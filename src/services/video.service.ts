import { PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config/dotenv";
import { s3Client } from "../config/s3Client";
import { AppDataSource } from "../config/database";
import { randomUUID } from "crypto";
import { CustomError } from "../types/CustomError";
import { VideoStatus } from "../models/Videos";
import { Like } from "typeorm";
import { Repository } from "typeorm";
import { Video } from "../models/Videos";
import { VenueInstallation } from "../models/VenueInstallations";
import pLimit from "p-limit";

interface signedUrlVideoData {
  captured_at: string;
  sha256: string;
  venue_id: string;
  client_id: string;
}

type DbVideo = {
  clipId: string;
  storagePath: string;
  capturedAt: Date | null;
  sizeBytes?: string | null;
}

class VideoService {
  private readonly VideoDataSource: Repository<Video>;
  private readonly VenueDataSource: Repository<VenueInstallation>

  constructor() {
    this.VideoDataSource = AppDataSource.getRepository(Video);
    this.VenueDataSource = AppDataSource.getRepository(VenueInstallation)
  }

  async createSignedUrlVideo(data: signedUrlVideoData) {
    // Lógica para criar URL assinada de vídeo a partir de metadados do vídeo
    // Validate Client ID
    const videoRepository = AppDataSource.getRepository("Video");

    const clientRepository = AppDataSource.getRepository("Client");
    const client = await clientRepository.findOne({
      where: { id: data.client_id },
      select: ["id", "retentionDays"],
    });

    if (!client) {
      console.warn("Client not found:", data.client_id);
      throw new CustomError("Cliente não encontrado", 404);
    }

    // Descobre contrato
    let contractType: string; // Lógica para determinar o tipo de contrato

    const venueInstalationRepo = AppDataSource.getRepository("VenueInstallation");
    const venue = await venueInstalationRepo.findOne({
      where: { clientId: data.client_id, id: data.venue_id },
      select: ["contractMethod"],
    });

    if (!venue?.contractMethod) {
      // TODO: Adicionar lógica de erro e envio de mensagem para central do cliente
      console.warn("Venue installation not found or contract method not defined:", data.venue_id);
      throw new CustomError("Quadra não encontrada ou método de contrato não definido.", 404);
    }
    contractType = venue.contractMethod; // "monthly_subscription" | "per_video"

    // Define destino
    let storagePath: string;
    const clip_id = randomUUID();
    if (contractType === "monthly_subscription") {
      const clipDate = new Date(data.captured_at);

      const month = clipDate.getMonth() + 1;
      const day = clipDate.getDate();
      storagePath = `main/clients/${data.client_id}/venues/${data.venue_id}/${month}/${day}/${clip_id}.mp4`;
    } else {
      storagePath = `temp/${data.client_id}/${data.venue_id}/${clip_id}.mp4`;
    }

    const capturedAtDate = new Date(data.captured_at);

    const retentionDays = typeof (client as any).retentionDays === "number"
      ? (client as any).retentionDays
      : 3;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + retentionDays);

    // Cria registro `clips`
    const clip = {
      clipId: clip_id,
      clientId: data.client_id,
      venueId: data.venue_id,
      capturedAt: capturedAtDate,
      expiresAt,
      contract: contractType,
      sha256: data.sha256,
      status: "queued",
      storagePath,
    };

    const existingClip = await videoRepository.findOne({ where: { clipId: clip.clipId } });
    if (existingClip) {
      throw new Error("Clip with this ID already exists.");
    }

    try {
      const videoClip = videoRepository.create(clip);
      await videoRepository.save(videoClip);

      // Gera URL assinada para upload (AWS S3)
      // comando para a operação de PUT
      const putCommand = new PutObjectCommand({
        Bucket: config.s3_bucket_name,
        Key: storagePath, // O caminho/nome do arquivo no bucket
      });

      // URL assinada a partir do comando
      const uploadUrl = await getSignedUrl(
        s3Client,
        putCommand,
        { expiresIn: 3600 } // URL expira em 1 hora (3600 segundos)
      );

      // getSignedUrl lança exceção em caso de falha
      if (!uploadUrl) {
        console.warn("Failed to create signed upload URL");
        throw new CustomError("Falha ao criar url assinada", 500);
      }

      return {
        clip_id: clip.clipId,
        contract_type: contractType,
        storage_path: storagePath,
        upload_url: uploadUrl,
        expires_hint_hours: 12,
      };
    } catch (error) {
      await videoRepository.delete({ clipId: clip.clipId });
      console.log(`Rolled back video record for clipId: ${clip.clipId}`);
      throw error;
    }
  }

  /**
   * List videos from database -> S3 bucket with pagination
   */
  async listVideos(params: { prefix?: string; limit: number; token?: string; includeSignedUrl?: boolean; ttl?: number; clientId?: string; venueId?: string }) {
    const { limit, token, includeSignedUrl, ttl, venueId } = params;

    try {
      const offset = token ? parseInt(token, 10) : 0;

      // Buscar instalação da venue para determinar clientId e contractMethod
      const venue = venueId
        ? await this.VenueDataSource.findOne({
            where: { id: venueId },
            select: ["clientId", "contractMethod"],
          })
        : null;

      if (!venue) {
        throw new CustomError("Instalação da quadra não encontrada", 404);
      }

      const resolvedClientId = venue.clientId;
      const effectivePrefix = venue.contractMethod === "monthly_subscription"
        ? `main/clients/${resolvedClientId}/venues/${venueId}/`
        : `temp/${resolvedClientId}/${venueId}/`;

      const videos = await this.VideoDataSource.find({
        where: {
          storagePath: Like(`${effectivePrefix}%`),
          clientId: resolvedClientId,
          venueId: venueId,
        },
        order: { capturedAt: "DESC" },
        skip: offset,
        take: limit,
      });

      const limiter = pLimit(5);

      const s3Videos = await Promise.all(
        videos.map((video) => 
          limiter(async () => {
            if (!video.storagePath) {
              return {
                clip_id: video.clipId,
                path: null as string | null,
                bucket: config.s3_bucket_name,
                size: null as number | null,
                last_modified: null as string | null,
                url: null as string | null,
                missing: true,
                captured_at: video.capturedAt?.toISOString() || null,
                contract_type: video.contract,
              };
            }

            // Consulta metadados e existência no S3
            let size: number | null = null;
            let lastModified: string | null = null;
            let url: string | null = null;
            let missing = false;

            try {
              const head = await s3Client.send(
                new HeadObjectCommand({
                  Bucket: config.s3_bucket_name,
                  Key: video.storagePath,
                })
              )

              size = head.ContentLength || null;
              lastModified = head.LastModified?.toISOString() || null;
            }
            catch (error) {
              // Em caso do objeto nao existir no S3, marcamos como missing (ausente)
              missing = true;
              // TODO: Fazer tratamento de banco ao dados para vídeos que não tiverem no amazon s3
            }

            if (includeSignedUrl && !missing) {
              try {
                const signed = await getSignedUrl(
                  s3Client,
                  new GetObjectCommand({
                    Bucket: config.s3_bucket_name,
                    Key: video.storagePath,
                  }),
                  { expiresIn: ttl ?? 3600 }
                )
                url = signed;
              }
              catch (error) {
                url = null;
              }
            }

            return {
              clip_id: video.clipId,
              path: video.storagePath,
              bucket: config.s3_bucket_name,
              size,
              last_modified: lastModified,
              url,
              missing,
              captured_at: video.capturedAt?.toISOString() || null,
              contract_type: video.contract,
            }
          })
        )
      )

      const hasMore = videos.length === limit;
      const nextToken = hasMore ? String(offset + videos.length) : null

      return {
        items: s3Videos,
        count: s3Videos.length,
        hasMore,
        nextToken,
      }
    } catch (error) {
      console.error("Error listing videos from S3:", error);
      throw new CustomError("Failed to list files from S3", 502);
    }
  }

  /**
   * Create signed URL for S3 object (preview or download)
   */
  async signUrl(params: { path: string; kind: "preview" | "download"; ttl: number }) {
    const { path, kind, ttl } = params;

    try {
      const command = new GetObjectCommand({
        Bucket: config.s3_bucket_name,
        Key: path,
        ResponseContentDisposition: kind === "download" ? "attachment" : undefined,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: ttl });

      return { url: signedUrl };
    } catch (error) {
      console.error("Error signing URL:", error);
      throw new CustomError("Failed to sign URL", 502);
    }
  }

  /**
   * Verify uploaded video exists and matches expected size
   */
  async verifyUpload(params: { storagePath: string; expectedSize: number; expectedEtag?: string }) {
    const { storagePath, expectedSize, expectedEtag } = params;

    try {
      const command = new HeadObjectCommand({
        Bucket: config.s3_bucket_name,
        Key: storagePath,
      });

      const response = await s3Client.send(command);

      const contentLength = response.ContentLength || 0;
      const objectEtag = response.ETag?.replace(/"/g, "") || undefined;

      // Verify size
      if (contentLength !== expectedSize) {
        throw new CustomError("Uploaded object size mismatch", 422);
      }

      // Verify ETag if provided
      if (expectedEtag && objectEtag && expectedEtag.replace(/"/g, "") !== objectEtag) {
        throw new CustomError("ETag mismatch", 422);
      }

      return {
        verified: true,
        size: contentLength,
        etag: objectEtag,
      };
    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      console.error("Error verifying upload:", error);
      throw new CustomError("Uploaded object not accessible for verification", 422);
    }
  }

  /**
   * Finalize video upload - verify and update status
   */
  async finalizeUpload(params: { videoId: string; size_bytes: number; sha256: string; etag?: string }) {
    const { videoId, size_bytes, sha256, etag } = params;

    // 1) Fetch video by clipId
    const videoRepository = AppDataSource.getRepository("Video");
    const video = await videoRepository.findOne({ where: { clipId: videoId } });

    if (!video) {
      throw new CustomError("Video not found", 404);
    }

    if (!video.storagePath) {
      throw new CustomError("Video has no storage_path set", 422);
    }

    // 2) Verify upload via S3 HEAD
    await this.verifyUpload({
      storagePath: video.storagePath,
      expectedSize: size_bytes,
      expectedEtag: etag,
    });

    // 3) Update status based on contract type
    const newStatus = video.contract === "monthly_subscription" ? VideoStatus.UPLOADED : VideoStatus.UPLOADED_TEMP;

    video.status = newStatus;
    video.sha256 = sha256;
    video.sizeBytes = String(size_bytes);
    await videoRepository.save(video);

    return {
      clip_id: video.clipId,
      contract_type: video.contract,
      storage_path: video.storagePath,
      status: newStatus === VideoStatus.UPLOADED ? "uploaded" : "uploaded_temp",
    };
  }

  /**
   * Get clips by venue with signed URLs
   */
  async getClipsByVenue(venueId: string) {
    const videoRepository = AppDataSource.getRepository("Video");

    const clips = await videoRepository.find({
      where: { venueId },
      order: { capturedAt: "DESC" },
    });

    // Generate signed URLs for each clip
    const items = await Promise.all(
      clips.map(async (clip) => {
        let signedUrl: string | null = null;

        if (clip.storagePath) {
          try {
            const { url } = await this.signUrl({
              path: clip.storagePath,
              kind: "preview",
              ttl: 600, // 10 minutes
            });
            signedUrl = url;
          } catch (error) {
            console.error(`Failed to sign URL for clip ${clip.clipId}:`, error);
          }
        }

        return {
          clip_id: clip.clipId,
          url: signedUrl,
          captured_at: clip.capturedAt?.toISOString() || null,
          duration_sec: clip.durationSec,
          meta: clip.meta,
          contract_type: clip.contract,
        };
      })
    );

    return { items };
  }
};

export const videoService = new VideoService();

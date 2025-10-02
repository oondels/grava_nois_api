import express, { Request, Response, NextFunction } from "express";
import { VideoService } from "../services/video.service";
import { z } from "zod";
import { CustomError } from "../types/CustomError";

export const videoRouter = express.Router();

/**
 * Recebe metadados do vídeo
 * @param clientId - ID do cliente
 * @param venueId - ID do local // Evita pegar a instalação errada se o cliente tiver várias
 * @description Este endpoint recebe metadados do vídeo e inicia o processo de upload.
 * 1. Descobre contrato (`monthly` | `per_video`).
 * 2. Define destino (path):
 *    - `monthly` → `main/clients/{client_id}/venues/{venue_id}/YYYY/MM/DD/{clip_id}.mp4`
 *    - `per_video` → `temp/{client_id}/{venue_id}/{clip_id}.mp4`
 * 3. Cria registro `clips` (status=`queued`).
 *    - Gera **URL assinada** para upload.
 * 4. Não publica no RabbitMQ ainda.
 *
 * @body {
 *   "venue_id": string,
 *   "duration_sec": number,
 *   "captured_at": timestamp,
 *   "meta": object, // { "codec": "h264", "fps": 30, "width": 1920, "height": 1080 },
 *   "sha256": string, // hash do arquivo de vídeo "HEX_DO_ARQUIVO"
 * }
 *
 * @returns JSON com mensagem de sucesso e informações de upload,
 * {
 *  "clip_id": "nanoid-clip-id", //* Id único
 *  "contract_type": "per_video",
 *  "storage_path": "temp/uuid-client/uuid-venue/nanoid-clip-id.mp4",
 *  "upload_url": "https://...signed-url...", //* O upload real do vídeo é realizado pela url retornada
 *  "expires_hint_hours": 12
 * }
 */
videoRouter.post("/api/videos/metadados/client/:clientId/venue/:venueId", async (req: Request, res: Response) => {
  try {
    const { clientId, venueId } = req.params;

    console.log("New video metadata received for client:", clientId, "venue:", venueId);

    const bodySchema = z.object({
      venue_id: z.string().uuid(),
      captured_at: z.string(),

      sha256: z.string().regex(/^[a-f0-9]{64}$/i),
    });

    // Validate Body
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
      return;
    }
    const { captured_at, sha256 } = parsed.data;

    const clipData = await VideoService.createSignedUrlVideo({
      captured_at,
      sha256,
      venue_id: venueId,
      client_id: clientId,
    });

    res.status(201).json(clipData);
  } catch (error) {
    console.error("Error processing video metadata:", error);
    res.status(500).json({ error: "Internal server error." });
    return;
  }
});

/**
 * POST /api/videos/:videoId/uploaded
 *
 * Finalize video upload after client completes S3 upload
 * - Validates existence of the object in S3 and integrity (sha256/size)
 * - Updates `videos.status` → `uploaded_temp` (per_video) or `uploaded` (monthly_subscription)
 * - TODO: Publish message to RabbitMQ (`clip.created`) for processing worker
 *
 * @body {
 *   "size_bytes": number,  // File size in bytes
 *   "sha256": string,      // SHA256 hash of the file
 *   "etag": string         // Optional ETag from S3 upload
 * }
 *
 * @returns {
 *   "clip_id": string,
 *   "contract_type": string,
 *   "storage_path": string,
 *   "status": "uploaded" | "uploaded_temp"
 * }
 */
videoRouter.post("/api/videos/:videoId/uploaded", async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    // Validate body
    const bodySchema = z.object({
      size_bytes: z.number().int().nonnegative(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/i),
      etag: z.string().min(1).optional(),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
      return;
    }

    const { size_bytes, sha256, etag } = parsed.data;

    const result = await VideoService.finalizeUpload({
      videoId,
      size_bytes,
      sha256,
      etag,
    });

    res.json(result);
  } catch (error: any) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("Error finalizing uploaded video:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/videos/list
 *
 * List video files from S3 bucket with pagination
 * Returns file metadata with optional signed URLs
 *
 * Query params:
 * - prefix: string (default: "")
 *     Path prefix within bucket. Ex.: "temp/client-id/venue-id"
 *     Sanitized (removes //, trim /, blocks "..")
 * - limit: number (default: 100, range: 1..100)
 * - offset: number (default: 0, >= 0)
 * - order: "asc" | "desc" (default: "desc")
 *
 * @returns {
 *   bucket: string,
 *   prefix: string,
 *   count: number,
 *   files: Array<{
 *     name: string,
 *     path: string,
 *     bucket: string,
 *     size: number | null,
 *     last_modified: string | null
 *   }>,
 *   hasMore: boolean,
 *   nextOffset: number
 * }
 */
videoRouter.get("/api/videos/list", async (req: Request, res: Response) => {
  try {
    // Parse and validate query params
    const prefixRaw = typeof req.query.prefix === "string" ? req.query.prefix : "";

    // Sanitize prefix
    let prefix = "";
    try {
      const decoded = decodeURIComponent(prefixRaw || "");
      if (decoded.includes("..")) {
        res.status(400).json({ error: "Invalid prefix" });
        return;
      }
      prefix = decoded.replace(/\/{2,}/g, "/").replace(/^\/+|\/+$/g, "");
    } catch {
      res.status(400).json({ error: "Invalid prefix" });
      return;
    }

    const limit = Math.min(
      100,
      Math.max(1, Number.isFinite(+req.query.limit!) ? parseInt(req.query.limit as string, 10) : 100)
    );

    const offset = Math.max(0, Number.isFinite(+req.query.offset!) ? parseInt(req.query.offset as string, 10) : 0);

    const order: "asc" | "desc" = req.query.order === "asc" ? "asc" : "desc";

    const result = await VideoService.listVideos({
      prefix,
      limit,
      offset,
      order,
    });

    // Short cache for list metadata (not for signed URLs)
    res.setHeader("Cache-Control", "private, max-age=15");
    res.json({
      bucket: result.files[0]?.bucket || "",
      prefix,
      count: result.count,
      files: result.files,
      hasMore: result.hasMore,
      nextOffset: result.nextOffset,
    });
  } catch (error: any) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("Error listing videos:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/videos/sign
 *
 * Generate signed URL for S3 object on-demand (preview or download)
 *
 * Query params:
 * - path: string (required)
 *     Full path to the video file in S3 bucket
 * - kind: "preview" | "download" (default: "preview")
 *     Type of access (preview or download attachment)
 * - ttl: number (default: 3600, range: 60..86400)
 *     Time-to-live in seconds for the signed URL
 *
 * @returns {
 *   url: string | null
 * }
 */
videoRouter.get("/api/videos/sign", async (req: Request, res: Response) => {
  try {
    const path = typeof req.query.path === "string" ? req.query.path : "";
    const kind = req.query.kind === "download" ? "download" : "preview";
    const ttl = Math.min(86400, Math.max(60, Number.parseInt(String(req.query.ttl ?? "3600"), 10) || 3600));

    // Validate path
    if (!path || path.includes("..")) {
      res.status(400).json({ error: "Invalid path" });
      return;
    }

    const result = await VideoService.signUrl({
      path,
      kind,
      ttl,
    });

    // Short cache for the JSON response (not the actual video)
    res.setHeader("Cache-Control", "private, max-age=5");
    res.json({ url: result.url });
  } catch (error: any) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("Error signing URL:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /videos-clips
 *
 * Get all clips for a specific venue with signed URLs
 *
 * Query params:
 * - venueId: string (required)
 *     UUID of the venue installation
 *
 * @returns {
 *   items: Array<{
 *     clip_id: string,
 *     url: string | null,
 *     captured_at: string | null,
 *     duration_sec: number | null,
 *     meta: object | null,
 *     contract_type: string
 *   }>
 * }
 */
videoRouter.get("/videos-clips", async (req: Request, res: Response) => {
  try {
    const venueId = req.query.venueId as string;

    if (!venueId) {
      res.status(400).json({ error: "venueId is required" });
      return;
    }

    const result = await VideoService.getClipsByVenue(venueId);
    res.json(result);
  } catch (error: any) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("Error fetching clips:", error);
    res.status(500).json({ error: "Erro ao buscar clipes gerados" });
  }
});

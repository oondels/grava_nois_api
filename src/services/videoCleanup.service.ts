import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { AppDataSource } from "../config/database";
import { config } from "../config/dotenv";
import { s3Client } from "../config/s3Client";
import { Video, VideoStatus } from "../models/Videos";
import { logger } from "../utils/logger";

const SERVICE_NAME = "video-cleanup";

const isS3NotFound = (error: unknown): boolean => {
  const err = error as { name?: string; code?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  const status = err?.$metadata?.httpStatusCode;
  const code = err?.name || err?.code || err?.Code;
  return status === 404 || code === "NoSuchKey" || code === "NotFound";
};

export class VideoCleanupService {
  static async processExpiredVideos(): Promise<void> {
    const videoRepository = AppDataSource.getRepository(Video);
    const now = new Date();

    const expiredVideos = await videoRepository
      .createQueryBuilder("video")
      .where("video.expiresAt IS NOT NULL")
      .andWhere("video.expiresAt < :now", { now })
      .andWhere("video.status != :expired", { expired: VideoStatus.EXPIRED })
      .andWhere("video.storagePath IS NOT NULL")
      .orderBy("video.expiresAt", "ASC")
      .take(50)
      .getMany();

    if (!expiredVideos.length) {
      logger.info(SERVICE_NAME, "Nenhum video expirado encontrado para limpeza.");
      return;
    }

    for (const video of expiredVideos) {
      if (!video.storagePath) {
        logger.warn(SERVICE_NAME, `Video ${video.id} sem storagePath, marcando como expirado.`);
        video.status = VideoStatus.EXPIRED;
        video.storagePath = null;
        video.deletedAt = new Date();
        await videoRepository.save(video);
        continue;
      }

      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: config.s3_bucket_name,
            Key: video.storagePath,
          })
        );

        video.status = VideoStatus.EXPIRED;
        video.storagePath = null;
        video.deletedAt = new Date();
        await videoRepository.save(video);

        logger.info(SERVICE_NAME, `Video ${video.id} expirado e removido do S3.`);
      } catch (error) {
        if (isS3NotFound(error)) {
          video.status = VideoStatus.EXPIRED;
          video.storagePath = null;
          video.deletedAt = new Date();
          await videoRepository.save(video);

          logger.info(SERVICE_NAME, `Video ${video.id} expirado; arquivo nao encontrado no S3.`);
          continue;
        }

        const message = error instanceof Error ? error.message : String(error);
        logger.error(SERVICE_NAME, `Falha ao remover video ${video.id} no S3: ${message}`);
      }
    }
  }
}

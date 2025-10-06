import express from "express";
import { VideoController } from "../controllers/video.controller";

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
videoRouter.post("/api/videos/metadados/client/:clientId/venue/:venueId", VideoController.createVideoMetadata);

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
videoRouter.post("/api/videos/:videoId/uploaded", VideoController.finalizeVideoUpload);

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
videoRouter.get("/api/videos/list", VideoController.listVideos);

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
videoRouter.get("/api/videos/sign", VideoController.signVideoUrl);

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
videoRouter.get("/videos-clips", VideoController.getClipsByVenue);

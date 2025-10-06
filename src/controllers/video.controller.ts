import { Request, Response, NextFunction } from "express";
import { VideoService } from "../services/video.service";
import { z } from "zod";
import { CustomError } from "../types/CustomError";

export class VideoController {
  static async createVideoMetadata(req: Request, res: Response, next: NextFunction) {
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
  }

  static async finalizeVideoUpload(req: Request, res: Response, next: NextFunction) {
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
  }

  static async listVideos(req: Request, res: Response, next: NextFunction) {
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
  }

  static async signVideoUrl(req: Request, res: Response, next: NextFunction) {
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
  }

  static async getClipsByVenue(req: Request, res: Response, next: NextFunction) {
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
  }
}
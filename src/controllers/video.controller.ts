import { Request, Response, NextFunction } from "express";
import { VideoService } from "../services/video.service";
import { string, z } from "zod";
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
      const queryParams = z.object({
        prefix: z.string()
          .transform(s => s.replace(/\/{2,}/g, '/'))
          .refine(s => !s.includes('..'), {
            message: "O prefixo não pode conter '..'"
          })
          .transform(s => s.startsWith('/') ? s.slice(1) : s)
          .transform(s => s.endsWith('/') ? s.slice(0, -1) : s),

        limit: z.coerce.number()
          .int()
          .min(1)
          .max(100)
          .default(100),

        order: z.enum(['asc', 'desc'])
          .optional(),

        token: z.string()
          .optional(),

        includeSignedUrl: z.boolean()
          .optional(),

        ttl: z.number()
          .int()
          .min(60)
          .max(86400)
          .optional(),
      })

      const parsed = queryParams.safeParse(req.query)
      if (!parsed.success) {
        res.status(400).json({
          error: "Parametros de query inválidos",
          details: parsed.error.flatten()
        })
        return;
      }
      const { prefix, limit, token, includeSignedUrl, ttl} = parsed.data;

      const result = await VideoService.listVideos({
        prefix,
        limit,
        token,
      });

      // Short cache for list metadata (not for signed URLs)
      res.setHeader("Cache-Control", "private, max-age=15");
      res.json({
        bucket: result.files[0]?.bucket || "",
        prefix,
        files: result.files,
        count: result.count,
        hasMore: result.hasMore,
        nextToken: result.nextToken || null,
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
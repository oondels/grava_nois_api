import { z } from "zod";

export const createVideoMetadataSchema = z.object({
  videoKey: z.string().min(1, "Video key é obrigatório"),
  duration: z.number().positive("Duração deve ser positiva").optional(),
  venueInstallationId: z.string().uuid("ID de instalação inválido").optional(),
});

export const getVideosByVenueSchema = z.object({
  venueId: z.string().uuid("ID de venue inválido"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const getPresignedUrlSchema = z.object({
  videoKey: z.string().min(1, "Video key é obrigatório"),
  expiresIn: z.coerce.number().int().positive().max(3600).default(3600),
});

export type CreateVideoMetadataInput = z.infer<typeof createVideoMetadataSchema>;
export type GetVideosByVenueInput = z.infer<typeof getVideosByVenueSchema>;
export type GetPresignedUrlInput = z.infer<typeof getPresignedUrlSchema>;

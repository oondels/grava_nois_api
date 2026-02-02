import { z } from "zod";

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    username: z.union([z.string().trim().min(1).max(64), z.null()]).optional(),
    avatarUrl: z.union([z.string().trim().url(), z.null()]).optional(),
    avatar_url: z.union([z.string().trim().url(), z.null()]).optional(),
    quadrasFiliadas: z.any().optional(),
    cep: z.union([z.string().trim().min(8).max(9), z.null()]).optional(),
    state: z.union([z.string().trim().min(2).max(64), z.null()]).optional(),
    city: z.union([z.string().trim().min(1).max(128), z.null()]).optional(),
    country: z.union([z.string().trim().min(1).max(128), z.null()]).optional(),
  })
  .transform((data) => {
    const avatarUrl = data.avatarUrl !== undefined ? data.avatarUrl : data.avatar_url;
    return {
      name: data.name,
      username: data.username,
      avatarUrl,
      quadrasFiliadas: data.quadrasFiliadas,
      cep: data.cep,
      state: data.state,
      city: data.city,
      country: data.country,
    };
  });

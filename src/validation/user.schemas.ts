import { z } from "zod";

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    username: z.union([z.string().trim().min(1).max(64), z.null()]).optional(),
    avatarUrl: z.union([z.string().trim().url(), z.null()]).optional(),
    // compat: alguns clientes enviam snake_case
    avatar_url: z.union([z.string().trim().url(), z.null()]).optional(),
  })
  .transform((data) => {
    const avatarUrl = data.avatarUrl !== undefined ? data.avatarUrl : data.avatar_url;
    return {
      name: data.name,
      username: data.username,
      avatarUrl,
    };
  });

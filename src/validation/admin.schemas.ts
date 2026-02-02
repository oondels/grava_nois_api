import { z } from "zod";

export const adminListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(255).optional(),
  role: z.string().trim().min(1).max(32).optional(),
});

export type AdminListUsersQuery = z.infer<typeof adminListUsersQuerySchema>;

export const adminUpdateUserSchema = z
  .object({
    isActive: z.boolean().optional(),
    role: z.string().trim().min(1).max(32).optional(),
    name: z.string().trim().min(1).max(255).optional(),
    username: z
      .union([z.string().trim().min(3).max(64), z.null()])
      .optional(),
  })
  .refine(
    (data) =>
      data.isActive !== undefined ||
      data.role !== undefined ||
      data.name !== undefined ||
      data.username !== undefined,
    {
      message: "Informe ao menos um campo para atualizar",
      path: [],
    }
  );

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

import { z } from "zod";
import {
  InstallationStatus,
  PaymentStatus,
} from "../models/VenueInstallations";
import { UserRole } from "../models/User";

export const adminListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(255).optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export type AdminListUsersQuery = z.infer<typeof adminListUsersQuerySchema>;

export const adminUpdateUserSchema = z
  .object({
    isActive: z.boolean().optional(),
    role: z.nativeEnum(UserRole).optional(),
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

export const adminListClientsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(255).optional(),
});

export type AdminListClientsQuery = z.infer<typeof adminListClientsQuerySchema>;

export const adminUpdateClientSchema = z
  .object({
    legalName: z.string().trim().min(1).max(255).optional(),
    tradeName: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
    responsibleName: z
      .union([z.string().trim().min(1).max(255), z.null()])
      .optional(),
    responsibleEmail: z.union([z.string().trim().email(), z.null()]).optional(),
    responsiblePhone: z
      .union([z.string().trim().min(8).max(20), z.null()])
      .optional(),
  })
  .refine(
    (data) =>
      data.legalName !== undefined ||
      data.tradeName !== undefined ||
      data.responsibleName !== undefined ||
      data.responsibleEmail !== undefined ||
      data.responsiblePhone !== undefined,
    {
      message: "Informe ao menos um campo para atualizar",
      path: [],
    }
  );

export type AdminUpdateClientInput = z.infer<typeof adminUpdateClientSchema>;

export const adminListVenuesQuerySchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  installationStatus: z.nativeEnum(InstallationStatus).optional(),
  isOnline: z.preprocess(
    (val) => (val === undefined ? undefined : val === "true" || val === true),
    z.boolean().optional()
  ),
  active: z.preprocess(
    (val) => (val === undefined ? undefined : val === "true" || val === true),
    z.boolean().optional()
  ),
});

export type AdminListVenuesQuery = z.infer<typeof adminListVenuesQuerySchema>;

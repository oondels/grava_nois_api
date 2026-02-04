import { z } from "zod";

export const createClientSchema = z.object({
  legalName: z.string().min(1, "Nome/Razão Social é obrigatório"),
  tradeName: z.string().optional(),
  responsibleEmail: z.string().email("Email inválido"),
  responsibleName: z.string().optional(),
  responsiblePhone: z.string().optional(),
  cnpj: z.string().optional(),
  responsibleCpf: z.string().optional(),
  retentionDays: z.number().int().positive().default(3),
}).refine(
  (data) => data.cnpj || data.responsibleCpf,
  {
    message: "CNPJ ou CPF do responsável é obrigatório",
    path: ["cnpj"],
  }
);

export const createVenueInstallationSchema = z.object({
  venueName: z.string().min(1, "Nome do local é obrigatório"),
  description: z.string().optional(),
  addressLine: z.string().optional(),
  countryCode: z.string().length(2, "Código do país deve ter 2 caracteres").optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

export const updateClientSchema = z
  .object({
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
      data.tradeName !== undefined ||
      data.responsibleName !== undefined ||
      data.responsibleEmail !== undefined ||
      data.responsiblePhone !== undefined,
    {
      message: "Informe ao menos um campo para atualizar",
      path: [],
    }
  );

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type CreateVenueInstallationInput = z.infer<typeof createVenueInstallationSchema>;
export type UpdateClientDto = z.infer<typeof updateClientSchema>;

import { z } from "zod";

// Parametros para envio de email
export interface SendParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Interface para provedores de notificação (email, SMS, etc)
export interface NotificationProvider {
  send(params: SendParams): Promise<void>;
}

// Schema e tipo para formulário de contato
export type ContactFormPayload = {
  estabelecimento: string;
  cnpjCpf: string;
  cep: string;
  endereco: string;
  estado: string;
  cidade: string;
  nome: string;
  telefone: string;
  email: string;
  segmento: string;
  qtdCameras: number | string;
  obs: string;
};

export const contactFormSchema = z.object({
  estabelecimento: z.string().min(1, "Estabelecimento é obrigatório"),
  cnpjCpf: z.string().min(1, "CNPJ/CPF é obrigatório"),
  cep: z.string().min(1, "CEP é obrigatório"),
  endereco: z.string().min(1, "Endereço é obrigatório"),
  estado: z.string().min(1, "Estado é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  nome: z.string().min(1, "Nome é obrigatório"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("Email inválido"),
  segmento: z.string().min(1, "Segmento é obrigatório"),
  qtdCameras: z.union([z.number().min(1, "Quantidade deve ser pelo menos 1"), z.string().regex(/^\d+$/, "Quantidade deve ser um número")]),
  obs: z.string().optional()
});


export type BugReportPayload = {
  name: string;
  email?: string;
  page: string;
  title?: string;
  description: string;
  steps?: string;
  severity: string;
  userAgent?: string;
  url?: string;
};
export const bugReportSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional(),
  page: z.string().min(1, "Página é obrigatória"),
  title: z.string().optional(),
  description: z.string().min(1, "Descrição é obrigatória"),
  steps: z.string().optional(),
  severity: z.string().default("Média"),
  userAgent: z.string().optional(),
  url: z.string().url("URL inválida").optional(),
});



import { ContactFormPayload, BugReportPayload } from "../../types/Notification";
import { EmailProvider } from "./providers/email.provider";
import { NotificationProvider } from "../../types/Notification";
import { config } from "../../config/dotenv";
import { logger } from "../../utils/logger";

class NotificationService {
  private provider: NotificationProvider;

  constructor(provider: NotificationProvider) {
    this.provider = provider;
  }

  private buildContactHtml(payload: ContactFormPayload): string {
    const safe = (value: string | undefined | null | number): string => {
      return value ? String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Não informado';
    };

    const loc = `${payload.cidade}/${payload.estado}`;

    return `
      <div style="font-family: Arial, sans-serif; color:#333; line-height:1.6; max-width:640px; margin:0 auto; background:#f9f9f9; padding:20px; border-radius:12px;">
        <div style="text-align:center; margin-bottom:20px;">
          <h1 style="color:#0d9757; font-size:22px; margin:0;">Nova Solicitação de Contato</h1>
          <p style="color:#777; margin:6px 0 0;">Grava Nóis — Formulário de Prospecção</p>
        </div>

        <div style="background:#fff; padding:18px; border-radius:10px; border:1px solid #eee;">
          <h2 style="color:#0056b3; font-size:18px; margin:0 0 12px;">Dados do Estabelecimento</h2>
          <table cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse;">
            <tbody>
              <tr><td style="width:40%; font-weight:bold; border-bottom:1px solid #f0f0f0;">Estabelecimento</td><td style="border-bottom:1px solid #f0f0f0;">${safe(payload.estabelecimento)}</td></tr>
              <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">CNPJ/CPF</td><td style="border-bottom:1px solid #f0f0f0;">${safe(payload.cnpjCpf)}</td></tr>
              <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">Segmento</td><td style="border-bottom:1px solid #f0f0f0;">${safe(payload.segmento)}</td></tr>
              <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">Qtd. Câmeras</td><td style="border-bottom:1px solid #f0f0f0;">${payload.qtdCameras}</td></tr>
              <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">Endereço</td><td style="border-bottom:1px solid #f0f0f0;">${safe(payload.endereco)}</td></tr>
              <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">Cidade/UF</td><td style="border-bottom:1px solid #f0f0f0;">${safe(loc)}</td></tr>
              <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">CEP</td><td style="border-bottom:1px solid #f0f0f0;">${safe(payload.cep)}</td></tr>
            </tbody>
          </table>

          <h2 style="color:#0056b3; font-size:18px; margin:20px 0 12px;">Contato</h2>
          <table cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse;">
            <tbody>
              <tr><td style="width:40%; font-weight:bold; border-bottom:1px solid #f0f0f0;">Nome</td><td style="border-bottom:1px solid #f0f0f0;">${safe(payload.nome)}</td></tr>
              <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">Telefone</td><td style="border-bottom:1px solid #f0f0f0;">${safe(payload.telefone)}</td></tr>
              <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">E-mail</td><td style="border-bottom:1px solid #f0f0f0;">${safe(payload.email)}</td></tr>
            </tbody>
          </table>

          <h2 style="color:#0d9757; font-size:18px; margin:20px 0 8px;">Observações</h2>
          <div style="font-size:15px; color:#555; background:#f7f7f7; padding:12px; border-radius:8px; border:1px solid #eee;">
            ${safe(payload.obs || 'Nenhuma')}
          </div>
        </div>

        <div style="text-align:center; margin-top:22px; color:#888; font-size:13px;">
          <p>Este e-mail foi gerado automaticamente a partir do site.</p>
        </div>
      </div>
    `;
  }

  private buildBugReportHtml(payload: BugReportPayload): string {
    const safe = (value: string | undefined | null | number): string => {
      return value ? String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Não informado';
    };

    return `
      <div style="font-family: Arial, sans-serif; color:#333; line-height:1.6; max-width:720px; margin:0 auto; background:#f9f9f9; padding:20px; border-radius:12px;">
        <div style="text-align:center; margin-bottom:20px;">
          <h1 style="color:#C62828; font-size:22px; margin:0;">Relatório de Erro</h1>
          <p style="color:#777; margin:6px 0 0;">Grava Nóis — Canal interno</p>
        </div>

        <div style="background:#fff; padding:18px; border-radius:10px; border:1px solid #eee;">
          <h2 style="color:#0056b3; font-size:18px; margin:0 0 12px;">Resumo</h2>
          <table cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse;">
            <tbody>
              <tr><td style="width:35%; font-weight:bold; border-bottom:1px solid #f0f0f0;">Título</td><td style="border-bottom:1px solid #f0f0f0;">${safe(payload.title)}</td></tr>
              <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">Severidade</td><td style="border-bottom:1px solid #f0f0f0;">${safe(String(payload.severity))}</td></tr>
              <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">Página</td><td style="border-bottom:1px solid #f0f0f0;">${safe(payload.page)}</td></tr>
              <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">URL</td><td style="border-bottom:1px solid #f0f0f0;">${safe(payload.url)}</td></tr>
            </tbody>
          </table>

          <h2 style="color:#0d9757; font-size:18px; margin:20px 0 8px;">Descrição</h2>
          <div style="font-size:15px; color:#555; background:#f7f7f7; padding:12px; border-radius:8px; border:1px solid #eee; white-space:pre-wrap;">
            ${safe(payload.description)}
          </div>

          ${payload.steps?.trim()
            ? `<h3 style="color:#333; font-size:16px; margin:16px 0 8px;">Passos para reproduzir</h3>
               <div style="font-size:15px; color:#555; background:#f7f7f7; padding:12px; border-radius:8px; border:1px solid #eee; white-space:pre-wrap;">${safe(payload.steps)}</div>`
            : ""
          }

          <h2 style="color:#0056b3; font-size:18px; margin:20px 0 12px;">Contato</h2>
          <table cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse;">
            <tbody>
              <tr><td style="width:35%; font-weight:bold; border-bottom:1px solid #f0f0f0;">Nome</td><td style="border-bottom:1px solid #f0f0f0;">${safe(payload.name)}</td></tr>
              <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">E-mail</td><td style="border-bottom:1px solid #f0f0f0;">${safe(payload.email)}</td></tr>
              <tr><td style="font-weight:bold; border-bottom:1px solid #f0f0f0;">User-Agent</td><td style="border-bottom:1px solid #f0f0f0;">${safe(payload.userAgent)}</td></tr>
            </tbody>
          </table>
        </div>

        <div style="text-align:center; margin-top:22px; color:#888; font-size:13px;">
          <p>Este e-mail foi gerado automaticamente a partir do Reportar Erro.</p>
        </div>
      </div>
    `;
  }

  async sendContactEmail(payload: ContactFormPayload) {
    const subject = `Novo cliente Grava Nóis ${payload.nome} - ${payload.email}`;
    const html = this.buildContactHtml(payload);

    await this.provider.send({
      to: config.dev_email,
      subject,
      html,
    });

    logger.info("[NotificationService]", `Nova solicitação enviada de contato: ${payload.nome}`);
  }

  async sendReportEmail(payload: BugReportPayload) {
    const subject = `Grava Nóis - Relatório de Erro: ${payload.title || 'Sem título'}`;
    const html = this.buildBugReportHtml(payload);

    await this.provider.send({
      to: config.dev_email,
      subject,
      html,
    });

    logger.info("[NotificationService]", `Novo relatório de erro enviado: ${payload.title || 'Sem título'}`);
  }
}

const emailProvider = new EmailProvider();
export const notificationService = new NotificationService(emailProvider);
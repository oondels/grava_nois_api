import nodeMailer from "nodemailer";
import { config } from "../../../config/dotenv";
import { logger } from "../../../utils/logger"
import { SendParams, NotificationProvider } from "../../../types/Notification";
import { CustomError } from "../../../types/CustomError";

export class EmailProvider implements NotificationProvider {
  private transporter: nodeMailer.Transporter;

  constructor() {
    this.transporter = nodeMailer.createTransport({
      host: config.mail_host,
      port: 465,
      secure: true,
      auth: {
        user: config.mail_user,
        pass: config.mail_pass,
      },
    });
    logger.info("[EmailProvider]", "Email provider (nodeMailer) inicializado.");
  }

  async send(params: SendParams): Promise<void> {
    try {
      await this.transporter.sendMail({
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text || undefined,
      });

      logger.info("[EmailProvider]", `Email enviado para ${params.to} com assunto "${params.subject}"`);
    } catch (error) {
      logger.error("[EmailProvider]", `Erro ao enviar email: ${(error as Error).message}`);
      throw new CustomError("Erro ao enviar email", 500, error);
    }
  }
}
import { Request, Response, NextFunction } from "express";
import { success, z } from "zod";
import { CustomError } from "../types/CustomError";
import { contactFormSchema, bugReportSchema, ContactFormPayload, BugReportPayload } from "../types/Notification";
import { notificationService } from "../services/notification/notification.service";

export class NotificationController {
  static async sendContactEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = contactFormSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "validation_failed",
          message: "Dados inválidos",
          details: validation.error.issues
        });
      }

      const payload = validation.data as ContactFormPayload;
      await notificationService.sendContactEmail(payload);

      return res.status(200).json({
        success: true,
        message: "Solicitação enviada com sucesso, entraremos em contato em breve!",
        data: null
      })
    } catch (error) {
      next(error)
    }
  }

  static async sendReportError(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = bugReportSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "validation_failed",
          message: "Dados inválidos",
          details: validation.error.issues
        });
      }

      const payload = validation.data as BugReportPayload;
      await notificationService.sendReportEmail(payload);

      return res.status(200).json({
        success: true,
        message: "Relatório enviado com sucesso, obrigado pelo feedback!",
        data: null
      })
    } catch (error) {
      next(error)
    }
  }
}
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { clientService } from "../services/client.service";
import { venueInstallationService } from "../services/venueInstallation.service";
import { CustomError } from "../types/CustomError";
import { clientInvoicesQuerySchema, UpdateClientDto } from "../validation/client.schemas";
import { formatZodError } from "../middlewares/validate";

export class ClientController {
  async createClient(req: Request, res: Response, next: NextFunction) {
    try {
      const newClient = await clientService.createClient(req.body);

      res.status(201).json({
        success: true,
        data: newClient,
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async createVenueInstallation(req: Request, res: Response, next: NextFunction) {
    try {
      const paramsSchema = z.object({
        clientId: z.string().min(1),
      });

      const paramsParsed = paramsSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Client ID é obrigatório'
          },
          requestId: (res.locals as any).requestId,
        });
        return;
      }

      const { clientId } = paramsParsed.data;

      const newVenue = await venueInstallationService.createVenueInstallation(
        clientId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: newVenue,
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        throw new CustomError("Forbidden - User is not a client", 403);
      }

      const client = await clientService.getMe(clientId);

      res.status(200).json({
        success: true,
        data: client,
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        throw new CustomError("Forbidden - User is not a client", 403);
      }

      const payload = req.body as UpdateClientDto;
      const updated = await clientService.updateMe(clientId, payload);

      res.status(200).json({
        success: true,
        message: "Cliente atualizado com sucesso",
        data: updated,
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        throw new CustomError("Forbidden - User is not a client", 403);
      }

      const stats = await clientService.getClientStats(clientId);

      res.status(200).json({
        success: true,
        data: stats,
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async getInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        throw new CustomError("Forbidden - User is not a client", 403);
      }

      const parsed = clientInvoicesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        const requestId = (res.locals as any).requestId;
        res.status(422).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Erro de Validação dos dados enviados",
          },
          requestId,
          details: formatZodError(parsed.error),
        });
        return;
      }

      const invoices = await clientService.getInvoices(clientId, parsed.data);

      res.status(200).json({
        success: true,
        data: invoices,
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSubscriptionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        throw new CustomError("Forbidden - User is not a client", 403);
      }

      const status = await clientService.getSubscriptionStatus(clientId);

      res.status(200).json({
        success: true,
        data: status,
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const clientController = new ClientController();

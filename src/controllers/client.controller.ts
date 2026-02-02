import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { clientService } from "../services/client.service";
import { venueInstallationService } from "../services/venueInstallation.service";
import { logger } from "../utils/logger";

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
}

export const clientController = new ClientController();

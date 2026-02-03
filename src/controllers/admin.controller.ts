import { Request, Response, NextFunction } from "express";
import { adminService } from "../services/admin.service";
import {
  adminListUsersQuerySchema,
  adminListClientsQuerySchema,
  adminListVenuesQuerySchema,
  AdminUpdateUserInput,
  AdminUpdateClientInput,
} from "../validation/admin.schemas";
import { z } from "zod";

const idParamSchema = z.object({
  id: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.string().min(1, "ID é obrigatório")
  ),
});

export class AdminController {
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const query = adminListUsersQuerySchema.parse(req.query);
      const { users, total } = await adminService.listUsers(query);

      res.status(200).json({
        success: true,
        data: {
          users,
          total,
          page: query.page,
          limit: query.limit,
        },
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);

      const payload = req.body as AdminUpdateUserInput;
      const updatedUser = await adminService.updateUser(id, payload);

      res.status(200).json({
        success: true,
        message: "Usuário atualizado com sucesso",
        user: updatedUser,
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async listClients(req: Request, res: Response, next: NextFunction) {
    try {
      const query = adminListClientsQuerySchema.parse(req.query);
      const { clients, total } = await adminService.listClients(query);

      res.status(200).json({
        success: true,
        data: {
          clients,
          total,
          page: query.page,
          limit: query.limit,
        },
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateClient(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);

      const payload = req.body as AdminUpdateClientInput;
      const updatedClient = await adminService.updateClient(id, payload);

      res.status(200).json({
        success: true,
        message: "Cliente atualizado com sucesso",
        client: updatedClient,
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async listVenues(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = adminListVenuesQuerySchema.parse(req.query);
      const venues = await adminService.listVenues(filters);

      res.status(200).json({
        success: true,
        data: venues,
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const dashboard = await adminService.getDashboardStats();
      res.status(200).json({
        success: true,
        data: dashboard,
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecentVideoErrors(req: Request, res: Response, next: NextFunction) {
    try {
      const videos = await adminService.getRecentVideoErrors();
      res.status(200).json({
        success: true,
        data: videos,
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();

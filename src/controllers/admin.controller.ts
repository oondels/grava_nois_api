import { Request, Response, NextFunction } from "express";
import { adminService } from "../services/admin.service";
import {
  adminListUsersQuerySchema,
  adminListClientsQuerySchema,
  adminListVenuesQuerySchema,
  AdminUpdateUserInput,
  AdminUpdateClientInput,
} from "../validation/admin.schemas";
import { CustomError } from "../types/CustomError";

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
      const { id } = req.params;
      if (!id) {
        throw new CustomError("User ID é obrigatório", 400);
      }

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
      const { id } = req.params;
      if (!id) {
        throw new CustomError("Client ID é obrigatório", 400);
      }

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
}

export const adminController = new AdminController();

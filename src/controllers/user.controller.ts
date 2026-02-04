import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { userService } from "../services/user.service";
import { UserRole } from "../models/User";
import { CustomError } from "../types/CustomError";

function toUserResponse(user: any) {
  const avatarUrl = user.avatarUrl ?? null;
  return {
    id: user.id,
    email: user.email,
    username: user.username ?? null,
    name: user.name,
    avatarUrl,
    provider: user.oauthProvider ?? null,
    role: user.role,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    quadrasFiliadas: user.quadrasFiliadas,
    localization: {
      cep: user.cep ?? null,
      state: user.state ?? null,
      city: user.city ?? null,
      country: user.country ?? null,
    }
  };
}

const idParamSchema = z.object({
  id: z.string().min(1),
});

export class UserController {
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const paramsParsed = idParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        throw new CustomError("User ID é obrigatório", 400);
      }
      const { id } = paramsParsed.data;

      // Permite acesso apenas ao próprio usuário ou admin
      if (req.user && req.user.id !== id && req.user.role !== UserRole.Admin) {
        throw new CustomError("Acesso negado! Você não tem permissão para acessar este perfil.", 403);
      }

      const user = await userService.getById(id);

      res.status(200).json({
        success: true,
        message: "Usuário encontrado com sucesso",
        user: toUserResponse(user),
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateById(req: Request, res: Response, next: NextFunction) {
    try {
      const paramsParsed = idParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        throw new CustomError("User ID é obrigatório", 400);
      }
      const { id } = paramsParsed.data;

      if (!req.user || req.user.id !== id) {
        throw new CustomError("Acesso negado", 403);
      }
      
      const patch = req.body as any;

      const hasAnyField =
        patch.name !== undefined ||
        patch.username !== undefined ||
        patch.avatarUrl !== undefined ||
        patch.quadrasFiliadas !== undefined;

      if (!hasAnyField) {
        const current = await userService.getById(id);
        res.status(200).json({
          success: true,
          message: "Nada para atualizar",
          user: toUserResponse(current),
          requestId: (res.locals as any).requestId,
        });
        return;
      }

      const updated = await userService.updateById(id, patch);

      res.status(200).json({
        success: true,
        message: "Perfil atualizado com sucesso",
        user: toUserResponse(updated),
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUserLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const paramsParsed = idParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        throw new CustomError("User ID é obrigatório", 400);
      }
      const { id } = paramsParsed.data;

      if (!req.user || req.user.id !== id) {
        throw new CustomError("Acesso negado", 403);
      }

      const { cep, state, city, country } = req.body;

      const patch: any = {};
      if (cep !== undefined) patch.cep = cep;
      if (state !== undefined) patch.state = state;
      if (city !== undefined) patch.city = city;
      if (country !== undefined) patch.country = country;

      const updated = await userService.updateById(id, patch);

      res.status(200).json({
        success: true,
        message: "Localização do usuário atualizada com sucesso",
        user: toUserResponse(updated),
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();

import { Request, Response, NextFunction } from "express";
import { userService } from "../services/user.service";
import { CustomError } from "../types/CustomError";

function toUserResponse(user: any) {
  const avatarUrl = user.avatarUrl ?? null;
  return {
    id: user.id,
    email: user.email,
    username: user.username ?? null,
    name: user.name,
    avatarUrl,
    // compat com formato antigo
    avatar_url: avatarUrl,
    provider: user.oauthProvider ?? null,
    role: user.role,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export class UserController {
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        throw new CustomError("User ID é obrigatório", 400);
      }

      const user = await userService.getById(id);

      res.status(200).json({
        success: true,
        message: "Usuário encontrado com sucesso",
        user: toUserResponse(user),
        data: toUserResponse(user),
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        throw new CustomError("User ID é obrigatório", 400);
      }

      // segurança básica: só o próprio usuário pode atualizar
      if (!req.user || req.user.id !== id) {
        throw new CustomError("Acesso negado", 403);
      }

      const patch = req.body as any;

      const hasAnyField =
        patch.name !== undefined ||
        patch.username !== undefined ||
        patch.avatarUrl !== undefined;

      if (!hasAnyField) {
        const current = await userService.getById(id);
        res.status(200).json({
          success: true,
          message: "Nada para atualizar",
          user: toUserResponse(current),
          data: toUserResponse(current),
          requestId: (res.locals as any).requestId,
        });
        return;
      }

      const updated = await userService.updateById(id, patch);

      res.status(200).json({
        success: true,
        message: "Perfil atualizado com sucesso",
        user: toUserResponse(updated),
        data: toUserResponse(updated),
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();

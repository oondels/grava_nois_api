import { Request, Response, NextFunction } from "express";
import { CustomError } from "../types/CustomError";
import { UserRole } from "../models/User";

/**
 * Middleware para verificar se o usuário é cliente
 * Deve ser usado após o middleware authenticateToken
 */
const requireClient = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new CustomError("Acesso negado! Usuário não autenticado.", 401);
  }

  if (req.user.role !== UserRole.Client || !req.user.clientId) {
    throw new CustomError("Forbidden - User is not a client", 403);
  }

  next();
};

export { requireClient };

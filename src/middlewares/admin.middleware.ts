import { Request, Response, NextFunction } from "express";
import { CustomError } from "../types/CustomError";

/**
 * Middleware para verificar se o usuário é administrador
 * Deve ser usado após o middleware authenticateToken
 * 
 * Exemplo de uso na rota:
 * router.delete("/users/:id", authenticateToken, requireAdmin, userController.deleteUser);
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Verifica se o usuário está autenticado (deve estar set pelo authenticateToken)
  if (!req.user) {
    throw new CustomError("Acesso negado! Usuário não autenticado.", 401);
  }

  // Verifica se o role é 'admin'
  if (req.user.role !== "admin") {
    throw new CustomError("Acesso negado! Você não tem permissão de administrador.", 403);
  }

  // Usuário é admin, permite continuar
  next();
};

export { requireAdmin };

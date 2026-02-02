/// <reference path="../types/express.d.ts" />
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { config } from "../config/dotenv";

const PRIVATE_KEY = config.jwt_secret as jwt.Secret;

export interface DecodedToken {
  id: string;
  email: string;
  role?: string;
}

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  // Tenta obter o token em ordem de prioridade: cookies, header Authorization, body
  let token = req.cookies.grn_access_token;
  
  if (!token) {
    // Tenta obter do header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  
  if (!token) {
    res.status(401).json({ message: "Acesso negado! Token de acesso não fornecido ou expirado!" });
    return;
  }

  jwt.verify(token, PRIVATE_KEY, async (error: jwt.VerifyErrors | null, decoded: jwt.JwtPayload | string | undefined) => {
    if (error || !decoded) {
      if (error && error.name === 'TokenExpiredError') {
        res.status(401).json({ message: "Sessão expirada. Faça login novamente." });
        return;
      }

      res.status(401).json({
        message: "Acesso negado! Você não tem permissões para acessar essa funcionalidade!",
      });
      return;
    }

    // Compat: o token foi assinado com `userId` em alguns fluxos.
    // Normaliza para `req.user.id` para evitar inconsistências em handlers.
    const payload = decoded as jwt.JwtPayload;
    const normalizedId = String((payload as any).userId ?? (payload as any).id ?? "");
    const normalizedEmail = String((payload as any).email ?? "");
    const normalizedRole = (payload as any).role ? String((payload as any).role) : undefined;

    if (!normalizedId || !normalizedEmail) {
      res.status(401).json({ message: "Token inválido." });
      return;
    }

    req.user = {
      id: normalizedId,
      email: normalizedEmail,
      role: normalizedRole,
    };
    next();
  });
};

export { PRIVATE_KEY, authenticateToken };
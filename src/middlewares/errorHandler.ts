import { Request, Response, NextFunction } from "express";
import { CustomError } from "../types/CustomError";
import { logger } from "../utils/logger";

/**
 * Middleware centralizado para tratamento de erros.
 * Padroniza o formato de resposta e realiza logging adequado.
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isCustom = error instanceof CustomError;
  const statusCode = isCustom 
    ? (error as CustomError).statusCode 
    : (Number(error?.status) || 500);
  
  const safeMessage = isCustom 
    ? error.message 
    : (statusCode === 404 ? "Recurso não encontrado" : "Erro interno no servidor.");
  
  const details = isCustom ? (error as CustomError).details : undefined;
  const requestId = (res.locals as any).requestId;

  // Log estruturado do erro
  logger.error('http-error', JSON.stringify({
    requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    error: error?.message || safeMessage,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  }));

  // Log de stack trace apenas em desenvolvimento
  if (process.env.NODE_ENV !== "production" && error?.stack) {
    console.error(error.stack);
  }

  // Resposta padronizada
  res.status(statusCode).json({
    success: false,
    error: {
      code: error.name || 'INTERNAL_ERROR',
      message: safeMessage
    },
    requestId,
    ...(process.env.NODE_ENV !== "production" && details ? { details } : {}),
  });
};

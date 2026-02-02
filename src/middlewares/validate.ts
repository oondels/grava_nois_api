import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Middleware de validação usando Zod.
 * Valida o corpo da requisição contra um schema e retorna erros formatados.
 * 
 * @param schema Schema Zod para validação
 * @returns Middleware Express
 * 
 * @example
 * router.post('/users', validate(createUserSchema), createUser);
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      const requestId = (res.locals as any).requestId;
      const errors = result.error.flatten();
      const firstMessage = result.error.issues[0]?.message ?? "Erro de Validação dos dados enviados";
      
      // 422 Unprocessable Entity: request is well-formed but semantically invalid
      res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstMessage
        },
        requestId,
        details: errors
      });
      return;
    }
    
    // Substitui req.body pelos dados validados e transformados
    req.body = result.data;
    next();
  };
};

/**
 * Formata erros de validação Zod para uma estrutura mais amigável.
 */
export const formatZodError = (error: ZodError) => {
  return error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));
};

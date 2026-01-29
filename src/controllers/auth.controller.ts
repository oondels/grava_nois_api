import { Request, Response, NextFunction } from "express"
import { authService } from "../services/auth.service"
import { config } from "../config/dotenv";
import { CustomError } from "../types/CustomError";
import jwt from 'jsonwebtoken';
import { signInSchema } from "../validation/auth.schemas";

function setAuthToken(res: Response, token: string) {
  const decoded = jwt.decode(token) as jwt.JwtPayload | null;
  if (!decoded || !decoded.exp) {
    throw new CustomError("Token de acesso inválido", 500);
  }

  const maxAgeMs = Math.max(decoded.exp * 1000 - Date.now(), 0);
  const isProd = config.env === "production";

  res.cookie("grn_access_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: maxAgeMs,
  });

}

export class AuthController {

  static async signIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validação feita pelo middleware validate()
      const { email, password } = req.body;
      const user = await authService.signIn(email, password);

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        config.jwt_secret as jwt.Secret,
        { expiresIn: config.jwt_expires_in } as jwt.SignOptions
      )

      setAuthToken(res, token);
      res.status(200).json({
        user: {
          email: user.email,
          username: user.username,
          emailVerified: user.emailVerified,
          role: user.role,
        },
        status: 200,
        message: "Login realizado com sucesso!"
      })
      return
    } catch (error) {
      next(error);
    }
  }

  //* Migração Supabase feita
  static async signUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name } = req.body ?? {};
      if (!email || !password || !name) {
        res.status(400).json({ error: "missing_credentials", message: "Email, senha e nome são obrigatórios." });
        return;
      }

      const newUser = await authService.signUp(email, password, name);

      const token = jwt.sign(
        {
          userId: newUser.id,
          email: newUser.email,
          role: newUser.role
        },
        config.jwt_secret as jwt.Secret,
        { expiresIn: config.jwt_expires_in } as jwt.SignOptions
      )

      setAuthToken(res, token);
      res.status(201).json({
        status: 201,
        message: "Usuário registrado com sucesso! Verifique seu email para ativar a conta.",
        user: {
          email,
          username: newUser.username,
          emailVerified: newUser.emailVerified,
          role: newUser.role,
        }
      });
      return
    } catch (error) {
      next(error)
    }
  }

  static async signOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies.grn_access_token;
      console.log(token);

      const isProd = config.env === 'production';
      res.clearCookie("grn_access_token", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: "/",
      });

      res.clearCookie("grn_refresh_token", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: "/"
      });

      res.status(204).end();
      return
    } catch (error) {
      next(error)
    }
  }

  static async authMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ message: "Usuário não autenticado." });
        return;
      }

      const foundedUser = await authService.getUser(user.id);

      res.json({
        status: 200,
        foundedUser
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  static async googleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idToken = req.body.idToken || req.body.credential;

      if (!idToken) {
        res.status(400).json({
          error: "missing_token",
          message: "Google ID token é obrigatório."
        });
        return;
      }

      // Authenticate with Google
      const user = await authService.googleLogin(idToken);

      // Generate JWT token (same pattern as signIn/signUp)
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        config.jwt_secret as jwt.Secret,
        { expiresIn: config.jwt_expires_in } as jwt.SignOptions
      );

      // Set cookie (same pattern as signIn/signUp)
      setAuthToken(res, token);
      res.status(200).json({
        user: {
          email: user.email,
          username: user.username,
          emailVerified: user.emailVerified,
          role: user.role,
        },
        status: 200,
        message: "Login com Google realizado com sucesso!"
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}
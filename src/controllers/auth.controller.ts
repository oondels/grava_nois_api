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

function setRefreshToken(res: Response, token: string) {
  const isProd = config.env === "production";
  const fiveDaysMs = 432000 * 1000;

  res.cookie("grn_refresh_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/auth/refresh",
    maxAge: fiveDaysMs,
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

      const refreshToken = await authService.generateRefreshToken(user.id);

      setAuthToken(res, token);
      setRefreshToken(res, refreshToken);
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

  static async signUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name } = req.body ?? {};

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

      const refreshToken = await authService.generateRefreshToken(newUser.id);

      setAuthToken(res, token);
      setRefreshToken(res, refreshToken);
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
      const refreshToken = req.cookies?.grn_refresh_token;
      if (refreshToken) {
        await authService.signOut(refreshToken);
      }

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
        path: "/auth/refresh"
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
      const refreshToken = await authService.generateRefreshToken(user.id);

      setAuthToken(res, token);
      setRefreshToken(res, refreshToken);
      res.status(200).json({
        user: {
          email: user.email,
          username: user.username,
          name: user.name,
          avatarUrl: user.avatarUrl,
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

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.grn_refresh_token;
      if (!refreshToken) {
        throw new CustomError("Refresh token ausente", 401);
      }

      const { userId, refreshToken: newRefreshToken } = await authService.refreshToken(refreshToken);
      const user = await authService.getUser(userId);

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        config.jwt_secret as jwt.Secret,
        { expiresIn: config.jwt_expires_in } as jwt.SignOptions
      );

      setAuthToken(res, token);
      setRefreshToken(res, newRefreshToken);

      res.status(200).json({
        accessToken: token,
        status: 200,
        message: "Token renovado com sucesso."
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}

import { Request, Response, NextFunction } from "express"
import { z } from "zod";
import { AuthService } from "../services/auth.service"
import { config } from "../config/dotenv";
import { ALLOWED_ORIGINS } from "../index";
import { CustomError } from "../types/CustomError";
import { flushSupabaseCookies } from "../config/supabase";

const signInSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});


function buildFinalRedirect(nextRaw: string | undefined | null) {
  // fallback
  let next = typeof nextRaw === "string" ? nextRaw : "/";

  try {
    // caso absoluto (http/https)
    if (/^https?:\/\//i.test(next)) {
      const url = new URL(next);
      if (ALLOWED_ORIGINS.has(`${url.protocol}//${url.host}`)) {
        // absoluto permitido
        return url.toString();
      }
      // origem não permitida → cai para fallback
      next = "/";
    }
  } catch {
    next = "/";
  }

  // caso relativo → prefixa com FRONTEND_ORIGIN
  if (!next.startsWith("/")) next = "/";
  const base = Array.from(ALLOWED_ORIGINS)[0] || "http://localhost:5173";
  return `${config.env === "production" ? base : "http://localhost:5173"}${next}`;
}

export class AuthController {
  static async signIn(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = signInSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "validation_failed",
          details: validation.error.issues
        });
      }

      const { email, password } = validation.data;
      await AuthService.signIn(email, password, req, res);

      return res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  static async signUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body ?? {};
      if (!email || !password) return res.status(400).json({ error: "missing_credentials" });

      await AuthService.signUp(email, password, req, res);

      // Se “Email confirmations” estiver ON, o usuário só loga após confirmar por e-mail
      return res.status(200).json({ status: "check_email" });
    } catch (error) {
      next(error)
    }
  }

  static async signOut(req: Request, res: Response, next: NextFunction) {
    try {
      await AuthService.signOut(req, res);

      return res.status(204).end();
    } catch (error) {
      next(error)
    }
  }

  static async authMe(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, profile } = await AuthService.getUser(req, res);

      return res.json({
        user: { id: user.id, email: user.email, app_metadata: user.app_metadata },
        profile,
      });
    } catch (error) {
      next(error)
    }
  }

  static async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const nextUrl = typeof req.query.next === "string" ? req.query.next : "/";

      // Definir cookie antes da chamada ao service
      res.cookie("post_auth_next", nextUrl, {
        httpOnly: true,
        secure: config.env === "production",
        sameSite: "lax",
        maxAge: 10 * 60 * 1000,
        path: "/"
      });

      const data = await AuthService.googleLogin(req, res);

      flushSupabaseCookies(res);

      return res.redirect(302, data.url);
    } catch (error) {
      next(error)
    }
  }

  static async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, error_description } = req.query as any;
      if (error) {
        const errorUrl = buildFinalRedirect(`/login?e=${encodeURIComponent(error_description || error)}`)
        return res.redirect(303, errorUrl);
      }

      const code = String(req.query.code || "");
      if (!code) {
        const errorUrl = buildFinalRedirect("/login?e=missing_code");
        return res.redirect(303, errorUrl);
      }

      await AuthService.googleCallback(req, res, code);

      const nextCookie = (req.cookies?.post_auth_next as string) || "/";
      res.clearCookie("post_auth_next", { path: "/" });

      const finalUrl = buildFinalRedirect(nextCookie);

      // Garante envio de cookies de sessão antes do redirect
      flushSupabaseCookies(res);

      return res.redirect(303, finalUrl);
    } catch (error) {
      if (error instanceof CustomError) {
        const errorUrl = buildFinalRedirect("/login?e=exchange_failed");
        return res.redirect(303, errorUrl);
      }
      console.error("Callback error: ", error);
      next(error)
    }
  }
}
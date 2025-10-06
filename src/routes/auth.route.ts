import { Router } from "express"
import { AuthController } from "../controllers/auth.controller"
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: { error: "too_many_requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRouter = Router()

authRouter.post("/sign-in",authLimiter, AuthController.signIn)

authRouter.post("/sign-up", authLimiter, AuthController.signUp)

authRouter.post("/sign-out", AuthController.signOut)

authRouter.get("/me", AuthController.authMe)

authRouter.get("/login/google", AuthController.googleLogin)

authRouter.get("/callback", AuthController.googleCallback)
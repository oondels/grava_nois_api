import { Router } from "express"
import { AuthController } from "../controllers/auth.controller"
import rateLimit from "express-rate-limit";
import { authenticateToken } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate";
import { googleSignInSchema, signInSchema, signUpSchema } from "../validation/auth.schemas";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: { error: "too_many_requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRouter = Router()

authRouter.post("/sign-in", authLimiter, validate(signInSchema), AuthController.signIn)

authRouter.post("/sign-up", authLimiter, validate(signUpSchema), AuthController.signUp)

authRouter.post("/sign-out", AuthController.signOut)

authRouter.post("/google", authLimiter, validate(googleSignInSchema), AuthController.googleLogin)

authRouter.get("/me", authenticateToken, AuthController.authMe)
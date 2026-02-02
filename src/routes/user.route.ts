import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate";
import { userController } from "../controllers/user.controller";
import { updateUserSchema } from "../validation/user.schemas";

export const userRouter = Router();

// Protegido: requer autenticação, permite próprio usuário ou admin
userRouter.get("/:id", authenticateToken, userController.getById.bind(userController));

// Atualização: exige autenticação e só permite o próprio usuário.
userRouter.patch(
  "/:id/location",
  authenticateToken,
  validate(updateUserSchema),
  userController.updateUserLocation.bind(userController)
);

// Atualização: exige autenticação e só permite o próprio usuário.
userRouter.patch(
  "/:id",
  authenticateToken,
  validate(updateUserSchema),
  userController.updateById.bind(userController)
);

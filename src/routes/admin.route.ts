import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/admin.middleware";
import { adminController } from "../controllers/admin.controller";
import { validate } from "../middlewares/validate";
import { adminUpdateUserSchema, adminUpdateClientSchema } from "../validation/admin.schemas";

export const adminRouter = Router();

adminRouter.use(authenticateToken, requireAdmin);

adminRouter.get("/users", adminController.listUsers.bind(adminController));

adminRouter.patch(
  "/users/:id",
  validate(adminUpdateUserSchema),
  adminController.updateUser.bind(adminController)
);

adminRouter.get("/clients", adminController.listClients.bind(adminController));

adminRouter.patch(
  "/clients/:id",
  validate(adminUpdateClientSchema),
  adminController.updateClient.bind(adminController)
);

adminRouter.get("/venues", adminController.listVenues.bind(adminController));

adminRouter.get("/dashboard", adminController.getDashboard.bind(adminController));

adminRouter.get(
  "/videos/recent-errors",
  adminController.getRecentVideoErrors.bind(adminController)
);

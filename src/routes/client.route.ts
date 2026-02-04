import { Router } from "express";
import { clientController } from "../controllers/client.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { requireClient } from "../middlewares/client.middleware";
import { validate } from "../middlewares/validate";
import { createClientSchema, createVenueInstallationSchema, updateClientSchema } from "../validation/client.schemas";

const router = Router();

// Perfil do cliente logado
router.get(
  "/me",
  authenticateToken,
  requireClient,
  clientController.getMe.bind(clientController)
);

router.patch(
  "/me",
  authenticateToken,
  requireClient,
  validate(updateClientSchema),
  clientController.updateMe.bind(clientController)
);

router.get(
  "/me/stats",
  authenticateToken,
  requireClient,
  clientController.getStats.bind(clientController)
);

// Criar novo cliente
router.post(
  "/",
  validate(createClientSchema),
  clientController.createClient.bind(clientController)
);

// Criar instalação de local para um cliente
router.post(
  "/venue-installations/:clientId",
  validate(createVenueInstallationSchema),
  clientController.createVenueInstallation.bind(clientController)
);

export { router as clientRouter };

import { Router } from "express";
import { clientController } from "../controllers/client.controller";
import { validate } from "../middlewares/validate";
import { createClientSchema, createVenueInstallationSchema } from "../validation/client.schemas";

const router = Router();

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

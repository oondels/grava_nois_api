import { Router } from "express";
import { VenueController } from "../controllers/venue.controller";

const quadrasRoute = Router();

/**
 * GET /api/quadras-filiadas
 * 
 * Busca todas as quadras filiadas com filtros opcionais
 * 
 * Query Parameters:
 *   - state?: string - Filtrar por estado
 *   - city?: string - Filtrar por cidade
 *   - countryCode?: string - Filtrar por código de país
 *   - active?: boolean - Filtrar por ativo (true/false)
 *   - postalCode?: string - Filtrar por código postal
 * 
 * @returns {Array<VenueInstallation>} Lista de quadras filiadas
 */
quadrasRoute.get("/", VenueController.getFiliadoVenues);

export { quadrasRoute };

import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { VenueInstallation } from "../models/VenueInstallations";
import { CustomError } from "../types/CustomError";
import { CreateVenueInstallationInput } from "../validation/client.schemas";
import { logger } from "../utils/logger";
import { clientService } from "./client.service";

export class VenueInstallationService {
  private venueRepository: Repository<VenueInstallation>;

  constructor() {
    this.venueRepository = AppDataSource.getRepository(VenueInstallation);
  }

  async createVenueInstallation(clientId: string, data: CreateVenueInstallationInput) {
    try {
      // Verificar se o cliente existe
      await clientService.getClientById(clientId);

      const newVenue = this.venueRepository.create({
        clientId: clientId,
        venueName: data.venueName,
        description: data.description,
        addressLine: data.addressLine,
        countryCode: data.countryCode,
        state: data.state,
        city: data.city,
        postalCode: data.postalCode,
        latitude: data.latitude,
        longitude: data.longitude,
      });

      await this.venueRepository.save(newVenue);

      logger.info("venue-service", `Venue installation created: ${newVenue.id} for client: ${clientId}`);

      return newVenue;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error("venue-service", `Error creating venue installation: ${error}`);
      throw new CustomError("Erro ao criar instalação", 500);
    }
  }

  async getVenuesByClientId(clientId: string) {
    const venues = await this.venueRepository.find({
      where: { clientId }
    });

    return venues;
  }
}

export const venueInstallationService = new VenueInstallationService();

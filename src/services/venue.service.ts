import { AppDataSource } from "../config/database";
import { VenueInstallation } from "../models/VenueInstallations";
import { CustomError } from "../types/CustomError";

interface GetFiliadoVenuesFilters {
  state?: string | null;
  city?: string | null;
  countryCode?: string | null;
  active?: boolean | null;
  postalCode?: string | null;
}

export class VenueService {
  private readonly venueRepository = AppDataSource.getRepository(VenueInstallation);

  async getFiliadoVenues(filters: GetFiliadoVenuesFilters = {}): Promise<VenueInstallation[]> {
    try {
      // Build where conditions dynamically
      const where: any = {
        deletedAt: null, // Soft delete filter
      };

      // Apply optional filters
      if (filters.state) {
        where.state = filters.state;
      }
      if (filters.city) {
        where.city = filters.city;
      }
      if (filters.countryCode) {
        where.countryCode = filters.countryCode;
      }
      if (filters.active !== null && filters.active !== undefined) {
        where.active = filters.active;
      }
      if (filters.postalCode) {
        where.postalCode = filters.postalCode;
      }

      // Query with filters and sorting
      const venues = await this.venueRepository.find({
        where,
        order: {
          venueName: "ASC",
        },
      });

      return venues;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Erro ao buscar quadras filiadas",
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}

export const venueService = new VenueService();

import { Request, Response, NextFunction } from "express";
import { venueService } from "../services/venue.service";

export class VenueController {
  static async getFiliadoVenues(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract optional filters from query params
      const { state, city, countryCode, active, postalCode } = req.query;

      // Parse active as boolean if provided
      const activeFilter = active === undefined || active === null 
        ? undefined 
        : active === "true" || active === "1";

      // Call service with filters
      const venues = await venueService.getFiliadoVenues({
        state: state as string | undefined,
        city: city as string | undefined,
        countryCode: countryCode as string | undefined,
        active: activeFilter,
        postalCode: postalCode as string | undefined,
      });

      // Return standardized response
      res.status(200).json({
        success: true,
        message: "Quadras filiadas obtidas com sucesso",
        data: venues,
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      // Pass error to centralized error handler middleware
      next(error);
    }
  }
}

import { Router, Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { logger } from "../utils/logger";

const quadrasRoute = Router();

quadrasRoute.get("/", async (req: Request, res: Response) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    const result = await queryRunner.query(`
      SELECT
        id, venue_name, state, city, address_line as "addressLine", country_code as "countryCode"
      FROM
        grn_core.venue_installations
      WHERE
        deleted_at IS NULL
      ORDER BY
        venue_name ASC
    `);

    await queryRunner.commitTransaction();
    
    res.status(200).json({
      success: true,
      data: result,
      requestId: (res.locals as any).requestId,
    });
  } catch (error) {
    await queryRunner.rollbackTransaction();
    logger.error("quadras-filiadas", `Erro ao buscar quadras filiadas: ${error}`);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: "Erro ao buscar quadras filiadas"
      },
      requestId: (res.locals as any).requestId,
    });
  } finally {
    await queryRunner.release();
  }
});

export { quadrasRoute };

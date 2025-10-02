import { Router, Request, Response } from "express";
import { AppDataSource } from "../config/database";

const quadrasRoute = Router();

//! TODO: Continuar daqui, adicionar a index.ts e retornar resposta adequada e çor fim vincular com client
quadrasRoute.get("/", async (req: Request, res: Response) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    const result = await queryRunner.query(`
      SELECT
        id, venue_name, state, city, addressLine
      FROM
        grn_core.venue_installations
    `);

    await queryRunner.commitTransaction();
    return res.status(200).json(result);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("Erro ao buscar quadras filiadas:", error);
    res.status(500).json({ message: "Erro ao buscar quadras filiadas" });
    return;
  } finally {
    await queryRunner.release();
  }
});

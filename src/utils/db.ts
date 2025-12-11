import { PoolClient } from "pg";
import { pool } from "../config/pg";
import { logger } from "./logger";

/**
 * Executa uma função dentro de uma transação de banco de dados.
 * Garante que BEGIN, COMMIT e ROLLBACK sejam executados corretamente.
 * 
 * @param fn Função que recebe um client de banco de dados e retorna uma Promise
 * @returns O resultado da função executada
 * @throws Lança o erro original se a transação falhar
 * 
 * @example
 * const result = await withTransaction(async (client) => {
 *   await client.query('INSERT INTO users (name) VALUES ($1)', ['John']);
 *   return { success: true };
 * });
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logger.error('transaction', `Rollback failed: ${rollbackError}`);
    }
    throw error;
  } finally {
    client.release();
  }
}

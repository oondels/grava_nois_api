import { Pool } from "pg";
import "./dotenv";

import postgres from "postgres";
import { preprocess } from "zod";

const tempDbUser = process.env.TEMP_DB_USER || "postgres";
const tempDbPassword = process.env.TEMP_DB_PASSWORD || "postgres";
const tempDbHost = process.env.TEMP_DB_HOST || "localhost";
const tempDbPort = parseInt(process.env.TEMP_DB_PORT || "5432", 10);
const tempDbName = process.env.TEMP_DB_NAME || "postgres";

export const pool = new Pool({
  user: tempDbUser,
  password: tempDbPassword,
  host: tempDbHost,
  port: tempDbPort,
  database: tempDbName,
});

// pool
//   .connect()
//   .then((client) => {
//     console.log(`Conectado ao banco de dados TEMP ${tempDbHost} com sucesso!`)
//     client.release()
//   })
//   .catch((error) => {
//     console.error('Erro ao conectar ao banco TEMP: ', error)
//   })

export const supabaseDb = postgres(process.env.SUPABASE_DATABASE as string, {
  ssl: "require",
});

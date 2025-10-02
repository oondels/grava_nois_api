import path from "path";
import { DataSource } from "typeorm";
import { config } from "./dotenv";
import { Client } from "../models/Clients";
import { VenueInstallation } from "../models/VenueInstallations";
import { Payment } from "../models/Payments";
import { Video } from "../models/Videos";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  synchronize: config.env === 'development', // Keep just in development mode
  logging: false,
  entities: [Client, VenueInstallation, Payment, Video],
  subscribers: [],
  migrations: [path.join(__dirname, '../migrations/*.{ts,js}')],
  migrationsTableName: "grava_nois_migrations",
})
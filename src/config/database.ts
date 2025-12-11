import path from "path";
import { DataSource } from "typeorm";
import { config } from "./dotenv";
import { Client } from "../models/Clients";
import { VenueInstallation } from "../models/VenueInstallations";
import { Payment } from "../models/Payments";
import { Video } from "../models/Videos";
import { User } from "../models/User";
import { UserOauth } from "../models/UserOauth";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  synchronize: false, // NEVER use true - always use migrations
  logging: false,
  entities: [Client, VenueInstallation, Payment, Video, User, UserOauth],
  subscribers: [],
  migrations: [path.join(__dirname, '../migrations/*.{ts,js}')],
  migrationsTableName: "grava_nois_migrations",
})
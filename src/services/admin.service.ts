import { In, Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { CustomError } from "../types/CustomError";
import { Client } from "../models/Clients";
import {
  InstallationStatus,
  PaymentStatus,
  VenueInstallation,
} from "../models/VenueInstallations";
import { Video, VideoStatus } from "../models/Videos";
import {
  AdminUpdateClientInput,
  AdminUpdateUserInput,
} from "../validation/admin.schemas";

export type ListUsersParams = {
  page: number;
  limit: number;
  search?: string;
  role?: string;
};

export type SafeUser = Omit<User, "password">;

type ListClientsParams = {
  page: number;
  limit: number;
  search?: string;
};

type ListVenuesFilters = {
  paymentStatus?: PaymentStatus;
  installationStatus?: InstallationStatus;
  isOnline?: boolean;
  active?: boolean;
};

class AdminService {
  private readonly userRepository: Repository<User>;
  private readonly clientRepository: Repository<Client>;
  private readonly venueRepository: Repository<VenueInstallation>;
  private readonly videoRepository: Repository<Video>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.clientRepository = AppDataSource.getRepository(Client);
    this.venueRepository = AppDataSource.getRepository(VenueInstallation);
    this.videoRepository = AppDataSource.getRepository(Video);
  }

  private sanitizeUser(user: User): SafeUser {
    const { password: _password, ...safeUser } = user as User & { password?: string | null };
    return safeUser;
  }

  async listUsers(params: ListUsersParams): Promise<{ users: SafeUser[]; total: number }> {
    const { page, limit, search, role } = params;
    const qb = this.userRepository
      .createQueryBuilder("user")
      .orderBy("user.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      const normalizedSearch = `%${search.toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(user.email) LIKE :search OR LOWER(user.name) LIKE :search)",
        { search: normalizedSearch }
      );
    }

    if (role) {
      qb.andWhere("user.role = :role", { role });
    }

    const [users, total] = await qb.getManyAndCount();

    return {
      users: users.map((user) => this.sanitizeUser(user)),
      total,
    };
  }

  async updateUser(userId: string, payload: AdminUpdateUserInput): Promise<SafeUser> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new CustomError("Usuário não encontrado", 404);
    }

    if (payload.isActive !== undefined) {
      user.isActive = payload.isActive;
    }

    if (payload.role !== undefined) {
      user.role = payload.role;
    }

    if (payload.name !== undefined) {
      user.name = payload.name;
    }

    if (payload.username !== undefined) {
      user.username = payload.username;
    }

    const updated = await this.userRepository.save(user);
    return this.sanitizeUser(updated);
  }

  async listClients(params: ListClientsParams) {
    const { page, limit, search } = params;
    const qb = this.clientRepository
      .createQueryBuilder("client")
      .orderBy("client.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      const normalizedSearch = `%${search.toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(client.legalName) LIKE :search OR LOWER(client.tradeName) LIKE :search OR LOWER(client.responsibleName) LIKE :search)",
        { search: normalizedSearch }
      );
    }

    const [clients, total] = await qb.getManyAndCount();

    if (!clients.length) {
      return { clients: [], total };
    }

    const clientIds = clients.map((client) => client.id);

    const stats = await this.venueRepository
      .createQueryBuilder("venue")
      .select("venue.clientId", "clientId")
      .addSelect("COUNT(venue.id)", "venueCount")
      .addSelect(
        "SUM(CASE WHEN venue.paymentStatus = :pastDue THEN 1 ELSE 0 END)",
        "pastDueCount"
      )
      .where("venue.clientId IN (:...clientIds)", { clientIds })
      .groupBy("venue.clientId")
      .setParameters({ pastDue: PaymentStatus.PAST_DUE })
      .getRawMany();

    const statsMap = new Map(
      stats.map((row) => [row.clientId, { venueCount: Number(row.venueCount), pastDueCount: Number(row.pastDueCount) }])
    );

    const enrichedClients = clients.map((client) => {
      const stat = statsMap.get(client.id);
      const venueCount = stat?.venueCount ?? 0;
      const hasPastDue = (stat?.pastDueCount ?? 0) > 0;

      return {
        ...client,
        venueCount,
        generalStatus: hasPastDue ? "attention" : "ok",
      };
    });

    return {
      clients: enrichedClients,
      total,
    };
  }

  async updateClient(clientId: string, patch: AdminUpdateClientInput) {
    const client = await this.clientRepository.findOne({ where: { id: clientId } });

    if (!client) {
      throw new CustomError("Cliente não encontrado", 404);
    }

    if (patch.legalName !== undefined) {
      client.legalName = patch.legalName;
    }

    if (patch.tradeName !== undefined) {
      client.tradeName = patch.tradeName;
    }

    if (patch.responsibleName !== undefined) {
      client.responsibleName = patch.responsibleName;
    }

    if (patch.responsibleEmail !== undefined) {
      client.responsibleEmail = patch.responsibleEmail;
    }

    if (patch.responsiblePhone !== undefined) {
      client.responsiblePhone = patch.responsiblePhone;
    }

    const updated = await this.clientRepository.save(client);
    return updated;
  }

  async listVenues(filters: ListVenuesFilters) {
    const qb = this.venueRepository
      .createQueryBuilder("venue")
      .leftJoinAndSelect("venue.client", "client")
      .orderBy("venue.createdAt", "DESC");

    if (filters.paymentStatus) {
      qb.andWhere("venue.paymentStatus = :paymentStatus", {
        paymentStatus: filters.paymentStatus,
      });
    }

    if (filters.installationStatus) {
      qb.andWhere("venue.installationStatus = :installationStatus", {
        installationStatus: filters.installationStatus,
      });
    }

    if (filters.isOnline !== undefined) {
      qb.andWhere("venue.isOnline = :isOnline", { isOnline: filters.isOnline });
    }

    if (filters.active !== undefined) {
      qb.andWhere("venue.active = :active", { active: filters.active });
    }

    return qb.getMany();
  }

  async getDashboardStats() {
    const [userCountsRaw, totalClients, venueCountsRaw, totalVideos] = await Promise.all([
      this.userRepository
        .createQueryBuilder("user")
        .select("SUM(CASE WHEN user.isActive = true THEN 1 ELSE 0 END)", "active")
        .addSelect("SUM(CASE WHEN user.isActive = false THEN 1 ELSE 0 END)", "inactive")
        .getRawOne<{ active: string | null; inactive: string | null }>(),
      this.clientRepository.count(),
      this.venueRepository
        .createQueryBuilder("venue")
        .select("SUM(CASE WHEN venue.isOnline = true THEN 1 ELSE 0 END)", "online")
        .addSelect("SUM(CASE WHEN venue.isOnline = false THEN 1 ELSE 0 END)", "offline")
        .getRawOne<{ online: string | null; offline: string | null }>(),
      this.videoRepository.count(),
    ]);

    const totalUsers = {
      active: Number(userCountsRaw?.active ?? 0),
      inactive: Number(userCountsRaw?.inactive ?? 0),
    };

    const totalVenues = {
      online: Number(venueCountsRaw?.online ?? 0),
      offline: Number(venueCountsRaw?.offline ?? 0),
    };

    return {
      totalUsers,
      totalClients,
      totalVenues,
      totalVideos,
    };
  }

  async getRecentVideoErrors() {
    return this.videoRepository.find({
      where: {
        status: In([VideoStatus.FAILED, VideoStatus.EXPIRED]),
      },
      order: { createdAt: "DESC" },
      take: 50,
      relations: ["client", "venue"],
    });
  }
}

export const adminService = new AdminService();

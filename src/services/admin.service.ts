import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { CustomError } from "../types/CustomError";
import { AdminUpdateUserInput } from "../validation/admin.schemas";

export type ListUsersParams = {
  page: number;
  limit: number;
  search?: string;
  role?: string;
};

export type SafeUser = Omit<User, "password">;

class AdminService {
  private readonly userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
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
}

export const adminService = new AdminService();

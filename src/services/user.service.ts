import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { CustomError } from "../types/CustomError";

export type UpdateUserInput = {
  name?: string;
  username?: string | null;
  avatarUrl?: string | null;
};

class UserService {
  private readonly userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  async getById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new CustomError("Usuário não encontrado", 404);
    }
    return user;
  }

  async updateById(userId: string, patch: UpdateUserInput): Promise<User> {
    const user = await this.getById(userId);

    const hasAnyChange =
      patch.name !== undefined ||
      patch.username !== undefined ||
      patch.avatarUrl !== undefined;

    if (!hasAnyChange) {
      return user;
    }

    if (patch.name !== undefined && patch.name !== user.name) {
      user.name = patch.name;
    }

    if (patch.username !== undefined && patch.username !== user.username) {
      user.username = patch.username;
    }

    if (patch.avatarUrl !== undefined && patch.avatarUrl !== user.avatarUrl) {
      user.avatarUrl = patch.avatarUrl;
    }

    return await this.userRepository.save(user);
  }
}

export const userService = new UserService();

import { CustomError } from "../types/CustomError";
import { config } from "../config/dotenv";
import { User } from "../models/User";
import { UserOauth } from "../models/UserOauth";
import { AppDataSource } from "../config/database";
import { randomUUID } from "crypto";
import { Repository } from "typeorm";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { redisClient } from "../config/redis";

class AuthService {
  private readonly UserDataSource: Repository<User>;
  private readonly UserOauthDataSource: Repository<UserOauth>;
  private readonly googleClient: OAuth2Client;
  private readonly refreshTokenTtlSeconds = 432000;
  private readonly refreshTokenPrefix = "rt:";

  constructor() {
    this.UserDataSource = AppDataSource.getRepository(User);
    this.UserOauthDataSource = AppDataSource.getRepository(UserOauth);
    this.googleClient = new OAuth2Client(config.google_client_id);
  }

  async signIn(email: string, password: string): Promise<Omit<User, 'password'>> {
    try {
      const user = await this.UserDataSource.findOne({ where: { email } });
      if (!user) throw new CustomError("Credenciais Inválidas", 404);

      if (!user.password) {
        throw new CustomError("Esta conta deve ser acessada via login social (ex: Google).", 400);
      }

      if (user.isActive === false) {
        throw new CustomError("Usuário inativo.", 403);
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) throw new CustomError("Credenciais Inválidas", 401);

      // Atualiza last_login_at
      user.lastLoginAt = new Date();
      await this.UserDataSource.save(user);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...safeUser } = user as any;

      return safeUser;
    } catch (error) {
      if (error instanceof CustomError) throw error;

      throw new CustomError("Erro desconhecido ao autenticar", 500);
    }
  }

  async signUp(email: string, password: string, name: string): Promise<Omit<User, 'password'>> {
    try {
      const existingUser = await this.UserDataSource.findOne({ where: { email } });
      console.log(existingUser);
      
      // usuário existe e é OAuth (password = null)
      if (existingUser && !existingUser.password) {
        throw new CustomError(
          "Esta conta foi criada usando login social (ex: Google). Acesse usando 'Continuar com Google'.",
          400
        );
      }

      // usuário existe e tem senha
      if (existingUser) {
        throw new CustomError("Email já cadastrado.", 409);
      }

      const hashedPassword = await bcrypt.hash(password, config.bcrypt_salt_rounds);

      const newUser = this.UserDataSource.create({
        email,
        password: hashedPassword,
        name: name,
        emailVerified: false,
        role: "common",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await this.UserDataSource.save(newUser);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...safeUser } = newUser as any;

      return safeUser;
    } catch (error) {
      if (error instanceof CustomError) throw error;

      throw new CustomError("Erro desconhecido ao registrar usuário", 500);
    }
  }

  async getUser(id: string) {
    try {
      const user = await this.UserDataSource.findOne({
        where: { id: id },
        relations: ["oauth"],
      });

      if (!user) {
        throw new CustomError("Usuário não encontrado.", 404);
      }

      // Remover password
      const { password: _, ...safeUser } = user as any;

      return {
        id: user.id,
        email: user.email,
        username: user.username || "",
        name: user.name || "",
        emailVerified: user.emailVerified,
        role: user.role,
        oauthProvider: user.oauth ? user.oauth.oauthProvider : null,
        avatarUrl: user.avatarUrl ? user.avatarUrl : null,
        country: user.country ? user.country : null,
        state: user.state ? user.state : null,
        city: user.city ? user.city : null,
        cep: user.cep ? user.cep : null,
        quadrasFiliadas: user.quadrasFiliadas ? user.quadrasFiliadas : null,
      };

    } catch (error) {
      if (error instanceof CustomError) throw error;

      throw new CustomError("Erro desconhecido ao obter usuário autenticado", 500);
    }
  }

  /**
   * Google OAuth Login
   * Verifies Google ID token, finds or creates user, and returns user object
   * @param idToken - Google ID token from the client
   * @returns User object without password
   */
  async googleLogin(idToken: string): Promise<Omit<User, 'password'>> {
    try {
      // Step 1: Verify Google token and extract user information
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: config.google_client_id,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new CustomError("Token do Google inválido", 401);
      }

      const { sub: googleId, email, name, given_name, email_verified, picture } = payload as any;

      if (!email || !googleId) {
        throw new CustomError("Informações insuficientes do Google", 401);
      }

      // Evita vincular/registrar com e-mail não verificado.
      if (Boolean(email_verified) !== true) {
        throw new CustomError("Email do Google não verificado.", 401);
      }

      const resolvedName = String(name || given_name || String(email).split("@")[0] || "Usuário");

      // Step 2: Check if user exists via OAuth link (grn_users_oauth)
      const existingOauth = await this.UserOauthDataSource.findOne({
        where: {
          oauthProvider: "google",
          oauthId: googleId,
        },
        relations: ["user"],
      });

      if (existingOauth) {
        console.log("Usuario existe em OAUTH");
        
        // Scenario 1: User exists and is linked to Google
        const user = existingOauth.user;

        if (user.isActive === false) {
          throw new CustomError("Usuário inativo.", 403);
        }

        // Update name and avatar if not set
        if (user.name !== resolvedName) {
          user.name = resolvedName;
        }
        if (user.avatarUrl === null && picture) {
          user.avatarUrl = picture;
        }

        // Update last_login_at
        user.lastLoginAt = new Date();
        await this.UserDataSource.save(user);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...safeUser } = user as any;
        return safeUser;
      }

      // Step 3: Check if user exists by email
      const existingUser = await this.UserDataSource.findOne({
        where: { email },
        relations: ["oauth"],
      });

      if (existingUser) {
        console.log("User existe por email");
        
        // Scenario 2: User exists but not linked to Google
        if (existingUser.isActive === false) {
          throw new CustomError("Usuário inativo.", 403);
        }

        // Caso já exista um vínculo OAuth (outro provedor) e a tabela tenha user_id único,
        // evitamos estourar constraint silenciosamente.
        if (existingUser.oauth) {
          if (existingUser.oauth.oauthProvider !== "google") {
            throw new CustomError(
              "Esta conta já está vinculada a outro provedor OAuth.",
              409
            );
          }

          existingUser.oauth.oauthId = googleId;
          await this.UserOauthDataSource.save(existingUser.oauth);
        } else {
          // Create OAuth link
          const newOauthLink = this.UserOauthDataSource.create({
            userId: existingUser.id,
            oauthProvider: "google",
            oauthId: googleId,
            createdAt: new Date(),
          });

          await this.UserOauthDataSource.save(newOauthLink);
        }

        // Update last_login_at
        existingUser.lastLoginAt = new Date();
        await this.UserDataSource.save(existingUser);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...safeUser } = existingUser as any;
        return safeUser;
      }

      // Scenario 3: New user - create both User and UserOauth records
      console.log("Novo usuario");
      
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Create new user
        const newUser = this.UserDataSource.create({
          email,
          password: null, // OAuth users don't have password
          name: resolvedName,
          avatarUrl: picture || null,
          emailVerified: true,
          role: "common",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        });

        const savedUser = await queryRunner.manager.save(User, newUser);

        // Create OAuth link
        const newOauthLink = this.UserOauthDataSource.create({
          userId: savedUser.id,
          oauthProvider: "google",
          oauthId: googleId,
          createdAt: new Date(),
        });

        await queryRunner.manager.save(UserOauth, newOauthLink);

        await queryRunner.commitTransaction();

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...safeUser } = savedUser as any;
        return safeUser;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      if (error instanceof CustomError) throw error;

      console.error("Google login error:", error);
      throw new CustomError("Erro ao autenticar com Google", 500);
    }
  }

  async generateRefreshToken(userId: string): Promise<string> {
    try {
      const token = randomUUID();
      const key = `${this.refreshTokenPrefix}${token}`;

      await redisClient.set(key, userId, { EX: this.refreshTokenTtlSeconds });
      return token;
    } catch (error) {
      throw new CustomError("Erro ao gerar refresh token", 500);
    }
  }

  async refreshToken(token: string): Promise<{ userId: string; refreshToken: string }> {
    try {
      const key = `${this.refreshTokenPrefix}${token}`;
      const userId = await redisClient.get(key);

      if (!userId) {
        throw new CustomError("Refresh token inválido", 401);
      }

      const newToken = randomUUID();
      const newKey = `${this.refreshTokenPrefix}${newToken}`;

      await redisClient.set(newKey, userId, { EX: this.refreshTokenTtlSeconds });
      await redisClient.del(key);

      return { userId, refreshToken: newToken };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError("Erro ao validar refresh token", 500);
    }
  }

  async signOut(token: string): Promise<void> {
    try {
      const key = `${this.refreshTokenPrefix}${token}`;
      await redisClient.del(key);
    } catch (error) {
      throw new CustomError("Erro ao invalidar refresh token", 500);
    }
  }
}

export const authService = new AuthService();

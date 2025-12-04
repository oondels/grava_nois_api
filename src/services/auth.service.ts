import { makeSupabase, flushSupabaseCookies } from "../config/supabase";
import { CustomError } from "../types/CustomError";
import { config } from "../config/dotenv";
import { User } from "../models/User";
import { UserOauth } from "../models/UserOauth";
import { AppDataSource } from "../config/database";
import { randomUUID } from "crypto";
import { Repository } from "typeorm";
import bcrypt from "bcrypt";

class AuthService {
  private readonly UserDataSource: Repository<User>;
  private readonly UserOauthDataSource: Repository<UserOauth>;

  constructor() {
    this.UserDataSource = AppDataSource.getRepository(User);
    this.UserOauthDataSource = AppDataSource.getRepository(UserOauth);
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

  async signUp(email: string, password: string): Promise<User> {
    try {

    } catch (error) {
      if (error instanceof CustomError) throw error;

      throw new CustomError("Erro desconhecido ao registrar usuário", 500);
    }
  }

  async signOut(req: Request, res: Response): Promise<void> {
    const supabase = makeSupabase(req, res);
    await supabase.auth.signOut();

    flushSupabaseCookies(res);
  }

  async getUser(req: Request, res: Response) {
    const supabase = makeSupabase(req, res);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) throw new CustomError("Não autorizado ou usuário não encontrado!", 401);

    const { data: profile, error: profileError } = await supabase.from("grn_auth.profiles").select("*").eq("id", user.id).single();

    // Profile pode não existir para usuários novos
    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Profile fetch error:", profileError);
    }

    return { user, profile: profile || null };
  }

  async googleLogin(req: Request, res: Response) {
    const supabase = makeSupabase(req, res);

    // Usa BACKEND_PUBLIC_URL, com fallback dinâmico a partir do host atual
    const dynamicBase = `${req.protocol}://${req.get("host")}`;
    const base = config.backend_public_url || dynamicBase;
    const url_callback = `${base}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: url_callback, // backend callback
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (error) throw new CustomError(error.message, 401);

    return data;
  }

  async googleCallback(req: Request, res: Response, code: string) {
    const supabase = makeSupabase(req, res);

    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error: any) {
      throw new CustomError("Falha ao trocar código por sessão: " + error.message, 401);
    }
  }
}

export const authService = new AuthService();
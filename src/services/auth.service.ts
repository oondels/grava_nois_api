import { makeSupabase, flushSupabaseCookies } from "../config/supabase";
import { Request, Response } from "express"
import { CustomError } from "../types/CustomError";
import { config } from "../config/dotenv"

export const AuthService = {
  async signIn(email: string, password: string, req: Request, res: Response): Promise<void> {
    const supabase = makeSupabase(req, res);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new CustomError(error.message, 401);

      if (!data.user) {
        throw new CustomError("Falha na autenticação", 401);
      }

      // Envia cookies antes de finalizar
      flushSupabaseCookies(res);
    } catch (error) {
      if (error instanceof CustomError) throw error;

      throw new CustomError("Erro desconhecido ao autenticar", 500);
    }

  },

  async signUp(email: string, password: string, req: Request, res: Response): Promise<void> {
    const supabase = makeSupabase(req, res);
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) throw new CustomError(error.message, 401);
  },

  async signOut(req: Request, res: Response): Promise<void> {
    const supabase = makeSupabase(req, res);
    await supabase.auth.signOut();

    flushSupabaseCookies(res);
  },

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
  },

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
  },

  async googleCallback(req: Request, res: Response, code: string) {
    const supabase = makeSupabase(req, res);

    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error: any) {
      throw new CustomError("Falha ao trocar código por sessão: " + error.message, 401);
    }
  }
}
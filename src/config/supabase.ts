import { config } from "./dotenv";
import { createClient } from "@supabase/supabase-js";
import { Request, Response } from "express";
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { serialize as serializeCookie, parse as parseCookie } from "cookie";

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

export function makeSupabase(req: Request, res: Response) {
  return createServerClient(config.supabaseUrl!, config.supabasePublishableKey!, {
    cookies: {
      getAll() {
        const parsed = req.headers.cookie ? parseCookie(req.headers.cookie) : {};
        const arr = Object.entries(parsed).map(([name, value]) => ({ name, value: String(value ?? "") }));

        if (!arr.length) {
          console.error("No cookies found in request");
        }

        return arr.length ? arr : null;
      },
      setAll(cookies) {
        const sameSiteOpt = (config.cookie_same_site?.toLowerCase?.() as any) || "lax";
        const normalized = cookies.map(({ name, value, options }) => ({
          name,
          value,
          options: {
            path: "/",
            httpOnly: true,
            secure: config.env === "production",
            sameSite: sameSiteOpt,
            ...options,
          } as any,
        }));
        res.locals._sb_cookies = ((res.locals._sb_cookies as any[]) || []).concat(normalized);
      },
    },
  });
}

export function flushSupabaseCookies(res: Response) {
  const pending = (res.locals._sb_cookies as { name: string; value: string; options: any }[]) || [];
  if (!pending.length) return;
  pending.forEach(({ name, value, options }) => {
    res.append("Set-Cookie", serializeCookie(name, value, options));
  });
  res.locals._sb_cookies = [];
}
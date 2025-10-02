import { config } from "./dotenv";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Constants?.expoConfig?.extra?.SUPABASE_URL as
  | string
  | undefined;
const supabaseKey = Constants?.expoConfig?.extra?.SUPABASE_KEY as
  | string
  | undefined;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Faltan SUPABASE_URL o SUPABASE_KEY en la configuración. Revisa tu .env y app.config.js",
  );
}

/**
 * Initializes and exports a Supabase client instance.
 *
 * The `supabase` constant is created using the `createClient` function,
 * which requires a Supabase URL and a Supabase Key for authentication.
 * These values should be securely provided and configured in the environment.
 *
 * @constant
 */
export const supabase = createClient(
  supabaseUrl as string,
  supabaseKey as string,
);

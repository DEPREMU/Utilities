import env from "../env.ts";
import chalk from "chalk";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = env.SUPABASE_URL as string | undefined;
const supabaseKey = env.SUPABASE_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    chalk.red(
      "SUPABASE_URL or SUPABASE_KEY is not defined in environment variables",
    ),
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

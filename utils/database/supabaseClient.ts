import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Constants?.expoConfig?.extra?.SUPABASE_URL;
const supabaseKey = Constants?.expoConfig?.extra?.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };

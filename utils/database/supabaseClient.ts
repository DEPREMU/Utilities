import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hxhofjcblsextrtjbxtw.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aG9mamNibHNleHRydGpieHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYxODQxNjQsImV4cCI6MjA0MTc2MDE2NH0.meKflLsd7eWJzBmhLpmUNlozif2Mt527Tqm4TBqBFq0";

const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };

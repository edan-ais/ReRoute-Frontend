import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// This will still build even if envs are not present at build-time;
// you just won't be able to fetch live data until they're set.
export const supabase =
  url && anonKey
    ? createClient(url, anonKey)
    : (null as any);

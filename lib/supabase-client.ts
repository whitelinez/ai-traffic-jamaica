"use client";
/**
 * lib/supabase-client.ts — Browser-side Supabase singleton.
 * Ported from src/core/supabase.js. Import this in Client Components only.
 * Server Components use lib/supabase-server.ts instead.
 *
 * NOTE: No throw at module scope — Next.js evaluates modules during static
 * prerender even for "use client" files. The client is created with empty
 * strings when env vars are absent (e.g. old Vercel project, CI without env)
 * and will simply fail at the first real network call.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Single instance — createClient is safe to call at module level on the client.
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { flowType: "pkce" },
});

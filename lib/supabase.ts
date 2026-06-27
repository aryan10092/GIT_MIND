export { getSupabaseAdmin, getSupabaseServer } from "@/lib/supabase/admin";
export { createBrowserSupabaseClient } from "@/lib/supabase/client";
export { createServerSupabaseClient } from "@/lib/supabase/server";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

/** @deprecated Use createBrowserSupabaseClient() */
export function getSupabaseBrowser() {
  return createBrowserSupabaseClient();
}

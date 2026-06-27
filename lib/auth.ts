import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAuthUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function verifyRepoAccess(
  userId: string,
  repoId: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data: repo } = await supabase
    .from("repos")
    .select("user_id")
    .eq("id", repoId)
    .maybeSingle();

  return repo?.user_id === userId;
}

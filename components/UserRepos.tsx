"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Repo } from "@/lib/types";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

export default function UserRepos() {
  const [user, setUser] = useState<User | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    async function load() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("repos")
        .select("*")
        .order("indexed_at", { ascending: false });

      setRepos((data as Repo[] | null) ?? []);
      setLoading(false);
    }
   console.log("userreposs",data)
    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return null;
  }


  if (repos.length === 0) {
    return (
      <div className="mt-12 w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-2 font-medium">Your repositories</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No indexed repos yet. Analyze your first repository above.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12 w-full max-w-2xl">
      <h2 className="mb-4 text-lg font-medium">Your repositories</h2>
      <ul className="space-y-3">
        {repos.map((repo) => (
          <li key={repo.id}>
            <Link
              href={`/repo/${repo.id}`}
              className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4 transition hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"
            >
              <div>
                <p className="font-medium">
                  {repo.owner}/{repo.name}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {repo.file_count} files · {repo.chunk_count} chunks ·{" "}
                  {formatDate(repo.indexed_at)}
                </p>
              </div>
              <span className="text-sm text-emerald-600">Open →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

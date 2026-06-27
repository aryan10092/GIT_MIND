import { notFound, redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import RepoWorkspace from "@/components/RepoWorkspace";
import { getAuthUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { FileChunk, Repo } from "@/lib/types";

type PageProps = {
  params: Promise<{ id: string }>;
};

function getLanguageBreakdown(paths: string[]) {
  const counts = new Map<string, number>();

  for (const path of paths) {
    const ext = path.includes(".") ? (path.split(".").pop() ?? "other") : "other";
    counts.set(ext, (counts.get(ext) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
}

export default async function RepoPage({ params }: PageProps) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/");
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: repo, error: repoError } = await supabase
    .from("repos")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (repoError || !repo) {
    notFound();
  }

  const typedRepo = repo as Repo;

  const { data: chunks } = await supabase
    .from("file_chunks")
    .select("path")
    .eq("repo_id", id);

  const uniquePaths = [
    ...new Set(
      (chunks as Pick<FileChunk, "path">[] | null)?.map((chunk) => chunk.path) ??
        [],
    ),
  ];
  const languages = getLanguageBreakdown(uniquePaths);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <AppHeader
        maxWidth="6xl"
        subtitle={
          <>
            <span className="hidden text-zinc-400 sm:inline">/</span>
            <a
              href={typedRepo.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-sm text-zinc-600 hover:text-emerald-600 dark:text-zinc-400 sm:inline"
            >
              {typedRepo.owner}/{typedRepo.name}
            </a>
          </>
        }
      />

      <RepoWorkspace
        repo={typedRepo}
        uniquePaths={uniquePaths}
        languages={languages}
      />
    </div>
  );
}

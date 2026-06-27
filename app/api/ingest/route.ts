import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { chunkFiles } from "@/lib/chunker";
import { embedTexts, formatChunkForEmbedding } from "@/lib/embeddings";
import { fetchPublicRepo } from "@/lib/github";
import { parseRepoInput } from "@/lib/parse-repo-url";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { IngestResult } from "@/lib/types";

export const maxDuration = 300;

const EMBED_BATCH_SIZE = 12;
const INSERT_BATCH_SIZE = 50;

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sign in required to index repositories." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { url?: string };
    const parsed = parseRepoInput(body.url ?? "");

    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid repository URL. Use owner/repo or a GitHub URL." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const fetched = await fetchPublicRepo(parsed.owner, parsed.name);
    const chunks = chunkFiles(
      fetched.files.map((file) => ({
        path: file.path,
        content: file.content,
      })),
    );

    const { data: existing } = await supabase
      .from("repos")
      .select("id")
      .eq("user_id", user.id)
      .eq("owner", parsed.owner)
      .eq("name", parsed.name)
      .maybeSingle();

    let repoId = existing?.id;

    if (repoId) {
      await supabase.from("file_chunks").delete().eq("repo_id", repoId);

      const { error: updateError } = await supabase
        .from("repos")
        .update({
          github_url: parsed.githubUrl,
          default_branch: fetched.defaultBranch,
          file_count: fetched.files.length,
          chunk_count: chunks.length,
          indexed_at: new Date().toISOString(),
          architecture_summary: null,
          mermaid_diagram: null,
          architecture_generated_at: null,
          health_suggestions: null,
          health_generated_at: null,
        })
        .eq("id", repoId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("repos")
        .insert({
          user_id: user.id,
          owner: parsed.owner,
          name: parsed.name,
          github_url: parsed.githubUrl,
          default_branch: fetched.defaultBranch,
          file_count: fetched.files.length,
          chunk_count: chunks.length,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      repoId = inserted.id;
    }

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const texts = batch.map((chunk) =>
        formatChunkForEmbedding(chunk.path, chunk.content),
      );

      const embeddings = await embedTexts(texts, EMBED_BATCH_SIZE);

      const rows = batch.map((chunk, index) => ({
        repo_id: repoId,
        path: chunk.path,
        content: chunk.content,
        chunk_index: chunk.chunkIndex,
        embedding: embeddings[index],
      }));

      for (let j = 0; j < rows.length; j += INSERT_BATCH_SIZE) {
        const insertBatch = rows.slice(j, j + INSERT_BATCH_SIZE);
        const { error: chunkError } = await supabase
          .from("file_chunks")
          .insert(insertBatch);

        if (chunkError) throw chunkError;
      }
    }

    const result: IngestResult = {
      id: repoId!,
      owner: parsed.owner,
      name: parsed.name,
      githubUrl: parsed.githubUrl,
      defaultBranch: fetched.defaultBranch,
      fileCount: fetched.files.length,
      chunkCount: chunks.length,
      indexedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to ingest repository.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

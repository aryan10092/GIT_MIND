import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getAuthUser, verifyRepoAccess } from "@/lib/auth";
import {
  buildArchitectureContext,
  formatArchitecturePrompt,
  parseArchitectureResponse,
} from "@/lib/architecture";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

type ArchitectureRequest = {
  repoId?: string;
  refresh?: boolean;
};

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Missing GROQ_API_KEY in environment." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as ArchitectureRequest;
    const { repoId, refresh = false } = body;

    if (!repoId) {
      return NextResponse.json({ error: "Missing repoId." }, { status: 400 });
    }

    const hasAccess = await verifyRepoAccess(user.id, repoId);

    if (!hasAccess) {
      return NextResponse.json({ error: "Repository not found." }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();

    const { data: repo, error: repoError } = await supabase
      .from("repos")
      .select(
        "owner, name, indexed_at, architecture_summary, mermaid_diagram, architecture_generated_at",
      )
      .eq("id", repoId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (repoError || !repo) {
      return NextResponse.json({ error: "Repository not found." }, { status: 404 });
    }

    if (
      !refresh &&
      repo.architecture_summary &&
      repo.mermaid_diagram &&
      repo.architecture_generated_at
    ) {
      return NextResponse.json({
        summary: repo.architecture_summary,
        mermaid: repo.mermaid_diagram,
        cached: true,
        generatedAt: repo.architecture_generated_at,
      });
    }

    const { data: chunks } = await supabase
      .from("file_chunks")
      .select("path")
      .eq("repo_id", repoId);

    const paths = [...new Set(chunks?.map((chunk) => chunk.path) ?? [])];
    const context = await buildArchitectureContext(repoId, paths);
    const prompt = formatArchitecturePrompt(repo.owner, repo.name, context);

    const { text } = await generateText({
      model: groq("openai/gpt-oss-20b"),
      system: `You analyze GitHub repositories. Return ONLY valid JSON with this shape:
{
  "summary": "2-4 short paragraphs in markdown describing stack, structure, and main components",
  "mermaid": "a valid mermaid flowchart TD diagram (max 12 nodes) showing architecture"
}
Use simple node labels without special characters. Base everything on the provided context only.`,
      prompt,
    });

    const { summary, mermaid } = parseArchitectureResponse(text);
    const generatedAt = new Date().toISOString();

    await supabase
      .from("repos")
      .update({
        architecture_summary: summary,
        mermaid_diagram: mermaid,
        architecture_generated_at: generatedAt,
      })
      .eq("id", repoId)
      .eq("user_id", user.id);

    return NextResponse.json({
      summary,
      mermaid,
      cached: false,
      generatedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate architecture.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getAuthUser, verifyRepoAccess } from "@/lib/auth";
import { computeHealth } from "@/lib/health";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const repoId = searchParams.get("repoId");

    if (!repoId) {
      return NextResponse.json({ error: "Missing repoId." }, { status: 400 });
    }

    const hasAccess = await verifyRepoAccess(user.id, repoId);

    if (!hasAccess) {
      return NextResponse.json({ error: "Repository not found." }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();

    const { data: repo } = await supabase
      .from("repos")
      .select("file_count, health_suggestions, health_generated_at, indexed_at")
      .eq("id", repoId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!repo) {
      return NextResponse.json({ error: "Repository not found." }, { status: 404 });
    }

    const { data: chunks } = await supabase
      .from("file_chunks")
      .select("path")
      .eq("repo_id", repoId);

    const paths = [...new Set(chunks?.map((chunk) => chunk.path) ?? [])];
    const health = computeHealth(paths, repo.file_count);

    const suggestionsFresh =
      repo.health_suggestions &&
      repo.health_generated_at &&
      repo.indexed_at &&
      repo.health_generated_at >= repo.indexed_at;

    return NextResponse.json({
      ...health,
      suggestions: suggestionsFresh ? repo.health_suggestions : null,
      suggestionsGeneratedAt: suggestionsFresh ? repo.health_generated_at : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to compute health.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    const body = (await request.json()) as { repoId?: string };
    const { repoId } = body;

    if (!repoId) {
      return NextResponse.json({ error: "Missing repoId." }, { status: 400 });
    }

    const hasAccess = await verifyRepoAccess(user.id, repoId);

    if (!hasAccess) {
      return NextResponse.json({ error: "Repository not found." }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();

    const { data: repo } = await supabase
      .from("repos")
      .select("owner, name, file_count")
      .eq("id", repoId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!repo) {
      return NextResponse.json({ error: "Repository not found." }, { status: 404 });
    }

    const { data: chunks } = await supabase
      .from("file_chunks")
      .select("path")
      .eq("repo_id", repoId);

    const paths = [...new Set(chunks?.map((chunk) => chunk.path) ?? [])];
    const health = computeHealth(paths, repo.file_count);
    const failedChecks = health.checks.filter((check) => !check.passed);

    const { text: suggestions } = await generateText({
      model: groq("openai/gpt-oss-20b"),
      system:
        "You are a helpful engineering advisor. Give exactly 3 short, actionable improvements as a numbered markdown list. Be specific and practical.",
      prompt: `Repository: ${repo.owner}/${repo.name}
Health score: ${health.score}/${health.maxScore}
Missing items:
${failedChecks.map((check) => `- ${check.label}: ${check.tip}`).join("\n") || "- None, suggest general maintainability improvements."}`,
    });

    const generatedAt = new Date().toISOString();

    await supabase
      .from("repos")
      .update({
        health_suggestions: suggestions,
        health_generated_at: generatedAt,
      })
      .eq("id", repoId)
      .eq("user_id", user.id);

    return NextResponse.json({
      ...health,
      suggestions,
      suggestionsGeneratedAt: generatedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate health suggestions.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

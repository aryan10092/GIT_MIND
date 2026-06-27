import { groq } from "@ai-sdk/groq";
import { streamText, type ModelMessage } from "ai";
import { NextResponse } from "next/server";
import { getAuthUser, verifyRepoAccess } from "@/lib/auth";
import { buildContext, buildSystemPrompt, getUniqueSources } from "@/lib/rag";
import { searchFileChunks } from "@/lib/search";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

type ChatRequest = {
  repoId?: string;
  messages?: { role: "user" | "assistant"; content: string }[];
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

    const body = (await request.json()) as ChatRequest;
    const { repoId, messages = [] } = body;

    if (!repoId) {
      return NextResponse.json({ error: "Missing repoId." }, { status: 400 });
    }

    const hasAccess = await verifyRepoAccess(user.id, repoId);

    if (!hasAccess) {
      return NextResponse.json({ error: "Repository not found." }, { status: 404 });
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    if (!lastUserMessage?.content.trim()) {
      return NextResponse.json(
        { error: "Missing user message." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: repo, error: repoError } = await supabase
      .from("repos")
      .select("owner, name")
      .eq("id", repoId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (repoError || !repo) {
      return NextResponse.json({ error: "Repository not found." }, { status: 404 });
    }

    const chunks = await searchFileChunks(repoId, lastUserMessage.content);
    const sources = getUniqueSources(chunks);
    const context = buildContext(chunks);
    const searchMode = chunks.some((chunk) => chunk.source === "vector" || chunk.source === "hybrid")
      ? "hybrid"
      : "keyword";

    const modelMessages: ModelMessage[] = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const result = streamText({
      model: groq("llama-3.1-8b-instant"),
      system: buildSystemPrompt(repo.owner, repo.name, context),
      messages: modelMessages,
    });

    const response = result.toTextStreamResponse();
    const headers = new Headers(response.headers);

    headers.set("X-GitMind-Sources", JSON.stringify(sources));
    headers.set("X-GitMind-Search", searchMode);
    headers.set(
      "Access-Control-Expose-Headers",
      "X-GitMind-Sources, X-GitMind-Search",
    );

    return new Response(response.body, { headers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate response.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

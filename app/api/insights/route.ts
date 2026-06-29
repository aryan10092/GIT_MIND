import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import {
  buildDeveloperPrompt,
  parseDeveloperAiResponse,
} from "@/lib/developer-ai";
import { computeDeveloperScore } from "@/lib/developer-score";
import {
  fetchDeveloperProfile,
  getTopLanguages,
  parseGitHubUsername,
} from "@/lib/github-profile";
import type { DeveloperInsightsResult } from "@/lib/types/developer-insights";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Missing GROQ_API_KEY in environment." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as { username?: string };
    const username = parseGitHubUsername(body.username ?? "");

    if (!username) {
      return NextResponse.json(
        { error: "Enter a valid GitHub username or profile URL." },
        { status: 400 },
      );
    }

    const { profile, repos } = await fetchDeveloperProfile(username);
    const languages = getTopLanguages(repos);
    const { score, breakdown } = computeDeveloperScore(profile, repos);

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      system: `You analyze public GitHub developer profiles. Return ONLY valid JSON:
{
  "strengths": ["3-5 short bullets based only on provided data"],
  "improvements": ["3-5 constructive suggestions grounded in the data"],
  "persona": "2-3 sentence developer persona paragraph",
  "resumeSummary": "3-4 sentence professional summary suitable for LinkedIn",
  "repoInsights": [
    {
      "name": "repo-name",
      "documentation": 1-10,
      "architecture": 1-10,
      "maintainability": 1-10,
      "complexity": 1-10,
      "summary": "2-3 sentences about the repo based only on metadata"
    }
  ]
}
Rules:
- Use ONLY the provided GitHub metadata
- Do not invent employers, degrees, or private work
- Include one repoInsights entry per listed repository
- Ratings should reflect description, activity, size, stars, topics, and maintenance signals`,
      prompt: buildDeveloperPrompt(profile, repos, score, languages),
    });

    const ai = parseDeveloperAiResponse(text);

    const result: DeveloperInsightsResult = {
      profile,
      repos,
      score,
      scoreBreakdown: breakdown,
      languages,
      strengths: ai.strengths,
      improvements: ai.improvements,
      persona: ai.persona,
      resumeSummary: ai.resumeSummary.replace("@user", `@${profile.login}`),
      repoInsights: ai.repoInsights,
    };

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to analyze developer.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

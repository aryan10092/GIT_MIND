import type {
  DeveloperAiInsights,
  GitHubRepoSummary,
  GitHubUserProfile,
  RepoInsight,
} from "@/lib/types/developer-insights";

export function buildDeveloperPrompt(
  profile: GitHubUserProfile,
  repos: GitHubRepoSummary[],
  score: number,
  languages: { name: string; count: number }[],
): string {
  const repoLines = repos
    .map(
      (repo) =>
        `- ${repo.name}: lang=${repo.language ?? "unknown"}, stars=${repo.stargazers_count}, forks=${repo.forks_count}, size=${repo.size}KB, pushed=${repo.pushed_at}, desc=${repo.description ?? "none"}, topics=${repo.topics.join(", ") || "none"}, archived=${repo.archived}`,
    )
    .join("\n");

  return `Analyze this public GitHub developer using ONLY the data below.

Developer:
- username: ${profile.login}
- name: ${profile.name ?? "not set"}
- bio: ${profile.bio ?? "not set"}
- followers: ${profile.followers}
- public repos: ${profile.public_repos}
- company: ${profile.company ?? "not set"}
- location: ${profile.location ?? "not set"}
- member since: ${profile.created_at}
- heuristic score: ${score}/100

Top languages: ${languages.map((l) => `${l.name} (${l.count})`).join(", ") || "unknown"}

Recent repositories:
${repoLines || "No repositories listed"}`;
}

export function parseDeveloperAiResponse(text: string): DeveloperAiInsights {
  const fallback: DeveloperAiInsights = {
    strengths: ["Active public GitHub presence"],
    improvements: ["Add descriptions to more repositories"],
    persona: "A developer building projects in public on GitHub.",
    resumeSummary: `GitHub developer @${"user"} with public repositories and open-source activity.`,
    repoInsights: [],
  };

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<DeveloperAiInsights>;

    return {
      strengths: clampList(parsed.strengths, 3, 5, fallback.strengths),
      improvements: clampList(parsed.improvements, 3, 5, fallback.improvements),
      persona: parsed.persona?.trim() || fallback.persona,
      resumeSummary: parsed.resumeSummary?.trim() || fallback.resumeSummary,
      repoInsights: (parsed.repoInsights ?? []).map(normalizeRepoInsight),
    };
  } catch {
    return fallback;
  }
}

function clampList(
  value: string[] | undefined,
  min: number,
  max: number,
  fallback: string[],
): string[] {
  const items = (value ?? []).map((item) => item.trim()).filter(Boolean);

  if (items.length >= min) {
    return items.slice(0, max);
  }

  return fallback.slice(0, max);
}

function normalizeRepoInsight(raw: Partial<RepoInsight>): RepoInsight {
  return {
    name: raw.name ?? "unknown",
    documentation: clampRating(raw.documentation),
    architecture: clampRating(raw.architecture),
    maintainability: clampRating(raw.maintainability),
    complexity: clampRating(raw.complexity),
    summary: raw.summary?.trim() || "No summary available.",
  };
}

function clampRating(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return 5;
  return Math.max(1, Math.min(10, Math.round(num)));
}

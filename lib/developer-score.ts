import type {
  GitHubRepoSummary,
  GitHubUserProfile,
  ScoreBreakdownItem,
} from "@/lib/types/developer-insights";

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

export function computeDeveloperScore(
  profile: GitHubUserProfile,
  repos: GitHubRepoSummary[],
): { score: number; breakdown: ScoreBreakdownItem[] } {
  if (repos.length === 0) {
    return {
      score: profile.bio ? 15 : 10,
      breakdown: [
        { label: "Profile completeness", points: profile.bio ? 10 : 5, max: 10 },
        { label: "Public repos", points: Math.min(profile.public_repos, 5), max: 10 },
      ],
    };
  }

  const now = Date.now();
  const activeRepos = repos.filter(
    (repo) => now - new Date(repo.pushed_at).getTime() < SIX_MONTHS_MS,
  ).length;
  const activityPoints = Math.round((activeRepos / repos.length) * 25);

  const documentedRepos = repos.filter((repo) => repo.description?.trim()).length;
  const documentationPoints = Math.round((documentedRepos / repos.length) * 20);

  const languages = new Set(
    repos.map((repo) => repo.language).filter(Boolean),
  );
  const diversityPoints = Math.min(15, languages.size * 3);

  const avgSize =
    repos.reduce((sum, repo) => sum + repo.size, 0) / repos.length;
  const starredRepos = repos.filter((repo) => repo.stargazers_count > 0).length;
  let complexityPoints = 8;
  if (avgSize > 500) complexityPoints = 15;
  else if (avgSize > 100) complexityPoints = 12;
  else if (starredRepos > 0) complexityPoints = 10;

  const portfolioPoints = Math.min(15, profile.public_repos);

  let profilePoints = 0;
  if (profile.bio?.trim()) profilePoints += 4;
  if (profile.name?.trim()) profilePoints += 3;
  if (profile.avatar_url) profilePoints += 3;

  const breakdown: ScoreBreakdownItem[] = [
    { label: "Recent activity", points: activityPoints, max: 25 },
    { label: "Documentation", points: documentationPoints, max: 20 },
    { label: "Language diversity", points: diversityPoints, max: 15 },
    { label: "Project depth", points: complexityPoints, max: 15 },
    { label: "Portfolio size", points: portfolioPoints, max: 15 },
    { label: "Profile completeness", points: profilePoints, max: 10 },
  ];

  const score = breakdown.reduce((sum, item) => sum + item.points, 0);

  return { score: Math.min(100, score), breakdown };
}

export function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 55) return "text-amber-600";
  return "text-red-600";
}

export function getScoreLabel(score: number) {
  if (score >= 80) return "Strong developer profile";
  if (score >= 55) return "Growing developer profile";
  return "Early-stage profile";
}

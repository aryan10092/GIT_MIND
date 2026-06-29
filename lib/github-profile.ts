import type {
  GitHubRepoSummary,
  GitHubUserProfile,
} from "@/lib/types/developer-insights";

const GITHUB_USER_PATTERN =
  /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9-]+)\/?$/;

const USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

export function parseGitHubUsername(input: string): string | null {
  const trimmed = input.trim().replace(/^@/, "");

  const urlMatch = trimmed.match(GITHUB_USER_PATTERN);
  if (urlMatch) {
    return urlMatch[1];
  }

  if (USERNAME_PATTERN.test(trimmed)) {
    return trimmed;
  }

  return null;
}

async function githubFetch<T>(url: string): Promise<T> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "GitMind",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers, next: { revalidate: 0 } });

  if (response.status === 404) {
    throw new Error("GitHub user not found.");
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${message}`);
  }

  return response.json() as Promise<T>;
}

type GitHubUserResponse = {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
  html_url: string;
  location: string | null;
  company: string | null;
};

type GitHubRepoResponse = {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number;
  topics?: string[];
  pushed_at: string;
  created_at: string;
  fork: boolean;
  archived: boolean;
  html_url: string;
};

export async function fetchDeveloperProfile(username: string): Promise<{
  profile: GitHubUserProfile;
  repos: GitHubRepoSummary[];
}> {
  const user = await githubFetch<GitHubUserResponse>(
    `https://api.github.com/users/${username}`,
  );

  const repos = await githubFetch<GitHubRepoResponse[]>(
    `https://api.github.com/users/${username}/repos?sort=pushed&per_page=10&type=owner`,
  );

  const profile: GitHubUserProfile = {
    login: user.login,
    name: user.name,
    avatar_url: user.avatar_url,
    bio: user.bio,
    followers: user.followers,
    following: user.following,
    public_repos: user.public_repos,
    created_at: user.created_at,
    html_url: user.html_url,
    location: user.location,
    company: user.company,
  };

  const summaries: GitHubRepoSummary[] = repos
    .filter((repo) => !repo.fork)
    .slice(0, 8)
    .map((repo) => ({
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      open_issues_count: repo.open_issues_count,
      size: repo.size,
      topics: repo.topics ?? [],
      pushed_at: repo.pushed_at,
      created_at: repo.created_at,
      fork: repo.fork,
      archived: repo.archived,
      html_url: repo.html_url,
    }));

  return { profile, repos: summaries };
}

export function getTopLanguages(repos: GitHubRepoSummary[]) {
  const counts = new Map<string, number>();

  for (const repo of repos) {
    if (!repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

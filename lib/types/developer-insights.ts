export type GitHubUserProfile = {
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

export type GitHubRepoSummary = {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number;
  topics: string[];
  pushed_at: string;
  created_at: string;
  fork: boolean;
  archived: boolean;
  html_url: string;
};

export type ScoreBreakdownItem = {
  label: string;
  points: number;
  max: number;
};

export type RepoInsight = {
  name: string;
  documentation: number;
  architecture: number;
  maintainability: number;
  complexity: number;
  summary: string;
};

export type DeveloperInsightsResult = {
  profile: GitHubUserProfile;
  repos: GitHubRepoSummary[];
  score: number;
  scoreBreakdown: ScoreBreakdownItem[];
  languages: { name: string; count: number }[];
  strengths: string[];
  improvements: string[];
  persona: string;
  resumeSummary: string;
  repoInsights: RepoInsight[];
};

export type DeveloperAiInsights = {
  strengths: string[];
  improvements: string[];
  persona: string;
  resumeSummary: string;
  repoInsights: RepoInsight[];
};

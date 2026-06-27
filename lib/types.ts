export type Repo = {
  id: string;
  user_id: string;
  owner: string;
  name: string;
  github_url: string;
  default_branch: string;
  file_count: number;
  chunk_count: number;
  indexed_at: string;
  architecture_summary?: string | null;
  mermaid_diagram?: string | null;
  architecture_generated_at?: string | null;
  health_suggestions?: string | null;
  health_generated_at?: string | null;
};

export type FileChunk = {
  id: string;
  repo_id: string;
  path: string;
  content: string;
  chunk_index: number;
};

export type IngestResult = {
  id: string;
  owner: string;
  name: string;
  githubUrl: string;
  defaultBranch: string;
  fileCount: number;
  chunkCount: number;
  indexedAt: string;
};

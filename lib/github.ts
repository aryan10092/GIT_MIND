const MAX_FILE_SIZE = 50 * 1024;
const MAX_FILES = 150;
const FETCH_CONCURRENCY = 8;

const SKIP_DIRS = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".next/",
  "coverage/",
  "vendor/",
  "__pycache__/",
  ".cache/",
  ".turbo/",
  "out/",
];

const SKIP_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "Cargo.lock",
  "poetry.lock",
  "Gemfile.lock",
]);

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp4",
  ".mp3",
  ".wav",
  ".zip",
  ".tar",
  ".gz",
  ".pdf",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".wasm",
  ".map",
  ".min.js",
  ".min.css",
]);

type GitHubTreeItem = {
  path: string;
  type: string;
  size?: number;
};

type GitHubRepoResponse = {
  default_branch: string;
  private: boolean;
};

export type RepoFile = {
  path: string;
  content: string;
};

export type FetchedRepo = {
  owner: string;
  name: string;
  defaultBranch: string;
  files: RepoFile[];
};

function shouldSkipPath(path: string, size?: number): boolean {
  if (size !== undefined && size > MAX_FILE_SIZE) return true;

  const fileName = path.split("/").pop() ?? path;
  if (SKIP_FILES.has(fileName)) return true;

  if (SKIP_DIRS.some((dir) => path.includes(dir))) return true;

  const ext = path.includes(".") ? `.${path.split(".").pop()}` : "";
  if (BINARY_EXTENSIONS.has(ext.toLowerCase())) return true;

  return false;
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

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${message}`);
  }

  return response.json() as Promise<T>;
}

async function fetchRawFile(
  owner: string,
  name: string,
  branch: string,
  path: string,
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${name}/${branch}/${path}`;

  const response = await fetch(url, { next: { revalidate: 0 } });

  if (!response.ok) return null;

  const content = await response.text();

  if (content.includes("\0") || content.length > MAX_FILE_SIZE) {
    return null;
  }

  return content;
}

async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await fn(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function fetchPublicRepo(
  owner: string,
  name: string,
): Promise<FetchedRepo> {
  const repo = await githubFetch<GitHubRepoResponse>(
    `https://api.github.com/repos/${owner}/${name}`,
  );

  if (repo.private) {
    throw new Error("Private repositories are not supported in Phase 1.");
  }

  const defaultBranch = repo.default_branch;

  const tree = await githubFetch<{ tree: GitHubTreeItem[] }>(
    `https://api.github.com/repos/${owner}/${name}/git/trees/${defaultBranch}?recursive=1`,
  );

  const blobPaths = tree.tree
    .filter(
      (item) =>
        item.type === "blob" && !shouldSkipPath(item.path, item.size),
    )
    .slice(0, MAX_FILES)
    .map((item) => item.path);  

  const files = (
    await mapConcurrent(blobPaths, FETCH_CONCURRENCY, async (path) => {
      const content = await fetchRawFile(owner, name, defaultBranch, path);
      if (!content) return null;
      return { path, content };
    })
  ).filter((file): file is RepoFile => file !== null);

  return {
    owner,
    name,
    defaultBranch,
    files,
  };
}

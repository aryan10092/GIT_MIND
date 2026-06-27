import { getSupabaseAdmin } from "@/lib/supabase/admin";

const CONFIG_FILES = new Set([
  "package.json",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "composer.json",
  "requirements.txt",
  "Gemfile",
  "pom.xml",
  "build.gradle",
  "docker-compose.yml",
  "Dockerfile",
  "tsconfig.json",
  "next.config.js",
  "next.config.ts",
  "next.config.mjs",
]);

const README_PATTERN = /^readme(\.(md|txt|rst))?$/i;

export type ArchitectureContext = {
  topLevelFolders: string[];
  configSnippets: { path: string; content: string }[];
  readmeExcerpt: string | null;
  fileCount: number;
};

export async function buildArchitectureContext(
  repoId: string,
  paths: string[],
): Promise<ArchitectureContext> {
  const supabase = getSupabaseAdmin();

  const topLevelFolders = [
    ...new Set(
      paths
        .map((path) => path.split("/")[0])
        .filter((entry) => entry && !entry.includes(".")),
    ),
  ].sort();

  const keyPaths = paths.filter((path) => {
    const fileName = path.split("/").pop() ?? path;
    return CONFIG_FILES.has(fileName) || README_PATTERN.test(fileName);
  });

  let chunks: { path: string; content: string; chunk_index: number }[] | null =
    null;

  if (keyPaths.length > 0) {
    const { data } = await supabase
      .from("file_chunks")
      .select("path, content, chunk_index")
      .eq("repo_id", repoId)
      .in("path", keyPaths)
      .order("chunk_index", { ascending: true });

    chunks = data;
  }

  const contentByPath = new Map<string, string>();

  for (const chunk of chunks ?? []) {
    const existing = contentByPath.get(chunk.path) ?? "";
    if (existing.length >= 2500) continue;
    contentByPath.set(
      chunk.path,
      `${existing}${chunk.content}`.slice(0, 2500),
    );
  }

  const configSnippets = [...contentByPath.entries()]
    .filter(([path]) => !README_PATTERN.test(path.split("/").pop() ?? path))
    .map(([path, content]) => ({ path, content }));

  const readmePath = [...contentByPath.keys()].find((path) =>
    README_PATTERN.test(path.split("/").pop() ?? path),
  );

  return {
    topLevelFolders,
    configSnippets,
    readmeExcerpt: readmePath ? (contentByPath.get(readmePath) ?? null) : null,
    fileCount: paths.length,
  };
}

export function formatArchitecturePrompt(
  owner: string,
  name: string,
  context: ArchitectureContext,
): string {
  const configSection =
    context.configSnippets.length > 0
      ? context.configSnippets
          .map((file) => `### ${file.path}\n${file.content}`)
          .join("\n\n")
      : "No root config files found in the index.";

  const readmeSection = context.readmeExcerpt
    ? context.readmeExcerpt.slice(0, 2000)
    : "No README found in the index.";

  return `Repository: ${owner}/${name}
Indexed files: ${context.fileCount}
Top-level folders: ${context.topLevelFolders.join(", ") || "none"}

README excerpt:
${readmeSection}

Config files:
${configSection}`;
}

export function parseArchitectureResponse(text: string): {
  summary: string;
  mermaid: string;
} {
  const trimmed = text.trim();

  try {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        summary?: string;
        mermaid?: string;
      };

      return {
        summary: parsed.summary?.trim() || "No summary generated.",
        mermaid: parsed.mermaid?.trim() || "flowchart TD\n  A[App] --> B[Unknown]",
      };
    }
  } catch {
    // Fall through to plain-text parsing.
  }

  const mermaidMatch = trimmed.match(/```mermaid\n([\s\S]*?)```/);
  const summary = trimmed
    .replace(/```mermaid[\s\S]*?```/g, "")
    .replace(/```json[\s\S]*?```/g, "")
    .trim();

  return {
    summary: summary || "No summary generated.",
    mermaid:
      mermaidMatch?.[1]?.trim() || "flowchart TD\n  A[App] --> B[Components]",
  };
}

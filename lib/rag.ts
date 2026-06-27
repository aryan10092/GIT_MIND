import type { SearchResult } from "@/lib/search";

export function buildContext(chunks: SearchResult[]): string {
  if (chunks.length === 0) {
    return "No relevant code context was found for this question.";
  }

  return chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] File: ${chunk.path} (chunk ${chunk.chunk_index})\n${chunk.content}`,
    )
    .join("\n\n");
}

export function buildSystemPrompt(
  owner: string,
  name: string,
  context: string,
): string {
  return `You are GitMind, an AI assistant for the GitHub repository ${owner}/${name}.

Answer questions using ONLY the code context below. If the answer is not in the context, say "I couldn't find that in the indexed codebase."

Rules:
- Cite file paths when referencing code (e.g. src/app/page.tsx)
- Be concise and practical
- Do not invent files, functions, or behaviors not shown in the context

--- CODE CONTEXT ---
${context}
--- END CONTEXT ---`;
}

export function getUniqueSources(chunks: SearchResult[]): string[] {
  return [...new Set(chunks.map((chunk) => chunk.path))];
}

import { embedText, isEmbeddingsAvailable } from "@/lib/embeddings";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type SearchResult = {
  id: string;
  path: string;
  content: string;
  chunk_index: number;
  rank?: number;
  similarity?: number;
  source?: "vector" | "keyword" | "hybrid";
};

function sanitizeQuery(query: string) {
  return query
    .trim()
    .replace(/[^\w\s./-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function resultKey(result: Pick<SearchResult, "path" | "chunk_index">) {
  return `${result.path}:${result.chunk_index}`;
}

function mergeSearchResults(
  vectorResults: SearchResult[],
  keywordResults: SearchResult[],
  limit: number,
): SearchResult[] {
  const scores = new Map<
    string,
    { result: SearchResult; score: number; sources: Set<string> }
  >();
  const rrfK = 60;

  vectorResults.forEach((result, index) => {
    const key = resultKey(result);
    scores.set(key, {
      result: { ...result, source: "vector" },
      score: 1 / (rrfK + index + 1) + (result.similarity ?? 0) * 0.5,
      sources: new Set(["vector"]),
    });
  });

  keywordResults.forEach((result, index) => {
    const key = resultKey(result);
    const rrfScore = 1 / (rrfK + index + 1) + (result.rank ?? 0) * 0.1;
    const existing = scores.get(key);

    if (existing) {
      existing.score += rrfScore;
      existing.sources.add("keyword");
      existing.result.source = "hybrid";
    } else {
      scores.set(key, {
        result: { ...result, source: "keyword" },
        score: rrfScore,
        sources: new Set(["keyword"]),
      });
    }
  });

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.result);
}

async function searchByEmbedding(
  repoId: string,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  if (!isEmbeddingsAvailable()) {
    return [];
  }

  try {
    const queryEmbedding = await embedText(query);

    if (!queryEmbedding) {
      return [];
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc("match_file_chunks", {
      p_repo_id: repoId,
      p_query_embedding: queryEmbedding,
      p_limit: limit,
      p_threshold: 0.25,
    });

    if (error || !data?.length) {
      return [];
    }

    return (data as SearchResult[]).map((row) => ({
      id: row.id,
      path: row.path,
      content: row.content,
      chunk_index: row.chunk_index,
      similarity: row.similarity,
      source: "vector" as const,
    }));
  } catch {
    return [];
  }
}



async function searchByKeywords(
  repoId: string,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  const sanitized = sanitizeQuery(query);
 

  if (!sanitized) {
    return [];
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("search_file_chunks", {
    p_repo_id: repoId,
    p_query: sanitized,
    p_limit: limit,
  });

    return (data as SearchResult[]).map((row) => ({
      ...row,
      source: "keyword" as const,
    }));
  
}

export async function searchFileChunks(
  repoId: string,
  query: string,
  limit = 8,
): Promise<SearchResult[]> {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const [vectorResults, keywordResults] = await Promise.all([
    searchByEmbedding(repoId, trimmed, limit),
    searchByKeywords(repoId, trimmed, limit),
  ]);

  if (vectorResults.length === 0) {
    return keywordResults.slice(0, limit);
  }

  if (keywordResults.length === 0) {
    return vectorResults.slice(0, limit);
  }

  return mergeSearchResults(vectorResults, keywordResults, limit);
}

export { formatChunkForEmbedding } from "@/lib/embeddings";

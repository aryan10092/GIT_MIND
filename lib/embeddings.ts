export const EMBEDDING_MODEL =
  "sentence-transformers/all-MiniLM-L6-v2";
export const EMBEDDING_DIMENSIONS = 384;

const HF_API_URL = `https://api-inference.huggingface.co/models/${EMBEDDING_MODEL}`;

function truncateForEmbedding(text: string, maxChars = 2000) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

export function formatChunkForEmbedding(path: string, content: string) {
  return truncateForEmbedding(`File: ${path}\n${content}`);
}

export function isEmbeddingsAvailable() {
  return Boolean(process.env.HUGGINGFACE_API_KEY);
}

function meanPool(values: number[][]): number[] {
  const dims = values[0]?.length ?? 0;
  const sums = new Array<number>(dims).fill(0);

  for (const row of values) {
    for (let i = 0; i < dims; i += 1) {
      sums[i] += row[i] ?? 0;
    }
  }

  return sums.map((value) => value / values.length);
}

function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

  if (magnitude === 0) return vector;

  return vector.map((value) => value / magnitude);
}

function parseEmbeddingResponse(payload: unknown): number[] | null {
  if (!payload) return null;

  if (Array.isArray(payload)) {
    if (payload.length === 0) return null;

    if (typeof payload[0] === "number") {
      return normalize(payload as number[]);
    }

    if (Array.isArray(payload[0])) {
      return normalize(meanPool(payload as number[][]));
    }
  }

  return null;
}

export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: truncateForEmbedding(text) }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as unknown;
  const vector = parseEmbeddingResponse(payload);

  if (!vector || vector.length !== EMBEDDING_DIMENSIONS) {
    return null;
  }

  return vector;
}

export async function embedTexts(
  texts: string[],
  batchSize = 8,
): Promise<(number[] | null)[]> {
  if (!isEmbeddingsAvailable()) {
    return texts.map(() => null);
  }

  const results: (number[] | null)[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    for (const text of batch) {
      try {
        results.push(await embedText(text));
      } catch {
        results.push(null);
      }
    }
  }

  return results;
}

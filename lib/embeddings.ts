export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIMENSIONS = 384;

type FeaturePipeline = (
  text: string,
  options?: { pooling?: string; normalize?: boolean },
) => Promise<{ data: Float32Array }>;

let embedder: FeaturePipeline | null = null;
let embedderPromise: Promise<FeaturePipeline> | null = null;

async function loadEmbedder(): Promise<FeaturePipeline> {
  if (embedder) return embedder;

  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      const pipe = await pipeline("feature-extraction", EMBEDDING_MODEL, {
        quantized: true,
      });
      embedder = pipe as FeaturePipeline;
      return embedder;
    })();
  }

  return embedderPromise;
}

function truncateForEmbedding(text: string, maxChars = 2000) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

export function formatChunkForEmbedding(path: string, content: string) {
  return truncateForEmbedding(`File: ${path}\n${content}`);
}

export async function embedText(text: string): Promise<number[]> {
  const pipe = await loadEmbedder();
  const output = await pipe(truncateForEmbedding(text), {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
}

export async function embedTexts(
  texts: string[],
  batchSize = 12,
): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const vectors = await Promise.all(batch.map((text) => embedText(text)));
    results.push(...vectors);
  }

  return results;
}

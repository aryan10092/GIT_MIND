const CHUNK_SIZE = 1500;

export type ChunkInput = {
  path: string;
  content: string;
};

export type ChunkOutput = {
  path: string;
  content: string;
  chunkIndex: number;
};

export function chunkFile({ path, content }: ChunkInput): ChunkOutput[] {
  if (content.length <= CHUNK_SIZE) {
    return [{ path, content, chunkIndex: 0 }];
  }

  const lines = content.split("\n");
  const chunks: ChunkOutput[] = [];
  let current = "";
  let chunkIndex = 0;

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;

    if (next.length > CHUNK_SIZE && current) {
      chunks.push({ path, content: current, chunkIndex });
      chunkIndex += 1;
      current = line;
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push({ path, content: current, chunkIndex });
  }

  return chunks;
}

export function chunkFiles(files: ChunkInput[]): ChunkOutput[] {
  return files.flatMap((file) => chunkFile(file));
}

-- Embeddings: run in Supabase SQL Editor (requires pgvector)

create extension if not exists vector;

alter table file_chunks
  add column if not exists embedding vector(384);

create index if not exists file_chunks_embedding_idx
  on file_chunks
  using hnsw (embedding vector_cosine_ops);

create or replace function match_file_chunks(
  p_repo_id uuid,
  p_query_embedding vector(384),
  p_limit int default 8,
  p_threshold float default 0.3
)
returns table (
  id uuid,
  path text,
  content text,
  chunk_index int,
  similarity float
)
language sql
stable
as $$
  select
    fc.id,
    fc.path,
    fc.content,
    fc.chunk_index,
    (1 - (fc.embedding <=> p_query_embedding))::float as similarity
  from file_chunks fc
  where fc.repo_id = p_repo_id
    and fc.embedding is not null
    and (1 - (fc.embedding <=> p_query_embedding)) > p_threshold
  order by fc.embedding <=> p_query_embedding
  limit p_limit;
$$;

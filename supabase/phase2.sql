create or replace function search_file_chunks(
  p_repo_id uuid,
  p_query text,
  p_limit int default 8
)
returns table (
  id uuid,
  path text,
  content text,
  chunk_index int,
  rank real
)
language sql
stable
as $$
  select
    fc.id,
    fc.path,
    fc.content,
    fc.chunk_index,
    ts_rank(
      to_tsvector('english', fc.content),
      plainto_tsquery('english', p_query)
    ) as rank
  from file_chunks fc
  where fc.repo_id = p_repo_id
    and to_tsvector('english', fc.content) @@ plainto_tsquery('english', p_query)
  order by rank desc
  limit p_limit;
$$;

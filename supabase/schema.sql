
create extension if not exists pg_trgm;

create table if not exists repos (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  name text not null,
  github_url text not null,
  default_branch text not null default 'main',
  file_count int not null default 0,
  chunk_count int not null default 0,
  indexed_at timestamptz not null default now(),
  unique (owner, name)
);

create table if not exists file_chunks (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references repos(id) on delete cascade,
  path text not null,
  content text not null,
  chunk_index int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists file_chunks_repo_id_idx on file_chunks (repo_id);
create index if not exists file_chunks_path_idx on file_chunks (repo_id, path);
create index if not exists file_chunks_content_search_idx
  on file_chunks using gin (to_tsvector('english', content));

alter table repos enable row level security;
alter table file_chunks enable row level security;

-- Public read access (MVP). Ingest uses service role key on the server.
create policy "Allow public read on repos"
  on repos for select using (true);

create policy "Allow public read on file_chunks"
  on file_chunks for select using (true);

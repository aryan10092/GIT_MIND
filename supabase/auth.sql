alter table repos
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table repos drop constraint if exists repos_owner_name_key;

create unique index if not exists repos_user_owner_name_idx
  on repos (user_id, owner, name);

create index if not exists repos_user_id_idx on repos (user_id);

drop policy if exists "Allow public read on repos" on repos;
drop policy if exists "Allow public read on file_chunks" on file_chunks;

create policy "Users read own repos"
  on repos for select
  using (auth.uid() = user_id);

create policy "Users insert own repos"
  on repos for insert
  with check (auth.uid() = user_id);

create policy "Users update own repos"
  on repos for update
  using (auth.uid() = user_id);

create policy "Users delete own repos"
  on repos for delete
  using (auth.uid() = user_id);

create policy "Users read own chunks"
  on file_chunks for select
  using (
    exists (
      select 1 from repos r
      where r.id = file_chunks.repo_id
        and r.user_id = auth.uid()
    )
  );

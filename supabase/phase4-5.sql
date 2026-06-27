
alter table repos
  add column if not exists architecture_summary text,
  add column if not exists mermaid_diagram text,
  add column if not exists architecture_generated_at timestamptz,
  add column if not exists health_suggestions text,
  add column if not exists health_generated_at timestamptz;

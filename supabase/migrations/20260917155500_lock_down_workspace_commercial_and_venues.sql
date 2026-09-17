-- Commercial rights and saved venues are workspace-private data. The UI uses
-- access-checked RPCs for both reads and writes, never direct table access.
alter table public.workspace_commercial_access enable row level security;
alter table public.workspace_saved_venues enable row level security;

revoke all on table public.workspace_commercial_access from anon, authenticated;
revoke all on table public.workspace_saved_venues from anon, authenticated;

notify pgrst,'reload schema';

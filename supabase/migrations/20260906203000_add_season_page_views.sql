create table if not exists public.season_page_views (
  season_id uuid primary key references public.seasons(id) on delete cascade,
  view_count bigint not null default 0 check (view_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.season_page_views enable row level security;
revoke all on table public.season_page_views from public, anon, authenticated;

create or replace function public.record_season_page_view(
  p_public_token uuid,
  p_season_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count bigint;
begin
  if not exists (
    select 1
    from public.seasons s
    join public.workspaces w on w.id = s.workspace_id
    where s.id = p_season_id
      and w.public_token = p_public_token
      and coalesce(w.public_enabled, true)
  ) then
    raise exception 'Lien public de saison invalide';
  end if;

  insert into public.season_page_views as spv (season_id, view_count, updated_at)
  values (p_season_id, 1, now())
  on conflict (season_id) do update
    set view_count = spv.view_count + 1,
        updated_at = now()
  returning view_count into v_count;

  return v_count;
end;
$$;

revoke execute on function public.record_season_page_view(uuid, uuid) from public;
grant execute on function public.record_season_page_view(uuid, uuid) to anon, authenticated;

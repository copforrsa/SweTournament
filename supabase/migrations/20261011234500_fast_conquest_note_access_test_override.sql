-- Temporary, explicit access grants for Fast Conquête post-tournament notes.
-- An override grants access to the salon only; it does not mark a player present
-- and does not modify matches, scores, or statistics.
create table if not exists private.fast_conquest_note_access_overrides (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid,
  reason text not null default 'test',
  primary key (tournament_id, user_id)
);

alter table private.fast_conquest_note_access_overrides enable row level security;
revoke all on table private.fast_conquest_note_access_overrides from public, anon, authenticated;

create or replace function private.fast_present(t uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null and (
    exists (
      select 1 from public.tournaments x
      where x.id = t and private.fast_admin(x.workspace_id)
    )
    or exists (
      select 1
      from public.tournament_players p
      join public.tournaments x on x.id = p.tournament_id
      join public.workspace_members m
        on m.workspace_id = x.workspace_id
       and m.linked_player_id = p.player_id
      where p.tournament_id = t
        and m.user_id = auth.uid()
        and m.active
        and m.role = 'coorganizer'
        and p.present
        and p.registration_status <> 'waitlist'
    )
    or exists (
      select 1 from private.fast_conquest_note_access_overrides o
      where o.tournament_id = t and o.user_id = auth.uid()
    )
  );
$function$;

revoke all on function private.fast_present(uuid) from public, anon, authenticated;

-- Ivory: one-off test access for this tournament's post-match salon.
insert into private.fast_conquest_note_access_overrides(tournament_id, user_id, granted_by, reason)
values (
  'fa72f2cc-13bc-46c5-9c4d-0aceafa87a6f'::uuid,
  '886ebd26-43da-459c-a44f-7228379cbeb0'::uuid,
  '8e47c5b5-831b-48a5-811e-67659574a125'::uuid,
  'test de connexion et salon'
)
on conflict (tournament_id, user_id) do update
set granted_at = excluded.granted_at,
    granted_by = excluded.granted_by,
    reason = excluded.reason;

-- Allow every active co-organizer who took part in the tournament to use
-- the Fast Conquête post-match voting room.
create or replace function private.fast_present(t uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null and (
    exists (
      select 1
      from public.tournaments x
      where x.id = t
        and private.fast_admin(x.workspace_id)
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
  );
$function$;

revoke all on function private.fast_present(uuid) from public, anon, authenticated;

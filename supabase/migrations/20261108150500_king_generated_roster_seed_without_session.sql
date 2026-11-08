-- A system-generated official King match is allowed to seed its own roster.
-- Interactive assignment edits still require the existing score-entry permission.
create or replace function private.guard_quick_match_player_available()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wid uuid;
  tid uuid;
  v_trusted_seed boolean := false;
begin
  select t.workspace_id,t.id into wid,tid
    from public.matches m
    join public.tournaments t on t.id=m.tournament_id
    where m.id=new.match_id;

  -- Only the nested match-insert -> roster-seeding trigger may use this path.
  -- All teams and players must match the stored official generated fixture.
  if pg_trigger_depth()>=2 then
    select exists(
      select 1
      from public.matches m
      join public.tournaments t on t.id=m.tournament_id
      join public.team_players tp
        on tp.team_id=new.team_id and tp.player_id=new.player_id
      where m.id=new.match_id
        and t.format='king_of_pitch'
        and t.rotation_mode='king_of_pitch'
        and coalesce((t.rotation_state->>'initialized')::boolean,false)
        and coalesce((t.rotation_state->>'version')::int,0)=2
        and m.rotation_generated=true
        and m.rotation_role in ('king','middle','stream')
        and new.team_id in (m.home_team_id,m.away_team_id)
    ) into v_trusted_seed;
  end if;

  if not v_trusted_seed then
    if auth.uid() is null then raise exception 'Connexion requise'; end if;
    if not (private.is_workspace_operational_admin(wid)
            or private.coorganizer_can_edit_tournament(tid)) then
      raise exception 'Droit de saisie des scores requis';
    end if;
  end if;

  -- Injury restrictions remain enforced for both automated and manual entries.
  if new.team_id is not null and exists(
    select 1 from public.players p
    join public.player_unavailability u on u.global_player_id=p.global_player_id
    where p.id=new.player_id and u.active=true
      and u.availability_mode='injured_unavailable'
      and (u.unavailable_until is null or u.unavailable_until>=current_date)
  ) then
    raise exception 'Ce joueur est indisponible';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_quick_match_player_available() from public, anon, authenticated;
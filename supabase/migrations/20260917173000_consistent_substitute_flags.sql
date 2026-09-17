-- A player already assigned to any team cannot be a common substitute.
-- Before the final draw, calculate substitutes from the total confirmed roster
-- (full teams of the tournament size), not only from currently created teams.
create or replace function private.recalculate_tournament_substitute_flags(p_tournament_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_team_size integer:=5;
  v_confirmed integer:=0;
  v_existing_teams integer:=0;
  v_capacity integer:=0;
  v_assigned integer:=0;
  v_free integer:=0;
  v_substitutes integer:=0;
begin
  select greatest(2,least(11,coalesce(team_size,5))) into v_team_size
  from public.tournaments where id=p_tournament_id;
  if v_team_size is null then return 0; end if;

  select count(*) into v_confirmed from public.tournament_players
  where tournament_id=p_tournament_id and present and coalesce(registration_status,'confirmed')<>'waitlist';
  select count(*) into v_existing_teams from public.teams where tournament_id=p_tournament_id;
  v_capacity:=greatest(v_existing_teams*v_team_size,(v_confirmed/v_team_size)*v_team_size);

  update public.tournament_players set is_substitute=false
  where tournament_id=p_tournament_id and is_substitute is distinct from false;
  if v_capacity=0 then return 0; end if;

  select count(distinct team_player.player_id) into v_assigned
  from public.team_players team_player
  join public.teams team on team.id=team_player.team_id
  join public.tournament_players registration on registration.tournament_id=p_tournament_id and registration.player_id=team_player.player_id
  where team.tournament_id=p_tournament_id and registration.present and coalesce(registration.registration_status,'confirmed')<>'waitlist';
  v_free:=greatest(0,v_capacity-v_assigned);

  with unassigned as (
    select registration.player_id,row_number() over(order by registration.registered_at nulls last,registration.player_id) as position
    from public.tournament_players registration
    where registration.tournament_id=p_tournament_id and registration.present and coalesce(registration.registration_status,'confirmed')<>'waitlist'
      and not exists(select 1 from public.team_players team_player join public.teams team on team.id=team_player.team_id where team.tournament_id=p_tournament_id and team_player.player_id=registration.player_id)
  )
  update public.tournament_players registration set is_substitute=true
  from unassigned candidate
  where registration.tournament_id=p_tournament_id and registration.player_id=candidate.player_id and candidate.position>v_free;

  select count(*) into v_substitutes from public.tournament_players
  where tournament_id=p_tournament_id and present and coalesce(registration_status,'confirmed')<>'waitlist' and is_substitute;
  return v_substitutes;
end $$;

do $$
declare tournament_row record;
begin
  for tournament_row in select id from public.tournaments where status<>'finished' loop
    perform private.recalculate_tournament_substitute_flags(tournament_row.id);
  end loop;
end $$;

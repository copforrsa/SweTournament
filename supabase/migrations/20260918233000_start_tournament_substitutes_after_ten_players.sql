create or replace function private.recalculate_tournament_substitute_flags(p_tournament_id uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_confirmed integer:=0;
  v_substitutes integer:=0;
begin
  select count(*) into v_confirmed
  from public.tournament_players
  where tournament_id=p_tournament_id and present and coalesce(registration_status,'confirmed')<>'waitlist';

  update public.tournament_players
  set is_substitute=false
  where tournament_id=p_tournament_id and is_substitute is distinct from false;

  -- A tournament remains freely cancellable/reorganisable through its first
  -- ten registrations. Only the 11th confirmed registration and later enter
  -- the substitute list, in chronological order.
  if v_confirmed<=10 then return 0; end if;

  with ordered as (
    select player_id,row_number() over(order by registered_at nulls last,player_id) as position
    from public.tournament_players
    where tournament_id=p_tournament_id and present and coalesce(registration_status,'confirmed')<>'waitlist'
  )
  update public.tournament_players registration
  set is_substitute=true
  from ordered candidate
  where registration.tournament_id=p_tournament_id
    and registration.player_id=candidate.player_id
    and candidate.position>10;

  select count(*) into v_substitutes
  from public.tournament_players
  where tournament_id=p_tournament_id and present and coalesce(registration_status,'confirmed')<>'waitlist' and is_substitute;

  return v_substitutes;
end;
$$;
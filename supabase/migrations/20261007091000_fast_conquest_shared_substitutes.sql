CREATE OR REPLACE FUNCTION private.recalculate_tournament_substitute_flags(p_tournament_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_confirmed integer := 0;
  v_core integer := 0;
  v_substitutes integer := 0;
begin
  -- Fast Conquête keeps explicitly designated shared substitutes unchanged.
  if exists(select 1 from public.tournaments where id=p_tournament_id and format='fast_conquest') then
    return (select count(*)::integer from public.tournament_players where tournament_id=p_tournament_id and present and is_substitute);
  end if;
  select count(*) into v_confirmed
  from public.tournament_players
  where tournament_id = p_tournament_id
    and present
    and coalesce(registration_status,'confirmed') <> 'waitlist';

  -- Players remain available until a full 5-player team can be formed.
  -- At 10/15/20/25/30/35 confirmed players, nobody is a substitute.
  v_core := case
    when v_confirmed < 10 then v_confirmed
    else floor(v_confirmed::numeric / 5)::integer * 5
  end;

  with ordered as (
    select player_id,
           row_number() over(order by registered_at nulls last, player_id) as position
    from public.tournament_players
    where tournament_id = p_tournament_id
      and present
      and coalesce(registration_status,'confirmed') <> 'waitlist'
  )
  update public.tournament_players registration
  set is_substitute = (candidate.position > v_core)
  from ordered candidate
  where registration.tournament_id = p_tournament_id
    and registration.player_id = candidate.player_id
    and registration.is_substitute is distinct from (candidate.position > v_core);

  select count(*) into v_substitutes
  from public.tournament_players
  where tournament_id = p_tournament_id
    and present
    and coalesce(registration_status,'confirmed') <> 'waitlist'
    and is_substitute;

  return v_substitutes;
end;
$function$;

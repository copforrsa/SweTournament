-- Keep every complete five-player team in the tournament.
-- Substitutes are only the registrations between two team-size thresholds:
-- 11-14 => 1-4 substitutes, 16-19 => 1-4, etc.
create or replace function private.recalculate_tournament_substitute_flags(p_tournament_id uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_confirmed integer := 0;
  v_core integer := 0;
  v_substitutes integer := 0;
begin
  select count(*) into v_confirmed
  from public.tournament_players
  where tournament_id = p_tournament_id
    and present
    and coalesce(registration_status,'confirmed') <> 'waitlist';

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
$$;
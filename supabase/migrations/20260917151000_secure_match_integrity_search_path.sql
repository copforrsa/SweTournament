-- Preserve the existing match-integrity checks while making name resolution
-- deterministic for this trigger function.
create or replace function public.enforce_match_integrity_v1()
returns trigger
language plpgsql
set search_path='public','pg_temp'
as $$
declare
  v_rotation_mode text;
  v_rotation_initialized boolean := false;
begin
  select t.rotation_mode,
         coalesce((t.rotation_state->>'initialized')::boolean,false)
    into v_rotation_mode,v_rotation_initialized
  from public.tournaments t
  where t.id=new.tournament_id;

  if coalesce(new.rotation_generated,false)=false
     and v_rotation_mode='king_of_pitch'
     and v_rotation_initialized then
    raise exception 'MATCH_MANUAL_DISABLED_AUTO_ROTATION';
  end if;

  if coalesce(new.rotation_generated,false)=false
     and (new.pitch is null or btrim(new.pitch)='') then
    raise exception 'MATCH_PITCH_REQUIRED';
  end if;

  if lower(coalesce(new.status,'')) <> 'finished' then
    if exists (
      select 1
      from public.matches m
      where m.tournament_id=new.tournament_id
        and m.id is distinct from new.id
        and lower(coalesce(m.status,'')) <> 'finished'
        and (
          m.home_team_id in (new.home_team_id,new.away_team_id)
          or m.away_team_id in (new.home_team_id,new.away_team_id)
        )
    ) then
      raise exception 'MATCH_TEAM_ALREADY_ACTIVE';
    end if;
  end if;

  return new;
end;
$$;

notify pgrst,'reload schema';

-- Keep the royal 4-point bonus for untouched official Carrefour fixtures only.
-- Friendly/organizer-adjusted matches after circuit launch remain 3-point victories.
alter table public.matches
  add column if not exists king_custom_match boolean not null default false;

create or replace function private.swe_mark_king_custom_match_v1()
returns trigger language plpgsql
set search_path to ''
as $function$
declare v_active boolean;
begin
  select t.format='king_of_pitch'
         and t.rotation_mode='king_of_pitch'
         and coalesce((t.rotation_state->>'initialized')::boolean,false)
  into v_active
  from public.tournaments t where t.id=new.tournament_id;
  if coalesce(v_active,false) then
    if TG_OP='INSERT' then
      if not coalesce(new.rotation_generated,false) then new.king_custom_match:=true; end if;
    elsif old.home_team_id is distinct from new.home_team_id
       or old.away_team_id is distinct from new.away_team_id
       or old.pitch is distinct from new.pitch
       or old.round_label is distinct from new.round_label then
      new.king_custom_match:=true;
    end if;
  end if;
  return new;
end $function$;

drop trigger if exists swe_king_custom_match_before_write on public.matches;
create trigger swe_king_custom_match_before_write
before insert or update of home_team_id,away_team_id,pitch,round_label
on public.matches
for each row execute function private.swe_mark_king_custom_match_v1();

-- Keep official match integrity, but permit explicitly marked custom fixtures
-- to be added after launch. The existing no-overlap and pitch checks still apply.
create or replace function public.enforce_match_integrity_v1()
returns trigger language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare v_rotation_mode text; v_rotation_initialized boolean := false;
begin
  select t.rotation_mode,coalesce((t.rotation_state->>'initialized')::boolean,false)
    into v_rotation_mode,v_rotation_initialized
  from public.tournaments t where t.id=new.tournament_id;

  if coalesce(new.rotation_generated,false)=false
    and v_rotation_mode='king_of_pitch' and v_rotation_initialized
    and not coalesce(new.king_custom_match,false)
  then raise exception 'MATCH_MANUAL_DISABLED_AUTO_ROTATION'; end if;

  if coalesce(new.rotation_generated,false)=false and (new.pitch is null or btrim(new.pitch)='')
  then raise exception 'MATCH_PITCH_REQUIRED'; end if;

  if lower(coalesce(new.status,'')) <> 'finished'
    and not (coalesce(new.rotation_generated,false) and nullif(btrim(coalesce(new.pitch,'')),'') is null)
  then
    if exists(
      select 1 from public.matches m
      where m.tournament_id=new.tournament_id
        and m.id is distinct from new.id
        and lower(coalesce(m.status,'')) <> 'finished'
        and not (coalesce(m.rotation_generated,false) and nullif(btrim(coalesce(m.pitch,'')),'') is null)
        and (m.home_team_id in (new.home_team_id,new.away_team_id)
             or m.away_team_id in (new.home_team_id,new.away_team_id))
        and not (new.competition_type='championship_qualification' and new.format_stage='qualification'
                 and new.status='scheduled' and m.competition_type='championship_qualification'
                 and m.format_stage='qualification' and m.status='scheduled')
        and not (new.competition_type='fast_conquest' and new.format_stage='qualification'
                 and m.competition_type='fast_conquest' and new.status='scheduled' and m.status='scheduled')
    ) then raise exception 'MATCH_TEAM_ALREADY_ACTIVE'; end if;
  end if;
  return new;
end $function$;
-- Assign Conquête fixtures to the tournament's own reserved pitches.
create or replace function public.conquest_add_match_v2(
  p_tournament_id uuid,
  p_home_team_id uuid,
  p_away_team_id uuid,
  p_type text,
  p_stage text,
  p_slot text,
  p_label text
) returns void
language plpgsql security definer set search_path='public'
as $$
declare
  v_order integer;
  v_pitch_ids uuid[];
  v_pitch_id uuid;
  v_pitch_name text;
begin
  if p_home_team_id is null or p_away_team_id is null or p_home_team_id=p_away_team_id then return; end if;
  select coalesce(max(match_order),0)+1 into v_order from public.matches where tournament_id=p_tournament_id;
  select reserved_pitch_ids into v_pitch_ids from public.tournaments where id=p_tournament_id;
  if coalesce(cardinality(v_pitch_ids),0)=0 then raise exception 'Aucun terrain n’est réservé pour ce tournoi'; end if;
  v_pitch_id:=v_pitch_ids[((v_order-1) % cardinality(v_pitch_ids))+1];
  select name into v_pitch_name from public.sports_pitches where id=v_pitch_id and active;
  if v_pitch_name is null then raise exception 'Un terrain réservé est introuvable ou inactif'; end if;
  insert into public.matches(
    tournament_id, home_team_id, away_team_id, match_order, status, home_score, away_score,
    pitch, round_label, rotation_role, rotation_generated, competition_type, format_stage, format_slot, workflow_version
  ) values (
    p_tournament_id, p_home_team_id, p_away_team_id, v_order, 'scheduled', 0, 0,
    v_pitch_name, p_label, 'conquest_v2', true, p_type, p_stage, p_slot, 2
  ) on conflict (tournament_id, format_slot) where format_slot is not null do nothing;
end;
$$;

-- Auto-start an eligible six-team King circuit once its three opening fixtures exist.
-- Keep explicit team pairings, recorded scores and tie-break decisions unchanged.
create or replace function private.swe_king_auto_start_six_v1(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_t public.tournaments%rowtype;
  v_pitch_ids uuid[];
  v_roles text[] := array['king','middle','stream'];
  v_pitch_id uuid;
  v_pitch_name text;
  v_m public.matches%rowtype;
  v_match_ids uuid[] := array[]::uuid[];
  v_n int;
  v_team_count int;
  v_match_count int;
  v_distinct_teams int;
  v_advance jsonb;
begin
  select * into v_t from public.tournaments where id=p_tournament_id for update;
  if not found or v_t.format<>'king_of_pitch' or v_t.status='finished'
     or v_t.rotation_mode not in ('standard','king_of_pitch')
     or coalesce((v_t.rotation_state->>'initialized')::boolean,false)
     or coalesce((v_t.rotation_state->>'version')::int,1)>1 then
    return jsonb_build_object('started',false,'reason','inactive_or_already_started');
  end if;
  if coalesce(v_t.team_review_requested,false)
     and v_t.team_review_status is distinct from 'approved' then
    return jsonb_build_object('started',false,'reason','team_review_pending');
  end if;
  v_pitch_ids := array[v_t.king_pitch_id,v_t.middle_pitch_id,v_t.stream_pitch_id];
  if array_position(v_pitch_ids,null) is not null
     or (select count(distinct x) from unnest(v_pitch_ids) as ids(x))<>3
     or exists (select 1 from unnest(v_pitch_ids) as ids(x)
                where not (ids.x=any(v_t.reserved_pitch_ids))) then
    return jsonb_build_object('started',false,'reason','pitch_roles_incomplete');
  end if;
  select count(*) into v_team_count from public.teams where tournament_id=p_tournament_id;
  select count(*) into v_match_count from public.matches where tournament_id=p_tournament_id;
  if v_team_count<>6 or v_match_count<>3 then
    return jsonb_build_object('started',false,'reason','waiting_for_six_teams_three_matches',
                              'teams',v_team_count,'matches',v_match_count);
  end if;
  if exists (
    select 1 from public.matches m
    left join public.teams h on h.id=m.home_team_id and h.tournament_id=p_tournament_id
    left join public.teams a on a.id=m.away_team_id and a.tournament_id=p_tournament_id
    where m.tournament_id=p_tournament_id
      and (m.match_order not between 1 and 3 or h.id is null or a.id is null
           or coalesce(m.king_custom_match,false))
  ) then
    return jsonb_build_object('started',false,'reason','non_initial_or_invalid_match');
  end if;
  select count(distinct x.team_id) into v_distinct_teams from (
    select home_team_id as team_id from public.matches where tournament_id=p_tournament_id
    union all
    select away_team_id as team_id from public.matches where tournament_id=p_tournament_id
  ) x;
  if v_distinct_teams<>6 then
    return jsonb_build_object('started',false,'reason','teams_not_distinct');
  end if;
  for v_n in 1..3 loop
    v_pitch_id := v_pitch_ids[v_n];
    select name into v_pitch_name from public.sports_pitches where id=v_pitch_id;
    if v_pitch_name is null then
      return jsonb_build_object('started',false,'reason','unknown_pitch');
    end if;
    select * into v_m from public.matches
     where tournament_id=p_tournament_id
       and lower(btrim(pitch))=lower(btrim(v_pitch_name))
     for update;
    if not found or v_m.id=any(v_match_ids) then
      return jsonb_build_object('started',false,'reason','initial_pitches_do_not_match');
    end if;
    if v_m.status='finished' and (
      v_m.home_score is null or v_m.away_score is null or
      (v_m.home_score=v_m.away_score and
        (v_m.tie_break_winner_team_id is null
         or v_m.tie_break_winner_team_id not in (v_m.home_team_id,v_m.away_team_id)
         or v_m.tie_break_method_used is distinct from
             (case when v_n=1 then 'penalties_3' else v_t.tie_break_method end)))
    ) then
      return jsonb_build_object('started',false,'reason','tiebreak_or_score_missing','match_order',v_m.match_order);
    end if;
    v_match_ids := array_append(v_match_ids,v_m.id);
  end loop;
  -- All eligibility checks passed: assign the three configured roles exactly once.
  for v_n in 1..3 loop
    update public.matches
       set rotation_generated=true,rotation_role=v_roles[v_n]
     where id=v_match_ids[v_n];
  end loop;
  update public.tournaments
     set rotation_mode='king_of_pitch',
         rotation_state=jsonb_build_object(
           'initialized',true,'version',2,'round',1,
           'stop_after_round',false,'started_at',now())
   where id=p_tournament_id;
  update public.matches set status='in_progress',
      started_at=coalesce(started_at,now())
   where id=any(v_match_ids) and status='scheduled';
  -- If all three results were already entered, recover the next round immediately.
  v_advance := private.swe_king_advance_v1(p_tournament_id);
  return jsonb_build_object('started',true,'advance',v_advance);
end;
$$;
revoke all on function private.swe_king_auto_start_six_v1(uuid) from public, anon, authenticated;

-- Automatically mark newly generated V2 round fixtures as underway.
create or replace function private.swe_king_generated_match_begin_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.rotation_generated is true and new.rotation_role in ('king','middle','stream')
     and new.status='scheduled'
     and exists (
       select 1 from public.tournaments t where t.id=new.tournament_id
       and t.format='king_of_pitch' and t.rotation_mode='king_of_pitch'
       and coalesce((t.rotation_state->>'version')::int,0)=2
       and coalesce((t.rotation_state->>'initialized')::boolean,false)
     ) then
    new.status:='in_progress';
    new.started_at:=coalesce(new.started_at,now());
  end if;
  return new;
end;
$$;
revoke all on function private.swe_king_generated_match_begin_v1() from public, anon, authenticated;
drop trigger if exists swe_king_generated_match_begin_v1 on public.matches;
create trigger swe_king_generated_match_begin_v1
before insert on public.matches for each row
execute function private.swe_king_generated_match_begin_v1();

create or replace function private.swe_king_auto_start_from_match_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.match_order between 1 and 3 then
    perform private.swe_king_auto_start_six_v1(new.tournament_id);
  end if;
  return new;
end;
$$;
revoke all on function private.swe_king_auto_start_from_match_v1() from public, anon, authenticated;
drop trigger if exists swe_king_auto_start_from_match_v1 on public.matches;
create trigger swe_king_auto_start_from_match_v1
after insert or update of status,tie_break_winner_team_id on public.matches
for each row execute function private.swe_king_auto_start_from_match_v1();

-- A collaborative draw can approve *after* the opening fixtures were prepared.
create or replace function private.swe_king_auto_start_from_tournament_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.swe_king_auto_start_six_v1(new.id);
  return new;
end;
$$;
revoke all on function private.swe_king_auto_start_from_tournament_v1() from public, anon, authenticated;
drop trigger if exists swe_king_auto_start_from_tournament_v1 on public.tournaments;
create trigger swe_king_auto_start_from_tournament_v1
after update of team_review_status,rotation_mode,king_pitch_id,middle_pitch_id,stream_pitch_id
on public.tournaments for each row
execute function private.swe_king_auto_start_from_tournament_v1();

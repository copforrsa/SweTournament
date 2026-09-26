-- V50.65 — Conquête du terrain: server-owned, idempotent workflow.
-- This migration deliberately preserves registrations, teams and all legacy matches.

alter table public.matches
  add column if not exists competition_type text,
  add column if not exists format_stage text,
  add column if not exists format_slot text,
  add column if not exists workflow_version integer;

create table if not exists public.tournament_format_workflows (
  tournament_id uuid primary key references public.tournaments(id) on delete cascade,
  format text not null check (format in ('classic','king_of_pitch','conquest')),
  phase text not null,
  config jsonb not null default '{}'::jsonb,
  state jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tournament_format_workflows enable row level security;

create unique index if not exists matches_one_format_slot_per_tournament_idx
  on public.matches(tournament_id, format_slot)
  where format_slot is not null;

alter table public.tournaments
  alter column team_review_duration_minutes set default 60;

create or replace function public.conquest_assert_operator_v2(p_workspace_id uuid, p_tournament_id uuid)
returns void
language plpgsql security definer set search_path='public','private'
as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  if not (
    private.is_platform_super_admin()
    or private.is_workspace_operational_admin(p_workspace_id)
    or private.coorganizer_can_edit_tournament(p_tournament_id)
  ) then
    raise exception 'Droit de gestion ou de saisie des scores requis';
  end if;
end;
$$;

create or replace function public.conquest_ranked_teams_v2(p_tournament_id uuid)
returns uuid[]
language sql stable security definer set search_path='public'
as $$
  with rows as (
    select home_team_id as team_id,
      case when home_score > away_score then 3 when home_score = away_score then 1 else 0 end as points,
      home_score as goals_for, away_score as goals_against
    from public.matches
    where tournament_id=p_tournament_id and competition_type='championship_qualification' and status='finished'
    union all
    select away_team_id,
      case when away_score > home_score then 3 when away_score = home_score then 1 else 0 end,
      away_score, home_score
    from public.matches
    where tournament_id=p_tournament_id and competition_type='championship_qualification' and status='finished'
  ), ranking as (
    select team_id, sum(points) as points, sum(goals_for-goals_against) as goal_difference, sum(goals_for) as goals_for
    from rows group by team_id
  )
  select coalesce(array_agg(team_id order by points desc, goal_difference desc, goals_for desc, team_id), '{}'::uuid[])
  from ranking;
$$;

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
declare v_order integer;
begin
  if p_home_team_id is null or p_away_team_id is null or p_home_team_id=p_away_team_id then return; end if;
  select coalesce(max(match_order),0)+1 into v_order from public.matches where tournament_id=p_tournament_id;
  insert into public.matches(
    tournament_id, home_team_id, away_team_id, match_order, status, home_score, away_score,
    round_label, rotation_role, rotation_generated, competition_type, format_stage, format_slot, workflow_version
  ) values (
    p_tournament_id, p_home_team_id, p_away_team_id, v_order, 'scheduled', 0, 0,
    p_label, 'conquest_v2', true, p_type, p_stage, p_slot, 2
  ) on conflict (tournament_id, format_slot) where format_slot is not null do nothing;
end;
$$;

create or replace function public.conquest_refresh_v2(p_tournament_id uuid)
returns jsonb
language plpgsql security definer set search_path='public','private'
as $$
declare
  t public.tournaments%rowtype;
  w public.tournament_format_workflows%rowtype;
  v_team_count integer;
  v_ranking uuid[];
  v_a uuid; v_b uuid; v_c uuid; v_d uuid;
  v_final_winner uuid;
begin
  select * into t from public.tournaments where id=p_tournament_id for update;
  if not found or t.format<>'conquest' then raise exception 'Ce tournoi n’est pas une Conquête'; end if;
  perform public.conquest_assert_operator_v2(t.workspace_id,t.id);
  select * into w from public.tournament_format_workflows where tournament_id=t.id and format='conquest' for update;
  if not found then raise exception 'Le workflow Conquête n’est pas initialisé'; end if;
  v_team_count:=coalesce((w.config->>'team_count')::integer,0);

  if w.phase='qualification' then
    if exists(select 1 from public.matches where tournament_id=t.id and competition_type='championship_qualification' and status<>'finished') then
      return jsonb_build_object('phase','qualification','ready',false);
    end if;
    v_ranking:=public.conquest_ranked_teams_v2(t.id);
    update public.tournament_format_workflows
      set phase='playoff_ready', state=jsonb_build_object('ranking',to_jsonb(v_ranking),'qualified_at',now()), updated_at=now()
      where tournament_id=t.id;
    update public.tournaments
      set rotation_mode='conquest', rotation_state=coalesce(rotation_state,'{}'::jsonb)||jsonb_build_object('format_workflow',jsonb_build_object('format','conquest','phase','playoff_ready','ranking',to_jsonb(v_ranking),'version',2))
      where id=t.id;
    return jsonb_build_object('phase','playoff_ready','ready',true,'ranking',to_jsonb(v_ranking));
  end if;

  if w.phase<>'playoffs' then
    return jsonb_build_object('phase',w.phase,'state',w.state);
  end if;

  select case when home_score>away_score then home_team_id when away_score>home_score then away_team_id else tie_break_winner_team_id end into v_a
    from public.matches where tournament_id=t.id and format_slot='playin_4_5' and status='finished';
  select case when home_score>away_score then home_team_id when away_score>home_score then away_team_id else tie_break_winner_team_id end into v_b
    from public.matches where tournament_id=t.id and format_slot='playin_3_6' and status='finished';
  select case when home_score>away_score then home_team_id when away_score>home_score then away_team_id else tie_break_winner_team_id end into v_c
    from public.matches where tournament_id=t.id and format_slot='semi_1' and status='finished';
  select case when home_score>away_score then home_team_id when away_score>home_score then away_team_id else tie_break_winner_team_id end into v_d
    from public.matches where tournament_id=t.id and format_slot='semi_2' and status='finished';

  if v_team_count=5 and v_a is not null then
    perform public.conquest_add_match_v2(t.id,(w.state->'ranking'->>0)::uuid,v_a,'conquest_playoff','semi_final','semi_1','Conquête • Demi-finale 1');
  elsif v_team_count=6 then
    if v_a is not null then perform public.conquest_add_match_v2(t.id,(w.state->'ranking'->>0)::uuid,v_a,'conquest_playoff','semi_final','semi_1','Conquête • Demi-finale 1'); end if;
    if v_b is not null then perform public.conquest_add_match_v2(t.id,(w.state->'ranking'->>1)::uuid,v_b,'conquest_playoff','semi_final','semi_2','Conquête • Demi-finale 2'); end if;
  end if;

  -- Reload the semi-final winners after possibly adding delayed semi-finals.
  select case when home_score>away_score then home_team_id when away_score>home_score then away_team_id else tie_break_winner_team_id end into v_c
    from public.matches where tournament_id=t.id and format_slot='semi_1' and status='finished';
  select case when home_score>away_score then home_team_id when away_score>home_score then away_team_id else tie_break_winner_team_id end into v_d
    from public.matches where tournament_id=t.id and format_slot='semi_2' and status='finished';
  if v_c is not null and v_d is not null then
    perform public.conquest_add_match_v2(t.id,v_c,v_d,'conquest_playoff','final','final','Conquête • Finale');
    perform public.conquest_add_match_v2(
      t.id,
      (select case when home_team_id=v_c then away_team_id else home_team_id end from public.matches where tournament_id=t.id and format_slot='semi_1' limit 1),
      (select case when home_team_id=v_d then away_team_id else home_team_id end from public.matches where tournament_id=t.id and format_slot='semi_2' limit 1),
      'classification','classification','third_place','Conquête • Match pour la 3e place'
    );
  end if;
  if v_team_count=6 and v_a is not null and v_b is not null then
    perform public.conquest_add_match_v2(
      t.id,
      (select case when home_team_id=v_a then away_team_id else home_team_id end from public.matches where tournament_id=t.id and format_slot='playin_4_5' limit 1),
      (select case when home_team_id=v_b then away_team_id else home_team_id end from public.matches where tournament_id=t.id and format_slot='playin_3_6' limit 1),
      'classification','classification','fifth_place','Conquête • Match pour la 5e place'
    );
  end if;

  select case when home_score>away_score then home_team_id when away_score>home_score then away_team_id else tie_break_winner_team_id end into v_final_winner
    from public.matches where tournament_id=t.id and format_slot='final' and status='finished';
  if v_final_winner is not null then
    update public.tournament_format_workflows
      set phase='finished',state=state||jsonb_build_object('winner_team_id',v_final_winner,'finished_at',now()),updated_at=now()
      where tournament_id=t.id;
    update public.tournaments
      set rotation_state=coalesce(rotation_state,'{}'::jsonb)||jsonb_build_object('format_workflow',jsonb_build_object('format','conquest','phase','finished','winner_team_id',v_final_winner,'version',2))
      where id=t.id;
    return jsonb_build_object('phase','finished','winner_team_id',v_final_winner);
  end if;
  return jsonb_build_object('phase','playoffs');
end;
$$;

create or replace function public.conquest_create_qualification_v2(p_tournament_id uuid, p_recreate boolean default false)
returns jsonb
language plpgsql security definer set search_path='public','private'
as $$
declare t public.tournaments%rowtype; v_teams uuid[]; v_count integer; i integer; j integer; v_created integer:=0;
begin
  select * into t from public.tournaments where id=p_tournament_id for update;
  if not found or t.format<>'conquest' then raise exception 'Ce parcours est réservé à Conquête'; end if;
  perform public.conquest_assert_operator_v2(t.workspace_id,t.id);
  select array_agg(id order by created_at,id) into v_teams from public.teams where tournament_id=t.id;
  v_count:=coalesce(array_length(v_teams,1),0);
  if v_count not between 4 and 6 then raise exception 'Conquête nécessite 4, 5 ou 6 équipes validées'; end if;
  if exists(select 1 from public.matches where tournament_id=t.id and rotation_generated and (competition_type in ('championship_qualification','conquest_playoff','classification') or rotation_role in ('conquest','conquest_league','championship','conquest_v2')) and status='finished') then
    raise exception 'Recréation verrouillée : un résultat est déjà enregistré';
  end if;
  if exists(select 1 from public.tournament_format_workflows where tournament_id=t.id) and not p_recreate then
    raise exception 'Le workflow existe déjà. Utilise la recréation avant le premier résultat.';
  end if;
  if p_recreate then
    delete from public.goals g using public.matches m
      where g.match_id=m.id and m.tournament_id=t.id and m.rotation_generated
        and (m.competition_type in ('championship_qualification','conquest_playoff','classification') or m.rotation_role in ('conquest','conquest_league','championship','conquest_v2'));
    delete from public.matches where tournament_id=t.id and rotation_generated
      and (competition_type in ('championship_qualification','conquest_playoff','classification') or rotation_role in ('conquest','conquest_league','championship','conquest_v2'));
    delete from public.tournament_format_workflows where tournament_id=t.id;
  end if;
  insert into public.tournament_format_workflows(tournament_id,format,phase,config,state)
    values(t.id,'conquest','qualification',jsonb_build_object('team_count',v_count,'mercy_goal_difference',mod(v_count,2)=1),jsonb_build_object('created_at',now()))
    on conflict(tournament_id) do update set format='conquest',phase='qualification',config=excluded.config,state=excluded.state,version=2,updated_at=now();
  for i in 1..v_count-1 loop
    for j in i+1..v_count loop
      v_created:=v_created+1;
      perform public.conquest_add_match_v2(t.id,v_teams[i],v_teams[j],'championship_qualification','qualification','qualification_'||i||'_'||j,'Championnat de qualification • Match '||v_created);
    end loop;
  end loop;
  update public.tournaments
    set rotation_mode='conquest', rotation_state=coalesce(rotation_state,'{}'::jsonb)||jsonb_build_object('format_workflow',jsonb_build_object('format','conquest','phase','qualification','team_count',v_count,'mercy_goal_difference',mod(v_count,2)=1,'version',2))
    where id=t.id;
  return jsonb_build_object('phase','qualification','created_matches',v_created,'team_count',v_count,'mercy_goal_difference',mod(v_count,2)=1);
end;
$$;

create or replace function public.conquest_start_playoffs_v2(p_tournament_id uuid)
returns jsonb
language plpgsql security definer set search_path='public','private'
as $$
declare t public.tournaments%rowtype; w public.tournament_format_workflows%rowtype; v_ranking uuid[]; v_count integer;
begin
  select * into t from public.tournaments where id=p_tournament_id for update;
  if not found or t.format<>'conquest' then raise exception 'Ce tournoi n’est pas une Conquête'; end if;
  perform public.conquest_assert_operator_v2(t.workspace_id,t.id);
  select * into w from public.tournament_format_workflows where tournament_id=t.id and format='conquest' for update;
  if not found or w.phase<>'playoff_ready' then raise exception 'Termine d’abord le championnat de qualification'; end if;
  select array_agg(value::uuid order by ordinality) into v_ranking from jsonb_array_elements_text(w.state->'ranking') with ordinality;
  v_count:=coalesce(array_length(v_ranking,1),0);
  if v_count=4 then
    perform public.conquest_add_match_v2(t.id,v_ranking[1],v_ranking[4],'conquest_playoff','semi_final','semi_1','Conquête • Demi-finale 1');
    perform public.conquest_add_match_v2(t.id,v_ranking[2],v_ranking[3],'conquest_playoff','semi_final','semi_2','Conquête • Demi-finale 2');
  elsif v_count=5 then
    perform public.conquest_add_match_v2(t.id,v_ranking[4],v_ranking[5],'conquest_playoff','playoff','playin_4_5','Conquête • Barrage 4e / 5e');
    perform public.conquest_add_match_v2(t.id,v_ranking[2],v_ranking[3],'conquest_playoff','semi_final','semi_2','Conquête • Demi-finale 2');
  elsif v_count=6 then
    perform public.conquest_add_match_v2(t.id,v_ranking[3],v_ranking[6],'conquest_playoff','playoff','playin_3_6','Conquête • Barrage 3e / 6e');
    perform public.conquest_add_match_v2(t.id,v_ranking[4],v_ranking[5],'conquest_playoff','playoff','playin_4_5','Conquête • Barrage 4e / 5e');
  else
    raise exception 'Le tableau Conquête accepte 4, 5 ou 6 équipes';
  end if;
  update public.tournament_format_workflows set phase='playoffs',updated_at=now() where tournament_id=t.id;
  update public.tournaments set rotation_state=coalesce(rotation_state,'{}'::jsonb)||jsonb_build_object('format_workflow',jsonb_build_object('format','conquest','phase','playoffs','ranking',to_jsonb(v_ranking),'version',2)) where id=t.id;
  return jsonb_build_object('phase','playoffs','ranking',to_jsonb(v_ranking));
end;
$$;

create or replace function public.conquest_finish_match_v2(p_match_id uuid, p_tie_break_winner_team_id uuid default null)
returns jsonb
language plpgsql security definer set search_path='public','private'
as $$
declare m public.matches%rowtype; t public.tournaments%rowtype;
begin
  select * into m from public.matches where id=p_match_id for update;
  if not found then raise exception 'Match introuvable'; end if;
  select * into t from public.tournaments where id=m.tournament_id for update;
  if not found or t.format<>'conquest' or m.competition_type not in ('conquest_playoff','classification') then raise exception 'Ce match ne fait pas partie de la phase Conquête'; end if;
  perform public.conquest_assert_operator_v2(t.workspace_id,t.id);
  if m.status='finished' then return public.conquest_refresh_v2(t.id); end if;
  if m.home_score=m.away_score and (p_tie_break_winner_team_id is null or p_tie_break_winner_team_id not in (m.home_team_id,m.away_team_id)) then
    raise exception 'Choisis le vainqueur du départage';
  end if;
  update public.matches set status='finished',finished_at=now(),tie_break_winner_team_id=case when home_score=away_score then p_tie_break_winner_team_id else null end,tie_break_method_used=case when home_score=away_score then 'penalties' else null end where id=m.id;
  return public.conquest_refresh_v2(t.id);
end;
$$;

create or replace function public.conquest_guard_finished_match_v2()
returns trigger
language plpgsql security definer set search_path='public'
as $$
begin
  if new.competition_type='conquest_playoff' and old.status is distinct from 'finished' and new.status='finished'
     and new.home_score=new.away_score
     and (new.tie_break_winner_team_id is null or new.tie_break_winner_team_id not in (new.home_team_id,new.away_team_id)) then
    raise exception 'Match nul : choisis le vainqueur du départage Conquête';
  end if;
  return new;
end;
$$;

create or replace function public.conquest_advance_after_match_v2()
returns trigger
language plpgsql security definer set search_path='public'
as $$
begin
  if new.competition_type in ('championship_qualification','conquest_playoff','classification')
     and old.status is distinct from 'finished' and new.status='finished' then
    perform public.conquest_refresh_v2(new.tournament_id);
  end if;
  return new;
end;
$$;

drop trigger if exists conquest_guard_finished_match_v2 on public.matches;
create trigger conquest_guard_finished_match_v2
  before update of status, tie_break_winner_team_id on public.matches
  for each row execute function public.conquest_guard_finished_match_v2();

drop trigger if exists conquest_advance_after_match_v2 on public.matches;
create trigger conquest_advance_after_match_v2
  after update of status on public.matches
  for each row execute function public.conquest_advance_after_match_v2();

revoke all on table public.tournament_format_workflows from anon, authenticated;
revoke all on function public.conquest_assert_operator_v2(uuid,uuid) from public, anon;
revoke all on function public.conquest_add_match_v2(uuid,uuid,uuid,text,text,text,text) from public, anon;
revoke all on function public.conquest_refresh_v2(uuid) from public, anon;
revoke all on function public.conquest_create_qualification_v2(uuid,boolean) from public, anon;
revoke all on function public.conquest_start_playoffs_v2(uuid) from public, anon;
revoke all on function public.conquest_finish_match_v2(uuid,uuid) from public, anon;
grant execute on function public.conquest_refresh_v2(uuid) to authenticated;
grant execute on function public.conquest_create_qualification_v2(uuid,boolean) to authenticated;
grant execute on function public.conquest_start_playoffs_v2(uuid) to authenticated;
grant execute on function public.conquest_finish_match_v2(uuid,uuid) to authenticated;

notify pgrst,'reload schema';

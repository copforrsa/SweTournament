-- V44.00: immutable player ratings, post-match appreciations and co-organizer insights.

create table if not exists public.player_post_match_observations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  evaluator_user_id uuid not null references auth.users(id) on delete cascade,
  appreciation_code smallint not null check (appreciation_code between 1 and 6),
  rating_delta numeric(2,1) not null check (rating_delta in (0,-0.2,-0.1,0.1,0.2,0.3)),
  created_at timestamptz not null default now(),
  unique(tournament_id,player_id,evaluator_user_id)
);

create index if not exists player_post_match_observations_workspace_evaluator_idx
  on public.player_post_match_observations(workspace_id,evaluator_user_id);
create index if not exists player_post_match_observations_player_idx
  on public.player_post_match_observations(player_id);

alter table public.player_post_match_observations enable row level security;
revoke all on table public.player_post_match_observations from public,anon,authenticated;

create or replace function private.swe_effective_player_rating_v4400(p_player_id uuid)
returns numeric
language sql
stable
set search_path=''
as $$
  with target as (
    select p.id,p.global_player_id from public.players p where p.id=p_player_id
  ), linked as (
    select p.id
    from target t
    join public.players p on (t.global_player_id is not null and p.global_player_id=t.global_player_id)
                            or (t.global_player_id is null and p.id=t.id)
  ), base as (
    select avg(r.rating)::numeric value
    from public.player_skill_ratings r join linked l on l.id=r.player_id
  ), adjustment as (
    select coalesce(sum(o.rating_delta),0)::numeric value
    from public.player_post_match_observations o join linked l on l.id=o.player_id
  )
  select case when base.value is null then null
              else round(least(5::numeric,greatest(1::numeric,base.value+adjustment.value)),2) end
  from base cross join adjustment;
$$;

revoke all on function private.swe_effective_player_rating_v4400(uuid) from public;

create or replace function public.get_effective_player_rating(p_player_id uuid)
returns numeric
language sql
stable security definer
set search_path='public','private','pg_temp'
as $$
  select coalesce(private.swe_effective_player_rating_v4400(p_player_id),
                  (select p.skill_level::numeric from public.players p where p.id=p_player_id),2::numeric);
$$;
revoke all on function public.get_effective_player_rating(uuid) from public,anon;
grant execute on function public.get_effective_player_rating(uuid) to authenticated;

create or replace function public.get_player_skill_aggregates(p_workspace_id uuid)
returns table(player_id uuid,voter_count bigint,avg_rating numeric,avg_cardio numeric,avg_dribble numeric,avg_collectif numeric,avg_frappe numeric,top_role text)
language plpgsql security definer
set search_path='public','private','pg_temp'
as $$
begin
  if not coalesce((select e.player_ratings_enabled from public.workspace_entitlements e where e.workspace_id=p_workspace_id),false) then return; end if;
  if not (private.is_workspace_admin(p_workspace_id) or private.is_workspace_coorganizer(p_workspace_id)) then raise exception 'Accès refusé'; end if;
  return query
  with linked as (
    select p.id local_player_id,coalesce(p.global_player_id,p.id) identity_id
    from public.players p where p.workspace_id=p_workspace_id
  ), ratings as (
    select l.local_player_id,r.rating,r.cardio,r.dribble,r.collectif,r.frappe,r.preferred_role
    from linked l join public.players px on coalesce(px.global_player_id,px.id)=l.identity_id
    join public.player_skill_ratings r on r.player_id=px.id
  ), base as (
    select r.local_player_id,count(*)::bigint voter_count,avg(r.rating)::numeric avg_rating,
      round(avg(r.cardio)::numeric,1) avg_cardio,round(avg(r.dribble)::numeric,1) avg_dribble,
      round(avg(r.collectif)::numeric,1) avg_collectif,round(avg(r.frappe)::numeric,1) avg_frappe
    from ratings r group by r.local_player_id
  ), adjustments as (
    select l.local_player_id,coalesce(sum(o.rating_delta),0)::numeric delta
    from linked l join public.players px on coalesce(px.global_player_id,px.id)=l.identity_id
    left join public.player_post_match_observations o on o.player_id=px.id
    group by l.local_player_id
  ), roles as (
    select r.local_player_id,r.preferred_role,count(*) cnt,
      row_number() over(partition by r.local_player_id order by count(*) desc,r.preferred_role) rn
    from ratings r where r.preferred_role is not null group by r.local_player_id,r.preferred_role
  )
  select b.local_player_id,b.voter_count,
    round(least(5::numeric,greatest(1::numeric,b.avg_rating+coalesce(a.delta,0))),1),
    b.avg_cardio,b.avg_dribble,b.avg_collectif,b.avg_frappe,
    (select rr.preferred_role from roles rr where rr.local_player_id=b.local_player_id and rr.rn=1 limit 1)
  from base b left join adjustments a on a.local_player_id=b.local_player_id;
end;
$$;

create or replace function public.submit_player_skill_review_v2(
  p_player_id uuid,p_cardio smallint,p_dribble smallint,p_collectif smallint,p_frappe smallint,
  p_preferred_role text,p_change_reason text default null,p_change_note text default null,p_tournament_id uuid default null)
returns jsonb
language plpgsql security definer
set search_path='public','private','pg_temp'
as $$
declare v_workspace uuid; v_rating numeric(3,2); v_linked uuid; v_old public.player_skill_ratings%rowtype;
begin
  if p_cardio not between 1 and 5 or p_dribble not between 1 and 5 or p_collectif not between 1 and 5 or p_frappe not between 1 and 5 then raise exception 'Chaque critère doit être noté de 1 à 5'; end if;
  if p_preferred_role not in ('defenseur','metronome','ratisseur','finisseur','dribbleur','frappeur','top_player') then raise exception 'Rôle de prédilection invalide'; end if;
  select p.workspace_id into v_workspace from public.players p where p.id=p_player_id and p.active=true;
  if v_workspace is null then raise exception 'Joueur introuvable'; end if;
  if not coalesce((select e.player_ratings_enabled from public.workspace_entitlements e where e.workspace_id=v_workspace),false) then raise exception 'Le module Notation des joueurs est désactivé pour cet espace'; end if;
  if not (private.is_workspace_admin(v_workspace) or private.is_workspace_coorganizer(v_workspace)) then raise exception 'Accès refusé'; end if;
  select wm.linked_player_id into v_linked from public.workspace_members wm where wm.workspace_id=v_workspace and wm.user_id=(select auth.uid());
  if v_linked=p_player_id then raise exception 'Tu ne peux pas évaluer ton propre profil'; end if;
  select * into v_old from public.player_skill_ratings r where r.player_id=p_player_id and r.evaluator_user_id=(select auth.uid());
  if found then raise exception 'Cette évaluation est définitive. Seul le Super Admin peut la corriger.'; end if;
  v_rating:=round((p_cardio+p_dribble+p_collectif+p_frappe)::numeric/4,2);
  insert into public.player_skill_ratings(workspace_id,player_id,evaluator_user_id,rating,cardio,dribble,collectif,frappe,preferred_role,updated_at)
  values(v_workspace,p_player_id,(select auth.uid()),v_rating,p_cardio,p_dribble,p_collectif,p_frappe,p_preferred_role,now());
  insert into public.player_skill_rating_history(workspace_id,player_id,evaluator_user_id,tournament_id,old_values,new_values,change_reason,change_note)
  values(v_workspace,p_player_id,(select auth.uid()),p_tournament_id,null,
    jsonb_build_object('rating',v_rating,'cardio',p_cardio,'dribble',p_dribble,'collectif',p_collectif,'frappe',p_frappe,'preferred_role',p_preferred_role),
    'initial_rating',null);
  return jsonb_build_object('saved',true,'rating',v_rating,'changed',false,'immutable',true);
end;
$$;
revoke all on function public.submit_player_skill_review_v2(uuid,smallint,smallint,smallint,smallint,text,text,text,uuid) from public,anon;
grant execute on function public.submit_player_skill_review_v2(uuid,smallint,smallint,smallint,smallint,text,text,text,uuid) to authenticated;

create or replace function public.submit_post_tournament_player_review(
  p_tournament_id uuid,p_player_id uuid,p_cardio smallint,p_dribble smallint,p_collectif smallint,p_frappe smallint,
  p_preferred_role text,p_change_reason text default null,p_change_note text default null)
returns jsonb
language plpgsql security definer
set search_path='public','private','pg_temp'
as $$
declare s public.tournament_rating_sessions%rowtype;
begin
  select * into s from public.tournament_rating_sessions where tournament_id=p_tournament_id;
  if not found or s.status<>'open' or s.closes_at<=now() then raise exception 'La période de notation est terminée'; end if;
  if not exists(select 1 from public.tournament_rating_evaluators e where e.tournament_id=p_tournament_id and e.evaluator_user_id=(select auth.uid())) then raise exception 'Tu ne fais pas partie des co-gestionnaires invités à noter ce tournoi'; end if;
  if not exists(select 1 from public.tournament_players tp where tp.tournament_id=p_tournament_id and tp.player_id=p_player_id and tp.present=true and coalesce(tp.registration_status,'')<>'waitlist') then raise exception 'Ce joueur n’était pas présent sur ce tournoi'; end if;
  if exists(select 1 from public.player_skill_ratings r where r.player_id=p_player_id and r.evaluator_user_id=(select auth.uid())) then raise exception 'Ce joueur a déjà une note définitive. Choisis maintenant une appréciation de match.'; end if;
  return public.submit_player_skill_review_v2(p_player_id,p_cardio,p_dribble,p_collectif,p_frappe,p_preferred_role,null,null,p_tournament_id);
end;
$$;
revoke all on function public.submit_post_tournament_player_review(uuid,uuid,smallint,smallint,smallint,smallint,text,text,text) from public,anon;
grant execute on function public.submit_post_tournament_player_review(uuid,uuid,smallint,smallint,smallint,smallint,text,text,text) to authenticated;

create or replace function public.submit_post_tournament_player_observation_v1(p_tournament_id uuid,p_player_id uuid,p_appreciation_code smallint)
returns jsonb
language plpgsql security definer
set search_path='public','private','pg_temp'
as $$
declare s public.tournament_rating_sessions%rowtype; v_workspace uuid; v_delta numeric(2,1);
begin
  if p_appreciation_code not between 1 and 6 then raise exception 'Appréciation invalide'; end if;
  select * into s from public.tournament_rating_sessions where tournament_id=p_tournament_id;
  if not found or s.status<>'open' or s.closes_at<=now() then raise exception 'La période de notation est terminée'; end if;
  v_workspace:=s.workspace_id;
  if not exists(select 1 from public.tournament_rating_evaluators e where e.tournament_id=p_tournament_id and e.evaluator_user_id=(select auth.uid())) then raise exception 'Accès refusé'; end if;
  if not exists(select 1 from public.tournament_players tp where tp.tournament_id=p_tournament_id and tp.player_id=p_player_id and tp.present=true and coalesce(tp.registration_status,'')<>'waitlist') then raise exception 'Ce joueur n’était pas présent sur ce tournoi'; end if;
  if not exists(select 1 from public.player_skill_ratings r where r.player_id=p_player_id and r.evaluator_user_id=(select auth.uid())) then raise exception 'Attribue d’abord sa note définitive dans Joueurs / Notes'; end if;
  v_delta:=case p_appreciation_code when 1 then 0 when 2 then -0.2 when 3 then -0.1 when 4 then 0.1 when 5 then 0.2 when 6 then 0.3 end;
  insert into public.player_post_match_observations(workspace_id,tournament_id,player_id,evaluator_user_id,appreciation_code,rating_delta)
  values(v_workspace,p_tournament_id,p_player_id,(select auth.uid()),p_appreciation_code,v_delta);
  insert into public.player_skill_rating_history(workspace_id,player_id,evaluator_user_id,tournament_id,old_values,new_values,change_reason,change_note)
  select v_workspace,p_player_id,(select auth.uid()),p_tournament_id,
    jsonb_build_object('rating',r.rating),jsonb_build_object('rating',r.rating,'appreciation_code',p_appreciation_code,'rating_delta',v_delta),
    'post_match_observation','Appréciation définitive après match'
  from public.player_skill_ratings r where r.player_id=p_player_id and r.evaluator_user_id=(select auth.uid());
  return jsonb_build_object('saved',true,'appreciation_code',p_appreciation_code,'rating_delta',v_delta,'effective_rating',private.swe_effective_player_rating_v4400(p_player_id));
exception when unique_violation then
  raise exception 'Ton appréciation pour ce joueur et ce tournoi est déjà enregistrée et définitive.';
end;
$$;
revoke all on function public.submit_post_tournament_player_observation_v1(uuid,uuid,smallint) from public,anon;
grant execute on function public.submit_post_tournament_player_observation_v1(uuid,uuid,smallint) to authenticated;

create or replace function public.get_my_coorganizer_season_stats_v1(p_workspace_id uuid)
returns jsonb
language plpgsql security definer
set search_path='public','private','auth','pg_temp'
as $$
declare v_player uuid; v_season uuid; v_total integer:=0; v_present integer:=0; v_rated integer:=0; v_met integer:=0; v_rows jsonb:='[]'::jsonb;
begin
  if not private.is_workspace_coorganizer(p_workspace_id) then raise exception 'Accès co-gestionnaire requis'; end if;
  select wm.linked_player_id into v_player from public.workspace_members wm
   where wm.workspace_id=p_workspace_id and wm.user_id=(select auth.uid()) and wm.active=true;
  if v_player is null then
    select p.id into v_player from public.global_player_profiles gp join public.players p on p.global_player_id=gp.id
     where gp.user_id=(select auth.uid()) and p.workspace_id=p_workspace_id and p.active=true limit 1;
  end if;
  select s.id into v_season from public.seasons s where s.workspace_id=p_workspace_id and s.is_active=true order by s.created_at desc limit 1;
  select count(*) into v_rated from public.player_skill_ratings r where r.workspace_id=p_workspace_id and r.evaluator_user_id=(select auth.uid());
  if v_player is not null then
    select count(*) into v_total from public.tournaments t where t.workspace_id=p_workspace_id and t.season_id=v_season and t.status='finished';
    select count(distinct tp.tournament_id) into v_present from public.tournament_players tp join public.tournaments t on t.id=tp.tournament_id
      where tp.player_id=v_player and tp.present=true and coalesce(tp.registration_status,'')<>'waitlist' and t.season_id=v_season and t.status='finished';
    with my_matches as (
      select distinct a.match_id,m.tournament_id from public.match_player_assignments a join public.matches m on m.id=a.match_id
       where a.player_id=v_player and a.team_id is not null and m.status in ('live','finished')
    ), together as (
      select a.player_id,array_agg(distinct coalesce(t.name,'SWÉ du '||to_char(t.tournament_date,'DD/MM/YYYY')) order by coalesce(t.name,'SWÉ du '||to_char(t.tournament_date,'DD/MM/YYYY'))) tournaments
      from my_matches mm join public.match_player_assignments a on a.match_id=mm.match_id and a.player_id<>v_player and a.team_id is not null
      join public.tournaments t on t.id=mm.tournament_id group by a.player_id
    )
    select count(*),coalesce(jsonb_agg(jsonb_build_object('player_id',p.id,'player_name',p.name,'tournaments',t.tournaments,
      'rated',r.player_id is not null,'rating',r.rating) order by lower(p.name)),'[]'::jsonb)
      into v_met,v_rows from together t join public.players p on p.id=t.player_id
      left join public.player_skill_ratings r on r.player_id=p.id and r.evaluator_user_id=(select auth.uid());
  end if;
  return jsonb_build_object('linked_player_id',v_player,'profile_linked',v_player is not null,'season_id',v_season,
    'season_tournaments',v_total,'season_attended',v_present,'season_presence_percent',case when v_total>0 then round(v_present*100.0/v_total) else 0 end,
    'players_met',v_met,'players_rated',v_rated,'players_unrated',coalesce((select count(*) from jsonb_array_elements(v_rows) as x(value) where coalesce((x.value->>'rated')::boolean,false)=false),0),
    'teammates',v_rows);
end;
$$;
revoke all on function public.get_my_coorganizer_season_stats_v1(uuid) from public,anon;
grant execute on function public.get_my_coorganizer_season_stats_v1(uuid) to authenticated;

create or replace function public.super_admin_update_player_skill_rating_v1(
  p_player_id uuid,p_evaluator_user_id uuid,p_cardio smallint,p_dribble smallint,p_collectif smallint,p_frappe smallint,p_preferred_role text,p_reason text)
returns jsonb
language plpgsql security definer
set search_path='public','private','pg_temp'
as $$
declare v_old public.player_skill_ratings%rowtype; v_rating numeric(3,2); v_reason text:=nullif(trim(coalesce(p_reason,'')),'');
begin
  if not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  if v_reason is null then raise exception 'Le motif de correction est obligatoire'; end if;
  if p_cardio not between 1 and 5 or p_dribble not between 1 and 5 or p_collectif not between 1 and 5 or p_frappe not between 1 and 5 then raise exception 'Chaque critère doit être noté de 1 à 5'; end if;
  if p_preferred_role not in ('defenseur','metronome','ratisseur','finisseur','dribbleur','frappeur','top_player') then raise exception 'Rôle invalide'; end if;
  select * into v_old from public.player_skill_ratings r where r.player_id=p_player_id and r.evaluator_user_id=p_evaluator_user_id for update;
  if not found then raise exception 'Évaluation introuvable'; end if;
  v_rating:=round((p_cardio+p_dribble+p_collectif+p_frappe)::numeric/4,2);
  update public.player_skill_ratings set rating=v_rating,cardio=p_cardio,dribble=p_dribble,collectif=p_collectif,frappe=p_frappe,preferred_role=p_preferred_role,updated_at=now()
   where player_id=p_player_id and evaluator_user_id=p_evaluator_user_id;
  insert into public.player_skill_rating_history(workspace_id,player_id,evaluator_user_id,old_values,new_values,change_reason,change_note)
  values(v_old.workspace_id,p_player_id,p_evaluator_user_id,
    jsonb_build_object('rating',v_old.rating,'cardio',v_old.cardio,'dribble',v_old.dribble,'collectif',v_old.collectif,'frappe',v_old.frappe,'preferred_role',v_old.preferred_role),
    jsonb_build_object('rating',v_rating,'cardio',p_cardio,'dribble',p_dribble,'collectif',p_collectif,'frappe',p_frappe,'preferred_role',p_preferred_role),
    'super_admin_correction',v_reason);
  return jsonb_build_object('saved',true,'rating',v_rating);
end;
$$;
revoke all on function public.super_admin_update_player_skill_rating_v1(uuid,uuid,smallint,smallint,smallint,smallint,text,text) from public,anon;
grant execute on function public.super_admin_update_player_skill_rating_v1(uuid,uuid,smallint,smallint,smallint,smallint,text,text) to authenticated;

create or replace function public.get_my_post_tournament_observations_v1(p_tournament_id uuid)
returns table(player_id uuid,appreciation_code smallint,rating_delta numeric,created_at timestamptz)
language plpgsql security definer
set search_path='public','private','pg_temp'
as $$
declare v_workspace uuid;
begin
  select t.workspace_id into v_workspace from public.tournaments t where t.id=p_tournament_id;
  if v_workspace is null or not (private.is_workspace_admin(v_workspace) or private.is_workspace_coorganizer(v_workspace)) then raise exception 'Accès refusé'; end if;
  return query select o.player_id,o.appreciation_code,o.rating_delta,o.created_at
    from public.player_post_match_observations o
    where o.tournament_id=p_tournament_id and o.evaluator_user_id=(select auth.uid());
end;
$$;
revoke all on function public.get_my_post_tournament_observations_v1(uuid) from public,anon;
grant execute on function public.get_my_post_tournament_observations_v1(uuid) to authenticated;

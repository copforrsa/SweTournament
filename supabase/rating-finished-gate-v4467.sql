create or replace function private.require_post_tournament_rating_v4467(p_tournament_id uuid,p_player_id uuid default null)
returns void language plpgsql security invoker set search_path='' as $$
declare t public.tournaments%rowtype;
begin
 select * into t from public.tournaments where id=p_tournament_id for share;
 if not found or t.status<>'finished' then raise exception 'La notation après tournoi sera disponible une fois le tournoi terminé';end if;
 if auth.uid() is null or not (private.is_workspace_admin(t.workspace_id) or exists(select 1 from public.tournament_rating_evaluators e where e.tournament_id=t.id and e.evaluator_user_id=auth.uid())) then raise exception 'Accès refusé';end if;
 if not exists(select 1 from public.tournament_rating_sessions s where s.tournament_id=t.id and s.status='open' and s.closes_at>now()) then raise exception 'La période de notation est terminée';end if;
 if p_player_id is not null and not exists(select 1 from public.tournament_players tp join public.players p on p.id=tp.player_id where tp.tournament_id=t.id and tp.player_id=p_player_id and p.workspace_id=t.workspace_id and tp.present and coalesce(tp.registration_status,'')<>'waitlist') then raise exception 'Ce joueur n’était pas présent sur ce tournoi';end if;
end $$;
revoke all on function private.require_post_tournament_rating_v4467(uuid,uuid) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.complete_post_tournament_rating_session(p_tournament_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 perform private.require_post_tournament_rating_v4467(p_tournament_id);
 update public.tournament_rating_evaluators set completed_at=now() where tournament_id=p_tournament_id and evaluator_user_id=auth.uid();
 if not found then raise exception 'Session de notation introuvable'; end if;
end $function$;
CREATE OR REPLACE FUNCTION public.get_my_coorganizer_latest_rating_action_v1(p_workspace_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=(select auth.uid());
  v_player uuid;
  v_tournament public.tournaments%rowtype;
  v_session public.tournament_rating_sessions%rowtype;
  v_total integer:=0;
  v_done integer:=0;
  v_completed_at timestamptz;
begin
  if v_uid is null then raise exception 'Authentification requise'; end if;
  select wm.linked_player_id into v_player
  from public.workspace_members wm
  where wm.workspace_id=p_workspace_id and wm.user_id=v_uid and wm.role='coorganizer' and coalesce(wm.active,true)=true;
  if not found then raise exception 'Accès refusé'; end if;

  select t.* into v_tournament
  from public.tournaments t
  join public.tournament_rating_sessions s on s.tournament_id=t.id and s.status='open' and s.closes_at>now()
  join public.tournament_rating_evaluators e on e.tournament_id=t.id and e.evaluator_user_id=v_uid
  join public.tournament_players mine on mine.tournament_id=t.id and mine.player_id=v_player
    and coalesce(mine.present,false)=true and coalesce(mine.registration_status,'')<>'waitlist'
  where t.status='finished' and t.workspace_id=p_workspace_id
  order by t.tournament_date desc nulls last,t.created_at desc
  limit 1;

  if v_tournament.id is null then
    return jsonb_build_object('assigned',false,'rating_action',jsonb_build_object('selected',false,'status','not_started'));
  end if;

  select s.* into v_session from public.tournament_rating_sessions s where s.tournament_id=v_tournament.id;

  select count(distinct tp.player_id) into v_total
  from public.team_players tp
  join public.teams tm on tm.id=tp.team_id and tm.tournament_id=v_tournament.id
  join public.tournament_players tpp on tpp.tournament_id=v_tournament.id and tpp.player_id=tp.player_id
  where coalesce(tpp.present,false)=true and coalesce(tpp.registration_status,'')<>'waitlist' and not private.is_own_rating_player_v4463(tp.player_id);

  select count(distinct h.player_id) into v_done
  from public.player_skill_rating_history h
  where h.tournament_id=v_tournament.id and h.evaluator_user_id=v_uid and not private.is_own_rating_player_v4463(h.player_id);

  select e.completed_at into v_completed_at
  from public.tournament_rating_evaluators e
  where e.tournament_id=v_tournament.id and e.evaluator_user_id=v_uid;

  return jsonb_build_object(
    'assigned',true,
    'tournament',jsonb_build_object(
      'id',v_tournament.id,
      'name',coalesce(v_tournament.name,'SWÉ du '||to_char(v_tournament.tournament_date,'DD/MM/YYYY')),
      'date',v_tournament.tournament_date
    ),
    'rating_action',jsonb_build_object(
      'selected',true,'total',v_total,'done',least(v_done,v_total),'completed_at',v_completed_at,
      'status','open','deadline',v_session.closes_at
    )
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.get_my_coorganizer_tournament_action_progress_v1(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_tournament public.tournaments%rowtype;
  v_member public.workspace_members%rowtype;
  v_permissions public.coorganizer_permissions%rowtype;
  v_review jsonb := '{}'::jsonb;
  v_rating_session public.tournament_rating_sessions%rowtype;
  v_rating_completed_at timestamptz;
  v_team_total integer := 0;
  v_rating_total integer := 0;
  v_rating_done integer := 0;
  v_profile_name text;
begin
  if v_user_id is null then raise exception 'Authentification requise'; end if;
  select * into v_tournament from public.tournaments t where t.id=p_tournament_id;
  if not found then raise exception 'Tournoi introuvable'; end if;

  select * into v_member
  from public.workspace_members wm
  where wm.workspace_id=v_tournament.workspace_id
    and wm.user_id=v_user_id
    and wm.role='coorganizer'
    and coalesce(wm.active,true)=true;
  if not found then raise exception 'Accès refusé'; end if;

  select * into v_permissions
  from public.coorganizer_permissions cp
  where cp.workspace_id=v_tournament.workspace_id and cp.user_id=v_user_id;

  select p.name into v_profile_name from public.players p where p.id=v_member.linked_player_id;
  select count(*) into v_team_total from public.teams tm where tm.tournament_id=p_tournament_id;

  if public.team_review_entitled(v_tournament.workspace_id) then
    v_review:=public.get_tournament_team_review_state(p_tournament_id);
  end if;

  select s.* into v_rating_session
  from public.tournament_rating_sessions s
  where s.tournament_id=p_tournament_id;

  select e.completed_at into v_rating_completed_at
  from public.tournament_rating_evaluators e
  where e.tournament_id=p_tournament_id and e.evaluator_user_id=v_user_id;

  if exists(
    select 1 from public.tournament_rating_evaluators e
    where e.tournament_id=p_tournament_id and e.evaluator_user_id=v_user_id
  ) then
    select count(distinct tp.player_id) into v_rating_total
    from public.team_players tp
    join public.teams tm on tm.id=tp.team_id and tm.tournament_id=p_tournament_id
    join public.tournament_players tpp on tpp.tournament_id=p_tournament_id and tpp.player_id=tp.player_id
    where coalesce(tpp.present,false)=true and coalesce(tpp.registration_status,'')<>'waitlist' and not private.is_own_rating_player_v4463(tp.player_id);

    select count(distinct h.player_id) into v_rating_done
    from public.player_skill_rating_history h
    where h.tournament_id=p_tournament_id and h.evaluator_user_id=v_user_id and not private.is_own_rating_player_v4463(h.player_id);
  end if;

  return jsonb_build_object(
    'tournament',jsonb_build_object(
      'id',v_tournament.id,
      'workspace_id',v_tournament.workspace_id,
      'name',coalesce(v_tournament.name,'SWÉ du '||to_char(v_tournament.tournament_date,'DD/MM/YYYY')),
      'date',v_tournament.tournament_date,
      'status',v_tournament.status
    ),
    'profile',jsonb_build_object('linked_player_id',v_member.linked_player_id,'name',v_profile_name),
    'permissions',jsonb_build_object(
      'can_enter_scores',coalesce(v_permissions.can_enter_scores,false),
      'can_view_players',coalesce(v_permissions.can_view_players,true),
      'can_generate_teams',coalesce(v_permissions.can_generate_teams,false),
      'can_create_tournaments',coalesce(v_permissions.can_create_tournaments,false),
      'can_add_members',coalesce(v_permissions.can_add_members,false),
      'can_delete_members',coalesce(v_permissions.can_delete_members,false),
      'can_invite_coorganizers',coalesce(v_permissions.can_invite_coorganizers,false),
      'temporary_admin_until',v_permissions.temporary_admin_until,
      'personal_instructions',v_permissions.personal_instructions
    ),
    'team_action',jsonb_build_object(
      'total',v_team_total,
      'done',case when coalesce(v_review->>'my_vote','')<>'' then v_team_total else 0 end,
      'enabled',coalesce((v_review->>'enabled')::boolean,false),
      'requested',coalesce((v_review->>'requested')::boolean,false),
      'eligible',coalesce((v_review->>'my_eligible')::boolean,false),
      'status',coalesce(v_review->>'status','not_started'),
      'my_vote',v_review->>'my_vote',
      'deadline',v_review->>'deadline'
    ),
    'rating_action',jsonb_build_object(
      'selected',v_tournament.status='finished' and exists(select 1 from public.tournament_rating_evaluators e where e.tournament_id=p_tournament_id and e.evaluator_user_id=v_user_id),
      'total',v_rating_total,
      'done',least(v_rating_done,v_rating_total),
      'completed_at',v_rating_completed_at,
      'status',case when v_tournament.status<>'finished' then 'not_started' when v_rating_session.tournament_id is null then 'not_started' when v_rating_session.status<>'open' or v_rating_session.closes_at<=now() then 'expired' else 'open' end,
      'deadline',v_rating_session.closes_at
    )
  );
end
$function$;
CREATE OR REPLACE FUNCTION public.get_my_post_tournament_rating_sessions(p_workspace_id uuid)
 RETURNS TABLE(tournament_id uuid, tournament_name text, tournament_date date, closes_at timestamp with time zone, completed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
begin
 if not private.is_workspace_member(p_workspace_id) then raise exception 'Accès refusé'; end if;
 return query select t.id,t.name::text,t.tournament_date,s.closes_at,e.completed_at
 from public.tournament_rating_sessions s join public.tournaments t on t.id=s.tournament_id join public.tournament_rating_evaluators e on e.tournament_id=t.id and e.evaluator_user_id=auth.uid()
 where t.status='finished' and s.workspace_id=p_workspace_id and s.status='open' and s.closes_at>now() order by t.tournament_date desc;
end $function$;
CREATE OR REPLACE FUNCTION public.get_my_post_tournament_rating_sessions_v2(p_workspace_id uuid)
 RETURNS TABLE(tournament_id uuid, tournament_name text, tournament_date date, closes_at timestamp with time zone, completed_at timestamp with time zone, status text, expired boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
begin
  if not private.is_workspace_member(p_workspace_id) then raise exception 'Accès refusé'; end if;
  return query
  select t.id,coalesce(t.name::text,'Swé du '||to_char(t.tournament_date,'DD/MM/YYYY')),t.tournament_date,s.closes_at,e.completed_at,
         case when s.status<>'open' or s.closes_at<=now() then 'expired' else 'open' end,
         (s.status<>'open' or s.closes_at<=now())
  from public.tournament_rating_sessions s
  join public.tournaments t on t.id=s.tournament_id
  join public.tournament_rating_evaluators e on e.tournament_id=t.id and e.evaluator_user_id=auth.uid()
  where t.status='finished' and s.workspace_id=p_workspace_id
  order by t.tournament_date desc;
end $function$;
CREATE OR REPLACE FUNCTION public.get_post_tournament_rating_sheet(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare v_t public.tournaments%rowtype; v_allowed boolean;
begin
 select * into v_t from public.tournaments where id=p_tournament_id;
 if not found then raise exception 'Tournoi introuvable'; end if;
 v_allowed:=private.is_workspace_admin(v_t.workspace_id) or exists(select 1 from public.tournament_rating_evaluators where tournament_id=p_tournament_id and evaluator_user_id=auth.uid());
 if not v_allowed then raise exception 'Accès refusé'; end if;
 if v_t.status<>'finished' then raise exception 'La notation après tournoi sera disponible une fois le tournoi terminé';end if;
 return jsonb_build_object(
  'tournament',jsonb_build_object('id',v_t.id,'name',v_t.name,'date',v_t.tournament_date),
  'my_player_id',(select p.id from public.players p where p.workspace_id=v_t.workspace_id and private.is_own_rating_player_v4463(p.id) limit 1),
  'my_team_id',(select tp.team_id from public.team_players tp join public.teams tm on tm.id=tp.team_id where tm.tournament_id=v_t.id and private.is_own_rating_player_v4463(tp.player_id) limit 1),
  'session',(select jsonb_build_object('closes_at',s.closes_at,'status',s.status) from public.tournament_rating_sessions s where s.tournament_id=v_t.id),
  'teams',coalesce((select jsonb_agg(jsonb_build_object('team_id',tm.id,'team_name',tm.name,'color',tm.color,'players',(
    select coalesce(jsonb_agg(jsonb_build_object('player_id',p.id,'player_name',p.name,'guest',p.is_group_member=false,'group_player_code',p.group_player_code,'existing',(
      select jsonb_build_object('rating',r.rating,'cardio',r.cardio,'dribble',r.dribble,'collectif',r.collectif,'frappe',r.frappe,'preferred_role',r.preferred_role,'updated_at',r.updated_at)
      from public.player_skill_ratings r where r.player_id=p.id and r.evaluator_user_id=auth.uid()
    )) order by lower(p.name)),'[]'::jsonb)
    from public.team_players tp join public.players p on p.id=tp.player_id join public.tournament_players tpp on tpp.tournament_id=v_t.id and tpp.player_id=p.id
    where tp.team_id=tm.id and not private.is_own_rating_player_v4463(p.id) and coalesce(tpp.present,false)=true and coalesce(tpp.registration_status,'')<>'waitlist'
  )) order by tm.created_at) from public.teams tm where tm.tournament_id=v_t.id),'[]'::jsonb)
 );
end $function$;
CREATE OR REPLACE FUNCTION public.submit_player_skill_review_v2(p_player_id uuid, p_cardio smallint, p_dribble smallint, p_collectif smallint, p_frappe smallint, p_preferred_role text, p_change_reason text DEFAULT NULL::text, p_change_note text DEFAULT NULL::text, p_tournament_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare v_workspace uuid; v_rating numeric(3,2); v_linked uuid; v_old public.player_skill_ratings%rowtype;
begin
  if p_tournament_id is not null then perform private.require_post_tournament_rating_v4467(p_tournament_id,p_player_id);end if;
  if p_cardio not between 1 and 5 or p_dribble not between 1 and 5 or p_collectif not between 1 and 5 or p_frappe not between 1 and 5 then raise exception 'Chaque critère doit être noté de 1 à 5'; end if;
  if p_preferred_role not in ('defenseur','metronome','ratisseur','finisseur','dribbleur','frappeur','top_player') then raise exception 'Rôle de prédilection invalide'; end if;
  select p.workspace_id into v_workspace from public.players p where p.id=p_player_id and p.active=true;
  if v_workspace is null then raise exception 'Joueur introuvable'; end if;
  if not coalesce((select e.player_ratings_enabled from public.workspace_entitlements e where e.workspace_id=v_workspace),false) then raise exception 'Le module Notation des joueurs est désactivé pour cet espace'; end if;
  if not (private.is_workspace_admin(v_workspace) or private.is_workspace_coorganizer(v_workspace)) then raise exception 'Accès refusé'; end if;
  select wm.linked_player_id into v_linked from public.workspace_members wm where wm.workspace_id=v_workspace and wm.user_id=(select auth.uid());
  if private.is_own_rating_player_v4463(p_player_id) then raise exception 'Tu ne peux pas évaluer ton propre profil'; end if;
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
$function$;
CREATE OR REPLACE FUNCTION public.submit_post_tournament_player_observation_v1(p_tournament_id uuid, p_player_id uuid, p_appreciation_code smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare s public.tournament_rating_sessions%rowtype; v_workspace uuid; v_delta numeric(2,1);
begin
  perform private.require_post_tournament_rating_v4467(p_tournament_id,p_player_id);
  if p_appreciation_code not between 1 and 6 then raise exception 'Appréciation invalide'; end if;
  select * into s from public.tournament_rating_sessions where tournament_id=p_tournament_id;
  if not found or s.status<>'open' or s.closes_at<=now() then raise exception 'La période de notation est terminée'; end if;
  v_workspace:=s.workspace_id;
  if private.is_own_rating_player_v4463(p_player_id) then raise exception 'Tu ne peux pas évaluer ton propre profil'; end if;
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
$function$;

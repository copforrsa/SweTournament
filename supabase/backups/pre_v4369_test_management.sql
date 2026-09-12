CREATE OR REPLACE FUNCTION public.seed_match_player_assignments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.match_player_assignments(match_id,player_id,team_id)
  select new.id,tp.player_id,tp.team_id
  from public.team_players tp
  where tp.team_id in (new.home_team_id,new.away_team_id)
  on conflict (match_id,player_id) do nothing;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.set_match_player_assignment(p_match_id uuid, p_player_id uuid, p_team_id uuid, p_apply_future boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  v_match public.matches%rowtype;
  v_tour public.tournaments%rowtype;
  v_player_ok boolean;
begin
  select * into v_match from public.matches where id=p_match_id;
  if not found then raise exception 'Match introuvable'; end if;
  select * into v_tour from public.tournaments where id=v_match.tournament_id;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not (private.is_workspace_admin(v_tour.workspace_id) or private.coorganizer_has_permission(v_tour.workspace_id,'enter_scores')) then
    raise exception 'Autorisation refusée';
  end if;
  select exists(select 1 from public.tournament_players where tournament_id=v_tour.id and player_id=p_player_id and present=true and coalesce(registration_status,'confirmed')<>'waitlist') into v_player_ok;
  if not v_player_ok then raise exception 'Ce joueur n’est pas inscrit à ce tournoi'; end if;
  if p_team_id is not null and p_team_id not in (v_match.home_team_id,v_match.away_team_id) then
    raise exception 'Le joueur doit être placé dans une des deux équipes de ce match';
  end if;

  insert into public.match_player_assignments(match_id,player_id,team_id,updated_by,updated_at)
  values(p_match_id,p_player_id,p_team_id,auth.uid(),now())
  on conflict(match_id,player_id) do update set team_id=excluded.team_id,updated_by=auth.uid(),updated_at=now();

  if coalesce(p_apply_future,false) then
    delete from public.team_players tp using public.teams tm
    where tp.team_id=tm.id and tm.tournament_id=v_tour.id and tp.player_id=p_player_id;

    if p_team_id is null then
      update public.tournament_players set is_substitute=true where tournament_id=v_tour.id and player_id=p_player_id;
    else
      insert into public.team_players(team_id,player_id) values(p_team_id,p_player_id) on conflict do nothing;
      update public.tournament_players set is_substitute=false where tournament_id=v_tour.id and player_id=p_player_id;
    end if;

    delete from public.match_player_assignments a
    using public.matches m
    where a.match_id=m.id and m.tournament_id=v_tour.id and m.match_order>=v_match.match_order and a.player_id=p_player_id;

    if p_team_id is null then
      insert into public.match_player_assignments(match_id,player_id,team_id,updated_by)
      select m.id,p_player_id,null,auth.uid() from public.matches m
      where m.tournament_id=v_tour.id and m.match_order>=v_match.match_order
      on conflict(match_id,player_id) do update set team_id=null,updated_by=auth.uid(),updated_at=now();
    else
      insert into public.match_player_assignments(match_id,player_id,team_id,updated_by)
      select m.id,p_player_id,p_team_id,auth.uid() from public.matches m
      where m.tournament_id=v_tour.id and m.match_order>=v_match.match_order and p_team_id in (m.home_team_id,m.away_team_id)
      on conflict(match_id,player_id) do update set team_id=excluded.team_id,updated_by=auth.uid(),updated_at=now();
    end if;
  end if;

  return jsonb_build_object('match_id',p_match_id,'player_id',p_player_id,'team_id',p_team_id,'apply_future',coalesce(p_apply_future,false));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_my_workspace_test_matches(p_workspace_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not (
  private.is_workspace_operational_admin(p_workspace_id) or private.coorganizer_has_permission(p_workspace_id,'scores')
 ) then raise exception 'Droit Matchs requis dans cet espace'; end if;
 return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
  select m.id,m.status,m.home_score,m.away_score,r.created_at,jsonb_array_length(r.participants) as player_count
  from private.match_test_runs r join public.matches m on m.id=r.match_id
  where r.target_workspace_id=p_workspace_id and r.manager_user_id=auth.uid()
  order by r.created_at desc limit 50
 ) x),'[]'::jsonb);
end $function$
;
CREATE OR REPLACE FUNCTION public.guard_match_assignment_player_available()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$ begin if exists(select 1 from public.players p join public.player_unavailability u on u.global_player_id=p.global_player_id where p.id=new.player_id and u.active=true and u.availability_mode='injured_unavailable' and (u.unavailable_until is null or u.unavailable_until>=current_date)) then raise exception 'Ce joueur est blessé et indisponible'; end if; return new; end $function$
;
CREATE OR REPLACE FUNCTION public.get_test_match_snapshot(p_match_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_run private.match_test_runs%rowtype; v_tour uuid;
begin
  select * into v_run from private.match_test_runs where match_id=p_match_id;
  if not found or auth.uid() is null then raise exception 'Match test indisponible'; end if;
  if not private.can_manage_test_match(p_match_id) and not exists(select 1 from jsonb_array_elements(v_run.participants) p where p->>'user_id'=auth.uid()::text) then
    raise exception 'Ce compte ne participe pas au match test';
  end if;
  select tournament_id into v_tour from public.matches where id=p_match_id;
  return jsonb_build_object('is_test',true,'can_edit',private.can_manage_test_match(p_match_id),'tournament_id',v_tour,'target_workspace_id',v_run.target_workspace_id,
    'tournaments',(select jsonb_agg(jsonb_build_object('id',id,'name',name,'tournament_date',tournament_date,'status',status,'format',format,'team_size',team_size)) from public.tournaments where id=v_tour),
    'teams',(select jsonb_agg(to_jsonb(t)) from public.teams t where tournament_id=v_tour),
    'players',(select jsonb_agg(jsonb_build_object('id',id,'name',name,'is_group_member',true)) from public.players where workspace_id=v_run.workspace_id),
    'team_players',(select jsonb_agg(to_jsonb(p)) from public.team_players p join public.teams t on t.id=p.team_id where t.tournament_id=v_tour),
    'match_player_assignments',(select jsonb_agg(to_jsonb(a)-'updated_by') from public.match_player_assignments a where match_id=p_match_id),
    'tournament_players',(select jsonb_agg(to_jsonb(p)) from public.tournament_players p where tournament_id=v_tour),
    'matches',(select jsonb_agg(to_jsonb(m)) from public.matches m where id=p_match_id),
    'goals',coalesce((select jsonb_agg(to_jsonb(g)-'created_by') from public.goals g where match_id=p_match_id),'[]'::jsonb));
end $function$
;
CREATE OR REPLACE FUNCTION public.super_admin_test_match_action(p_match_id uuid, p_action text, p_scorer_id uuid DEFAULT NULL::uuid, p_assister_id uuid DEFAULT NULL::uuid, p_goal_id uuid DEFAULT NULL::uuid, p_home_score integer DEFAULT NULL::integer, p_away_score integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare m public.matches%rowtype; v_team uuid; v_goal public.goals%rowtype;
begin
 if not private.can_manage_test_match(p_match_id) then raise exception 'Droit Matchs requis pour ce test'; end if;
 if not exists(select 1 from private.match_test_runs where match_id=p_match_id) then raise exception 'Match test indisponible'; end if;
 select * into m from public.matches where id=p_match_id for update;
 if p_action='start' then
  if m.status<>'scheduled' then raise exception 'Le match a déjà démarré'; end if;
  update public.matches set status='live',started_at=now() where id=m.id;
  update public.tournaments set status='live' where id=m.tournament_id;
 elsif p_action='goal' then
  if m.status<>'live' then raise exception 'Démarre le match avant de saisir un but'; end if;
  select team_id into v_team from public.match_player_assignments where match_id=m.id and player_id=p_scorer_id;
  if v_team is null or v_team not in (m.home_team_id,m.away_team_id) then raise exception 'Buteur invalide'; end if;
  if p_assister_id is not null and (p_assister_id=p_scorer_id or not exists(select 1 from public.match_player_assignments where match_id=m.id and player_id=p_assister_id and team_id=v_team)) then raise exception 'Le passeur doit être un coéquipier du buteur'; end if;
  insert into public.goals(match_id,team_id,scorer_player_id,assister_player_id) values(m.id,v_team,p_scorer_id,p_assister_id) returning * into v_goal;
  update public.matches set home_score=m.home_score+case when v_team=m.home_team_id then 1 else 0 end,away_score=m.away_score+case when v_team=m.away_team_id then 1 else 0 end where id=m.id;
 elsif p_action in ('undo_goal','delete_goal') then
  if m.status<>'live' then raise exception 'Le match doit être en cours'; end if;
  if p_action='undo_goal' then
   select * into v_goal from public.goals where match_id=m.id order by created_at desc,id desc limit 1;
  else
   select * into v_goal from public.goals where match_id=m.id and id=p_goal_id;
  end if;
  if v_goal.id is null then raise exception 'But introuvable dans ce match test'; end if;
  delete from public.goals where id=v_goal.id;
  update public.matches set home_score=greatest(0,m.home_score-case when v_goal.team_id=m.home_team_id then 1 else 0 end),away_score=greatest(0,m.away_score-case when v_goal.team_id=m.away_team_id then 1 else 0 end) where id=m.id;
 elsif p_action='set_assist' then
  if m.status<>'live' then raise exception 'Le match doit être en cours'; end if;
  select * into v_goal from public.goals where match_id=m.id and id=p_goal_id;
  if v_goal.id is null then raise exception 'But introuvable dans ce match test'; end if;
  if p_assister_id is not null and (p_assister_id=v_goal.scorer_player_id or not exists(
    select 1 from public.match_player_assignments where match_id=m.id and player_id=p_assister_id and team_id=v_goal.team_id
  )) then raise exception 'Le passeur doit être un coéquipier du buteur'; end if;
  update public.goals set assister_player_id=p_assister_id where id=v_goal.id;
  -- The goal trigger recounts scores: preserve any score entered manually.
  update public.matches set home_score=m.home_score,away_score=m.away_score where id=m.id;
 elsif p_action='set_score' then
  if m.status<>'live' then raise exception 'Le match doit être en cours'; end if;
  if p_home_score is null or p_away_score is null or p_home_score<0 or p_away_score<0 then raise exception 'Les scores doivent être des nombres positifs ou nuls'; end if;
  update public.matches set home_score=p_home_score,away_score=p_away_score where id=m.id;
 elsif p_action='finish' then
  if m.status<>'live' then raise exception 'Le match doit être en cours'; end if;
  update public.matches set status='finished',finished_at=now() where id=m.id;
  update public.tournaments set status='finished' where id=m.tournament_id;
 else raise exception 'Action inconnue'; end if;
 return public.get_test_match_snapshot(m.id)||jsonb_build_object('action_goal_id',case when p_action='goal' then v_goal.id else null end);
end $function$
;
CREATE OR REPLACE FUNCTION private.test_match_recipient_allowed(p_workspace_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(
  select 1 from public.workspace_members wm
  left join public.coorganizer_permissions cp on cp.workspace_id=wm.workspace_id and cp.user_id=wm.user_id
  where wm.workspace_id=p_workspace_id and wm.user_id=p_user_id and coalesce(wm.active,true)
  and ((wm.role='admin' and wm.active=true) or (wm.role='coorganizer' and (coalesce(cp.can_enter_scores,true) or cp.temporary_admin_until>now())))
 );
$function$
;
CREATE OR REPLACE FUNCTION private.can_manage_test_match(p_match_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select auth.uid() is not null and exists(
  select 1 from private.match_test_runs r where r.match_id=p_match_id and
   (private.is_platform_super_admin() or
    (r.manager_user_id=auth.uid() and
     (private.is_workspace_operational_admin(r.target_workspace_id) or private.coorganizer_has_permission(r.target_workspace_id,'scores'))))
 );
$function$
;
CREATE OR REPLACE FUNCTION public.super_admin_create_test_match(p_swe_ids text[], p_request_id uuid, p_target_workspace_id uuid DEFAULT NULL::uuid, p_manager_user_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_match uuid; v_workspace uuid; v_tour uuid; v_a uuid; v_b uuid; v_player uuid;
  v_ids text[]; v_count integer; v_target integer; v_i integer:=0; v_map jsonb:='[]'; r record;
begin
  if not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  if p_request_id is null then raise exception 'Identifiant de demande requis'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select match_id into v_match from private.match_test_runs where request_id=p_request_id;
  if found then return v_match; end if;
  if (p_target_workspace_id is null) <> (p_manager_user_id is null) then raise exception 'Choisis un espace et son gestionnaire'; end if;
  if p_target_workspace_id is not null and not private.test_match_recipient_allowed(p_target_workspace_id,p_manager_user_id) then
    raise exception 'Ce gestionnaire ne dispose pas du droit Matchs dans cet espace';
  end if;
  select array_agg(distinct upper(btrim(x))) into v_ids from unnest(p_swe_ids) x where btrim(x)<>'';
  v_count:=coalesce(cardinality(v_ids),0);
  if v_count>12 then raise exception 'Maximum 12 comptes SWÉ pour ce test'; end if;
  v_target:=greatest(10,((v_count+1)/2)*2);
  if (select count(*) from public.global_player_profiles where upper(public_player_id)=any(v_ids) and identity_status='active')<>v_count then
    raise exception 'Un ID SWÉ est inconnu ou son compte est inactif';
  end if;
  insert into public.workspaces(name,owner_user_id,public_enabled)
    values('TEST SWÉ — '||to_char(now(),'DD/MM/YYYY HH24:MI'),auth.uid(),false) returning id into v_workspace;
  insert into public.tournaments(workspace_id,name,tournament_date,status,registration_open,max_players,team_size,discovery_mode,season_id)
    values(v_workspace,'Match test — simulation',current_date,'draft',false,v_target,v_target/2,'unlisted',null) returning id into v_tour;
  insert into public.teams(tournament_id,name,color) values(v_tour,'Test Bleus','#2563eb') returning id into v_a;
  insert into public.teams(tournament_id,name,color) values(v_tour,'Test Rouges','#dc2626') returning id into v_b;
  for r in select id,user_id,public_player_id,display_name from public.global_player_profiles where upper(public_player_id)=any(v_ids) order by public_player_id loop
    v_i:=v_i+1;
    insert into public.players(workspace_id,name,is_group_member,global_player_id)
      values(v_workspace,left(r.display_name,30)||' ['||left(r.public_player_id,24)||']',false,null) returning id into v_player;
    insert into public.tournament_players(tournament_id,player_id,present,registration_status)
      values(v_tour,v_player,true,'confirmed');
    insert into public.team_players(team_id,player_id) values(case when v_i%2=1 then v_a else v_b end,v_player);
    v_map:=v_map||jsonb_build_array(jsonb_build_object('player_id',v_player,'user_id',r.user_id,'swe_id',r.public_player_id));
  end loop;
  while v_i<v_target loop
    v_i:=v_i+1;
    insert into public.players(workspace_id,name,is_group_member,global_player_id,skill_level)
      values(v_workspace,'Joueur test '||lpad(v_i::text,2,'0'),false,null,3) returning id into v_player;
    insert into public.tournament_players(tournament_id,player_id,present,registration_status)
      values(v_tour,v_player,true,'confirmed');
    insert into public.team_players(team_id,player_id) values(case when v_i%2=1 then v_a else v_b end,v_player);
    v_map:=v_map||jsonb_build_array(jsonb_build_object('player_id',v_player,'user_id',null,'swe_id',null,'synthetic',true));
  end loop;
  insert into public.matches(tournament_id,home_team_id,away_team_id,pitch,round_label)
    values(v_tour,v_a,v_b,'Terrain test','Simulation') returning id into v_match;
  insert into private.match_test_runs(match_id,workspace_id,created_by,request_id,participants,target_workspace_id,manager_user_id)
    values(v_match,v_workspace,auth.uid(),p_request_id,v_map,p_target_workspace_id,p_manager_user_id);
  return v_match;
end $function$
;

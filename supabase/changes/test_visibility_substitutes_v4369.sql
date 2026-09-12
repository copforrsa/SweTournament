-- Test-only access: share assigned tests with score managers of the selected workspace.
CREATE OR REPLACE FUNCTION private.can_manage_test_match(p_match_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select auth.uid() is not null and exists(
  select 1 from private.match_test_runs r where r.match_id=p_match_id and
   (private.is_platform_super_admin() or
    (r.target_workspace_id is not null and
     (private.is_workspace_operational_admin(r.target_workspace_id) or private.coorganizer_has_permission(r.target_workspace_id,'scores'))))
 );
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
  select m.id,m.status,m.home_score,m.away_score,r.created_at,r.target_workspace_id,w.name as source_workspace_name,jsonb_array_length(r.participants) as player_count
  from private.match_test_runs r join public.matches m on m.id=r.match_id left join public.workspaces w on w.id=r.target_workspace_id
  where (r.target_workspace_id=p_workspace_id or r.manager_user_id=auth.uid()) and private.can_manage_test_match(r.match_id)
  order by r.created_at desc limit 50
 ) x),'[]'::jsonb);
end $function$
;
-- Complete isolated fixtures with two bench players. This internal helper is not exposed.
create function private.ensure_test_match_substitutes(p_match_id uuid)
returns void language plpgsql set search_path='' as $$
declare r private.match_test_runs%rowtype; tid uuid; pid uuid; n integer;
begin
 select * into r from private.match_test_runs where match_id=p_match_id for update;
 if not found then raise exception 'Match test introuvable'; end if;
 select tournament_id into tid from public.matches where id=p_match_id;
 select count(*) into n from jsonb_array_elements(r.participants) p where p->>'bench'='true';
 while n<2 loop
  n:=n+1;
  insert into public.players(workspace_id,name,is_group_member,global_player_id,skill_level)
   values(r.workspace_id,'Remplaçant test '||lpad(n::text,2,'0'),false,null,3) returning id into pid;
  insert into public.tournament_players(tournament_id,player_id,present,registration_status,is_substitute)
   values(tid,pid,true,'confirmed',true);
  r.participants:=r.participants||jsonb_build_array(jsonb_build_object('player_id',pid,'user_id',null,'swe_id',null,'synthetic',true,'bench',true));
 end loop;
 update private.match_test_runs set participants=r.participants where match_id=p_match_id;
 update public.tournaments set max_players=greatest(max_players,jsonb_array_length(r.participants)) where id=tid;
end $$;
revoke all on function private.ensure_test_match_substitutes(uuid) from public,anon,authenticated;
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
  perform private.ensure_test_match_substitutes(v_match);
  return v_match;
end $function$
;
drop function public.super_admin_test_match_action(uuid,text,uuid,uuid,uuid,integer,integer);
CREATE OR REPLACE FUNCTION public.super_admin_test_match_action(p_match_id uuid, p_action text, p_scorer_id uuid DEFAULT NULL::uuid, p_assister_id uuid DEFAULT NULL::uuid, p_goal_id uuid DEFAULT NULL::uuid, p_home_score integer DEFAULT NULL::integer, p_away_score integer DEFAULT NULL::integer, p_out_player_id uuid DEFAULT NULL, p_in_player_id uuid DEFAULT NULL)
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
 elsif p_action='substitute' then
  if m.status<>'live' then raise exception 'Le match doit être en cours'; end if;
  if p_out_player_id is null or p_in_player_id is null then raise exception 'Choisis le joueur et son remplaçant'; end if;
  select team_id into v_team from public.match_player_assignments where match_id=m.id and player_id=p_out_player_id;
  if v_team is null then raise exception 'Joueur à remplacer introuvable'; end if;
  if p_out_player_id=p_in_player_id or not exists(
    select 1 from public.tournament_players where tournament_id=m.tournament_id and player_id=p_in_player_id
      and present=true and coalesce(registration_status,'confirmed')<>'waitlist'
  ) then raise exception 'Remplaçant invalide pour ce match test'; end if;
  if exists(select 1 from public.match_player_assignments where match_id=m.id and player_id=p_in_player_id and team_id is not null) then
    raise exception 'Ce remplaçant est déjà sur le terrain';
  end if;
  -- Only this isolated test is changed; keep a null assignment for the outgoing player.
  update public.match_player_assignments set team_id=null,updated_by=auth.uid(),updated_at=now()
    where match_id=m.id and player_id=p_out_player_id;
  insert into public.match_player_assignments(match_id,player_id,team_id,updated_by,updated_at)
    values(m.id,p_in_player_id,v_team,auth.uid(),now())
    on conflict(match_id,player_id) do update set team_id=excluded.team_id,updated_by=auth.uid(),updated_at=now();
 elsif p_action='finish' then
  if m.status<>'live' then raise exception 'Le match doit être en cours'; end if;
  update public.matches set status='finished',finished_at=now() where id=m.id;
  update public.tournaments set status='finished' where id=m.tournament_id;
 else raise exception 'Action inconnue'; end if;
 return public.get_test_match_snapshot(m.id)||jsonb_build_object('action_goal_id',case when p_action='goal' then v_goal.id else null end);
end $function$
;
revoke all on function public.super_admin_test_match_action(uuid,text,uuid,uuid,uuid,integer,integer,uuid,uuid) from public,anon;
grant execute on function public.super_admin_test_match_action(uuid,text,uuid,uuid,uuid,integer,integer,uuid,uuid) to authenticated;
-- Existing scheduled/live tests receive bench players without altering scores or lineups.
do $$ declare mid uuid; begin
 for mid in select r.match_id from private.match_test_runs r join public.matches m on m.id=r.match_id where m.status<>'finished'
 loop perform private.ensure_test_match_substitutes(mid); end loop;
end $$;

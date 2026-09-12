-- Function definitions before V43.68; code backup: backup/v43.67-before-assigned-quick-tests-20260912
CREATE OR REPLACE FUNCTION private.coorganizer_can_edit_tournament(p_tournament_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select exists(select 1 from public.tournaments t where t.id=p_tournament_id and t.status<>'finished' and private.coorganizer_has_permission(t.workspace_id,'scores'));
$function$
;
CREATE OR REPLACE FUNCTION private.coorganizer_has_permission(p_workspace_id uuid, p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select exists(
    select 1
    from public.workspace_members wm
    left join public.coorganizer_permissions cp
      on cp.workspace_id=wm.workspace_id and cp.user_id=wm.user_id
    where wm.workspace_id=p_workspace_id
      and wm.user_id=auth.uid()
      and wm.role='coorganizer'
      and coalesce(wm.active,true)=true
      and case p_permission
        when 'invite' then coalesce(cp.can_invite_coorganizers,false)
        when 'scores' then coalesce(cp.can_enter_scores,true)
        when 'add_members' then coalesce(cp.can_add_members,true)
        when 'delete_members' then coalesce(cp.can_delete_members,false)
        when 'create_tournaments' then coalesce(cp.can_create_tournaments,false)
        when 'view_players' then coalesce(cp.can_view_players,true)
        when 'generate_teams' then coalesce(cp.can_generate_teams,false)
        else false
      end
  );
$function$
;
CREATE OR REPLACE FUNCTION private.has_temporary_admin(p_workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select exists(
    select 1
    from public.workspace_members wm
    join public.coorganizer_permissions cp on cp.workspace_id=wm.workspace_id and cp.user_id=wm.user_id
    where wm.workspace_id=p_workspace_id
      and wm.user_id=auth.uid()
      and wm.role='coorganizer'
      and coalesce(wm.active,true)=true
      and cp.temporary_admin_until is not null
      and cp.temporary_admin_until > now()
  );
$function$
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
  if not private.is_platform_super_admin() and not exists(select 1 from jsonb_array_elements(v_run.participants) p where p->>'user_id'=auth.uid()::text) then
    raise exception 'Ce compte ne participe pas au match test';
  end if;
  select tournament_id into v_tour from public.matches where id=p_match_id;
  return jsonb_build_object('is_test',true,'can_edit',private.is_platform_super_admin(),'tournament_id',v_tour,
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
CREATE OR REPLACE FUNCTION public.super_admin_list_test_matches()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select m.id,m.status,m.home_score,m.away_score,r.created_at,jsonb_array_length(r.participants) as player_count
    from private.match_test_runs r join public.matches m on m.id=r.match_id order by r.created_at desc limit 50
  ) x),'[]'::jsonb);
end $function$
;
CREATE OR REPLACE FUNCTION public.super_admin_create_test_match(p_swe_ids text[], p_request_id uuid)
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
  insert into private.match_test_runs(match_id,workspace_id,created_by,request_id,participants)
    values(v_match,v_workspace,auth.uid(),p_request_id,v_map);
  return v_match;
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
 if not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
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
  insert into public.goals(match_id,team_id,scorer_player_id,assister_player_id) values(m.id,v_team,p_scorer_id,p_assister_id);
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
 elsif p_action='set_score' then
  if m.status<>'live' then raise exception 'Le match doit être en cours'; end if;
  if p_home_score is null or p_away_score is null or p_home_score<0 or p_away_score<0 then raise exception 'Les scores doivent être des nombres positifs ou nuls'; end if;
  update public.matches set home_score=p_home_score,away_score=p_away_score where id=m.id;
 elsif p_action='finish' then
  if m.status<>'live' then raise exception 'Le match doit être en cours'; end if;
  update public.matches set status='finished',finished_at=now() where id=m.id;
  update public.tournaments set status='finished' where id=m.tournament_id;
 else raise exception 'Action inconnue'; end if;
 return public.get_test_match_snapshot(m.id);
end $function$
;

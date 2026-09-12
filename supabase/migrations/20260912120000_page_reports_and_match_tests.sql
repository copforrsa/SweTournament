-- V43.65: additive changes. Existing registration/season totals remain authoritative.
create table private.app_page_views (
  page_key text primary key,
  page_type text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  entity_id uuid,
  view_count bigint not null default 0 check (view_count >= 0),
  updated_at timestamptz not null default now()
);
revoke all on private.app_page_views from public, anon, authenticated;

create or replace function public.record_swe_page_view(p_page text, p_public_token uuid default null, p_entity_id uuid default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_workspace uuid; v_key text; v_count bigint;
begin
  if p_page = 'registration' then
    return public.record_public_registration_page_view(p_public_token,p_entity_id);
  elsif p_page = 'season' then
    return public.record_season_page_view(p_public_token,p_entity_id);
  elsif p_page in ('workspace','history','live','league') then
    select id into v_workspace from public.workspaces where public_token=p_public_token and public_enabled;
    if v_workspace is null then raise exception 'Lien public indisponible'; end if;
    if p_page in ('history','live') and not exists(select 1 from public.tournaments where id=p_entity_id and workspace_id=v_workspace) then
      raise exception 'Tournoi indisponible';
    elsif p_page='league' and not exists(select 1 from public.leagues where id=p_entity_id and workspace_id=v_workspace) then
      raise exception 'Ligue indisponible';
    end if;
    v_key:=p_page||':'||coalesce(p_entity_id,v_workspace)::text;
  elsif p_page in ('home','player_card','complexes','reservation','complex_portal','super_admin','reset','test_live')
    or p_page in ('app:home','app:myplayer','app:players','app:permissions','app:tournaments','app:teams','app:matches','app:league','app:cooler','app:ranking','app:simple-swe') then
    v_key:=p_page;
  else raise exception 'Page inconnue';
  end if;
  insert into private.app_page_views as v(page_key,page_type,workspace_id,entity_id,view_count)
  values(v_key,p_page,v_workspace,case when v_workspace is not null then p_entity_id end,1)
  on conflict(page_key) do update set view_count=v.view_count+1,updated_at=now()
  returning view_count into v_count;
  return v_count;
end $$;
revoke all on function public.record_swe_page_view(text,uuid,uuid) from public;
grant execute on function public.record_swe_page_view(text,uuid,uuid) to anon,authenticated;

create or replace function public.super_admin_get_page_reports()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  return coalesce((select jsonb_agg(to_jsonb(r) order by r.view_count desc,r.page_key) from (
    select 'registration:'||t.id as page_key,'registration' as page_type,t.name as title,w.name as workspace_name,v.view_count,v.updated_at
    from public.public_registration_page_views v join public.tournaments t on t.id=v.tournament_id join public.workspaces w on w.id=t.workspace_id
    union all
    select 'season:'||s.id,'season',s.name,w.name,v.view_count,v.updated_at
    from public.season_page_views v join public.seasons s on s.id=v.season_id join public.workspaces w on w.id=s.workspace_id
    union all
    select v.page_key,v.page_type,coalesce(t.name,l.name,w.name,v.page_type),w.name,v.view_count,v.updated_at
    from private.app_page_views v left join public.workspaces w on w.id=v.workspace_id
    left join public.tournaments t on t.id=v.entity_id and v.page_type in ('history','live')
    left join public.leagues l on l.id=v.entity_id and v.page_type='league'
  ) r),'[]'::jsonb);
end $$;
revoke all on function public.super_admin_get_page_reports() from public,anon;
grant execute on function public.super_admin_get_page_reports() to authenticated;

-- A test uses the real match/goals/assignment engine, isolated from real profiles.
-- No global_player_id or workspace membership is attached to the copied players.
create table private.match_test_runs (
  match_id uuid primary key references public.matches(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  request_id uuid not null unique,
  participants jsonb not null,
  created_at timestamptz not null default now()
);
revoke all on private.match_test_runs from public,anon,authenticated;

create or replace function public.super_admin_create_test_match(p_swe_ids text[],p_request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_match uuid; v_workspace uuid; v_tour uuid; v_a uuid; v_b uuid; v_player uuid;
  v_ids text[]; v_count integer; v_i integer:=0; v_map jsonb:='[]'; r record;
begin
  if not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  if p_request_id is null then raise exception 'Identifiant de demande requis'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select match_id into v_match from private.match_test_runs where request_id=p_request_id;
  if found then return v_match; end if;
  select array_agg(distinct upper(btrim(x))) into v_ids from unnest(p_swe_ids) x where btrim(x)<>'';
  v_count:=coalesce(cardinality(v_ids),0);
  if v_count<2 or v_count>12 then raise exception 'Sélectionne entre 2 et 12 comptes avec un ID SWÉ'; end if;
  if (select count(*) from public.global_player_profiles where upper(public_player_id)=any(v_ids) and identity_status='active')<>v_count then
    raise exception 'Un ID SWÉ est inconnu ou son compte est inactif';
  end if;
  insert into public.workspaces(name,owner_user_id,public_enabled)
    values('TEST SWÉ — '||to_char(now(),'DD/MM/YYYY HH24:MI'),auth.uid(),false) returning id into v_workspace;
  insert into public.tournaments(workspace_id,name,tournament_date,status,registration_open,max_players,team_size,discovery_mode,season_id)
    values(v_workspace,'Match test — simulation',current_date,'draft',false,v_count,greatest(2,(v_count+1)/2),'unlisted',null) returning id into v_tour;
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
  insert into public.matches(tournament_id,home_team_id,away_team_id,pitch,round_label)
    values(v_tour,v_a,v_b,'Terrain test','Simulation') returning id into v_match;
  insert into private.match_test_runs(match_id,workspace_id,created_by,request_id,participants)
    values(v_match,v_workspace,auth.uid(),p_request_id,v_map);
  return v_match;
end $$;
revoke all on function public.super_admin_create_test_match(text[],uuid) from public,anon;
grant execute on function public.super_admin_create_test_match(text[],uuid) to authenticated;

create or replace function public.get_test_match_snapshot(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_run private.match_test_runs%rowtype; v_tour uuid;
begin
  select * into v_run from private.match_test_runs where match_id=p_match_id;
  if not found or auth.uid() is null then raise exception 'Match test indisponible'; end if;
  if not private.is_platform_super_admin() and not exists(select 1 from jsonb_array_elements(v_run.participants) p where p->>'user_id'=auth.uid()::text) then
    raise exception 'Ce compte ne participe pas au match test';
  end if;
  select tournament_id into v_tour from public.matches where id=p_match_id;
  return jsonb_build_object('is_test',true,'tournament_id',v_tour,
    'tournaments',(select jsonb_agg(jsonb_build_object('id',id,'name',name,'tournament_date',tournament_date)) from public.tournaments where id=v_tour),
    'teams',(select jsonb_agg(to_jsonb(t)) from public.teams t where tournament_id=v_tour),
    'players',(select jsonb_agg(jsonb_build_object('id',id,'name',name,'is_group_member',true)) from public.players where workspace_id=v_run.workspace_id),
    'team_players',(select jsonb_agg(to_jsonb(p)) from public.team_players p join public.teams t on t.id=p.team_id where t.tournament_id=v_tour),
    'match_player_assignments',(select jsonb_agg(to_jsonb(a)-'updated_by') from public.match_player_assignments a where match_id=p_match_id),
    'tournament_players',(select jsonb_agg(to_jsonb(p)) from public.tournament_players p where tournament_id=v_tour),
    'matches',(select jsonb_agg(to_jsonb(m)) from public.matches m where id=p_match_id),
    'goals',coalesce((select jsonb_agg(to_jsonb(g)-'created_by') from public.goals g where match_id=p_match_id),'[]'::jsonb));
end $$;
revoke all on function public.get_test_match_snapshot(uuid) from public,anon;
grant execute on function public.get_test_match_snapshot(uuid) to authenticated;

create or replace function public.super_admin_test_match_action(p_match_id uuid,p_action text,p_scorer_id uuid default null,p_assister_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.matches%rowtype; v_team uuid;
begin
  if not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  if not exists(select 1 from private.match_test_runs where match_id=p_match_id) then raise exception 'Match test indisponible'; end if;
  select * into m from public.matches where id=p_match_id for update;
  if p_action='start' then
    if m.status<>'scheduled' then raise exception 'Le match a déjà démarré'; end if;
    update public.matches set status='live',started_at=now() where id=m.id;
  elsif p_action='goal' then
    if m.status<>'live' then raise exception 'Démarre le match avant de saisir un but'; end if;
    select team_id into v_team from public.match_player_assignments where match_id=m.id and player_id=p_scorer_id;
    if v_team is null or v_team not in (m.home_team_id,m.away_team_id) then raise exception 'Buteur invalide'; end if;
    if p_assister_id is not null and (p_assister_id=p_scorer_id or not exists(select 1 from public.match_player_assignments where match_id=m.id and player_id=p_assister_id and team_id=v_team)) then raise exception 'Le passeur doit être un coéquipier du buteur'; end if;
    insert into public.goals(match_id,team_id,scorer_player_id,assister_player_id) values(m.id,v_team,p_scorer_id,p_assister_id);
  elsif p_action='undo_goal' then
    if m.status<>'live' then raise exception 'Le match doit être en cours'; end if;
    delete from public.goals where id=(select id from public.goals where match_id=m.id order by created_at desc,id desc limit 1);
  elsif p_action='finish' then
    if m.status<>'live' then raise exception 'Le match doit être en cours'; end if;
    update public.matches set status='finished',finished_at=now() where id=m.id;
    update public.tournaments set status='finished' where id=m.tournament_id;
  else raise exception 'Action inconnue'; end if;
  return public.get_test_match_snapshot(m.id);
end $$;
revoke all on function public.super_admin_test_match_action(uuid,text,uuid,uuid) from public,anon;
grant execute on function public.super_admin_test_match_action(uuid,text,uuid,uuid) to authenticated;

create or replace function public.super_admin_list_test_matches()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select m.id,m.status,m.home_score,m.away_score,r.created_at,jsonb_array_length(r.participants) as player_count
    from private.match_test_runs r join public.matches m on m.id=r.match_id order by r.created_at desc limit 50
  ) x),'[]'::jsonb);
end $$;
revoke all on function public.super_admin_list_test_matches() from public,anon;
grant execute on function public.super_admin_list_test_matches() to authenticated;

create or replace function public.super_admin_get_test_match_accounts()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('swe_id',public_player_id,'name',display_name) order by display_name) from public.global_player_profiles where identity_status='active'),'[]'::jsonb);
end $$;
revoke all on function public.super_admin_get_test_match_accounts() from public,anon;
grant execute on function public.super_admin_get_test_match_accounts() to authenticated;

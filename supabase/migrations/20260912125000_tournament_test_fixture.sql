create table private.tournament_test_runs(
 request_id uuid primary key,
 created_by uuid not null references auth.users(id),
 workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
 tournament_id uuid not null unique references public.tournaments(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table private.tournament_test_runs enable row level security;
revoke all on private.tournament_test_runs from public,anon,authenticated;

create function private.create_tournament_test(p_request_id uuid,p_date date,p_format text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_user uuid:=auth.uid(); v_workspace uuid; v_season uuid; v_tournament uuid; v_player uuid; v_code text; i integer; v_result jsonb;
begin
 if v_user is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
 if p_request_id is null or p_date is null or p_format not in ('classic','king_of_pitch') then raise exception 'Paramètres du tournoi test invalides'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,73));
 select jsonb_build_object('workspace_id',r.workspace_id,'tournament_id',r.tournament_id,'short_code',t.short_code,'workspace_name',w.name)
 into v_result from private.tournament_test_runs r join public.tournaments t on t.id=r.tournament_id join public.workspaces w on w.id=r.workspace_id where r.request_id=p_request_id;
 if v_result is not null then return v_result; end if;
 insert into public.workspaces(name,owner_user_id,public_enabled,rating_group_name)
 values('TEST SWÉ — 30 joueurs — '||to_char(p_date,'DD/MM'),v_user,true,'Academy de test') returning id into v_workspace;
 insert into public.workspace_members(workspace_id,user_id,role,active) values(v_workspace,v_user,'admin',true);
 insert into public.workspace_commercial_access(workspace_id,subscription_plan,special_access_enabled,organizer_type) values(v_workspace,'free',true,'group');
 insert into public.workspace_entitlements(workspace_id,max_players_cap,player_ratings_enabled,match_ratings_enabled,top_player_enabled,tournaments_enabled,rankings_enabled)
 values(v_workspace,35,true,true,true,true,true);
 insert into public.seasons(workspace_id,name,starts_on,is_active) values(v_workspace,'Saison de test',p_date,true) returning id into v_season;
 insert into public.tournaments(workspace_id,season_id,name,tournament_date,start_time,format,rotation_mode,status,registration_open,max_players,team_size,venue,entry_fee_cents,online_payment_enabled,discovery_mode,registration_briefing,created_by)
 values(v_workspace,v_season,'TEST — Tournoi 30 joueurs',p_date,'09:00',p_format,case when p_format='king_of_pitch' then 'king_of_pitch' else 'standard' end,'draft',true,30,5,'Terrain fictif — test SWÉ',0,false,'unlisted',
 '{"general":"Tournoi de test avec 30 joueurs fictifs. Prépare les équipes, lance les matchs et teste la saisie des buts, passes et remplacements.","observe":true,"evening":true,"rating":true}'::jsonb,v_user)
 returning id,short_code into v_tournament,v_code;
 for i in 1..30 loop
  insert into public.players(workspace_id,name,active,is_group_member,skill_level)
  values(v_workspace,'Joueur test '||lpad(i::text,2,'0'),true,true,1+((i-1)%5)) returning id into v_player;
  insert into public.tournament_players(tournament_id,player_id,present,registration_status,registered_at)
  values(v_tournament,v_player,true,'confirmed',now()+i*interval '1 millisecond');
  if i<=28 then
   insert into public.player_skill_ratings(workspace_id,player_id,evaluator_user_id,rating)
   values(v_workspace,v_player,v_user,1+((i-1)%5));
  end if;
 end loop;
 insert into private.tournament_test_runs(request_id,created_by,workspace_id,tournament_id) values(p_request_id,v_user,v_workspace,v_tournament);
 return jsonb_build_object('workspace_id',v_workspace,'tournament_id',v_tournament,'short_code',v_code,'workspace_name','TEST SWÉ — 30 joueurs — '||to_char(p_date,'DD/MM'));
end $$;
revoke all on function private.create_tournament_test(uuid,date,text) from public;
grant execute on function private.create_tournament_test(uuid,date,text) to authenticated;
create function public.super_admin_create_test_tournament(p_request_id uuid,p_date date,p_format text default 'classic')
returns jsonb language sql security invoker set search_path=public,private,pg_temp as $$
 select private.create_tournament_test(p_request_id,p_date,p_format);
$$;
revoke all on function public.super_admin_create_test_tournament(uuid,date,text) from public,anon;
grant execute on function public.super_admin_create_test_tournament(uuid,date,text) to authenticated;

create function private.list_tournament_tests()
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
begin
 if auth.uid() is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
 return coalesce((select jsonb_agg(x order by x.created_at desc) from (
 select r.created_at,r.workspace_id,r.tournament_id,t.short_code,t.name,t.tournament_date,t.status,w.name workspace_name,
 (select count(*) from public.tournament_players tp where tp.tournament_id=t.id and tp.present) player_count
 from private.tournament_test_runs r join public.tournaments t on t.id=r.tournament_id join public.workspaces w on w.id=r.workspace_id
 order by r.created_at desc limit 30) x),'[]'::jsonb);
end $$;
revoke all on function private.list_tournament_tests() from public;
grant execute on function private.list_tournament_tests() to authenticated;
create function public.super_admin_list_test_tournaments() returns jsonb language sql stable security invoker set search_path=public,private,pg_temp as $$
 select private.list_tournament_tests();
$$;
revoke all on function public.super_admin_list_test_tournaments() from public,anon;
grant execute on function public.super_admin_list_test_tournaments() to authenticated;


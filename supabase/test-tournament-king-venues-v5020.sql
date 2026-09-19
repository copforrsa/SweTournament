create or replace function private.create_tournament_test(p_request_id uuid,p_date date,p_format text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_user uuid:=auth.uid(); v_workspace uuid; v_season uuid; v_tournament uuid; v_player uuid; v_code text; i integer; v_result jsonb; v_complex uuid; v_king uuid; v_middle uuid; v_lower uuid;
begin
 if v_user is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
 if p_request_id is null or p_date is null or p_format not in ('classic','king_of_pitch') then raise exception 'Paramètres du tournoi test invalides'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,73));
 select jsonb_build_object('workspace_id',r.workspace_id,'tournament_id',r.tournament_id,'short_code',t.short_code,'workspace_name',w.name)
 into v_result from private.tournament_test_runs r join public.tournaments t on t.id=r.tournament_id join public.workspaces w on w.id=r.workspace_id where r.request_id=p_request_id;
 if v_result is not null then return v_result; end if;
 if p_format='king_of_pitch' then
  -- Resolve a complete existing pitch set; never produce a King test with no roles.
  select c.id,k.id,m.id,b.id into v_complex,v_king,v_middle,v_lower
  from public.sports_complexes c
  join public.sports_pitches k on k.complex_id=c.id and k.name='Carrefour' and k.active
  join public.sports_pitches m on m.complex_id=c.id and m.name='Mercedes' and m.active
  join public.sports_pitches b on b.complex_id=c.id and b.name='Boulogne' and b.active
  where c.name='Arena' and c.active order by c.id limit 1;
  if v_complex is null then raise exception 'Configure les terrains Arena Carrefour, Mercedes et Boulogne avant de créer un test Roi du terrain.'; end if;
 end if;
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
 if p_format='king_of_pitch' then
  update public.tournaments set complex_id=v_complex,reserved_pitch_ids=array[v_king,v_middle,v_lower],
   venue='Arena — Carrefour, Mercedes, Boulogne',king_pitch_id=v_king,middle_pitch_id=v_middle,stream_pitch_id=v_lower,
   rotation_state=jsonb_build_object('version',1,'initialized',false,'queue','[]'::jsonb,'active','{}'::jsonb)
  where id=v_tournament;
 end if;
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

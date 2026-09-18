-- Rollback-only integration test: no scores, memberships or logs are retained.
begin;
do $$
declare mid uuid; wid uuid; uid uuid; tid uuid; tm uuid; p1 uuid; p2 uuid; gid uuid; subid uuid; r jsonb; baseline integer;
begin
 select m.id,t.workspace_id,t.id,m.home_team_id,wm.user_id into mid,wid,tid,tm,uid
 from public.matches m join public.tournaments t on t.id=m.tournament_id
 join public.workspace_members wm on wm.workspace_id=t.workspace_id and wm.role='admin' and coalesce(wm.active,true)
 where t.status<>'finished' and (select count(*) from public.team_players where team_id=m.home_team_id)>=2 limit 1;
 if mid is null then raise exception 'No suitable rollback fixture';end if;
 select player_id into p1 from public.team_players where team_id=tm order by player_id limit 1;
 select player_id into p2 from public.team_players where team_id=tm and player_id<>p1 order by player_id limit 1;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
 select greatest(home_score,(select count(*)::int from public.goals where match_id=mid and team_id=tm))+2 into baseline from public.matches where id=mid;
 execute 'set local role authenticated';
 r:=public.quick_match_action_v1(mid,'score',jsonb_build_object('home',baseline,'away',100));
 r:=public.quick_match_action_v1(mid,'add',jsonb_build_object('team_id',tm,'scorer_id',p1));
 if (r->'match'->>'home_score')::int<>baseline+1 then raise exception 'add changed existing score';end if;
 select id into gid from public.goals where match_id=mid and scorer_player_id=p1 order by created_at desc,id desc limit 1;
 r:=public.quick_match_action_v1(mid,'edit',jsonb_build_object('goal_id',gid,'scorer_id',p1,'assister_id',p2));
 if (r->'match'->>'home_score')::int<>baseline+1 or (r->'match'->>'away_score')::int<>100 then raise exception 'assist changed score';end if;
 r:=public.quick_match_action_v1(mid,'delete',jsonb_build_object('goal_id',gid));
 if (r->'match'->>'home_score')::int<>baseline then raise exception 'delete wrong score';end if;
 r:=public.quick_match_action_v1(mid,'attach',jsonb_build_object('team_id',tm,'scorer_id',p1));
 if (r->'match'->>'home_score')::int<>baseline then raise exception 'attach double counted';end if;
 execute 'reset role';
 -- Rollback-only bench fixture, distinct from both match teams.
 select p.id into subid from public.players p where p.workspace_id=wid and p.id not in
 (select player_id from public.team_players where team_id in (select home_team_id from public.matches where id=mid union select away_team_id from public.matches where id=mid))
 and not exists(select 1 from public.player_unavailability u where u.global_player_id=p.global_player_id and u.active and u.availability_mode='injured_unavailable') limit 1;
 if subid is null then raise exception 'Missing bench fixture';end if;
 insert into public.tournament_players(tournament_id,player_id,present,is_substitute,registration_status) values(tid,subid,true,true,'confirmed')
 on conflict(tournament_id,player_id) do update set present=true,is_substitute=true,registration_status='confirmed';
 update public.match_player_assignments set team_id=null where player_id=subid and match_id in (select id from public.matches where tournament_id=tid);
 execute 'set local role authenticated';
 r:=public.quick_match_action_v1(mid,'substitute',jsonb_build_object('out_id',p1,'in_id',subid));
 if not exists(select 1 from jsonb_array_elements(r->'match'->'substitutions') x where x->>'in_id'=subid::text and x->>'out_id'=p1::text) then raise exception 'Replacement history missing';end if;
 r:=public.quick_match_action_v1(mid,'add',jsonb_build_object('team_id',tm,'scorer_id',subid));
 if not exists(select 1 from jsonb_array_elements(r->'goals') x where x->>'scorer_player_id'=subid::text) then raise exception 'Substitute goal attribution missing';end if;
 execute 'reset role';
 -- Exercise the co-manager role on an individually finished match.
 update public.workspace_members set role='coorganizer' where workspace_id=wid and user_id=uid;
 insert into public.coorganizer_permissions(workspace_id,user_id,can_enter_scores) values(wid,uid,true)
 on conflict(workspace_id,user_id) do update set can_enter_scores=true;
 update public.matches set status='finished' where id=mid;
 execute 'set local role authenticated';
 r:=public.quick_match_action_v1(mid,'score',jsonb_build_object('home',baseline+2,'away',100));
 if (r->'match'->>'home_score')::int<>baseline+2 then raise exception 'co-manager finished match update failed';end if;
 execute 'reset role';
 update public.coorganizer_permissions set can_enter_scores=false where workspace_id=wid and user_id=uid;
 execute 'set local role authenticated';
 begin
   perform public.quick_match_action_v1(mid,'score','{"home":100,"away":100}');
   raise exception 'TEST_FAILED unauthorized edit';
 exception when others then if sqlerrm like 'TEST_FAILED%' then raise;end if; end;
 execute 'reset role';
 update public.workspace_members set role='admin' where workspace_id=wid and user_id=uid;
 update public.tournaments set status='finished' where id=tid;
 execute 'set local role authenticated';
 begin
   perform public.quick_match_action_v1(mid,'score','{"home":100,"away":100}');
   raise exception 'TEST_FAILED closed tournament edit';
 exception when others then if sqlerrm like 'TEST_FAILED%' then raise;end if; end;
 execute 'reset role';
end $$;
rollback;
select 'PASS: add/edit/delete/attach, co-manager finished match, permission denial, closed tournament; all changes rolled back' as validation;

begin;
do $$
declare users uuid[]; ws uuid; tid uuid; ta uuid; tb uuid; mid uuid; ids uuid[]:='{}'; pid uuid; i integer;
begin
 select array_agg(user_id) into users from (select distinct user_id from public.global_player_profiles order by user_id limit 3) u;
 insert into public.workspaces(name,owner_user_id,public_enabled) values('Replacement validation',users[1],false) returning id into ws;
 insert into public.workspace_members(workspace_id,user_id,role,active) values(ws,users[1],'admin',true),(ws,users[2],'coorganizer',true),(ws,users[3],'coorganizer',true);
 insert into public.coorganizer_permissions(workspace_id,user_id,can_enter_scores) values(ws,users[2],true),(ws,users[3],false);
 insert into public.tournaments(workspace_id,name,status,max_players,team_size,tournament_date,registration_open) values(ws,'Transactional replacement test','live',5,2,current_date,false) returning id into tid;
 insert into public.teams(tournament_id,name) values(tid,'A') returning id into ta;
 insert into public.teams(tournament_id,name) values(tid,'B') returning id into tb;
 for i in 1..5 loop
  insert into public.players(workspace_id,name,is_group_member,global_player_id) values(ws,'Fixture '||i,false,null) returning id into pid;ids:=array_append(ids,pid);
  insert into public.tournament_players(tournament_id,player_id,present,registration_status,is_substitute) values(tid,pid,true,'confirmed',i=5);
  if i<5 then insert into public.team_players(team_id,player_id) values(case when i<=2 then ta else tb end,pid);end if;
 end loop;
 insert into public.matches(tournament_id,home_team_id,away_team_id,status,started_at) values(tid,ta,tb,'live',now()) returning id into mid;
 perform set_config('request.jwt.claim.sub',users[2]::text,true);execute 'set local role authenticated';
 perform public.set_match_player_assignment(mid,ids[5],ta,false,ids[1]);
 execute 'reset role';
 if not exists(select 1 from public.match_player_assignments where match_id=mid and player_id=ids[5] and team_id=ta) or exists(select 1 from public.match_player_assignments where match_id=mid and player_id=ids[1] and team_id is not null) then raise exception 'Normal coorganizer replacement failed';end if;
 perform set_config('request.jwt.claim.sub',users[2]::text,true);execute 'set local role authenticated';
 begin perform public.set_match_player_assignment(mid,ids[3],ta,false,ids[5]);raise exception 'TEST_FAILED: active opponent accepted';exception when others then if sqlerrm like 'TEST_FAILED:%' then raise;end if;end;
 execute 'reset role';
 if not exists(select 1 from public.match_player_assignments where match_id=mid and player_id=ids[5] and team_id=ta) then raise exception 'Rejected replacement was not atomic';end if;
 perform set_config('request.jwt.claim.sub',users[3]::text,true);execute 'set local role authenticated';
 begin perform public.set_match_player_assignment(mid,ids[1],ta,false,ids[5]);raise exception 'TEST_FAILED: unauthorized replacement';exception when others then if sqlerrm like 'TEST_FAILED:%' then raise;end if;end;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',users[1]::text,true);execute 'set local role authenticated';
 perform public.set_match_player_assignment(mid,ids[1],ta,false,ids[5]);
 execute 'reset role';
 update public.matches set status='finished' where id=mid;
 execute 'set local role authenticated';
 begin perform public.set_match_player_assignment(mid,ids[5],ta,false,ids[1]);raise exception 'TEST_FAILED: finished replacement';exception when others then if sqlerrm like 'TEST_FAILED:%' then raise;end if;end;
 execute 'reset role';
end $$;
rollback;
select 'Existing replacement RPC: admin, authorized coorganizer, denied coorganizer, atomicity and finished lock passed' as validation;

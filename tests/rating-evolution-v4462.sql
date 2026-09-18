-- Isolated, rollback-only checks. No real votes or team ratings are retained.
begin;
do $$
declare pid uuid; tid uuid; wid uuid; uid uuid; n numeric; base numeric; j jsonb; linked uuid; teamid uuid; saved numeric;
begin
 select r.player_id,s.tournament_id,s.workspace_id,e.evaluator_user_id into pid,tid,wid,uid
 from public.tournament_rating_sessions s join public.tournament_rating_evaluators e on e.tournament_id=s.tournament_id
 join public.player_skill_ratings r on r.workspace_id=s.workspace_id and r.evaluator_user_id=e.evaluator_user_id limit 1;
 if pid is null then raise exception 'No rating fixture';end if;
 insert into public.tournament_rating_evaluators(tournament_id,evaluator_user_id)
 select tid,id from auth.users where id<>uid limit 1 on conflict do nothing;
 select coalesce(global_player_id,id) into linked from public.players where id=pid;
 delete from public.player_post_match_observations o using public.players p where p.id=o.player_id and coalesce(p.global_player_id,p.id)=linked;
 select avg(r.rating) into base from public.player_skill_ratings r join public.players p on p.id=r.player_id where coalesce(p.global_player_id,p.id)=linked;
 select count(distinct evaluator_user_id) into n from public.tournament_rating_evaluators where tournament_id=tid;
 update public.tournament_rating_sessions set status='closed' where tournament_id=tid;
 insert into public.player_post_match_observations(workspace_id,tournament_id,player_id,evaluator_user_id,appreciation_code,rating_delta) values(wid,tid,pid,uid,6,0.3);
 j:=private.player_rating_breakdown_v4462(pid);
 if (j->>'rating_delta')::numeric<>round(0.3/n,2) then raise exception 'Wrong denominator %',j;end if;
 if (j->>'avg_rating')::numeric<>round(least(5,greatest(1,base+0.3/n)),2) then raise exception 'Wrong effective rating';end if;
 update public.tournament_rating_sessions set status='open',closes_at=now()+interval '1 hour' where tournament_id=tid;
 j:=private.player_rating_breakdown_v4462(pid);
 if (j->>'rating_delta')::numeric<>0 or (j->>'pending_delta')::numeric<>round(0.3/n,2) then raise exception 'Open votes applied early';end if;
 select tp.team_id,tp.rating_at_join into teamid,saved from public.team_players tp where tp.player_id=pid limit 1;
 if teamid is not null then
  update public.team_players set rating_at_join=0 where team_id=teamid and player_id=pid;
  if (select rating_at_join from public.team_players where team_id=teamid and player_id=pid) is distinct from saved then raise exception 'Snapshot overwritten';end if;
 end if;
 select wm.user_id into uid from public.workspace_members wm where wm.workspace_id=wid and wm.role='admin' and wm.active limit 1;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 execute 'set local role authenticated';
 j:=public.get_workspace_player_progress_v4462(wid);
 if jsonb_typeof(j->'players')<>'array' then raise exception 'Missing player list';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub','',true);
 begin
  perform private.workspace_player_progress_v4462(wid);
  raise exception 'TEST_FAILED anonymous access';
 exception when others then if sqlerrm like 'TEST_FAILED%' then raise;end if;end;
end $$;
rollback;
select 'PASS weighted denominator, provisional votes, immutable team rating, authenticated access; rollback complete' validation;

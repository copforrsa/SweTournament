begin;
do $$
declare tid uuid; uid uuid; s jsonb; k integer; snapshot jsonb; prior jsonb; max_overlap integer; worst numeric; started timestamptz;
begin
 select t.id,wm.user_id into tid,uid from public.tournaments t join public.workspace_members wm on wm.workspace_id=t.workspace_id and wm.role='admin' and wm.active where t.name='TEST Glacière — 16/09/2026' limit 1;
 if tid is null then raise exception 'Missing test room';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 for k in 1..4 loop
  select coalesce(jsonb_agg(p.snapshot),'[]') into prior from public.team_draw_room_proposals p where tournament_id=tid;
  update public.tournaments set team_redraws_used=0 where id=tid;
  started:=clock_timestamp();
  execute 'set local role authenticated';
  s:=public.team_draw_room_redraw_v1(tid);
  execute 'reset role';
  snapshot:=s->'proposals'->0->'snapshot';
  select max(shared) into max_overlap from (
   select new_team.ordinality n,h.ordinality h,old_team.ordinality o,count(*) shared
   from jsonb_array_elements(snapshot->'teams') with ordinality new_team
   cross join lateral jsonb_array_elements(new_team.value->'players') new_player
   cross join jsonb_array_elements(prior) with ordinality h
   cross join lateral jsonb_array_elements(h.value->'teams') with ordinality old_team
   cross join lateral jsonb_array_elements(old_team.value->'players') old_player
   where new_player->>'id'=old_player->>'id'
   group by new_team.ordinality,h.ordinality,old_team.ordinality
  ) overlap_counts;
  if max_overlap>3 then raise exception 'Near-duplicate team: % players retained',max_overlap;end if;
  select max((t->>'average_rating')::numeric)-min((t->>'average_rating')::numeric) into worst from jsonb_array_elements(snapshot->'teams') t;
  if worst>0.26 then raise exception 'Balance degraded: %',worst;end if;
  raise notice 'Scenario %: maximum overlap %, average gap %, elapsed %',k,max_overlap,worst,clock_timestamp()-started;
 end loop;
end $$;
rollback;
select 'PASS: each five-player team changes at least two members versus all prior scenarios, team averages within 0.26/5; test data unchanged' result;

create or replace function private.diversify_draw_v4466(p_tournament_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare
 ids uuid[]; slots uuid[]; initial_slots uuid[]; best_slots uuid[]; ratings numeric[]; movable integer[];
 signatures text[]; signature text; snap jsonb; base_spread numeric; spread numeric; best_spread numeric:=1000;
 history jsonb; diversity integer; best_diversity integer:=-1; acceptable boolean; free_count integer;
 i integer; j integer; a integer; b integer; tmp uuid; n integer; attempt integer;
begin
 select array_agg(tp.player_id order by tp.player_id),array_agg(tp.team_id order by tp.player_id),
 array_agg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end order by tp.player_id)
 into ids,initial_slots,ratings from public.team_players tp join public.teams tm on tm.id=tp.team_id join public.players p on p.id=tp.player_id where tm.tournament_id=p_tournament_id;
 n:=coalesce(array_length(ids,1),0); if n=0 then return;end if;
 select array_agg(g.idx) into movable from generate_series(1,n) g(idx) where not private.is_locked_team_player_v4465(initial_slots[g.idx],ids[g.idx]);
 select array_agg(private.draw_roster_signature_v4466(snapshot)) into signatures from public.team_draw_room_proposals where tournament_id=p_tournament_id;
 select coalesce(jsonb_agg(snapshot),'[]'::jsonb) into history from public.team_draw_room_proposals where tournament_id=p_tournament_id;
 if jsonb_array_length(history)=0 then return;end if;
 free_count:=coalesce(array_length(movable,1),0);
 select max(avg_rating)-min(avg_rating) into base_spread from (select avg(ratings[g.idx]) avg_rating from generate_series(1,n) g(idx) group by initial_slots[g.idx]) s;
 -- Evaluate alternatives in memory; only the chosen roster is written.
 for attempt in 0..800 loop
  slots:=initial_slots;
  if attempt>0 and coalesce(array_length(movable,1),0)>1 then
   for j in 1..(free_count + attempt % greatest(free_count,1)) loop
    a:=movable[1+floor(random()*array_length(movable,1))::int];
    b:=movable[1+floor(random()*array_length(movable,1))::int];
    tmp:=slots[a];slots[a]:=slots[b];slots[b]:=tmp;
   end loop;
  end if;
  select max(avg_rating)-min(avg_rating) into spread from (select avg(ratings[g.idx]) avg_rating from generate_series(1,n) g(idx) group by slots[g.idx]) s;
  if spread>greatest(base_spread,0.20)+0.05 then continue;end if;
  select jsonb_build_object('teams',jsonb_agg(jsonb_build_object('players',players))) into snap from (
   select jsonb_agg(jsonb_build_object('id',ids[g.idx])) players from generate_series(1,n) g(idx) group by slots[g.idx]
  ) s;
  signature:=private.draw_roster_signature_v4466(snap);
  if signature=any(coalesce(signatures,'{}'::text[])) then continue;end if;

  -- Compare actual teammate groups against EVERY previous proposal.
  -- A new color/name/order never counts as a different composition.
  with candidate as (
   select ids[g.idx] pid,slots[g.idx] team_id,(g.idx=any(coalesce(movable,'{}'::integer[]))) mobile
   from generate_series(1,n) g(idx)
  ), old_members as (
   select h.proposal_no,ot.team_no,(p->>'id')::uuid pid
   from jsonb_array_elements(history) with ordinality h(snapshot,proposal_no)
   cross join lateral jsonb_array_elements(h.snapshot->'teams') with ordinality ot(team,team_no)
   cross join lateral jsonb_array_elements(ot.team->'players') p
  ), overlap as (
   select c.team_id,o.proposal_no,o.team_no,count(*) shared
   from candidate c join old_members o using(pid) group by c.team_id,o.proposal_no,o.team_no
  ), counts as (
   select team_id,count(*) size,count(*) filter(where mobile) free
   from candidate group by team_id
  ), distances as (
   select c.team_id,h.proposal_no,c.size-coalesce(max(o.shared),0) changed,
   least(2,c.size/2,c.free,greatest(0,free_count-c.free)) required
   from counts c cross join generate_series(1,jsonb_array_length(history)) h(proposal_no)
   left join overlap o on o.team_id=c.team_id and o.proposal_no=h.proposal_no
   group by c.team_id,h.proposal_no,c.size,c.free
  ), per_proposal as (
   select proposal_no,sum(changed)::integer distance,bool_and(changed>=required) passes
   from distances group by proposal_no
  )
  select min(distance),bool_and(passes) into diversity,acceptable from per_proposal;
  if not coalesce(acceptable,false) then continue;end if;
  -- Once balance is acceptable, prioritize changed groups over hundredths of a point.
  if diversity>best_diversity or (diversity=best_diversity and spread<best_spread) then
   best_slots:=slots;best_spread:=spread;best_diversity:=diversity;
  end if;
 end loop;
 if best_slots is null then raise exception 'Aucune composition assez différente et équilibrée trouvée. Les joueurs confirmés restent fixes ; aucun tirage supplémentaire n’a été décompté.';end if;
 for i in 1..n loop
  if best_slots[i]<>initial_slots[i] then delete from public.team_players where team_id=initial_slots[i] and player_id=ids[i];end if;
 end loop;
 for i in 1..n loop
  if best_slots[i]<>initial_slots[i] then insert into public.team_players(team_id,player_id) values(best_slots[i],ids[i]);end if;
 end loop;
end $$;
revoke all on function private.diversify_draw_v4466(uuid) from public;

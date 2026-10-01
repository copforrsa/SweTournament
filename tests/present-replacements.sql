-- Transactional verification: every fixture and replacement is rolled back.
begin;
do $$
declare mid uuid; tid uuid; wid uuid; uid uuid; outgoing uuid; incoming uuid; result jsonb; rejected boolean;
begin
 select m.id,t.id,t.workspace_id,wm.user_id into mid,tid,wid,uid
 from public.matches m join public.tournaments t on t.id=m.tournament_id
 join public.workspace_members wm on wm.workspace_id=t.workspace_id and wm.role='admin' and coalesce(wm.active,true)
 where exists(select 1 from public.team_players where team_id=m.home_team_id)
 and exists(select 1 from public.players p where p.workspace_id=t.workspace_id and not exists(select 1 from public.team_players a where a.player_id=p.id and a.team_id in(m.home_team_id,m.away_team_id))) limit 1;
 if mid is null then raise exception 'No rollback fixture'; end if;
 select a.player_id into outgoing from public.team_players a join public.matches m on m.home_team_id=a.team_id where m.id=mid limit 1;
 select p.id into incoming from public.players p where p.workspace_id=wid and not exists(select 1 from public.team_players a join public.matches m on a.team_id in(m.home_team_id,m.away_team_id) where m.id=mid and a.player_id=p.id) limit 1;
 update public.matches set status='finished' where id=mid;
 delete from public.match_player_assignments where match_id=mid;
 insert into public.tournament_players(tournament_id,player_id,present,is_substitute,registration_status) values(tid,incoming,true,false,'confirmed') on conflict(tournament_id,player_id) do update set present=true,is_substitute=false,registration_status='confirmed';
 -- Force the fallback fixture after any automatic substitute recalculation.
 update public.tournament_players set is_substitute=false where tournament_id=tid and player_id=incoming;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.quick_match_action_v1(mid,'substitute',jsonb_build_object('out_id',outgoing,'in_id',incoming));
 if not exists(select 1 from jsonb_array_elements(result->'assignments') a where a->>'player_id'=incoming::text and a->>'team_id' is not null) then raise exception 'Present player replacement failed'; end if;
 execute 'reset role';
 update public.tournament_players set present=false where tournament_id=tid and player_id=outgoing;
 execute 'set local role authenticated';
 rejected:=false;
 begin perform public.quick_match_action_v1(mid,'substitute',jsonb_build_object('out_id',incoming,'in_id',outgoing)); exception when others then if sqlerrm='Choisis un joueur présent du tournoi' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'Absent player accepted'; end if;
 execute 'reset role';
end $$;
rollback;

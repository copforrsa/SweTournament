-- Enrich existing proposals without changing rosters, proposal IDs or votes.
update public.team_draw_room_proposals pr
set snapshot=jsonb_set(pr.snapshot,'{teams}',(
 select coalesce(jsonb_agg(enriched order by team_ord),'[]'::jsonb)
 from (
 select team_ord,team || jsonb_build_object('players',players,'average_rating',(
 select round(avg((p->>'balancing_rating')::numeric),2) from jsonb_array_elements(players) p)) enriched
 from jsonb_array_elements(pr.snapshot->'teams') with ordinality t(team,team_ord)
 cross join lateral (
 select coalesce(jsonb_agg(player || jsonb_build_object(
 'balancing_rating',case when p.is_group_member=false then 2.5 else coalesce(
 (select tp.rating_at_join from public.team_players tp join public.teams tm on tm.id=tp.team_id where tm.tournament_id=pr.tournament_id and tp.player_id=p.id limit 1),public.get_effective_player_rating(p.id)) end,
 'rating_is_estimate',p.is_group_member=false
 ) order by player_ord),'[]'::jsonb) players
 from jsonb_array_elements(team->'players') with ordinality pl(player,player_ord)
 left join public.players p on p.id=(player->>'id')::uuid
 ) x
 ) enriched_teams
))
where pr.published_at is null and exists(select 1 from jsonb_array_elements(pr.snapshot->'teams') t where not t ? 'average_rating');

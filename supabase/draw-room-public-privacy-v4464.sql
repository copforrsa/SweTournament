CREATE OR REPLACE FUNCTION public.get_public_workspace_snapshot(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare w public.workspaces%rowtype;
begin
  select * into w from public.workspaces where public_token=p_token and public_enabled=true;
  if not found then return null; end if;
  return jsonb_build_object(
    'workspace',jsonb_build_object('id',w.id,'name',w.name),
    'features',coalesce((select jsonb_build_object('rankings_enabled',coalesce(e.rankings_enabled,true),'player_ratings_enabled',coalesce(e.player_ratings_enabled,false)) from public.workspace_entitlements e where e.workspace_id=w.id),jsonb_build_object('rankings_enabled',true,'player_ratings_enabled',false)),
    'players',coalesce((select jsonb_agg(to_jsonb(p)-'workspace_id'-'skill_level') from public.players p where p.workspace_id=w.id),'[]'::jsonb),
    'tournament_group_levels',coalesce((select jsonb_agg(jsonb_build_object('tournament_id',g.tournament_id,'avg_rating',g.avg_rating)) from (select q.tournament_id,round(avg(q.player_avg)::numeric,1) avg_rating from (select distinct tp.tournament_id,tp.player_id,pr.player_avg from public.tournament_players tp join public.tournaments t on t.id=tp.tournament_id and t.workspace_id=w.id join (select r.player_id,avg(r.rating)::numeric player_avg from public.player_skill_ratings r where r.workspace_id=w.id and r.rating is not null group by r.player_id) pr on pr.player_id=tp.player_id where coalesce(tp.present,false)=true and coalesce(tp.registration_status,'')<>'waitlist') q group by q.tournament_id) g),'[]'::jsonb),
    'seasons',coalesce((select jsonb_agg(to_jsonb(s)-'workspace_id') from public.seasons s where s.workspace_id=w.id),'[]'::jsonb),
    'leagues',coalesce((select jsonb_agg(to_jsonb(l)-'workspace_id'-'created_by') from public.leagues l where l.workspace_id=w.id),'[]'::jsonb),
    'league_players',coalesce((select jsonb_agg(to_jsonb(lp)) from public.league_players lp join public.leagues l on l.id=lp.league_id where l.workspace_id=w.id),'[]'::jsonb),
    'tournaments',coalesce((select jsonb_agg((to_jsonb(t)-'workspace_id'-'created_by'-'venue_address'-'venue_latitude'-'venue_longitude') || case when coalesce(t.share_location,false) then jsonb_build_object('venue_address',t.venue_address,'venue_latitude',t.venue_latitude,'venue_longitude',t.venue_longitude,'share_location',true) else jsonb_build_object('share_location',false) end) from public.tournaments t where t.workspace_id=w.id),'[]'::jsonb),
    'tournament_players',coalesce((select jsonb_agg(to_jsonb(tp)) from public.tournament_players tp join public.tournaments t on t.id=tp.tournament_id where t.workspace_id=w.id),'[]'::jsonb),
    'teams',coalesce((select jsonb_agg(to_jsonb(tm)) from public.teams tm join public.tournaments t on t.id=tm.tournament_id where t.workspace_id=w.id and (not t.draw_room_first_enabled or t.team_review_status='approved' or coalesce(tm.is_preformed,false))),'[]'::jsonb),
    'team_players',coalesce((select jsonb_agg(to_jsonb(tp)-'rating_at_join') from public.team_players tp join public.teams tm on tm.id=tp.team_id join public.tournaments t on t.id=tm.tournament_id where t.workspace_id=w.id and (not t.draw_room_first_enabled or t.team_review_status='approved' or coalesce(tm.is_preformed,false))),'[]'::jsonb),
    'team_player_invitations',coalesce((select jsonb_agg(to_jsonb(i)) from public.team_player_invitations i join public.tournaments t on t.id=i.tournament_id where t.workspace_id=w.id),'[]'::jsonb),
    'matches',coalesce((select jsonb_agg(to_jsonb(m)) from public.matches m join public.tournaments t on t.id=m.tournament_id where t.workspace_id=w.id),'[]'::jsonb),
    'goals',coalesce((select jsonb_agg(to_jsonb(g)-'created_by') from public.goals g join public.matches m on m.id=g.match_id join public.tournaments t on t.id=m.tournament_id where t.workspace_id=w.id),'[]'::jsonb),
    'match_player_assignments',coalesce((select jsonb_agg(to_jsonb(a)-'updated_by') from public.match_player_assignments a join public.matches m on m.id=a.match_id join public.tournaments t on t.id=m.tournament_id where t.workspace_id=w.id),'[]'::jsonb),
    'sports_complexes',coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order,c.name) from public.sports_complexes c where c.active=true),'[]'::jsonb),
    'sports_pitches',coalesce((select jsonb_agg(to_jsonb(p) order by p.sort_order,p.name) from public.sports_pitches p where p.active=true),'[]'::jsonb)
  );
end $function$;

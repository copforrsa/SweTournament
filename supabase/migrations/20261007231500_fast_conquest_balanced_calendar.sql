CREATE OR REPLACE FUNCTION public.fast_conquest_context(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.tournaments%rowtype; s private.fast_conquest_sessions%rowtype; a boolean; d boolean; c boolean; e boolean; begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 select * into t from public.tournaments where id=p_tournament_id and format='fast_conquest'; if not found then raise exception 'Fast Conquête introuvable'; end if;
 a:=private.fast_admin(t.workspace_id); d:=private.fast_designated(t.id);e:=private.swe_workspace_full_access(t.workspace_id);
 c:=exists(select 1 from private.fast_conquest_captains where tournament_id=t.id and user_id=auth.uid());
 if not (a or d or c) then raise exception 'Accès réservé aux gestionnaires désignés et capitaines'; end if;
 select * into s from private.fast_conquest_sessions where tournament_id=t.id;
 return jsonb_build_object('tournament',to_jsonb(t),'entitled',e,'admin',a,'can_score',e and (a or d and private.coorganizer_can_edit_tournament(t.id)),'can_note',e and private.fast_present(t.id),'version',coalesce(s.version,0),'state',s.state,'locked',coalesce(s.locked,false),'mode',t.fast_team_mode,'pitch_count',coalesce(cardinality(t.reserved_pitch_ids),0),'vote_open',coalesce(s.vote_open,false),'vote_revision',coalesce(s.vote_revision,0),'notes_open',coalesce(s.notes_open,false),'notes_closed',coalesce(s.notes_closed,false),
 'team_ratings',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'rating',(select avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end) from public.team_players tp join public.players p on p.id=tp.player_id where tp.team_id=x.id))) from public.teams x where x.tournament_id=t.id),'[]'::jsonb),
 'teams',coalesce((select jsonb_agg(id order by created_at,id) from public.teams where tournament_id=t.id),'[]'::jsonb),
 'matches',coalesce((select jsonb_agg(to_jsonb(m)||jsonb_build_object('scoring_digest',private.fast_digest(m.id),'captains_confirmed',(select count(*)=2 from private.fast_conquest_confirmations f where f.match_id=m.id and f.digest=private.fast_digest(m.id)),'can_confirm',exists(select 1 from private.fast_conquest_captains k where k.tournament_id=t.id and k.user_id=auth.uid() and k.team_id in (m.home_team_id,m.away_team_id)))) from public.matches m where m.tournament_id=t.id),'[]'::jsonb),
 'evaluators',case when a or d then coalesce((select jsonb_agg(e.user_id) from private.fast_conquest_evaluators e where tournament_id=t.id),'[]'::jsonb) else '[]'::jsonb end,
 'votes',case when a or d then coalesce((select jsonb_agg(v) from private.fast_conquest_votes v where tournament_id=t.id and revision=s.vote_revision),'[]'::jsonb) else '[]'::jsonb end,
 'my_notes',case when d then coalesce((select jsonb_agg(n) from private.fast_conquest_notes n where tournament_id=t.id and user_id=auth.uid()),'[]'::jsonb) else '[]'::jsonb end,
 'note_summary',case when a then coalesce((select jsonb_agg(z) from (select player_id,count(*) voters,avg(appreciation_code) average,jsonb_agg(comment) filter(where comment<>'') observations from private.fast_conquest_notes where tournament_id=t.id group by player_id) z),'[]'::jsonb) else '[]'::jsonb end,
 'participants',coalesce((select jsonb_agg(z.player_id) from (select distinct a.player_id from public.match_player_assignments a join public.matches m on m.id=a.match_id where m.tournament_id=t.id and m.status='finished') z),'[]'::jsonb),
 'captain_candidates',coalesce((select jsonb_agg(jsonb_build_object('team_id',tp.team_id,'player_id',tp.player_id,'user_id',g.user_id)) from public.team_players tp join public.teams x on x.id=tp.team_id join public.players p on p.id=tp.player_id join public.global_player_profiles g on g.id=p.global_player_id where x.tournament_id=t.id and g.user_id is not null),'[]'::jsonb),
 'captains',coalesce((select jsonb_agg(k) from private.fast_conquest_captains k where tournament_id=t.id),'[]'::jsonb));
end $function$;
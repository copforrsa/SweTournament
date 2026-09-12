-- V43.72: read-only aggregate for the signed-in and shared player cards.
-- Historical matches imported without a start/finish timestamp can have incomplete
-- assignments. Only those archived scheduled matches fall back to the team roster.
-- Explicit match assignments (including a NULL bench assignment) always win.
-- No registrations, scores, goals, memberships or share links are changed.
CREATE OR REPLACE FUNCTION private.player_card_stats_v1(p_global_player_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
WITH mp AS (
  SELECT p.id FROM public.players p WHERE p.global_player_id=p_global_player_id
), eligible AS (
  SELECT m.*,t.status tournament_status,t.format,
    (t.status='finished' AND m.status='scheduled' AND m.started_at IS NULL AND m.finished_at IS NULL) legacy
  FROM public.matches m JOIN public.tournaments t ON t.id=m.tournament_id
  WHERE m.status IN ('live','finished') OR
    (t.status='finished' AND m.status='scheduled' AND m.started_at IS NULL AND m.finished_at IS NULL)
), appearances AS (
  SELECT m.id match_id,m.tournament_id,a.team_id
  FROM eligible m JOIN public.match_player_assignments a ON a.match_id=m.id
  JOIN mp ON mp.id=a.player_id WHERE a.team_id IN (m.home_team_id,m.away_team_id)
  UNION
  SELECT m.id,m.tournament_id,tp.team_id
  FROM eligible m JOIN public.team_players tp ON tp.team_id IN (m.home_team_id,m.away_team_id)
  JOIN mp ON mp.id=tp.player_id
  WHERE (m.legacy OR NOT EXISTS (SELECT 1 FROM public.match_player_assignments any_a WHERE any_a.match_id=m.id))
    AND NOT EXISTS (SELECT 1 FROM public.match_player_assignments a WHERE a.match_id=m.id AND a.player_id=mp.id)
), results AS (
  SELECT a.*,m.status,m.legacy,m.tournament_status,
    CASE WHEN m.home_score>m.away_score THEN m.home_team_id
         WHEN m.away_score>m.home_score THEN m.away_team_id END winner
  FROM appearances a JOIN eligible m ON m.id=a.match_id
), team_table AS (
  -- Same 3/1 points, goal difference and goals-scored ranking as the tournament UI.
  SELECT m.tournament_id,tm.id team_id,tm.name,
    sum(CASE WHEN (tm.id=m.home_team_id AND m.home_score>m.away_score) OR
                       (tm.id=m.away_team_id AND m.away_score>m.home_score) THEN 3
             WHEN m.home_score=m.away_score THEN 1 ELSE 0 END) pts,
    sum(CASE WHEN tm.id=m.home_team_id THEN m.home_score ELSE m.away_score END) gf,
    sum(CASE WHEN tm.id=m.home_team_id THEN m.away_score ELSE m.home_score END) ga
  FROM eligible m JOIN public.teams tm ON tm.id IN (m.home_team_id,m.away_team_id)
  WHERE m.tournament_status='finished' AND coalesce(m.format,'classic')<>'league'
    AND m.tournament_id IN (SELECT tournament_id FROM appearances)
  GROUP BY m.tournament_id,tm.id,tm.name
), champions AS (
  SELECT *,row_number() OVER (PARTITION BY tournament_id ORDER BY pts DESC,(gf-ga) DESC,gf DESC,name,team_id) place
  FROM team_table
), ratings AS (
  SELECT r.rating,r.preferred_role,r.evaluator_user_id FROM public.player_skill_ratings r JOIN mp ON mp.id=r.player_id
), roles AS (
  SELECT preferred_role,count(*) n FROM ratings WHERE preferred_role IS NOT NULL GROUP BY preferred_role
), top_roles AS (
  SELECT preferred_role FROM roles WHERE n=(SELECT max(n) FROM roles)
)
SELECT jsonb_build_object(
  'tournaments',(SELECT count(DISTINCT tournament_id) FROM appearances),
  'matches',(SELECT count(DISTINCT match_id) FROM appearances),
  'wins',(SELECT count(DISTINCT match_id) FROM results WHERE (status='finished' OR legacy) AND team_id=winner),
  'goals',(SELECT count(*) FROM public.goals g JOIN mp ON mp.id=g.scorer_player_id WHERE NOT coalesce(g.is_own_goal,false)),
  'assists',(SELECT count(*) FROM public.goals g JOIN mp ON mp.id=g.assister_player_id),
  'tournament_wins',(SELECT count(DISTINCT c.tournament_id) FROM champions c JOIN appearances a ON a.tournament_id=c.tournament_id AND a.team_id=c.team_id WHERE c.place=1),
  'rating',(SELECT round(avg(rating)::numeric,1) FROM ratings WHERE rating IS NOT NULL),
  'preferred_role',(SELECT CASE WHEN count(*)>1 THEN 'couteau_suisse' ELSE min(preferred_role) END FROM top_roles)
);
$$;
REVOKE ALL ON FUNCTION private.player_card_stats_v1(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_my_player_card_stats_v1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_gid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT id INTO v_gid FROM public.global_player_profiles WHERE user_id=auth.uid();
  RETURN private.player_card_stats_v1(v_gid);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_player_card_by_token_v1(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_gp public.global_player_profiles%rowtype;
BEGIN
  SELECT gp.* INTO v_gp FROM public.player_card_share_tokens s
    JOIN public.global_player_profiles gp ON gp.id=s.global_player_id
    WHERE s.token=p_token AND s.active=true LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('public_player_id',v_gp.public_player_id,
    'display_name',coalesce(nullif(trim(v_gp.nickname),''),nullif(trim(v_gp.first_name),''),v_gp.display_name),
    'avatar_url',v_gp.avatar_url) || private.player_card_stats_v1(v_gp.id);
END;
$$;


-- Read-only aggregate exercised against session-local fixtures. No production writes.
BEGIN;
CREATE TEMP TABLE players ON COMMIT DROP AS SELECT * FROM public.players WITH NO DATA;
CREATE TEMP TABLE tournaments ON COMMIT DROP AS SELECT * FROM public.tournaments WITH NO DATA;
CREATE TEMP TABLE matches ON COMMIT DROP AS SELECT * FROM public.matches WITH NO DATA;
CREATE TEMP TABLE teams ON COMMIT DROP AS SELECT * FROM public.teams WITH NO DATA;
CREATE TEMP TABLE team_players ON COMMIT DROP AS SELECT * FROM public.team_players WITH NO DATA;
CREATE TEMP TABLE match_player_assignments ON COMMIT DROP AS SELECT * FROM public.match_player_assignments WITH NO DATA;
CREATE TEMP TABLE player_skill_ratings ON COMMIT DROP AS SELECT * FROM public.player_skill_ratings WITH NO DATA;
CREATE TEMP TABLE goals ON COMMIT DROP AS SELECT * FROM public.goals WITH NO DATA;
INSERT INTO pg_temp.players(id,global_player_id) VALUES ('00000000-0000-4000-8000-000000000001'::uuid,'00000000-0000-4000-8000-000000000100'::uuid),('00000000-0000-4000-8000-000000000002'::uuid,'00000000-0000-4000-8000-000000000200'::uuid);
INSERT INTO pg_temp.tournaments(id,status,format) VALUES ('00000000-0000-4000-8000-000000000030'::uuid,'finished','classic'),('00000000-0000-4000-8000-000000000031'::uuid,'live','classic'),('00000000-0000-4000-8000-000000000032'::uuid,'draft','classic');
INSERT INTO pg_temp.teams(id,tournament_id,name) VALUES ('00000000-0000-4000-8000-000000000010'::uuid,'00000000-0000-4000-8000-000000000030'::uuid,'Bleus'),('00000000-0000-4000-8000-000000000020'::uuid,'00000000-0000-4000-8000-000000000030'::uuid,'Rouges');
INSERT INTO pg_temp.team_players(team_id,player_id) VALUES ('00000000-0000-4000-8000-000000000010'::uuid,'00000000-0000-4000-8000-000000000001'::uuid),('00000000-0000-4000-8000-000000000020'::uuid,'00000000-0000-4000-8000-000000000002'::uuid);
INSERT INTO pg_temp.matches(id,tournament_id,status,home_team_id,away_team_id,home_score,away_score) VALUES
('00000000-0000-4000-8000-000000001001'::uuid,'00000000-0000-4000-8000-000000000030'::uuid,'scheduled','00000000-0000-4000-8000-000000000010'::uuid,'00000000-0000-4000-8000-000000000020'::uuid,3,1),
('00000000-0000-4000-8000-000000001002'::uuid,'00000000-0000-4000-8000-000000000030'::uuid,'finished','00000000-0000-4000-8000-000000000010'::uuid,'00000000-0000-4000-8000-000000000020'::uuid,2,0),
('00000000-0000-4000-8000-000000001003'::uuid,'00000000-0000-4000-8000-000000000030'::uuid,'finished','00000000-0000-4000-8000-000000000010'::uuid,'00000000-0000-4000-8000-000000000020'::uuid,0,1),
('00000000-0000-4000-8000-000000001004'::uuid,'00000000-0000-4000-8000-000000000030'::uuid,'finished','00000000-0000-4000-8000-000000000010'::uuid,'00000000-0000-4000-8000-000000000020'::uuid,2,0),
('00000000-0000-4000-8000-000000001005'::uuid,'00000000-0000-4000-8000-000000000032'::uuid,'scheduled','00000000-0000-4000-8000-000000000010'::uuid,'00000000-0000-4000-8000-000000000020'::uuid,0,0),
('00000000-0000-4000-8000-000000001006'::uuid,'00000000-0000-4000-8000-000000000030'::uuid,'finished','00000000-0000-4000-8000-000000000010'::uuid,'00000000-0000-4000-8000-000000000020'::uuid,0,0),
('00000000-0000-4000-8000-000000001007'::uuid,'00000000-0000-4000-8000-000000000031'::uuid,'live','00000000-0000-4000-8000-000000000010'::uuid,'00000000-0000-4000-8000-000000000020'::uuid,1,0),
('00000000-0000-4000-8000-000000001008'::uuid,'00000000-0000-4000-8000-000000000030'::uuid,'scheduled','00000000-0000-4000-8000-000000000010'::uuid,'00000000-0000-4000-8000-000000000020'::uuid,1,0);
INSERT INTO pg_temp.match_player_assignments(match_id,player_id,team_id) VALUES
('00000000-0000-4000-8000-000000001001'::uuid,'00000000-0000-4000-8000-000000000002'::uuid,'00000000-0000-4000-8000-000000000020'::uuid),
('00000000-0000-4000-8000-000000001002'::uuid,'00000000-0000-4000-8000-000000000002'::uuid,'00000000-0000-4000-8000-000000000020'::uuid),
('00000000-0000-4000-8000-000000001003'::uuid,'00000000-0000-4000-8000-000000000001'::uuid,'00000000-0000-4000-8000-000000000020'::uuid),
('00000000-0000-4000-8000-000000001004'::uuid,'00000000-0000-4000-8000-000000000001'::uuid,NULL),
('00000000-0000-4000-8000-000000001007'::uuid,'00000000-0000-4000-8000-000000000001'::uuid,'00000000-0000-4000-8000-000000000010'::uuid),
('00000000-0000-4000-8000-000000001008'::uuid,'00000000-0000-4000-8000-000000000001'::uuid,NULL);
INSERT INTO pg_temp.player_skill_ratings(player_id,rating,preferred_role) VALUES ('00000000-0000-4000-8000-000000000001'::uuid,3,'forward'),('00000000-0000-4000-8000-000000000001'::uuid,3,'defender'),('00000000-0000-4000-8000-000000000001'::uuid,4,NULL);
INSERT INTO pg_temp.goals(id,match_id,scorer_player_id,is_own_goal) VALUES ('00000000-0000-4000-8000-000000000501'::uuid,'00000000-0000-4000-8000-000000001001'::uuid,'00000000-0000-4000-8000-000000000001'::uuid,false),('00000000-0000-4000-8000-000000000502'::uuid,'00000000-0000-4000-8000-000000001003'::uuid,'00000000-0000-4000-8000-000000000001'::uuid,false),('00000000-0000-4000-8000-000000000503'::uuid,'00000000-0000-4000-8000-000000001003'::uuid,'00000000-0000-4000-8000-000000000001'::uuid,true);
CREATE TEMP TABLE card_test_result ON COMMIT DROP AS WITH mp AS (
  SELECT p.id FROM pg_temp.players p WHERE p.global_player_id='00000000-0000-4000-8000-000000000100'::uuid
), eligible AS (
  SELECT m.*,t.status tournament_status,t.format,
    (t.status='finished' AND m.status='scheduled' AND m.started_at IS NULL AND m.finished_at IS NULL) legacy
  FROM pg_temp.matches m JOIN pg_temp.tournaments t ON t.id=m.tournament_id
  WHERE m.status IN ('live','finished') OR
    (t.status='finished' AND m.status='scheduled' AND m.started_at IS NULL AND m.finished_at IS NULL)
), appearances AS (
  SELECT m.id match_id,m.tournament_id,a.team_id
  FROM eligible m JOIN pg_temp.match_player_assignments a ON a.match_id=m.id
  JOIN mp ON mp.id=a.player_id WHERE a.team_id IN (m.home_team_id,m.away_team_id)
  UNION
  SELECT m.id,m.tournament_id,tp.team_id
  FROM eligible m JOIN pg_temp.team_players tp ON tp.team_id IN (m.home_team_id,m.away_team_id)
  JOIN mp ON mp.id=tp.player_id
  WHERE (m.legacy OR NOT EXISTS (SELECT 1 FROM pg_temp.match_player_assignments any_a WHERE any_a.match_id=m.id))
    AND NOT EXISTS (SELECT 1 FROM pg_temp.match_player_assignments a WHERE a.match_id=m.id AND a.player_id=mp.id)
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
  FROM eligible m JOIN pg_temp.teams tm ON tm.id IN (m.home_team_id,m.away_team_id)
  WHERE m.tournament_status='finished' AND coalesce(m.format,'classic')<>'league'
    AND m.tournament_id IN (SELECT tournament_id FROM appearances)
  GROUP BY m.tournament_id,tm.id,tm.name
), champions AS (
  SELECT *,row_number() OVER (PARTITION BY tournament_id ORDER BY pts DESC,(gf-ga) DESC,gf DESC,name,team_id) place
  FROM team_table
), ratings AS (
  SELECT r.rating,r.preferred_role,r.evaluator_user_id FROM pg_temp.player_skill_ratings r JOIN mp ON mp.id=r.player_id
), roles AS (
  SELECT preferred_role,count(*) n FROM ratings WHERE preferred_role IS NOT NULL GROUP BY preferred_role
), top_roles AS (
  SELECT preferred_role FROM roles WHERE n=(SELECT max(n) FROM roles)
)
SELECT jsonb_build_object(
  'tournaments',(SELECT count(DISTINCT tournament_id) FROM appearances),
  'matches',(SELECT count(DISTINCT match_id) FROM appearances),
  'wins',(SELECT count(DISTINCT match_id) FROM results WHERE (status='finished' OR legacy) AND team_id=winner),
  'goals',(SELECT count(*) FROM pg_temp.goals g JOIN mp ON mp.id=g.scorer_player_id WHERE NOT coalesce(g.is_own_goal,false)),
  'assists',(SELECT count(*) FROM pg_temp.goals g JOIN mp ON mp.id=g.assister_player_id),
  'tournament_wins',(SELECT count(DISTINCT c.tournament_id) FROM champions c JOIN appearances a ON a.tournament_id=c.tournament_id AND a.team_id=c.team_id WHERE c.place=1),
  'rating',(SELECT round(avg(rating)::numeric,1) FROM ratings WHERE rating IS NOT NULL),
  'preferred_role',(SELECT CASE WHEN count(*)>1 THEN 'couteau_suisse' ELSE min(preferred_role) END FROM top_roles)
);
DO $$ DECLARE s jsonb; BEGIN SELECT jsonb_build_object INTO s FROM pg_temp.card_test_result;
 IF s->>'matches'<>'4' OR s->>'wins'<>'2' OR s->>'tournaments'<>'2' OR s->>'goals'<>'2' OR s->>'rating'<>'3.3' OR s->>'preferred_role'<>'couteau_suisse' THEN RAISE EXCEPTION 'Card aggregation regression: %',s; END IF; END $$;
SELECT jsonb_build_object as verified FROM pg_temp.card_test_result;
ROLLBACK;


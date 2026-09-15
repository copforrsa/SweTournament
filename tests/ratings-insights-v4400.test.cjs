const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('ratings are immutable except through audited Super Admin correction',()=>{
  const sql=read('supabase/migrations/20260915011500_immutable_ratings_coorganizer_insights_v4400.sql');
  assert.match(sql,/Cette évaluation est définitive\. Seul le Super Admin/);
  assert.match(sql,/private\.is_platform_super_admin\(\)/);
  assert.match(sql,/super_admin_correction/);
  assert.match(sql,/motif de correction est obligatoire/i);
});

test('the six post-match appreciations have the requested deltas and are unique',()=>{
  const sql=read('supabase/migrations/20260915011500_immutable_ratings_coorganizer_insights_v4400.sql');
  assert.match(sql,/unique\(tournament_id,player_id,evaluator_user_id\)/);
  for(const pair of ['when 1 then 0','when 2 then -0.2','when 3 then -0.1','when 4 then 0.1','when 5 then 0.2','when 6 then 0.3'])assert.ok(sql.includes(pair),pair);
  const ui=read('hotfix-v4278-rating-cooler-president.js');
  for(const label of ['Dommage, il était blessé','Il n’a pas bien joué du tout','Ce n’était pas son jour','Il a tenu son rang','Il a créé la surprise','Le maestro du jour'])assert.ok(ui.includes(label),label);
});

test('co-organizer insights and scoped health badges are wired',()=>{
  const ui=read('coorganizer-insights-v4400.js');
  for(const label of ['Joueurs rencontrés','Présence dans la saison','Joueurs notés','À noter'])assert.ok(ui.includes(label),label);
  assert.match(ui,/MutationObserver/);
  assert.match(ui,/data-insights="unrated"/);
  assert.match(ui,/Voir les joueurs/);
  assert.match(ui,/dataset\.sweInsights/);
  const health=read('player-experience-v4349.js');
  assert.match(health,/\['view-players','view-teams','view-tournaments','view-matches'\]/);
  assert.match(health,/E\('view-myplayer'\).*data-health-player/);
});

test('co-organizer match rating falls back to the season value',()=>{
  const dashboard=read('coorganizer-dashboard-v4399.js');
  const sql=read('supabase/migrations/20260915093000_coorganizer_stable_stats_match_rating_v4401.sql');
  assert.match(dashboard,/season_match_rating/);
  assert.match(dashboard,/Moyenne de la saison/);
  assert.match(dashboard,/swe:coorg-insights-ready/);
  assert.match(sql,/'season_match_rating',v_match_rating/);
  assert.match(sql,/round\(avg\(score\),1\)/);
});

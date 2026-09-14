const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(root,'coorganizer-dashboard-v4399.js'),'utf8');
const onboarding=fs.readFileSync(path.join(root,'supabase/migrations/20260913235729_coorganizer_tournament_dashboard_onboarding.sql'),'utf8');
const progress=fs.readFileSync(path.join(root,'supabase/migrations/20260913235832_coorganizer_tournament_action_progress.sql'),'utf8');

test('dashboard uses selected tournament and existing workflows',()=>{
  assert.match(js,/get_my_coorganizer_tournament_action_progress_v1/);
  assert.match(js,/p_tournament_id:t\.id/);
  assert.match(js,/s\.activeTour=id/);
  assert.match(js,/s\.teamCompetitionId=tournamentId/);
  assert.match(js,/u\.searchParams\.set\('rate',tournamentId\)/);
  assert.match(js,/setView\('teams'\)/);
});

test('pending actions and progress are dynamic',()=>{
  assert.match(js,/done\+' sur '\+total/);
  assert.match(js,/filter\(x=>x==='active'\)\.length/);
  assert.match(js,/role="progressbar"/);
  assert.match(progress,/count\(distinct h\.player_id\)/);
  assert.match(progress,/case when coalesce\(v_review->>'my_vote',''\)<>'' then v_team_total else 0 end/);
});

test('onboarding is persistent and permission aware',()=>{
  assert.match(js,/get_my_coorganizer_dashboard_onboarding_v1/);
  assert.match(js,/mark_my_coorganizer_dashboard_onboarding_v1/);
  assert.match(js,/onboarding\?\.should_highlight&&!!p\.can_view_players/);
  assert.match(onboarding,/primary key \(user_id,tournament_id,step\)/);
  assert.match(onboarding,/p_action not in \('viewed','clicked','dismissed','completed'\)/);
});

test('profile and tournament selectors are distinct and quick access is compact',()=>{
  assert.match(js,/aria-label="Profil actif"/);
  assert.match(js,/aria-label="Tournoi affiché"/);
  assert.match(js,/if\(id==='player'\)[\s\S]*setView\('myplayer'\)/);
  assert.match(js,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(js,/min-height:82px!important/);
  assert.match(js,/@media\(max-width:1050px\)[\s\S]*repeat\(2,minmax\(0,1fr\)\)/);
});

test('server functions reject anonymous and unrelated users',()=>{
  for(const sql of [onboarding,progress]){
    assert.match(sql,/auth\.uid\(\)/);
    assert.match(sql,/role='coorganizer'/);
    assert.match(sql,/raise exception 'Accès refusé'/);
    assert.match(sql,/revoke all on function[\s\S]+from public,anon/);
    assert.match(sql,/grant execute on function[\s\S]+to authenticated/);
  }
});

test('dashboard has mobile layout and accessible states',()=>{
  assert.match(js,/@media\(max-width:650px\)/);
  assert.match(js,/:focus-visible/);
  assert.match(js,/aria-label="Tournoi affiché"/);
  assert.match(js,/aria-valuemin="0"/);
  assert.match(js,/data-dismiss-intro aria-label=/);
});

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(root,'coorganizer-dashboard-v4399.js'),'utf8');
const onboarding=fs.readFileSync(path.join(root,'supabase/migrations/20260913235729_coorganizer_tournament_dashboard_onboarding.sql'),'utf8');
const progress=fs.readFileSync(path.join(root,'supabase/migrations/20260913235832_coorganizer_tournament_action_progress.sql'),'utf8');

test('dashboard uses the active tournament and existing workflows',()=>{
  assert.match(js,/get_my_coorganizer_tournament_action_progress_v1/);
  assert.match(js,/p_tournament_id:t\.id/);
  assert.doesNotMatch(js,/sweCoorgTournamentSelect/);
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

test('header keeps only the profile selector and quick access is compact',()=>{
  assert.match(js,/aria-label="Profil actif"/);
  assert.doesNotMatch(js,/aria-label="Tournoi affiché"/);
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
  assert.match(js,/aria-label="Profil actif"/);
  assert.match(js,/aria-valuemin="0"/);
  assert.match(js,/data-dismiss-intro aria-label=/);
});

test('dashboard renders Naya immediately even when server calls never resolve',async()=>{
  const dom=new JSDOM('<!doctype html><body><main id="main"><header class="top"><div class="row"><div></div></div></header><div id="view-home"></div></main></body>',{url:'https://app.swetournament.fr',runScripts:'outside-only'});
  const w=dom.window,d=w.document;
  w.S={session:{user:{email:'laurencesarahlouison@gmail.com',user_metadata:{}}},workspace:{id:'ws',role:'coorganizer'},memberships:[{workspace_id:'ws',role:'coorganizer',workspaces:{name:'Tournoi du dimanche'}}],tournaments:[{id:'tour',name:'Tournoi du dimanche'}],activeTour:'tour',playerDashboard:{profile:{nickname:'Nayasarah'}},myPermissions:{can_view_players:true},workspaceFeatures:{rankings_enabled:true},players:[],teams:[],matches:[],tPlayers:[],skillAggregates:[],matchAssignments:[],goals:[]};
  w.isCoorg=()=>true;w.ratingForMatchPlayer=()=>null;w.setView=()=>{};w.sb={rpc:()=>new Promise(()=>{})};
  w.eval(js);d.dispatchEvent(new w.Event('DOMContentLoaded'));await new Promise(r=>setTimeout(r,240));
  const root=d.getElementById('sweCoorgDashboard4399');assert.ok(root);assert.match(root.textContent,/Nayasarah/);assert.doesNotMatch(root.textContent,/Chargement de ton espace/);
  dom.window.close();
});

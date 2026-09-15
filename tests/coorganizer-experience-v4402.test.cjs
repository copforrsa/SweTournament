const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('all co-organizer rights are shown and allowed rights are green',()=>{
  const js=read('coorganizer-experience-v4402.js');
  for(const right of ['can_view_players','can_enter_scores','can_generate_teams','can_create_tournaments','can_add_members','can_delete_members','can_invite_coorganizers'])assert.ok(js.includes(right),right);
  assert.match(js,/span\.allowed/);
  assert.match(js,/background:#dff8e9/);
  assert.match(js,/Développer toute la puissance de SWÉ/);
  assert.match(js,/background:linear-gradient\(135deg,#ffd84e,#f4b900\)/);
});

test('latest rating action is restricted to an assigned co-organizer who participated',()=>{
  const sql=read('supabase/migrations/20260915102000_coorganizer_latest_rating_action_v4402.sql');
  assert.match(sql,/wm\.role='coorganizer'/);
  assert.match(sql,/tournament_rating_evaluators e[\s\S]*e\.evaluator_user_id=v_uid/);
  assert.match(sql,/mine\.player_id=v_player[\s\S]*mine\.present,false\)=true/);
  assert.match(sql,/s\.status='open' and s\.closes_at>now\(\)/);
  assert.match(sql,/revoke all on function[\s\S]*from public,anon/);
});

test('team vote is displayed only when the administrator opened it',()=>{
  const js=read('coorganizer-experience-v4402.js');
  assert.match(js,/data-action-kind="team"\]\.waiting/);
  assert.match(js,/data-action-kind="team"\]\.locked/);
  assert.match(js,/data-action-kind="team"\]\.expired/);
});

test('fifteen football avatars coexist with personal photo upload',()=>{
  const js=read('football-avatar-picker-v4402.js'),svg=read('football-avatars-v4402.svg');
  assert.match(js,/length:15/);
  assert.match(js,/Ajouter une photo/);
  assert.match(js,/update_my_player_profile_details/);
  assert.equal((svg.match(/<view id="avatar-/g)||[]).length,15);
});

test('enhancement layer renders rights and the latest pending rating without replacing navigation',async()=>{
  const html='<!doctype html><body><div id="organizerAccessBanner"><button data-go="home">Ancien texte</button></div><div id="sweCoorgDashboard4399"><div class="swe-coorg-rights"><div class="swe-coorg-chips"></div></div><section class="swe-coorg-section"><h2>📋 Actions à réaliser</h2><span class="swe-coorg-pending"></span><div class="swe-coorg-actions"><article class="swe-coorg-action waiting" data-action-kind="team"></article></div></section></div><nav id="native-navigation">Onglets natifs</nav></body>';
  const dom=new JSDOM(html,{url:'https://app.swetournament.fr',runScripts:'outside-only'}),w=dom.window,d=w.document;
  w.S={workspace:{id:'ws',role:'coorganizer'},myPermissions:{can_view_players:true,can_enter_scores:false}};
  w.sb={rpc:async()=>({data:{assigned:true,tournament:{id:'tour',name:'Finale'},rating_action:{selected:true,total:12,done:3,status:'open'}}})};
  w.eval(read('coorganizer-experience-v4402.js'));await new Promise(r=>setTimeout(r,180));
  assert.equal(d.querySelectorAll('.swe-coorg-chips span').length,7);
  assert.equal(d.querySelectorAll('.swe-coorg-chips .allowed').length,1);
  assert.equal(d.querySelector('[data-action-kind="team"]'),null);
  assert.match(d.querySelector('[data-swe-latest-rating]').textContent,/Finale/);
  assert.match(d.querySelector('#organizerAccessBanner button').textContent,/Développer toute la puissance/);
  assert.ok(d.getElementById('native-navigation'));
  dom.window.close();
});

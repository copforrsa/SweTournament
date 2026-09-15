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

test('twenty premium football avatars coexist with personal photo upload',async()=>{
  const js=read('football-avatar-picker-v4404.js');
  assert.match(js,/5 mascottes/);
  assert.match(js,/10 joueurs/);
  assert.match(js,/5 joueuses/);
  assert.match(js,/Importer ma photo/);
  assert.match(js,/update_my_player_profile_details/);
  assert.equal((js.match(/'[^']+'/g)||[]).filter(x=>/Lion capitaine|Joueuse gardienne/.test(x)).length,2);
  for(let i=1;i<=20;i++)assert.ok(fs.existsSync(path.join(root,'assets/avatars-v4403/avatar-'+String(i).padStart(2,'0')+'.webp')),'avatar '+i);
  const dom=new JSDOM('<!doctype html><body><div id="view-myplayer"><section class="player-hub-hero"><button id="swe4338PhotoBtn">Ajouter une photo</button></section></div></body>',{url:'https://app.swetournament.fr',runScripts:'outside-only'}),w=dom.window,d=w.document;
  let saved=null;w.S={session:{user:{id:'user'}},playerDashboard:{profile:{age:28,avatar_url:null}}};w.sb={rpc:async(name,args)=>(saved={name,args},{data:true,error:null})};w.eval(js);await new Promise(r=>setTimeout(r,120));
  assert.equal(d.querySelectorAll('[data-foot-avatar]').length,20);
  d.querySelector('[data-foot-avatar="20"]').click();await new Promise(r=>setTimeout(r,20));
  assert.equal(saved.name,'update_my_player_profile_details');assert.match(saved.args.p_avatar_url,/avatar-20\.webp$/);
  dom.window.close();
});

test('modify photo opens the premium gallery even when an avatar already exists',async()=>{
  const js=read('football-avatar-picker-v4404.js');
  const dom=new JSDOM('<!doctype html><body><div id="view-myplayer"><section class="player-hub-hero"><button id="swe4338PhotoBtn">Modifier ma photo</button><input id="swe4338PhotoInput" type="file"></section></div></body>',{url:'https://app.swetournament.fr',runScripts:'outside-only'}),w=dom.window,d=w.document;
  w.S={session:{user:{id:'user'}},playerDashboard:{profile:{age:28,avatar_url:'https://example.com/photo.webp'}}};w.sb={rpc:async()=>({data:true,error:null})};w.eval(js);await new Promise(r=>setTimeout(r,100));
  d.getElementById('swe4338PhotoBtn').click();
  assert.equal(d.getElementById('sweAvatarPicker4404Modal').classList.contains('hidden'),false);
  assert.equal(d.querySelectorAll('#sweAvatarPicker4404Modal [data-foot-avatar]').length,20);
  assert.ok(d.querySelector('#sweAvatarPicker4404Modal [data-upload-own-photo]'));
  dom.window.close();
});

test('co-organizer profile has no creation warning and linked groups are deduplicated',()=>{
  const guard=read('profile-coorg-photo-guard-v4354.js'),fix=read('player-profile-fixes-v4404.js');
  assert.doesNotMatch(guard,/Création de SWÉ indisponible en mode co-gestionnaire/);
  assert.match(guard,/stop\?\.remove\(\)/);
  assert.match(fix,/seen\.has\(k\)/);
  assert.match(fix,/row\.remove\(\)/);
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

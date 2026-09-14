const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const wait=()=>new Promise(r=>setTimeout(r,320));
async function setup(role=null,rpc){
 const dom=new JSDOM(read('index.html'),{url:'https://app.swetournament.fr/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.S={session:{user:{id:'player-1'}},workspace:role?{id:'workspace-1',role}:null,memberships:role?[{workspace_id:'workspace-1',role,workspaces:{name:'Mon groupe'}}]:[],workspaceFeatures:{tournaments_enabled:true,league_enabled:true,rankings_enabled:true},myPermissions:{can_view_players:true,can_enter_scores:true},lastView:'myplayer',playerDashboard:{profile:{nickname:'Nayasarah'},stats:{},requests:[]},tournaments:[]};
 w.isAdmin=()=>w.S.workspace?.role==='admin';w.isCoorg=()=>w.S.workspace?.role==='coorganizer';w.hasTemporaryAdmin=()=>false;w.hasAdminOps=w.isAdmin;
 w.renderTeams=()=>{};w.renderRanking=()=>{};w.__cardOpens=0;w.SWEPlayerCard={open:()=>w.__cardOpens++};
 let calls=0;w.sb={rpc:async(name)=>{calls++;return rpc?rpc(name):{data:{created:[],participations:[]}}}};
 const app=read('app.js');w.eval(app.slice(app.indexOf('function setView(v){'),app.indexOf('let recoveryMode=')));
 d.getElementById('main').classList.remove('hidden');d.getElementById('myPlayerDashboard').classList.remove('hidden');d.getElementById('myPlayerCreateCard').classList.add('hidden');
 const stats=d.getElementById('myPlayerStats');stats.innerHTML=['Groupes','Swés joués','Matchs','Victoires','Trophées','Buts','Passes','Note'].map(x=>'<div><small>'+x+'</small><b>0</b></div>').join('');
 const identity=d.createElement('div');identity.id='swePlayerIdentity4321';identity.innerHTML='<input id="swe4321Nick" value="original"><button id="swe4321Edit">Modifier</button>';d.querySelector('.player-hub-hero').append(identity);
 w.setView('myplayer');w.eval(read('player-profile-compact.js'));w.eval(read('player-home.js'));await wait();
 return {w,d,dom,calls:()=>calls};
}
test('player rubrics preserve native routes, buttons, form values and disclosure state',async()=>{
 const {w,d,dom}=await setup();try{
  const tabs=[...d.querySelectorAll('.tabs .tab')],attrs=tabs.map(b=>b.outerHTML),input=d.getElementById('swe4321Nick');input.value='Brouillon';
  const details=d.getElementById('sweCompact-identity');details.open=true;
  let join=0;const joinButton=d.createElement('button');joinButton.dataset.playerDirectJoin='real-tournament';joinButton.onclick=()=>join++;d.getElementById('myPlayerOpportunities').append(joinButton);
  for(const panel of ['profile','stats','registrations','mine','home']){d.querySelector('#swePlayerNav [data-player-panel="'+panel+'"]').click();assert.equal(w.S.lastView,'myplayer');assert.equal(d.querySelector('.view.active').id,'view-myplayer')}
  assert.deepEqual(tabs.map(b=>b.outerHTML),attrs);assert.equal(d.getElementById('swe4321Nick'),input);assert.equal(input.value,'Brouillon');assert.equal(details.open,true);
  d.querySelector('#swePlayerQuick [data-player-panel=discover]').click();joinButton.click();assert.equal(join,1);assert.equal(d.getElementById('myPlayerOpportunities').contains(joinButton),true);
  d.dispatchEvent(new w.Event('swe:rendered'));await wait();assert.equal(input.value,'Brouillon');assert.equal(d.querySelectorAll('#swePlayerNav').length,1);
 }finally{dom.window.close()}
});
test('leaving player restores administrator and co-manager routes, including existing permission gates',async()=>{
 for(const role of ['admin','coorganizer']){const {w,d,dom}=await setup(role);try{
  const invitation=d.getElementById('inviteBox');assert.equal(invitation.parentElement.id,'view-myplayer');
  d.querySelector('#swePlayerProfiles button:nth-child(2)').click();assert.equal(w.S.lastView,'home');assert.equal(d.documentElement.classList.contains('swe-player-home-active'),false);assert.equal(invitation.parentElement.id,'main');
  for(const route of ['players','tournaments','teams','matches','league','ranking']){d.querySelector('.tabs [data-view="'+route+'"]').click();assert.equal(w.S.lastView,route)}
  if(role==='coorganizer'){w.S.myPermissions.can_view_players=false;d.querySelector('.tabs [data-view=players]').click();assert.equal(w.S.lastView,'home');d.querySelector('.tabs [data-view=permissions]').click();assert.equal(w.S.lastView,'home')}
  d.querySelector('.tabs [data-view=myplayer]').click();await wait();assert.equal(d.documentElement.classList.contains('swe-player-home-active'),true);assert.equal(d.getElementById('inviteBox'),invitation);
 }finally{dom.window.close()}}
});
test('account uses the existing logout and workspace switch handlers; offers use existing entry',async()=>{
 const {w,d,dom}=await setup('admin');try{
  let logout=0,offer=0,switched='';d.getElementById('logout').onclick=()=>logout++;d.getElementById('becomeOrganizer').onclick=()=>{offer++;d.getElementById('workspaceSetup').classList.remove('hidden')};
  w.S.memberships.push({workspace_id:'workspace-2',role:'coorganizer',workspaces:{name:'Second groupe'}});
  const sw=d.getElementById('workspaceSwitcher');sw.innerHTML='<option value="workspace-1">Un</option><option value="workspace-2">Deux</option>';sw.addEventListener('change',()=>switched=sw.value);
  d.dispatchEvent(new w.Event('swe:rendered'));await wait();
  d.getElementById('swePlayerAccountToggle').click();assert.equal(d.getElementById('swePlayerAccountMenu').classList.contains('hidden'),false);d.getElementById('swePlayerSwitchToggle').click();assert.equal(d.getElementById('swePlayerProfiles').classList.contains('hidden'),false);
  d.getElementById('swePlayerLogout').click();d.getElementById('swePlayerOffers').click();assert.equal(d.documentElement.classList.contains('swe-organizer-setup-active'),true);assert.equal(d.getElementById('workspaceSetup').classList.contains('hidden'),false);assert.ok(d.getElementById('swePlayerOfferBack'));d.getElementById('swePlayerOfferBack').click();assert.equal(d.documentElement.classList.contains('swe-organizer-setup-active'),false);
  d.getElementById('swePlayerAccountToggle').click();d.getElementById('swePlayerSwitchToggle').click();d.querySelector('#swePlayerProfiles button:nth-child(3)').click();assert.equal(logout,1);assert.equal(offer,1);assert.equal(switched,'workspace-2');
 }finally{dom.window.close()}
});
test('profile menus and native invitation acceptance remain clickable after layout moves',async()=>{
 const {w,d,dom}=await setup();try{
  const fold=d.getElementById('sweCompact-identity'),summary=fold.querySelector('summary');assert.equal(fold.open,false);summary.click();assert.equal(fold.open,true);summary.click();assert.equal(fold.open,false);
  let accepted=0;const button=d.createElement('button');button.textContent='Accepter';button.onclick=()=>accepted++;d.getElementById('inviteList').append(button);d.querySelector('#swePlayerNav [data-player-panel="registrations"]').click();button.click();assert.equal(accepted,1);assert.equal(d.getElementById('inviteBox').parentElement.id,'view-myplayer');
  assert.equal(d.getElementById('swePlayerManage').textContent,'＋ Créer un SWÉ rapide');const shortcut=d.getElementById('swePlayerCardShortcut');assert.ok(shortcut);shortcut.click();assert.equal(w.__cardOpens,1);
 }finally{dom.window.close()}
});
test('rapid SWE creator keeps its native tab and supports return to player home',async()=>{
 const {w,d,dom}=await setup();try{
  w.sb.rpc=async name=>({data:name==='get_community_swe_venues'?{complexes:[],venues:[]}:name==='get_my_community_swes_v2'?{created:[],participations:[]}:false});
  w.eval(read('simple-swe-page-v4350.js'));
  const native=d.getElementById('simpleSweTab');d.getElementById('swePlayerCreateQuick').click();
  assert.equal(w.S.lastView,'simple-swe');assert.equal(d.querySelector('.view.active').id,'view-simple-swe');assert.equal(d.documentElement.classList.contains('swe-player-home-active'),false);assert.equal(d.getElementById('simpleSweTab'),native);
  d.querySelector('#view-simple-swe [data-swe-go=myplayer]').click();await wait();assert.equal(w.S.lastView,'myplayer');assert.equal(d.documentElement.dataset.simpleSwePremium,undefined);assert.equal(d.documentElement.classList.contains('swe-player-home-active'),true);
 }finally{dom.window.close()}
});
test('community rows are user scoped, escaped, and errors are distinguished from empty results',async()=>{
 const {w,d,dom,calls}=await setup(null,()=>({data:{created:[{id:'a',title:'<img src=x onerror=bad()>',confirmed:3,max_players:10}],participations:[]}}));try{
  assert.equal(d.querySelector('#swePlayerMineRows img'),null);assert.match(d.getElementById('swePlayerMineRows').textContent,/3 \/ 10/);const before=calls();for(let i=0;i<3;i++){d.dispatchEvent(new w.Event('swe:rendered'));await wait()}assert.equal(calls(),before);
  w.S.session.user.id='player-2';w.sb.rpc=async()=>({error:{message:'failure'}});d.dispatchEvent(new w.Event('swe:rendered'));await wait();assert.match(d.getElementById('swePlayerMineRows').textContent,/pas disponibles/);assert.doesNotMatch(d.getElementById('swePlayerMineRows').textContent,/onerror/);
 }finally{dom.window.close()}
});

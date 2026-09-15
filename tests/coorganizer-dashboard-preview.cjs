const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');

const root=path.resolve(__dirname,'..');
const shots=path.join(__dirname,'screenshots');
fs.mkdirSync(shots,{recursive:true});

(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>${fs.readFileSync(path.join(root,'styles.css'),'utf8')}</style></head><body><main class="app"><section id="main"><header class="top"><div class="row"><div><h1>⚽ SWÉ TOURNAMENT 5/5 <small>V43.99</small></h1><div id="workspaceName">Tournoi du dimanche • Co-organisateur</div></div><button>Déconnexion</button></div></header><section id="view-home" class="view active"><div class="card"><h2>👋 Bienvenue</h2><p>Ancien dashboard co-gestionnaire.</p></div><div class="card"><h2>📊 Vue d’ensemble</h2></div><div class="card"><h2>Actions rapides</h2></div></section></section></main></body></html>`);
  await page.screenshot({path:path.join(shots,'coorganizer-dashboard-before.png'),fullPage:true});
  await page.evaluate(()=>{
   const tid='00000000-0000-4000-8000-000000000101',tid2='00000000-0000-4000-8000-000000000102',pid='00000000-0000-4000-8000-000000000201';
   window.S={workspace:{id:'00000000-0000-4000-8000-000000000001',role:'coorganizer'},session:{user:{id:'00000000-0000-4000-8000-000000000002',email:'alex@example.test',user_metadata:{}}},tournaments:[{id:tid,name:'Tournoi du dimanche',tournament_date:'2026-09-14',format:'classic'},{id:tid2,name:'Coupe du samedi',tournament_date:'2026-09-20',format:'classic'}],activeTour:tid,teamCompetitionId:tid,players:[{id:pid,name:'Alex Martin',active:true,is_group_member:true}],myLinkedPlayerId:pid,skillAggregates:[{player_id:pid,avg_rating:4.7,voter_count:6}],tPlayers:[{tournament_id:tid,player_id:pid,present:true,registration_status:'confirmed'}],teams:Array.from({length:8},(_,i)=>({id:'team-'+i,tournament_id:tid,name:'Équipe '+(i+1)})),matches:Array.from({length:4},(_,i)=>({id:'match-'+i,status:i<3?'finished':'scheduled'})),matchAssignments:[{match_id:'match-0',player_id:pid,team_id:'team-0'}],goals:[],workspaceFeatures:{rankings_enabled:true},myPermissions:{can_view_players:true,can_enter_scores:true,can_generate_teams:true}};
   window.isCoorg=()=>true;window.hasTemporaryAdmin=()=>false;window.ratingForMatchPlayer=()=>({rating:8.6});window.setView=v=>window.__view=v;window.loadTournament=async()=>{S.tPlayers=[{tournament_id:S.activeTour,player_id:pid,present:S.activeTour===tid,registration_status:'confirmed'}];S.teams=S.activeTour===tid?Array.from({length:8},(_,i)=>({id:'team-'+i,tournament_id:tid,name:'Équipe '+(i+1)})):Array.from({length:4},(_,i)=>({id:'cup-team-'+i,tournament_id:tid2,name:'Coupe '+(i+1)}));S.matches=S.activeTour===tid?S.matches:[]};window.renderAll=()=>document.dispatchEvent(new Event('swe:rendered'));
   window.__rpc=[];window.sb={rpc:async(name,args)=>{window.__rpc.push({name,args});if(name==='get_my_coorganizer_dashboard_onboarding_v1')return {data:{should_highlight:true}};if(name==='mark_my_coorganizer_dashboard_onboarding_v1')return {data:{should_highlight:false}};const second=args.p_tournament_id===tid2;return {data:{tournament:{id:args.p_tournament_id,name:second?'Coupe du samedi':'Tournoi du dimanche'},profile:{linked_player_id:pid,name:'Alex Martin'},permissions:{can_view_players:true,can_enter_scores:!second,can_generate_teams:true,personal_instructions:'Vérifie les présences avant le coup d’envoi.'},team_action:{total:second?4:8,done:0,enabled:true,requested:true,eligible:true,status:'pending',deadline:'2026-09-15T18:00:00Z'},rating_action:{total:19,done:3,selected:true,status:'open',deadline:'2026-09-15T18:00:00Z'}}}}};
  });
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'coorganizer-dashboard-v4399.js'),'utf8')});
  await page.locator('#sweCoorgDashboard4399').filter({hasText:'Actions à réaliser'}).waitFor();
  assert.match(await page.locator('#sweCoorgDashboard4399').innerText(),/0 sur 8 équipes évaluées/);
  assert.match(await page.locator('#sweCoorgDashboard4399').innerText(),/3 sur 19 joueurs notés/);
  assert.equal(await page.locator('.swe-coorg-access-card.start').count(),1);
  await page.screenshot({path:path.join(shots,'coorganizer-dashboard-after-desktop.png'),fullPage:true});
  await page.locator('[data-dismiss-intro]').click();
  assert.equal(await page.locator('.swe-coorg-access-card.start').count(),0);
  await page.evaluate(async()=>{S.activeTour=S.tournaments[1].id;await loadTournament();renderAll()});
  await page.locator('#sweCoorgDashboard4399').filter({hasText:'0 sur 4 équipes évaluées'}).waitFor();
  assert.equal(await page.locator('[data-coorg-view="matches"]').isDisabled(),true);
  await page.setViewportSize({width:390,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await page.screenshot({path:path.join(shots,'coorganizer-dashboard-after-mobile.png'),fullPage:true});
  assert.ok(await page.evaluate(()=>window.__rpc.some(x=>x.name==='mark_my_coorganizer_dashboard_onboarding_v1'&&x.args.p_action==='dismissed')));
  console.log('Co-organizer premium dashboard, tournament context, permissions, onboarding and responsive: OK');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

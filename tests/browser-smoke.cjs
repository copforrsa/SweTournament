// Run with Playwright installed. All remote requests are mocked; no production writes.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..');
const screenshotDir=path.join(__dirname,'screenshots');fs.mkdirSync(screenshotDir,{recursive:true});
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const token=id(1),current=id(2),past=id(3),season=id(4),match=id(5),a=id(6),b=id(7);
const players=[1,2,3,4].map(n=>({id:id(10+n),name:'Joueur '+n,active:true,is_group_member:true}));
const snapshot={workspace:{id:id(30),name:'Groupe de vérification'},features:{rankings_enabled:true,player_ratings_enabled:false,top_player_enabled:false},players,seasons:[{id:season,name:'Saison de test',is_active:true}],leagues:[],tournaments:[{id:current,name:'Prochain tournoi',tournament_date:'2099-09-20',registration_open:true,status:'draft',format:'classic',max_players:20,team_size:5,season_id:season,registration_deadline:'2099-09-19T17:00:00Z'},{id:past,name:'Tournoi précédent',tournament_date:'2026-09-01',status:'finished',format:'classic',season_id:season}],tournament_players:players.map(p=>({tournament_id:current,player_id:p.id,present:true,registration_status:'confirmed'})),teams:[{id:a,tournament_id:past,name:'Bleus',color:'#2563eb'},{id:b,tournament_id:past,name:'Rouges',color:'#dc2626'}],team_players:players.map((p,i)=>({team_id:i%2?a:b,player_id:p.id})),matches:[{id:match,tournament_id:past,home_team_id:a,away_team_id:b,home_score:1,away_score:0,status:'finished',match_order:1}],goals:[{id:id(20),match_id:match,team_id:a,scorer_player_id:players[1].id,assister_player_id:players[3].id}],match_player_assignments:players.map((p,i)=>({match_id:match,team_id:i%2?a:b,player_id:p.id})),sports_complexes:[],sports_pitches:[]};
snapshot.teams[0].name='Équipe Harry MC';
snapshot.matches.push({id:id(21),tournament_id:past,home_team_id:b,away_team_id:a,home_score:12,away_score:2,status:'finished',match_order:2});
function installMock(data,ids){
 window.__calls=[];window.__snapshot=data;window.__testScore=0;window.__testCanEdit??=true;
 const fakeId=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const testPlayers=Array.from({length:10},(_,i)=>({id:fakeId(i+1),name:'Joueur test '+String(i+1).padStart(2,'0'),is_group_member:false}));
 const testTeams=data.teams.map(t=>({...t}));
 window.__testSnapshot={is_test:true,can_edit:window.__testCanEdit,tournament_id:ids.past,tournaments:[{id:ids.past,name:'Match test automatique',status:'draft',format:'classic',team_size:5}],players:testPlayers,teams:testTeams,team_players:testPlayers.map((p,i)=>({team_id:testTeams[i%2].id,player_id:p.id})),matches:[{...data.matches[0],status:'scheduled',home_score:0,away_score:0}],goals:[],tournament_players:testPlayers.map(p=>({tournament_id:ids.past,player_id:p.id,present:true,registration_status:'confirmed'})),match_player_assignments:testPlayers.map((p,i)=>({match_id:ids.match,team_id:testTeams[i%2].id,player_id:p.id}))};
 for(let i=1;i<=2;i++){const p={id:fakeId(10+i),name:'Remplaçant test 0'+i,is_group_member:false};window.__testSnapshot.players.push(p);window.__testSnapshot.tournament_players.push({tournament_id:ids.past,player_id:p.id,present:true,registration_status:'confirmed',is_substitute:true})}
 let goalIndex=100;
 window.supabase={createClient:()=>{
  const query=new Proxy(()=>query,{get:(_t,k)=>k==='then'?resolve=>Promise.resolve({data:[],error:null}).then(resolve):()=>query});
  return {
   auth:{
    getSession:async()=>({data:{session:location.pathname.includes('forssadmin')||new URLSearchParams(location.search).has('test')?{user:{id:ids.user,email:'test@example.invalid'}}:null}}),
    getUser:async()=>({data:{user:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
    signInWithPassword:async()=>({data:{},error:null}),signOut:async()=>({error:null})
   },
   from:()=>query,channel:()=>({on(){return this},subscribe(){return this},unsubscribe(){}}),removeChannel:async()=>{},
   rpc:async(name,args)=>{
    window.__calls.push({name,args});
    if(name==='is_platform_super_admin')return {data:true};
    if(name==='get_public_workspace_snapshot_v2')return {data:window.__snapshot};
    if(name==='resolve_public_tournament_short_link')return {data:{public_token:ids.token,tournament_id:ids.current,view:'tournament'}};
    if(name==='super_admin_get_test_match_accounts')return {data:[...Array.from({length:15},(_,i)=>({swe_id:'SWE-TEST'+(i+1),name:'Compte '+(i+1)})),{swe_id:'SWE-E5DE3BA0',name:'Testing boy'}]};
    if(name==='super_admin_get_test_match_recipients')return {data:[{workspace_id:ids.current,user_id:ids.user,workspace_name:'Groupe du dimanche',role:'coorganizer',name:'Testing boy',swe_id:'SWE-E5DE3BA0'}]};
    if(name==='super_admin_list_test_matches')return {data:[{id:ids.match,created_at:'2026-09-12T12:00:00Z',player_count:4,status:'scheduled',home_score:0,away_score:0}]};
    if(name==='super_admin_get_page_reports')return {data:[{page_key:'registration:x',page_type:'registration',title:'Prochain tournoi',workspace_name:'Groupe',view_count:42,updated_at:'2026-09-12T12:00:00Z'}]};
    if(name==='super_admin_create_test_match'){
     await new Promise(resolve=>setTimeout(resolve,200));
     if(window.__failTestCreate){window.__failTestCreate=false;return {data:null,error:{message:'Création temporairement indisponible'}}}
     return {data:ids.match,error:null};
    }
    if(name==='get_test_match_snapshot'){const d=structuredClone(window.__testSnapshot);d.matches[0].home_score=window.__testScore;d.can_edit=window.__testCanEdit;return window.__denyTest?{error:{message:'Ce compte ne participe pas au match test'}}:{data:d}}
    if(name==='super_admin_test_match_action'){
     if(!window.__testCanEdit)return {error:{message:'Accès Super Admin requis'}};
     const d=window.__testSnapshot,m=d.matches[0];m.home_score=window.__testScore;
     if(args.p_action==='start'){m.status='live';d.tournaments[0].status='live'}
     if(args.p_action==='finish'){m.status='finished';d.tournaments[0].status='finished'}
     if(args.p_action==='set_score'){m.home_score=args.p_home_score;m.away_score=args.p_away_score}
     if(args.p_action==='goal'){const team=d.match_player_assignments.find(p=>p.player_id===args.p_scorer_id).team_id;const goalId=fakeId(goalIndex++);d.action_goal_id=goalId;d.goals.push({id:goalId,match_id:m.id,team_id:team,scorer_player_id:args.p_scorer_id,assister_player_id:args.p_assister_id});if(team===m.home_team_id)m.home_score++;else m.away_score++}
     if(args.p_action==='substitute'){const outgoing=d.match_player_assignments.find(p=>p.player_id===args.p_out_player_id);const team=outgoing.team_id;outgoing.team_id=null;const incoming=d.match_player_assignments.find(p=>p.player_id===args.p_in_player_id);if(incoming)incoming.team_id=team;else d.match_player_assignments.push({match_id:m.id,player_id:args.p_in_player_id,team_id:team})}
     if(args.p_action==='set_assist')d.goals.find(g=>g.id===args.p_goal_id).assister_player_id=args.p_assister_id;
     if(args.p_action==='delete_goal'){const goal=d.goals.find(g=>g.id===args.p_goal_id);if(goal.team_id===m.home_team_id)m.home_score--;else m.away_score--;d.goals=d.goals.filter(g=>g.id!==args.p_goal_id)}
     window.__testScore=m.home_score;return {data:structuredClone(d)};
    }
    if(name.includes('platform_settings'))return {data:{footer_enabled:false,consent_gate_enabled:false}};
    return {data:[],error:null};
   }
  };
 }};
}
const sdk='('+installMock.toString()+')('+JSON.stringify(snapshot)+','+JSON.stringify({user:id(99),token,current,past,match})+');';
new (require('node:vm').Script)(sdk);
async function checkScoreLayout(page){
 await page.locator('.swe-live-match4306 .history-team-name').first().waitFor();
 const rows=await page.locator('.history-scoreline').evaluateAll(lines=>lines.map(line=>{
  const names=[...line.querySelectorAll('.history-team-name')],score=line.querySelector('.score');
  const boxes=names.map(n=>n.getBoundingClientRect()),box=score.getBoundingClientRect(),row=line.getBoundingClientRect();
  return {fonts:names.map(n=>getComputedStyle(n).fontSize),backgrounds:names.map(n=>getComputedStyle(n).backgroundColor),scoreWidth:box.width,centered:Math.abs((box.x+box.width/2)-(row.x+row.width/2))<1,noOverlap:boxes[0].right<=box.left&&box.right<=boxes[1].left,contained:line.scrollWidth<=line.clientWidth,goalsBelow:[...line.querySelectorAll('.history-goals')].every(g=>g.getBoundingClientRect().top>=Math.max(box.bottom,...boxes.map(b=>b.bottom)))};
 }));
 assert.ok(rows.length);
 for(const row of rows){assert.equal(row.fonts.length,2);assert.equal(row.fonts[0],row.fonts[1]);assert.deepEqual(row.backgrounds,['rgb(15, 23, 42)','rgb(15, 23, 42)']);assert.ok(row.centered&&row.noOverlap&&row.contained&&row.goalsBelow,JSON.stringify(row));}
 assert.equal(new Set(rows.map(r=>r.scoreWidth)).size,1);
}
const errors=[];
async function checkTestAccountPicker(page){
 await page.locator('#testOptionalAccounts summary').click();
 await page.locator('#testAccountCount').filter({hasText:'16 comptes disponibles'}).waitFor();
 await page.locator('#testExpandAccounts').click();assert.equal(await page.locator('#testAccounts').evaluate(e=>e.style.maxHeight),'none');
 await page.locator('#testExpandAccounts').click();assert.equal(await page.locator('#testAccounts').evaluate(e=>e.style.maxHeight),'260px');
 await page.locator('#testSearch').fill('SWE-E5DE3BA0');assert.equal(await page.locator('[data-test-account]').count(),1);assert.match(await page.locator('#testAccounts').innerText(),/Testing boy/);
 await page.locator('[data-test-account="SWE-E5DE3BA0"]').check();await page.locator('#testSearch').fill('');assert.equal(await page.locator('[data-test-account="SWE-E5DE3BA0"]').isChecked(),true);await page.locator('[data-test-account="SWE-E5DE3BA0"]').uncheck();
 console.log('Match-test account search, expand/collapse and selection: OK');
}
async function checkTestMatchCreation(page){
 const create=page.locator('#testCreate'),accounts=page.locator('[data-test-account]');
 await page.locator('#testCreateHint').filter({hasText:'10 joueurs fictifs'}).waitFor();
 for(let i=0;i<13;i++)await accounts.nth(i).check();
 await create.click();await page.locator('#testCreateError').filter({hasText:'Maximum 12 comptes'}).waitFor();
 assert.equal(await page.evaluate(()=>window.__calls.filter(c=>c.name==='super_admin_create_test_match').length),0);
 for(let i=0;i<13;i++)await accounts.nth(i).uncheck();
 await page.locator('#testDestination').selectOption(current+':'+id(99));
 await page.evaluate(()=>{window.__failTestCreate=true});
 await create.click();assert.equal(await create.isDisabled(),true);assert.equal(await create.getAttribute('aria-busy'),'true');
 await page.locator('#testCreateError').filter({hasText:'Création temporairement indisponible'}).waitFor();
 assert.equal(await create.isEnabled(),true);assert.equal(await accounts.first().isEnabled(),true);
 await create.click();await page.locator('#testQuickFrame').waitFor();
 await page.waitForFunction(()=>document.getElementById('testCreate')?.getAttribute('aria-busy')==='false');
 const calls=await page.evaluate(()=>window.__calls.filter(c=>c.name==='super_admin_create_test_match'));
 assert.equal(calls.length,2);assert.deepEqual(calls[0].args.p_swe_ids,[]);assert.equal(calls[0].args.p_request_id,calls[1].args.p_request_id);
 assert.equal(calls[0].args.p_target_workspace_id,current);assert.equal(calls[0].args.p_manager_user_id,id(99));
 assert.match(await page.getByRole('link',{name:'Ouvrir la saisie dans une nouvelle fenêtre'}).getAttribute('href'),/tab=matches/);
 console.log('Automatic match creation with no account selected, limit, busy state and retry: OK');
}
async function checkSharedMatchModule(page,onLiveCheck){
 await page.locator('[data-test-tab="matches"]').click();await page.locator('#testModuleStart').click();
 await page.locator('.swe4301-goal-form').waitFor();
 const score=page.locator('.swe4300-result'),inputs=page.locator('.swe4300-edit input');
 await inputs.nth(0).fill('0');await inputs.nth(1).fill('0');await page.getByRole('button',{name:'Enregistrer le score'}).click();await score.filter({hasText:'0 - 0'}).waitFor();
 assert.equal(await page.locator('.swe4360-player').count(),10);
 await page.locator('.swe4360-player').filter({hasText:'Joueur test 01'}).click();await score.filter({hasText:'1 - 0'}).waitFor();
 await page.locator('.swe4360-assist.show').waitFor();assert.equal(await page.locator('.swe4360-assist [data-assist]').count(),5);
 // The next server refresh must preserve the pending passer choice.
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await page.locator('.swe4360-assist [data-assist]').filter({hasText:'Joueur test 03'}).click();
 await page.locator('.swe4301-goal-history').filter({hasText:'Joueur test 01 ← Joueur test 03'}).waitFor();
 await page.getByRole('button',{name:'Retirer le passeur',exact:true}).click();await page.locator('.swe4301-goal-history').filter({hasText:'sans passe'}).waitFor();assert.equal(await score.innerText(),'1 - 0');
 await page.getByRole('button',{name:'Ajouter un passeur',exact:true}).click();await page.getByLabel('Passeur du but').selectOption({label:'Joueur test 03'});await page.getByRole('button',{name:'Enregistrer le passeur',exact:true}).click();await page.locator('.swe4301-goal-history').filter({hasText:'Joueur test 01 ← Joueur test 03'}).waitFor();
 await page.getByRole('button',{name:'Annuler',exact:true}).click();await score.filter({hasText:'0 - 0'}).waitFor();
 await page.locator('.swe4360-player').filter({hasText:'Joueur test 02'}).click();await score.filter({hasText:'0 - 1'}).waitFor();
 await page.locator('.swe4360-assist [data-undo]').click();await score.filter({hasText:'0 - 0'}).waitFor();
 const addGoal=async()=>{
  const selects=page.locator('.swe4301-goal-form select');
  await selects.nth(0).selectOption(a);await selects.nth(1).selectOption({label:'Joueur test 01'});await selects.nth(2).selectOption({label:'Joueur test 03'});
  await page.locator('.swe4301-goal-form button').click();
 };
 await addGoal();await score.filter({hasText:'1 - 0'}).waitFor();assert.match(await page.locator('.swe4301-goal-history').innerText(),/Joueur test 01 ← Joueur test 03/);
 await page.getByRole('button',{name:'Annuler',exact:true}).click();await score.filter({hasText:'0 - 0'}).waitFor();
 await inputs.nth(0).fill('3');await inputs.nth(1).fill('2');await page.getByRole('button',{name:'Enregistrer le score'}).click();await score.filter({hasText:'3 - 2'}).waitFor();
 await addGoal();await score.filter({hasText:'4 - 2'}).waitFor();
 await page.locator('.swe4306-details summary').filter({hasText:'Remplaçants'}).click();
 await page.getByLabel('Joueur à remplacer',{exact:true}).selectOption({label:'Joueur test 01'});await page.getByLabel('Remplaçant',{exact:true}).selectOption({label:'Remplaçant test 01'});await page.getByRole('button',{name:'🔁 Remplacer',exact:true}).click();
 await page.locator('.swe4360-player').filter({hasText:'Remplaçant test 01'}).waitFor();assert.equal(await page.locator('.swe4360-player').filter({hasText:'Joueur test 01'}).count(),0);assert.equal(await page.locator('.swe4360-player').count(),10);assert.equal(await score.innerText(),'4 - 2');
 // Assignment-only server refresh must keep the new scorer and the old goal history.
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.locator('.swe4360-player').filter({hasText:'Remplaçant test 01'}).click();await score.filter({hasText:'5 - 2'}).waitFor();
 await page.locator('.swe4360-assist [data-undo]').click();await score.filter({hasText:'4 - 2'}).waitFor();
 if(onLiveCheck)await onLiveCheck();
 await page.locator('#testModuleFinish').click();await page.locator('#testModuleState').filter({hasText:'terminé'}).waitFor();assert.equal(await page.locator('.swe4301-goal-form').count(),0);assert.equal(await page.getByRole('button',{name:'🔁 Remplacer',exact:true}).count(),0);
 await page.locator('[data-test-tab="direct"]').click();await page.locator('#liveMatches').filter({hasText:'4 - 2'}).waitFor();
 console.log('Shared Matchs module: quick scorer, passer, refresh, undo, manual score, finish and direct result: OK');
}
const securityHeaders=Object.fromEntries(fs.readFileSync(path.join(root,'_headers'),'utf8').split('\n\n')[0].split('\n').slice(1).filter(Boolean).map(line=>{const i=line.indexOf(':');return [line.slice(0,i).trim(),line.slice(i+1).trim()]}));
const appCsp=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<meta http-equiv="Content-Security-Policy"[^>]+>/)[0];
const server=http.createServer((req,res)=>{let target=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403);return res.end()}try{if(fs.statSync(target).isDirectory())target=path.join(target,'index.html');if(target.endsWith('.html'))for(const [key,value] of Object.entries(securityHeaders))res.setHeader(key,value);res.setHeader('Content-Type',target.endsWith('.html')?'text/html':target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':'application/octet-stream');res.end(fs.readFileSync(target))}catch{res.writeHead(404);res.end()}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:1280,height:900},{width:768,height:1024},{width:360,height:800}]){
   const context=await browser.newContext({viewport});await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();if(u.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'text/javascript',body:sdk});if(u.pathname.endsWith('/record_swe_page_view'))return route.fulfill({contentType:'application/json',body:'42'});return route.abort()});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/?s=TESTCODE');
   await page.locator('#chooseSoloMode').waitFor({state:'visible'});
   await page.locator('#chooseSoloMode').click();
   await page.locator('#publicPlayerSelect').waitFor({state:'visible'});
   await page.locator('#swePageViewCount').filter({hasText:'42 vues'}).waitFor();
   assert.equal(await page.locator('#publicGuestFields').getAttribute('open'),null);
   assert.equal(await page.locator('#publicLastTournamentDetails').isVisible(),false);
   assert.equal(await page.locator('#publicTeams').isVisible(),false);
   await page.locator('#toggleLastTournamentPublic').click();
   await page.locator('#publicResults').waitFor({state:'visible'});
   assert.match(await page.locator('#publicResults').innerText(),/Bleus|Rouges/);
   await checkScoreLayout(page);
   await page.locator('#toggleLastTournamentPublic').click();
   assert.equal(await page.locator('#publicLastTournamentDetails').isVisible(),false);
   const href=await page.locator('#publicHistory a').getAttribute('href');assert.match(href,/history=/);assert.match(href,/from_tournament=/);
   await page.locator('#publicGuestFields summary').click();assert.equal(await page.locator('#publicGuestName').isVisible(),true);
   await page.locator('#publicPlayerSelect').selectOption(players[0].id);
   const chosen=await page.locator('#publicPlayerSelect').inputValue();await page.waitForTimeout(1300);assert.equal(await page.locator('#publicPlayerSelect').inputValue(),chosen);
   await page.screenshot({path:path.join(screenshotDir,'screenshot-registration-'+viewport.width+'.png'),fullPage:true});
   await page.goto(base+'/?public='+token+'&history='+past+'&from_tournament='+current+'&from_view=tournament');
   await page.locator('#backPublic').waitFor({state:'visible'});await checkScoreLayout(page);
   await page.screenshot({path:path.join(screenshotDir,'screenshot-history-'+viewport.width+'.png'),fullPage:true});
   await page.locator('#backPublic').click();await page.locator('#chooseSoloMode').waitFor({state:'visible'});assert.equal(new URL(page.url()).searchParams.get('tournament'),current);
   {
    const organizer=await context.newPage();organizer.on('pageerror',e=>errors.push(e.message));
    await organizer.setContent('<main><div class="card"><div id="tournamentList"></div></div></main>');
    await organizer.evaluate(({current,past})=>{
      window.S={workspace:{role:'admin'},tournaments:[{id:current,name:'Tournoi choisi',status:'draft'},{id:past,name:'Autre tournoi',status:'draft'}],activeTour:past,tPlayers:[],myPermissions:{}};
      window.sb={from:()=>({select:()=>({in:async()=>({data:[],error:null})})})};
      window.hasAdminOps=()=>S.workspace.role==='admin';window.isCoorg=()=>S.workspace.role==='coorganizer';
      window.__generated=[];window.loadTournament=async()=>{};window.runSmartTeamGeneration=async()=>{window.__generated.push(S.activeTour)};window.renderAll=()=>{};window.toast=()=>{};
    },{current,past});
    await organizer.addScriptTag({content:fs.readFileSync(path.join(root,'tournament-compact-v4349.js'),'utf8')});
    const manage=organizer.locator('[data-swe-manage-tour="'+current+'"]'),details=organizer.locator('#sweTournamentDetails');
    await manage.waitFor();assert.equal(await details.isVisible(),false);
    await manage.click();await details.waitFor({state:'visible'});assert.equal(await manage.getAttribute('aria-expanded'),'true');assert.equal(await manage.innerText(),'Masquer');
    await organizer.locator('[data-swe-collapse="bottom"]').click();assert.equal(await details.isVisible(),false);assert.equal(await manage.innerText(),'Gérer');assert.equal(await organizer.evaluate(()=>S.activeTour),current);
    await manage.click();await details.waitFor({state:'visible'});await manage.click();assert.equal(await details.isVisible(),false);assert.equal(await manage.getAttribute('aria-expanded'),'false');
    await organizer.evaluate(()=>{window.loadTournament=()=>new Promise(resolve=>{window.__finishLoad=resolve})});
    await organizer.locator('[data-swe-manage-tour="'+past+'"]').click();await details.waitFor({state:'visible'});
    await organizer.locator('[data-swe-collapse="top"]').click();assert.equal(await details.isVisible(),false);
    await organizer.evaluate(()=>{window.__finishLoad();window.loadTournament=async()=>{};document.dispatchEvent(new Event('swe:rendered'))});
    await organizer.waitForTimeout(300);assert.equal(await details.isVisible(),false);assert.equal(await organizer.locator('[data-swe-collapse="panel"]').isVisible(),false);
    console.log('Tournament details open, close and remain closed after loading:',viewport.width,'OK');
    await organizer.locator('[data-swe-generate-tour="'+current+'"]').click();await organizer.waitForFunction(()=>window.__generated.length===1);assert.deepEqual(await organizer.evaluate(()=>window.__generated),[current]);
    await organizer.evaluate(()=>{S.workspace.role='coorganizer';S.myPermissions.can_generate_teams=false;document.dispatchEvent(new Event('swe:rendered'))});
    await organizer.waitForFunction(id=>document.querySelector('[data-swe-generate-tour="'+id+'"]').disabled,current);
    console.log('Tournament shortcut targets the selected tournament and respects permissions: OK');await organizer.close();
   }
   // Use the real selector, renderer and CSP; the V43.68 iframe regression fails here.
   const assigned=await context.newPage();assigned.on('pageerror',e=>errors.push(e.message));
   await assigned.route(base+'/tests/match-harness.html',route=>route.fulfill({contentType:'text/html',headers:securityHeaders,body:'<!doctype html><head><meta name="viewport" content="width=device-width">'+appCsp+'<link rel="stylesheet" href="/styles.css"></head><body><main class="app"><div class="tabs"><button data-view="matches" class="active">Matchs</button></div><section id="view-matches" class="view active"><div id="matchCompetitionSelectorCard" class="card"><h3>Matchs à saisir</h3><select id="matchCompetitionSelect"></select><p id="matchCompetitionStatus"></p></div><div id="matchCreateAdminCard"></div><div id="matchesList"></div></section></main></body>'}));
   const bootAssigned=async()=>{
    await assigned.goto(base+'/tests/match-harness.html');
    await assigned.evaluate(({current,match,user})=>{
     window.S={workspace:{id:current,role:'coorganizer'},session:{user:{id:user}},myPermissions:{can_enter_scores:true},matches:[],tournaments:[{id:current,name:'Tournoi réel',status:'draft'}],activeTour:current,teams:[],teamPlayers:[],players:[],goals:[]};
     window.currentTour=()=>S.tournaments.find(t=>t.id===S.activeTour);window.loadTournament=async()=>{};window.renderMatches=()=>{};window.canEditCurrentMatches=()=>false;
     const query=new Proxy(()=>query,{get:(_t,k)=>k==='then'?resolve=>Promise.resolve({data:[],error:null}).then(resolve):()=>query});
     window.__assignedCalls=[];window.sb={from:()=>query,rpc:async(name,args)=>{window.__assignedCalls.push({name,args});return {data:args.p_workspace_id===current?[{id:match,status:'scheduled',created_at:'2026-09-12T12:00:00Z',source_workspace_name:'Espace partagé'}]:[]}}};
    },{current,match,user:id(99)});
    await assigned.addScriptTag({url:base+'/match-engine-v4300.js'});await assigned.addScriptTag({url:base+'/match-tab-recovery-v4355.js'});await assigned.locator('[data-view="matches"]').click();
    await assigned.locator('#matchCompetitionSelect option[value="test:'+match+'"]').waitFor({state:'attached'});
   };
   await bootAssigned();await assigned.locator('#matchCompetitionSelect').selectOption('test:'+match);await assigned.locator('#assignedTestFrame').waitFor();
   let assignedFrame=await (await assigned.locator('#assignedTestFrame').elementHandle()).contentFrame();
   assert.equal(new URL(assignedFrame.url()).searchParams.has('admin'),false);
   await checkSharedMatchModule(assignedFrame,()=>assigned.screenshot({path:path.join(screenshotDir,'screenshot-assigned-quick-'+viewport.width+'.png'),fullPage:true}));
   await assigned.evaluate(()=>window.SWE_RENDER_MATCHES_4302(false));assert.equal(await assigned.locator('#matchCompetitionSelect').inputValue(),'test:'+match);
   await bootAssigned();await assigned.locator('#assignedTestFrame').waitFor();assert.equal(await assigned.locator('#matchCompetitionSelect').inputValue(),'test:'+match);
   await assigned.locator('#matchCompetitionSelect').selectOption(current);await assigned.locator('#assignedWorkspaceTests').waitFor({state:'detached'});assert.equal(await assigned.evaluate(()=>S.activeTour),current);
   await assigned.evaluate(()=>{S.activeTour=null;S.tournaments=[];document.querySelector('[data-view="matches"]').click()});await assigned.locator('#assignedTestFrame').waitFor();
   await assigned.evaluate(past=>{S.workspace.id=past;document.dispatchEvent(new Event('swe:rendered'))},past);
   await assigned.locator('#assignedWorkspaceTests').waitFor({state:'detached'});assert.equal(await assigned.evaluate(()=>S.matches.length),0);
   await assigned.close();console.log('Real CSP, assigned selector, management, reload, no tournament and workspace switch:',viewport.width,'OK');
   await page.goto(base+'/live.html?test='+match+'&admin=1&tab=matches');await checkSharedMatchModule(page);
   console.log('Registration, history, guest disclosure and selection:',viewport.width,'OK');await context.close();
  }
  const context=await browser.newContext();await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();if(u.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'text/javascript',body:sdk});if(u.pathname.endsWith('/record_swe_page_view'))return route.fulfill({contentType:'application/json',body:'42'});return route.abort()});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/live.html?test='+match+'&admin=1');await page.locator('#liveMatches').filter({hasText:'0 - 0'}).waitFor();await page.evaluate(()=>{window.__testScore=2;document.dispatchEvent(new Event('visibilitychange'))});await page.locator('#liveMatches').filter({hasText:'2 - 0'}).waitFor();console.log('Existing live renderer refreshes test scores: OK');
  await page.goto(base+'/forssadmin/');await page.locator('[data-view="reports"]').click();await page.locator('#reportRows').filter({hasText:'42'}).waitFor();await page.locator('[data-view="matchtests"]').click();await checkTestAccountPicker(page);await checkTestMatchCreation(page);
  const testFrame=await (await page.locator('#testQuickFrame').elementHandle()).contentFrame();await checkSharedMatchModule(testFrame);console.log('Super Admin reports, destination picker and embedded quick entry: OK');
  const reader=await context.newPage();reader.on('pageerror',e=>errors.push(e.message));await reader.addInitScript(()=>{window.__testCanEdit=false});await reader.goto(base+'/live.html?test='+match+'&tab=matches');await reader.locator('.swe4300-result').waitFor();assert.equal(await reader.locator('#testModuleStart').isVisible(),false);assert.equal(await reader.locator('.swe4301-goal-form').count(),0);assert.equal(await reader.locator('.swe4300-edit').count(),0);await reader.close();
  const denied=await context.newPage();denied.on('pageerror',e=>errors.push(e.message));await denied.addInitScript(()=>{window.__denyTest=true});await denied.goto(base+'/live.html?test='+match+'&tab=matches');await denied.locator('#liveError').filter({hasText:'ne participe pas'}).waitFor();assert.equal(await denied.locator('.swe4300-match').count(),0);await denied.close();
  const normal=await context.newPage();normal.on('pageerror',e=>errors.push(e.message));await normal.setContent('<div id="matchesList"></div>');
  await normal.evaluate(data=>{
   window.S={players:data.players,teams:data.teams,teamPlayers:data.team_players,matches:[data.matches[0]],goals:[],tournaments:[data.tournaments[1]],activeTour:data.tournaments[1].id};window.__normalWrites=[];
   window.currentTour=()=>S.tournaments[0];window.canEditCurrentMatches=()=>true;window.isAdmin=()=>true;window.renderMatches=()=>{};window.toast=()=>{};
   window.sb={from:table=>({update:values=>({eq:async(key,value)=>{window.__normalWrites.push({table,values,key,value});return {error:null}}})})};
  },snapshot);
  await normal.addScriptTag({content:fs.readFileSync(path.join(root,'match-engine-v4300.js'),'utf8')});await normal.locator('.swe4300-edit input').first().fill('3');await normal.locator('.swe4300-edit button').click();assert.deepEqual(await normal.evaluate(()=>window.__normalWrites.map(x=>x.values)),[{home_score:3,away_score:0}]);await normal.close();console.log('Normal match module and test viewer permissions: OK');
  await context.close();assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);console.error('Page errors:',errors);server.close();process.exitCode=1});

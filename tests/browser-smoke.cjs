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
 window.__calls=[];window.__snapshot=data;window.__testScore=0;
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
    if(name==='super_admin_get_test_match_accounts')return {data:[...Array.from({length:8},(_,i)=>({swe_id:'SWE-TEST'+(i+1),name:'Compte '+(i+1)})),{swe_id:'SWE-E5DE3BA0',name:'Testing boy'}]};
    if(name==='super_admin_list_test_matches')return {data:[{id:ids.match,created_at:'2026-09-12T12:00:00Z',player_count:4,status:'scheduled',home_score:0,away_score:0}]};
    if(name==='super_admin_get_page_reports')return {data:[{page_key:'registration:x',page_type:'registration',title:'Prochain tournoi',workspace_name:'Groupe',view_count:42,updated_at:'2026-09-12T12:00:00Z'}]};
    if(name==='get_test_match_snapshot'){const d=structuredClone(window.__snapshot);d.is_test=true;d.tournament_id=ids.past;d.matches[0].home_score=window.__testScore;return {data:d}}
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
 await page.locator('#testAccountCount').filter({hasText:'9 comptes disponibles'}).waitFor();
 await page.locator('#testExpandAccounts').click();assert.equal(await page.locator('#testAccounts').evaluate(e=>e.style.maxHeight),'none');
 await page.locator('#testExpandAccounts').click();assert.equal(await page.locator('#testAccounts').evaluate(e=>e.style.maxHeight),'260px');
 await page.locator('#testSearch').fill('SWE-E5DE3BA0');assert.equal(await page.locator('[data-test-account]').count(),1);assert.match(await page.locator('#testAccounts').innerText(),/Testing boy/);
 await page.locator('[data-test-account="SWE-E5DE3BA0"]').check();await page.locator('#testSearch').fill('');assert.equal(await page.locator('[data-test-account="SWE-E5DE3BA0"]').isChecked(),true);await page.locator('[data-test-account="SWE-E5DE3BA0"]').uncheck();
 console.log('Match-test account search, expand/collapse and selection: OK');
}
const server=http.createServer((req,res)=>{let target=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403);return res.end()}try{if(fs.statSync(target).isDirectory())target=path.join(target,'index.html');res.setHeader('Content-Type',target.endsWith('.html')?'text/html':target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':'application/octet-stream');res.end(fs.readFileSync(target))}catch{res.writeHead(404);res.end()}});
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
   console.log('Registration, history, guest disclosure and selection:',viewport.width,'OK');await context.close();
  }
  const context=await browser.newContext();await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();if(u.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'text/javascript',body:sdk});if(u.pathname.endsWith('/record_swe_page_view'))return route.fulfill({contentType:'application/json',body:'42'});return route.abort()});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/live.html?test='+match+'&admin=1');await page.locator('#liveMatches').filter({hasText:'0 - 0'}).waitFor();await page.evaluate(()=>{window.__testScore=2;document.dispatchEvent(new Event('visibilitychange'))});await page.locator('#liveMatches').filter({hasText:'2 - 0'}).waitFor();console.log('Existing live renderer refreshes test scores: OK');
  await page.goto(base+'/forssadmin/');await page.locator('[data-view="reports"]').click();await page.locator('#reportRows').filter({hasText:'42'}).waitFor();await page.locator('[data-view="matchtests"]').click();await checkTestAccountPicker(page);await page.locator('[data-test-account]').first().check();await page.locator('[data-test-account]').nth(1).check();assert.equal(await page.locator('#testCreate').isEnabled(),true);await page.locator('[data-open-test]').click();await page.locator('#testScorer').waitFor();assert.equal(await page.locator('#testAssister option').count(),2);console.log('Super Admin reports and match-test screen: OK');
  await context.close();assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);console.error('Page errors:',errors);server.close();process.exitCode=1});

// Run with Playwright installed. All remote requests are mocked; no production writes.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..');
const screenshotDir=path.join(__dirname,'screenshots');fs.mkdirSync(screenshotDir,{recursive:true});
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const token=id(1),current=id(2),past=id(3),season=id(4),match=id(5),a=id(6),b=id(7);
const players=[1,2,3,4].map(n=>({id:id(10+n),name:'Joueur '+n,active:true,is_group_member:true}));
const snapshot={workspace:{id:id(30),name:'Groupe de vérification'},features:{rankings_enabled:true,player_ratings_enabled:false,top_player_enabled:false},players,seasons:[{id:season,name:'Saison de test',is_active:true}],leagues:[],tournaments:[{id:current,workspace_id:id(30),name:'Prochain tournoi',tournament_date:'2099-09-20',registration_open:true,status:'draft',format:'classic',max_players:20,team_size:5,season_id:season,registration_deadline:'2099-09-19T17:00:00Z'},{id:past,workspace_id:id(30),name:'Tournoi précédent',tournament_date:'2026-09-01',status:'finished',format:'classic',season_id:season}],tournament_players:players.map(p=>({tournament_id:current,player_id:p.id,present:true,registration_status:'confirmed'})),teams:[{id:a,tournament_id:past,name:'Bleus',color:'#2563eb'},{id:b,tournament_id:past,name:'Rouges',color:'#dc2626'}],team_players:players.map((p,i)=>({team_id:i%2?a:b,player_id:p.id})),matches:[{id:match,tournament_id:past,home_team_id:a,away_team_id:b,home_score:1,away_score:0,status:'finished',match_order:1}],goals:[{id:id(20),match_id:match,team_id:a,scorer_player_id:players[1].id,assister_player_id:players[3].id}],match_player_assignments:players.map((p,i)=>({match_id:match,team_id:i%2?a:b,player_id:p.id})),sports_complexes:[],sports_pitches:[]};
snapshot.teams[0].name='Équipe Harry MC';
snapshot.tournaments[0].tournament_date='2026-09-13';snapshot.tournaments[0].max_players=35;snapshot.tournaments[0].start_time='09:00';snapshot.tournaments[0].venue='Arena — Carrefour, Mercedes, Boulogne';snapshot.tournaments[0].entry_fee_cents=900;
for(let i=5;i<=30;i++){const p={id:id(100+i),name:'Joueur '+i,active:true,is_group_member:true};snapshot.players.push(p);snapshot.tournament_players.push({tournament_id:current,player_id:p.id,present:true,registration_status:'confirmed',registered_at:'2026-09-12T12:00:00Z'});}

snapshot.players.push({id:id(50),name:'Ancien invité',active:true,is_group_member:false,guest_of_player_id:players[0].id});
snapshot.tournament_players.push({tournament_id:past,player_id:id(50),present:true,registration_status:'confirmed',registered_by_player_id:players[0].id});
snapshot.tournaments[0].registration_briefing={general:'Rendez-vous 15 minutes avant le début.',observe:true,evening:true,rating:true};
snapshot.matches.push({id:id(21),tournament_id:past,home_team_id:b,away_team_id:a,home_score:12,away_score:2,status:'finished',match_order:2});
function installMock(data,ids,ruleRows){
 if(window.__enableTopFive){data.features.player_ratings_enabled=true;data.features.top_player_enabled=true;for(const p of data.players.slice(4,6))data.match_player_assignments.push({match_id:ids.match,team_id:data.teams[0].id,player_id:p.id});data.tournaments.push({id:'season-tournament-two',name:'Deuxième journée',tournament_date:'2026-09-08',status:'finished',format:'classic',season_id:ids.season});data.teams.push({id:'season-team-home',tournament_id:'season-tournament-two',name:'Or'},{id:'season-team-away',tournament_id:'season-tournament-two',name:'Argent'});data.matches.push({id:'season-match-two',tournament_id:'season-tournament-two',home_team_id:'season-team-home',away_team_id:'season-team-away',home_score:3,away_score:0,status:'scheduled'});data.match_player_assignments.push({match_id:'season-match-two',team_id:'season-team-home',player_id:data.players[0].id},{match_id:'season-match-two',team_id:'season-team-away',player_id:data.players[1].id});data.goals.push({id:'season-goal-one',match_id:'season-match-two',team_id:'season-team-home',scorer_player_id:data.players[0].id},{id:'season-goal-two',match_id:'season-match-two',team_id:'season-team-home',scorer_player_id:data.players[0].id});}
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
    getSession:async()=>({data:{session:window.__publicSession||location.pathname.includes('forssadmin')||new URLSearchParams(location.search).has('test')?{user:{id:ids.user,email:'test@example.invalid'}}:null}}),
    getUser:async()=>({data:{user:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
    signInWithPassword:async()=>({data:{},error:null}),signOut:async()=>({error:null})
   },
   from:()=>query,channel:()=>({on(){return this},subscribe(){return this},unsubscribe(){}}),removeChannel:async()=>{},
   rpc:async(name,args)=>{
    window.__calls.push({name,args});
    if(['get_my_player_card_stats_v1','get_public_player_card_by_short_code_v1','get_public_player_card_by_token_v1'].includes(name))return {data:window.__cardUnavailable?null:(window.__card||{display_name:'Forssa',public_player_id:'SWE-B2A9B0CB',matches:12,wins:3,goals:2,assists:0,tournaments:2,tournament_wins:0,rating:3.3,preferred_role:'finisseur'})};
    if(name==='get_or_create_my_player_card_share_v1')return {data:{url:location.origin+'/c.html?s=80871023'}};
    if(name==='super_admin_get_user_journal')return {data:{rows:args?.p_search==='aucun'?[]:[{key:args?.p_before?'audit:1':'audit:2',at:args?.p_before?'2026-09-11T12:00:00Z':'2026-09-12T12:00:00Z',actor_name:'Alice <img src=x>',action:'insert',target_type:'goal',target_id:ids.match,workspace_name:'Groupe de test',details:{source:args?.p_before?'reconstructed':'audit_logs',target_name:'But de vérification'}}],has_more:!args?.p_before&&!args?.p_search}};
    if(name==='super_admin_get_test_players')return {data:[...(window.__playersDeleted?[]:[{player_id:'fixture-1',name:'Joueur test 01',workspace_name:'Fixture',protected:false}]),{player_id:'protected-1',name:'Joueur lié',workspace_name:'Fixture',protected:true}]};
    if(name==='super_admin_delete_test_players'){if(window.__refuseDeletePlayers)return {error:{message:'Suppression refusée : joueur protégé'}};window.__playersDeleted=true;return {data:args.p_player_ids.length};}
    if(name==='super_admin_get_king_rules')return {data:ruleRows};
    if(name==='super_admin_save_king_rule'){const row=ruleRows.find(r=>r.team_count===args.p_team_count);Object.assign(row,{title:args.p_title,body:args.p_body});return {data:null};}
    if(name==='get_public_tournament_king_rules'){const n=window.__snapshot.tournament_players.filter(r=>r.tournament_id===args.p_tournament_id&&r.present&&r.registration_status!=='waitlist').length,teams=Math.floor(n/5),row=ruleRows.find(r=>r.team_count===teams),common=ruleRows[0];return {data:{player_count:n,team_count:teams,substitutes:n%5,title:row?.title,body:row?.body,common_title:common.title,common_body:common.body}};}
    if(name==='is_platform_super_admin')return {data:true};
    if(name==='get_public_registration_player_rating')return {data:{player_id:args.p_player_id,rating_group_name:'Chien Boul Academy',avg_rating:args.p_player_id===data.players[0].id?3.3:null}};
    if(name==='super_admin_manage_test_tournament'){if(args.p_action==='delete')window.__tournamentDeleted=true;return {data:{workspace_id:ids.current,tournament_id:args.p_tournament_id}};}
    if(name==='super_admin_list_test_tournaments')return {data:window.__tournamentDeleted?[]:[{workspace_id:ids.current,tournament_id:ids.current,short_code:'TEST30',workspace_name:'TEST SWÉ — 30 joueurs',player_count:30,tournament_date:'2026-09-13',status:'draft'}]};
    if(name==='super_admin_create_test_tournament')return {data:{workspace_id:ids.current,tournament_id:ids.current,short_code:'TEST30'}};
    if(name==='get_public_workspace_snapshot_v2')return {data:window.__snapshot};
    if(name==='public_tournament_payment_status'){const result=structuredClone(window.__paymentStatus||{available:false,reason:'free',entry_fee_cents:0});if(window.__delayPayment)await new Promise(r=>setTimeout(r,500));return {data:result};}
    if(name==='public_tournament_payment_choice_status')return {data:window.__paymentChoice||{}};
    if(name==='get_my_tournament_presentation_v1')return {data:{my_player_id:data.players[0].id,is_coorganizer:true,personal_instructions:'Vérifie les présences avant le tirage.',tournament_rating_windows:window.__ratingWindows||[]}};
    if(name==='public_register_tournament_guest'){let p=window.__snapshot.players.find(p=>p.name.toLowerCase()===args.p_guest_name.toLowerCase());if(!p){p={id:fakeId(200),name:args.p_guest_name,active:true,is_group_member:false,guest_of_player_id:args.p_host_player_id};window.__snapshot.players.push(p)}window.__snapshot.tournament_players.push({tournament_id:args.p_tournament_id,player_id:p.id,present:true,registration_status:'confirmed',registered_by_player_id:args.p_host_player_id});return {data:{player_id:p.id,status:'confirmed'}};}
    if(name==='public_tournament_registration'){const reg=window.__snapshot.tournament_players.find(r=>r.player_id===args.p_player_id&&r.tournament_id===args.p_tournament_id);if(reg)reg.present=args.p_action==='join';return {data:{position:1,is_substitute:false}};}
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
async function checkHomeShop(context,base,width){
 const page=await context.newPage();
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),start=html.indexOf('<div class="card" id="homeEcosystemCard"'),end=html.indexOf('<div class="card" id="homeCoorgVotesCard"',start);
 await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="'+base+'/styles.css"><link rel="stylesheet" href="'+base+'/home-commerce.css"></head><body><main class="app">'+html.slice(start,end)+'</main></body></html>');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8'),render=app.slice(app.indexOf('function renderEcosystemCommercial(){'),app.indexOf('function renderHome(){'));
 await page.addScriptTag({content:'const $=s=>document.querySelector(s);const S={workspace:{id:"test"},workspaceFeatures:{player_ratings_enabled:false,third_half_enabled:false,tournaments_enabled:false},commercialAccess:{subscription_plan:"free"},organizerAccess:{trial_active:false}};function isAdmin(){return true}function refreshCoorgPurchasePrice(){};'+render+';renderEcosystemCommercial();'});
 assert.equal(await page.locator('#homeCoorgOfferCard').getAttribute('open'),null);
 assert.equal(await page.locator('#homeBuyCoorg').isVisible(),false);
 assert.equal(await page.locator('#ecoRatingsModule').isVisible(),false);
 await page.locator('#homeCoorgOfferCard>summary').click();await page.locator('#homeBuyCoorg').waitFor();await page.locator('#homeCoorgQty').fill('3');
 await page.locator('#homeCoorgOfferCard>summary').click();assert.equal(await page.locator('#homeBuyCoorg').isVisible(),false);
 await page.locator('#homeCoorgOfferCard>summary').click();assert.equal(await page.locator('#homeCoorgQty').inputValue(),'3');await page.locator('#homeCoorgOfferCard>summary').click();
 await page.screenshot({path:path.join(screenshotDir,'home-shop-collapsed-'+width+'.png'),fullPage:true});
 await page.locator('#homeModulesDisclosure>summary').focus();await page.keyboard.press('Enter');await page.locator('#ecoRatingsModule').waitFor();
 assert.equal(await page.locator('[data-module-state="locked"]').count(),3);assert.equal(await page.locator('#homeRequestUpgrade').isVisible(),true);
 await page.screenshot({path:path.join(screenshotDir,'home-shop-unpurchased-'+width+'.png'),fullPage:true});
 await page.evaluate(()=>{S.organizerAccess={trial_active:true,days_remaining:60};S.workspaceFeatures={player_ratings_enabled:true,third_half_enabled:true,tournaments_enabled:true};renderEcosystemCommercial()});
 assert.equal(await page.locator('#homeCoorgOfferCard').isVisible(),false);assert.equal(await page.locator('[data-module-state="trial"]').count(),3);assert.equal(await page.locator('#homeRequestUpgrade').isVisible(),false);
 await page.evaluate(()=>{S.workspaceFeatures.third_half_enabled=false;renderEcosystemCommercial()});assert.equal(await page.locator('#ecoThirdHalfModule').getAttribute('data-module-state'),'locked');assert.equal(await page.locator('#homeRequestUpgrade').isVisible(),true);
 await page.evaluate(()=>{S.organizerAccess.trial_active=false;renderEcosystemCommercial()});assert.equal(await page.locator('#homeCoorgOfferCard').isVisible(),true);assert.equal(await page.locator('#homeTrialPricingNotice').isVisible(),false);assert.equal(await page.locator('[data-module-state="active"]').count(),2);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Home shop has no horizontal overflow');
 await page.locator('#homeModulesDisclosure>summary').click();assert.equal(await page.locator('#ecoRatingsModule').isVisible(),false);
 await page.close();console.log('Home shop disclosures, keyboard, preserved quantity, trial and disabled modules:',width,'OK');
}
async function checkMobileCoorgRights(context,base){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('data-swe-loader="mobile-coorg-rights-v4362"')<html.indexOf('hotfix-v4244.js'),'Mobile rights must load before the deferred module chain');
 const page=await context.newPage();
 await page.setContent('<!doctype html><meta name="viewport" content="width=device-width"><main><nav class="tabs"><button class="tab active" data-view="home">Accueil</button><button class="tab" data-view="myplayer">Profil</button><button class="tab" data-view="players">Joueurs</button><button class="tab" data-view="tournaments">Tournois</button><button class="tab" data-view="teams">Équipes</button><button class="tab" data-view="matches" style="display:none" disabled>Matchs</button><button class="tab disabled-tab" data-view="permissions" disabled>Droits</button><button class="tab" data-view="ranking">Classement</button></nav></main>');
 await page.addScriptTag({content:'var S={session:{user:{id:"coorg"}},workspace:{role:"coorganizer"},myPermissions:{can_view_players:true,can_create_tournaments:false,can_generate_teams:false,can_enter_scores:false}};function isCoorg(){return S.workspace.role==="coorganizer"}'});
 await page.addScriptTag({url:base+'/mobile-coorg-rights-v4362.js?v=test'});
 await page.waitForFunction(()=>document.querySelector('[data-view="tournaments"]').classList.contains('swe-mobile-right-denied'));
 assert.deepEqual(await page.locator('.swe-mobile-right-denied').evaluateAll(nodes=>nodes.map(n=>n.dataset.view)),['tournaments','teams','matches','permissions','ranking']);
 assert.equal(await page.locator('[data-view="players"]').getAttribute('aria-disabled'),'false');
 assert.notEqual(await page.locator('[data-view="matches"]').evaluate(e=>getComputedStyle(e).display),'none');
 assert.ok(Number(await page.locator('[data-view="matches"]').evaluate(e=>getComputedStyle(e).opacity))<0.5);
 assert.equal(await page.locator('[data-view="matches"]').evaluate(e=>e.disabled),false,'Denied mobile tabs keep their native touch events');
 await page.locator('[data-view="matches"]').dispatchEvent('click');await page.locator('#sweMobileRightsToast4362').waitFor({state:'visible'});
 await page.evaluate(()=>{S.myPermissions.can_create_tournaments=true;S.myPermissions.can_generate_teams=true;S.myPermissions.can_enter_scores=true;document.dispatchEvent(new Event('swe:rendered'))});
 await page.waitForFunction(()=>!document.querySelector('[data-view="matches"]').classList.contains('swe-mobile-right-denied'));
 assert.equal(await page.locator('[data-view="matches"]').getAttribute('aria-disabled'),'false');
 assert.equal(await page.locator('[data-view="permissions"]').getAttribute('aria-disabled'),'true');
 await page.close();console.log('Mobile co-manager tabs use live permissions, stay visible in grey and explain denied access: OK');
}
async function checkPlayerRatingMobile(context,base){
 const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
 for(const cls of ['player-rating-card','player-rating-criteria','player-rating-field','player-rating-role','player-rating-progress'])assert.match(source,new RegExp(cls));
 const page=await context.newPage();
 await page.setContent('<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="'+base+'/styles.css"><link rel="stylesheet" href="'+base+'/player-rating-ui.css"><main class="app"><article class="player" style="max-width:480px"><h3>Alex L</h3><div class="player-rating-card"><div class="player-rating-head"><div class="player-rating-title-row"><b>⚽ Mon évaluation</b><span class="player-rating-private">🔒 CONFIDENTIEL</span></div><div class="muted small player-rating-scale">1 à renforcer · 2 moyen · 3 bon · 4 très bon · 5 excellent</div><div class="player-rating-balance">⚖️ Ces critères alimentent la création des équipes équilibrées.</div><div class="player-rating-verdict"><b>🕵️ Verdict collectif</b><strong>2.3/5</strong></div></div><div class="player-rating-criteria">'+['❤️ Cardio','🪄 Dribble','🤝 Collectif','🎯 Frappe'].map((label,i)=>'<label class="player-rating-field '+(i<3?'is-filled':'')+'"><span class="player-rating-label">'+label+'</span><select class="player-rating-select"><option>'+(i===1?'1/5 · À renforcer':'3/5 · Bon')+'</option></select></label>').join('')+'</div><label class="player-rating-role is-filled"><span class="player-rating-label">🧭 Rôle de prédilection</span><select class="player-rating-select"><option>🛡️ Défenseur</option></select></label><div class="player-rating-progress"><div><span>Préparation de l’évaluation</span><b>4/5</b></div><span class="player-rating-progress-track"><i style="width:80%"></i></span></div><button class="primary" style="width:100%;margin-top:10px">💾 Mettre à jour mon évaluation</button></div></article></main>');
 const fields=page.locator('.player-rating-field');assert.equal(await fields.count(),4);
 assert.ok(await fields.evaluateAll(nodes=>Math.abs(nodes[0].getBoundingClientRect().top-nodes[1].getBoundingClientRect().top)<1),'Two compact rating tiles stay on the same row');
 assert.ok(await page.locator('.player-rating-select').evaluateAll(selects=>selects.every(s=>{const r=s.getBoundingClientRect(),p=s.parentElement.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1})),'Every rating select stays inside its tile');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Rating card has no mobile horizontal overflow');
 assert.ok(await page.locator('.player-rating-progress-track').evaluate(e=>Math.abs(e.firstElementChild.getBoundingClientRect().width-e.getBoundingClientRect().width*.8)<1));
 await page.screenshot({path:path.join(screenshotDir,'player-rating-mobile-360.png'),fullPage:true});await page.close();
 console.log('Mobile player rating tiles, selects, balance cue and progress: OK');
}
const sdk='('+installMock.toString()+')('+JSON.stringify(snapshot)+','+JSON.stringify({user:id(99),token,current,past,season,match})+','+JSON.stringify(require('./king-rule-fixtures.json'))+');';
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
async function checkPlayerCards(context,base,width){
 const expected={'Matchs':'12','Victoires':'3','Buts':'2','Passes':'0','Tournois joués':'2','Tournois remportés':'0'};
 const check=async(page,prefix)=>{
  assert.deepEqual(await page.locator(prefix+'stat').evaluateAll(rows=>Object.fromEntries(rows.map(r=>[r.querySelector('small').textContent,r.querySelector('b').textContent]))),expected);
  const stars=page.locator(prefix+'stars');assert.match(await stars.innerText(),/3,3 \/ 5/);assert.equal(await stars.evaluate(e=>e.style.getPropertyValue('--rating-fill')),'66%');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
 };
 for(const route of ['/c.html?s=80871023','/carte-joueur.html?token='+token]){
  const card=await context.newPage();card.on('pageerror',e=>errors.push(e.message));await card.goto(base+route);await card.locator('.stat').first().waitFor();await check(card,'.');
  assert.equal(await card.locator('#shortUrl').inputValue(),base+route);await card.locator('#qrToggle').click();assert.equal(await card.locator('#qrbox').isVisible(),true);await card.locator('#qrToggle').click();assert.equal(await card.locator('#qrbox').isVisible(),false);
  if(route.startsWith('/c.html'))await card.screenshot({path:path.join(screenshotDir,'player-card-public-'+width+'.png'),fullPage:true});
  await card.close();
 }
 const own=await context.newPage();own.on('pageerror',e=>errors.push(e.message));await own.setContent('<style>body{margin:0;font-family:Arial}*{box-sizing:border-box}.hidden{display:none}</style><button id="swe4338CardBtn">Ma carte</button>');
 await own.addScriptTag({content:sdk});await own.evaluate(()=>{window.S={session:{user:{id:'fixture'}},playerDashboard:{profile:{display_name:'Forssa',public_player_id:'SWE-B2A9B0CB'},stats:{matches:6,wins:1,rating:5}}};window.sb=window.supabase.createClient()});
 await own.addScriptTag({content:fs.readFileSync(path.join(root,'player-card-v4344.js'),'utf8')});await own.waitForFunction(()=>typeof document.getElementById('swe4338CardBtn').onclick==='function');await own.locator('#swe4338CardBtn').click();await own.locator('.swe4344-stat').first().waitFor();await check(own,'.swe4344-');await own.screenshot({path:path.join(screenshotDir,'player-card-own-'+width+'.png'),fullPage:true});
 await own.locator('#swe4344Close').click();await own.evaluate(()=>{window.__card={matches:12,wins:3,goals:2,assists:0,tournaments:2,tournament_wins:0,rating:null}});await own.locator('#swe4338CardBtn').click();assert.match(await own.locator('.swe4344-stars').innerText(),/Non noté/);assert.equal(await own.locator('.swe4344-stars').evaluate(e=>e.style.getPropertyValue('--rating-fill')),'0%');await own.close();
 if(width===360){const missing=await context.newPage();await missing.addInitScript(()=>{window.__cardUnavailable=true});await missing.goto(base+'/c.html?s=INVALID');await missing.locator('#root').filter({hasText:'plus disponible'}).waitFor();assert.equal(await missing.locator('.card').count(),0);await missing.close()}
 console.log('Fresh private/public card statistics, fractional rating, unrated state, share links and mobile:',width,'OK');
}
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
 assert.ok(await page.locator('.swe4360-player').evaluateAll(buttons=>buttons.every(b=>{const r=b.getBoundingClientRect(),p=b.parentElement.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1})), 'Quick score buttons must remain inside their team column');
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
   const context=await browser.newContext({viewport,timezoneId:'America/Martinique'});await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();if(u.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'text/javascript',body:sdk});if(u.pathname.endsWith('/record_swe_page_view'))return route.fulfill({contentType:'application/json',body:'42'});return route.abort()});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await checkPlayerCards(context,base,viewport.width);
   await checkHomeShop(context,base,viewport.width);
   if(viewport.width===360)await checkMobileCoorgRights(context,base);
   if(viewport.width===360)await checkPlayerRatingMobile(context,base);
   await page.goto(base+'/?s=TESTCODE');
   await page.locator('#chooseSoloMode').waitFor({state:'visible'});
   await page.locator('#chooseSoloMode').click();
   await page.locator('#publicPlayerSelect').waitFor({state:'visible'});
   await page.locator('#swePageViewCount').filter({hasText:'42 vues'}).waitFor();
   assert.equal(await page.locator('#publicGuestFields').getAttribute('open'),null);
   assert.equal(await page.locator('#publicLastTournamentDetails').isVisible(),false);
   assert.equal(await page.locator('#publicTeams').isVisible(),false);
   await page.locator('#toggleLastTournamentPublic').click();
   await page.locator('#backPublic').waitFor({state:'visible'});await checkScoreLayout(page);
   assert.match(page.url(),/history=/);assert.match(page.url(),/from_s=TESTCODE/);
   await page.locator('#backPublic').click();await page.locator('#publicPlayerSelect').waitFor({state:'visible'});
   assert.equal(new URL(page.url()).searchParams.get('s'),'TESTCODE');
   assert.match(await page.locator('#registrationMeta').innerText(),/(Aujourd’hui|dimanche 13 septembre)/);assert.match(await page.locator('#registrationMeta').innerText(),/09:00/);assert.match(await page.locator('#registrationMeta').innerText(),/Arena/);
   assert.equal(await page.locator('#publicRegisteredList > .player').count(),5);
   const more=page.locator('#publicMoreRegistrations');assert.equal(await more.getAttribute('open'),null);await more.locator('summary').click();assert.ok(await page.locator('#publicMoreRegistrations > .player:visible').count()>=25);await more.locator('summary').click();
   assert.equal(await page.locator('#registrationSeasonRankings #publicSeasonScorers').isVisible(),true);assert.ok((await page.locator('#registrationSeasonRankings').boundingBox()).y>(await page.locator('#registrationPeople').boundingBox()).y,'Season rankings follow registrations on every screen');
   assert.match(await page.locator('#publicSeasonScorers').innerText(),/Joueur 2/);
   assert.match(await page.locator('#publicSeasonAssists').innerText(),/Joueur 4/);
   const href=await page.locator('#publicHistory a').getAttribute('href');assert.match(href,/history=/);assert.match(href,/from_tournament=/);
   await page.locator('#publicGuestFields summary').click();assert.equal(await page.locator('#publicGuestName').isVisible(),true);
   await page.locator('#publicPlayerSelect').selectOption(players[0].id);
   await page.locator('#registrationPlayerStats').filter({hasText:'3,3 / 5'}).waitFor();
   assert.match(await page.locator('#registrationPlayerStats').innerText(),/Chien Boul Academy/);
   assert.match(await page.locator('#registrationPlayerStats .sp-season-heading').innerText(),/résultats de la saison/);
   assert.deepEqual(await page.locator('.sp-player-numbers strong').allTextContents(),['2','1','0','0','1']);
   assert.match(await page.locator('#registrationPlayerStats').textContent(),/5,5 \/ 10/);
   await page.locator('#publicPlayerSelect').selectOption(players[1].id);await page.locator('.sp-academy').filter({hasText:'Non noté'}).waitFor();await page.locator('#publicPlayerSelect').selectOption(players[0].id);
   await page.locator('#publicGuestName').fill('Texte conservé');
   await page.evaluate(async token=>{await Promise.all([bootPublic(token),bootPublic(token),bootPublic(token)]);},token);
   assert.equal(await page.locator('#publicGuestName').inputValue(),'Texte conservé');
   for(const selector of ['#registrationProgress','.sp-body','#publicRegisteredList','#publicPlayerSelect'])assert.equal(await page.locator(selector).count(),1,'Only one '+selector);
   const chosen=await page.locator('#publicPlayerSelect').inputValue();await page.waitForTimeout(1300);assert.equal(await page.locator('#publicPlayerSelect').inputValue(),chosen);
   await page.screenshot({path:path.join(screenshotDir,'screenshot-registration-'+viewport.width+'.png'),fullPage:true});
   assert.equal(await page.locator('#publicView').getAttribute('data-stage'),'green');
   assert.equal(new URL(page.url()).searchParams.get('s'),'TESTCODE');
   assert.equal(await page.locator('#registrationLiveLink').count(),0);
   const rules=page.locator('#registrationParticipationRules');assert.equal(await rules.getAttribute('open'),null);await rules.locator('summary').click();assert.match(await rules.innerText(),/tu paies ta tournée au groupe à la prochaine édition/);await rules.locator('summary').click();assert.equal(await rules.getAttribute('open'),null);
   await page.locator('#publicPreviousGuestsWrap').waitFor({state:'visible'});
   await page.locator('#publicPreviousGuest').selectOption(id(50));assert.equal(await page.locator('#publicGuestName').inputValue(),'Ancien invité');
   await page.locator('#publicAddGuest').click();await page.locator('#publicPreviousGuest option[value="'+id(50)+'"]').waitFor({state:'attached'});await page.waitForFunction(pid=>document.querySelector('#publicPreviousGuest option[value="'+pid+'"]').disabled,id(50));
   assert.equal(await page.evaluate(pid=>window.__snapshot.players.filter(p=>p.id===pid).length,id(50)),1);
   await page.locator('#publicGuestName').fill('Nouvel invité');await page.locator('#publicAddGuest').click();await page.locator('#publicRegisteredList').filter({hasText:'Nouvel invité'}).waitFor();
   assert.match(await page.locator('#registrationMissions').innerText(),/Connecte-toi/);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Premium has no page overflow');
   await page.locator('#publicJoin').click();await page.locator('#registrationConfirmOk').click();
   assert.ok(await page.evaluate(({current,token})=>window.__calls.some(c=>c.name==='public_tournament_registration'&&c.args.p_tournament_id===current&&c.args.p_token===token&&c.args.p_action==='join'),{current,token}));
   assert.deepEqual(await page.locator('.build-badge').allTextContents(),['MAJ '+await page.evaluate(()=>window.SWE_BUILD_VERSION)]);
   console.log('Production preview uses shared URL and real guest/registration callbacks:',viewport.width,'OK');

   await page.goto(base+'/?public='+token+'&history='+past+'&from_tournament='+current+'&from_view=tournament');
   await page.locator('#backPublic').waitFor({state:'visible'});await checkScoreLayout(page);
   await page.screenshot({path:path.join(screenshotDir,'screenshot-history-'+viewport.width+'.png'),fullPage:true});
   await page.locator('#backPublic').click();await page.locator('#chooseSoloMode').waitFor({state:'visible'});assert.equal(new URL(page.url()).searchParams.get('s'),'TESTCODE');
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
   await assigned.route(base+'/tests/match-harness.html',route=>route.fulfill({contentType:'text/html',headers:securityHeaders,body:'<!doctype html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">'+appCsp+'<link rel="stylesheet" href="/styles.css"></head><body><main class="app"><div class="tabs"><button data-view="matches" class="active">Matchs</button></div><section id="view-matches" class="view active"><div id="matchCompetitionSelectorCard" class="card"><h3>Matchs à saisir</h3><select id="matchCompetitionSelect"></select><p id="matchCompetitionStatus"></p></div><div id="matchCreateAdminCard"></div><div id="matchesList"></div></section></main></body>'}));
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
  await page.locator('[data-view="reports"]').click();await page.locator('#journalRows').filter({hasText:'Alice'}).waitFor();assert.equal(await page.locator('#journalRows img').count(),0);await page.locator('#journalMore').click();await page.locator('#journalState').filter({hasText:'2 action'}).waitFor();assert.equal(await page.locator('#journalRows tr').count(),2);
  await page.locator('#journalSearch').fill('aucun');await page.locator('#journalFilters button').click();await page.locator('#journalState').filter({hasText:'0 action'}).waitFor();assert.match(await page.locator('#journalRows').innerText(),/Aucune action/);
  await page.locator('#journalSearch').fill('');await page.locator('#journalFilters button').click();await page.locator('#journalState').filter({hasText:'1 action'}).waitFor();await page.locator('#userJournal').screenshot({path:path.join(screenshotDir,'user-journal.png')});
  await page.locator('[data-view="players"]').click();await page.locator('#deleteAllTestPlayers').waitFor({state:'attached'});await page.locator('details').filter({has:page.locator('#deleteAllTestPlayers')}).locator('summary').click();assert.equal(await page.locator('#testPlayersBody tr').count(),2);
  page.once('dialog',d=>d.dismiss());await page.locator('#deleteAllTestPlayers').click();assert.ok(!await page.evaluate(()=>window.__calls.some(c=>c.name==='super_admin_delete_test_players')));
  await page.evaluate(()=>window.__refuseDeletePlayers=true);page.once('dialog',d=>d.accept());await page.locator('#deleteAllTestPlayers').click();await page.locator('#testPlayersFeedback').filter({hasText:'refusée'}).waitFor();assert.equal(await page.locator('#testPlayersBody tr').count(),2);
  await page.evaluate(()=>window.__refuseDeletePlayers=false);page.once('dialog',d=>d.accept());await page.locator('#deleteAllTestPlayers').click();await page.locator('#testPlayersFeedback').filter({hasText:'1 joueurs test supprimés'}).waitFor({state:'attached'});assert.equal(await page.locator('#testPlayersBody tr').count(),1);assert.ok(await page.evaluate(()=>window.__calls.filter(c=>c.name==='super_admin_delete_test_players').every(c=>c.args.p_player_ids.length===1&&c.args.p_player_ids[0]==='fixture-1')));
  await page.locator('[data-view="registrationtests"]').click();await page.locator('#createTournamentTest').waitFor();await page.locator('#createTournamentTest').click();await page.locator('#tournamentTestFeedback').filter({hasText:'Tournoi prêt'}).waitFor();assert.ok(await page.evaluate(()=>window.__calls.some(c=>c.name==='super_admin_create_test_tournament'&&c.args.p_format==='classic')));await page.locator('details').filter({has:page.locator('#registrationPreviewFrame')}).locator('summary').click();await page.locator('#registrationPreviewFrame').waitFor();const previewFrame=await (await page.locator('#registrationPreviewFrame').elementHandle()).contentFrame();await previewFrame.locator('#pvRegistration').waitFor();assert.equal(await previewFrame.locator('.pv-person').count(),14);console.log('Super Admin registration preview entry: OK');
  assert.match(await page.locator('[data-test-workspace]').getAttribute('href'),/test_tournament=/);
  page.once('dialog',d=>d.dismiss());await page.locator('[data-delete-tournament-test]').click();assert.equal(await page.locator('[data-delete-tournament-test]').count(),1);assert.ok(!await page.evaluate(()=>window.__calls.some(c=>c.name==='super_admin_manage_test_tournament'&&c.args.p_action==='delete')));
  page.once('dialog',d=>d.accept());await page.locator('[data-delete-tournament-test]').click();await page.locator('#tournamentTestFeedback').filter({hasText:'supprimé'}).waitFor();assert.equal(await page.locator('[data-delete-tournament-test]').count(),0);
  await page.locator('[data-view="settings"]').click();await page.locator('[data-king-case="3"]').waitFor();assert.equal(await page.locator('[data-king-case]').count(),6);
  await page.locator('[data-king-case="3"] summary').click();assert.match(await page.locator('[data-king-case="3"] [data-title]').inputValue(),/1 terrain/);
  await page.locator('[data-king-case="3"] [data-body]').fill('Règlement de vérification');await page.locator('[data-king-case="3"] [data-save]').click();await page.locator('[data-king-case="3"] [data-feedback]').filter({hasText:'enregistré'}).waitFor();assert.ok(await page.evaluate(()=>window.__calls.some(c=>c.name==='super_admin_save_king_rule'&&c.args.p_team_count===3)));
  const rulePage=await context.newPage();rulePage.on('pageerror',e=>errors.push(e.message));await rulePage.goto(base+'/?s=TESTCODE');await rulePage.locator('#publicPlayerSelect').waitFor();
  await rulePage.evaluate(current=>{window.__snapshot.tournaments.find(t=>t.id===current).format='king_of_pitch';window.__snapshot.tournament_players.filter(r=>r.tournament_id===current).forEach((r,i)=>r.present=i<15);},current);
  await rulePage.locator('#registrationRules summary').click();await rulePage.locator('#registrationRules').filter({hasText:'15 joueurs — 3 équipes — 1 terrain'}).waitFor({timeout:12000});assert.match(await rulePage.locator('#registrationRules').innerText(),/TAB obligatoire à 3 tireurs/);assert.doesNotMatch(await rulePage.locator('#registrationRules').innerText(),/30 joueurs|25 joueurs/);
  await rulePage.evaluate(current=>{window.__snapshot.tournament_players.filter(r=>r.tournament_id===current).forEach(r=>r.present=true)},current);await rulePage.locator('#registrationRules').filter({hasText:'30 joueurs — 6 équipes — 3 terrains'}).waitFor({timeout:12000});assert.doesNotMatch(await rulePage.locator('#registrationRules').innerText(),/15 joueurs/);await rulePage.close();
  const stale=await context.newPage();stale.on('pageerror',e=>errors.push(e.message));await stale.route('**/build-version.js?check=*',route=>route.fulfill({contentType:'text/javascript',body:"window.SWE_BUILD_VERSION='43.99';"}));await stale.goto(base+'/?s=TESTCODE');await stale.locator('#sweBuildRefresh').waitFor();await stale.locator('#publicGuestFields summary').click();await stale.locator('#publicGuestName').fill('Saisie non rechargée');await stale.waitForTimeout(1200);assert.equal(await stale.locator('#publicGuestName').inputValue(),'Saisie non rechargée');assert.notEqual(await stale.evaluate(()=>window.SWE_BUILD_VERSION),'43.99');assert.equal(new URL(stale.url()).searchParams.get('s'),'TESTCODE');await stale.close();
  const recovery=await context.newPage();await recovery.goto(base+'/');await recovery.evaluate(()=>{localStorage.setItem('swe-recovery-test','kept');sessionStorage.setItem('swe-recovery-test','kept');});await recovery.goto(base+'/reset-v4250.html');await recovery.waitForURL(u=>u.pathname==='/'&&u.searchParams.has('refresh'));assert.deepEqual(await recovery.evaluate(()=>[localStorage.getItem('swe-recovery-test'),sessionStorage.getItem('swe-recovery-test')]),['kept','kept']);await recovery.close();
  const topPage=await context.newPage();await topPage.addInitScript(()=>window.__enableTopFive=true);await topPage.goto(base+'/?s=TESTCODE');await topPage.locator('#publicTournamentTopFive li').first().waitFor();assert.equal(await topPage.locator('#publicTournamentTopFive li').count(),5);assert.match(await topPage.locator('#publicTournamentTopFive').innerText(),/Top 5 de la saison/);assert.match(await topPage.locator('#publicTournamentTopFive').innerText(),/Saison de test/);assert.match(await topPage.locator('#publicTournamentTopFive li').first().innerText(),/Joueur 1/);assert.match(await topPage.locator('#publicTournamentTopFive li').first().innerText(),/2 matchs/);
  for(const width of [1280,390]){await topPage.setViewportSize({width,height:1100});await topPage.locator('#registrationSeasonRankings').screenshot({path:path.join(screenshotDir,'top-five-'+width+'.png')});assert.ok(await topPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));}
  await topPage.close();
  const reader=await context.newPage();reader.on('pageerror',e=>errors.push(e.message));await reader.addInitScript(()=>{window.__testCanEdit=false});await reader.goto(base+'/live.html?test='+match+'&tab=matches');await reader.locator('.swe4300-result').waitFor();assert.equal(await reader.locator('#testModuleStart').isVisible(),false);assert.equal(await reader.locator('.swe4301-goal-form').count(),0);assert.equal(await reader.locator('.swe4300-edit').count(),0);await reader.close();
  const denied=await context.newPage();denied.on('pageerror',e=>errors.push(e.message));await denied.addInitScript(()=>{window.__denyTest=true});await denied.goto(base+'/live.html?test='+match+'&tab=matches');await denied.locator('#liveError').filter({hasText:'ne participe pas'}).waitFor();assert.equal(await denied.locator('.swe4300-match').count(),0);await denied.close();
  const normal=await context.newPage();normal.on('pageerror',e=>errors.push(e.message));await normal.setContent('<div id="matchesList"></div>');
  await normal.evaluate(data=>{
   window.S={players:data.players,teams:data.teams,teamPlayers:data.team_players,matches:[data.matches[0]],goals:[],tournaments:[data.tournaments[1]],activeTour:data.tournaments[1].id};window.__normalWrites=[];
   window.currentTour=()=>S.tournaments[0];window.canEditCurrentMatches=()=>true;window.isAdmin=()=>true;window.renderMatches=()=>{};window.toast=()=>{};
   window.sb={from:table=>({update:values=>({eq:async(key,value)=>{window.__normalWrites.push({table,values,key,value});return {error:null}}})})};
  },snapshot);
  await normal.addScriptTag({content:fs.readFileSync(path.join(root,'match-engine-v4300.js'),'utf8')});await normal.locator('.swe4300-edit input').first().fill('3');await normal.locator('.swe4300-edit button').click();assert.deepEqual(await normal.evaluate(()=>window.__normalWrites.map(x=>x.values)),[{home_score:3,away_score:0}]);await normal.close();console.log('Normal match module and test viewer permissions: OK');

  const payment=await context.newPage();payment.on('pageerror',e=>errors.push(e.message));
  await payment.addInitScript(()=>{window.__paymentStatus={available:true,entry_fee_cents:900,total_cents:950,service_fee_cents:50,payment_status:'unpaid'};});
  await payment.goto(base+'/?s=TESTCODE');await payment.locator('#publicPlayerSelect').waitFor();
  assert.equal(await payment.locator('#publicPaymentBox').isVisible(),false);
  await payment.locator('#publicPlayerSelect').selectOption(players[0].id);await payment.locator('#publicPayEntry').waitFor();
  await payment.waitForFunction(()=>window.__SWE_4283_STABILITY===true);
  assert.equal(await payment.locator('[id^="swePayOnline"]').count(),0,'Legacy payment renderers must not overwrite app controller');
  await payment.evaluate(()=>{window.__paymentChoice={manual_paid_at:'2026-09-12T10:00:00Z'}});
  await payment.locator('#publicPlayerSelect').selectOption(players[1].id);await payment.locator('#publicPaymentBox').filter({hasText:'payée sur place'}).waitFor();
  assert.equal(await payment.locator('#publicPaymentBox button').count(),0);
  await payment.evaluate(()=>{window.__paymentChoice={payment_preference:'onsite'}});
  await payment.locator('#publicPlayerSelect').selectOption(players[0].id);await payment.locator('#publicSwitchOnline').waitFor();
  assert.equal(await payment.locator('#publicPayEntry').count(),0);
  await payment.evaluate(()=>{window.__paymentChoice={};window.__delayPayment=true;});
  await payment.locator('#publicPlayerSelect').selectOption(players[1].id);
  await payment.locator('#publicPlayerSelect').selectOption('');await payment.waitForTimeout(700);
  assert.equal(await payment.locator('#publicPaymentBox').isVisible(),false);assert.equal(await payment.locator('#publicPaymentBox button').count(),0,'Late response after deselection stays hidden');
  await payment.locator('#publicPlayerSelect').selectOption(players[0].id);
  await payment.evaluate(()=>{window.__paymentStatus={available:false,reason:'free',entry_fee_cents:0};window.__delayPayment=false;});
  await payment.locator('#publicPlayerSelect').selectOption(players[1].id);await payment.waitForTimeout(700);
  assert.equal(await payment.locator('#publicPaymentBox').isVisible(),false,'Previous unpaid player cannot overwrite free player');
  await payment.close();console.log('Payment ownership, paid onsite, preference and stale responses: OK');

  const premium=await context.newPage();premium.on('pageerror',e=>errors.push(e.message));await premium.addInitScript(()=>{window.__publicSession=true});await premium.goto(base+'/?s=TESTCODE');await premium.locator('#registrationMissions').filter({hasText:'dans la soirée'}).waitFor();
  assert.match(await premium.locator('#registrationMissions').innerText(),/Vérifie les présences/);assert.equal(await premium.locator('.sp-coorg-instructions').getAttribute('open'),'');
  const organizerHref=await premium.locator('#registrationMissions a').getAttribute('href');assert.equal(new URL(organizerHref).searchParams.get('workspace'),id(30));assert.equal(new URL(organizerHref).searchParams.get('start'),'home');
  await premium.locator('.sp-coorg-instructions summary').click();assert.equal(await premium.locator('.sp-coorg-instructions').getAttribute('open'),null);await premium.locator('.sp-coorg-instructions summary').click();
  await premium.locator('#publicPlayerSelect').selectOption(players[0].id);await premium.locator('#registrationPlayerStats').waitFor({state:'visible'});assert.ok(await premium.evaluate(()=>document.querySelector('#publicParticipationActions').getBoundingClientRect().top<document.querySelector('#registrationPlayerStats').getBoundingClientRect().top),'Participation buttons stay above the player profile');
  await premium.evaluate(current=>{const t=window.__snapshot.tournaments.find(t=>t.id===current);t.max_players=30;t.format='king_of_pitch';window.__snapshot.teams.push({id:'current-team-a',tournament_id:current,name:'Lions du Nord',color:'#b91c1c'},{id:'current-team-b',tournament_id:current,name:'Étoiles Royales',color:'#1d4ed8'},{id:'current-team-c',tournament_id:current,name:'Gardiens de la Cour',color:'#15803d'});window.__snapshot.team_players.push(...window.__snapshot.players.slice(0,15).map((p,i)=>({team_id:i<5?'current-team-a':i<10?'current-team-b':'current-team-c',player_id:p.id})));const substitute=window.__snapshot.players.find(p=>p.name==='Joueur 30');window.__snapshot.tournament_players.find(r=>r.tournament_id===current&&r.player_id===substitute.id).is_substitute=true;document.querySelector('#publicView').__registrationPresentation.update();},current);
  await premium.locator('#registrationSelectionLock').filter({hasText:'Effectif complet'}).waitFor();assert.equal(await premium.locator('#publicPlayerSelect').isDisabled(),true);assert.match(await premium.locator('.sp-royal-format').innerText(),/Roi du Terrain/);assert.match(await premium.locator('.sp-royal-head h2').innerText(),/prétendants à la couronne/i);assert.match(await premium.locator('.sp-royal-subs').innerText(),/Remplaçants de la cour[\s\S]*Joueur 30/);assert.match(await premium.locator('.sp-royal-head p').innerText(),/15 joueurs en équipe · 1 remplaçant/);assert.equal(await premium.locator('.sp-team-jump').getAttribute('href'),'#registrationTeamGrid');assert.ok(await premium.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('.sp-team h3')).fontSize)>20));assert.equal(await premium.evaluate(()=>getComputedStyle(document.querySelector('.sp-team-grid')).gridTemplateColumns.split(' ').length),3);assert.ok(await premium.evaluate(()=>document.querySelector('#registrationTeams').parentElement.classList.contains('sp-body')));assert.equal(await premium.evaluate(()=>getComputedStyle(document.querySelector('.sp-team-callout h2')).textAlign),'center');assert.equal(await premium.evaluate(()=>getComputedStyle(document.querySelector('.sp-royal-head h2')).textAlign),'center');assert.ok(await premium.evaluate(()=>document.querySelector('.sp-royal-countdown').compareDocumentPosition(document.querySelector('.sp-royal-format'))&Node.DOCUMENT_POSITION_FOLLOWING));
  await premium.evaluate(current=>{const t=window.__snapshot.tournaments.find(t=>t.id===current);t.max_players=35;t.format='classic';window.__snapshot.teams=window.__snapshot.teams.filter(t=>t.tournament_id!==current);window.__snapshot.team_players=window.__snapshot.team_players.filter(tp=>!String(tp.team_id).startsWith('current-team-'));document.querySelector('#publicView').__registrationPresentation.update();},current);assert.equal(await premium.locator('#publicPlayerSelect').isEnabled(),true);
  await premium.evaluate(current=>{const now=new Date();const t=window.__snapshot.tournaments.find(t=>t.id===current);t.tournament_date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');t.registration_deadline=new Date(now.getTime()+60000).toISOString();document.querySelector('#publicView').__registrationPresentation.update();},current);
  await premium.locator('#registrationMeta').filter({hasText:'Aujourd’hui'}).waitFor({timeout:12000});assert.match(await premium.locator('#registrationSummary').innerText(),/Aujourd’hui à/);
  await premium.evaluate(current=>{window.__snapshot.tournaments.find(t=>t.id===current).registration_deadline='2099-09-19T17:00:00Z';document.querySelector('#publicView').__registrationPresentation.update();},current);
  await premium.locator('#publicGuestFields summary').click();await premium.locator('#publicGuestName').fill('Saisie à préserver');
  await premium.evaluate(({current,a,b})=>{const t=window.__snapshot.tournaments.find(t=>t.id===current);t.registration_briefing.general='';t.registration_briefing.observe=false;t.registration_briefing.evening=false;t.registration_briefing.rating=false;window.__snapshot.matches.push({id:'live-check',tournament_id:current,home_team_id:a,away_team_id:b,home_score:0,away_score:0,status:'live'});}, {current,a,b});
  await premium.locator('#registrationLiveLink').waitFor({timeout:12000});assert.equal(await premium.locator('#publicView').getAttribute('data-stage'),'orange');assert.match(await premium.locator('#registrationPhaseCard').innerText(),/0 – 0/);assert.equal(await premium.locator('#publicGuestName').inputValue(),'Saisie à préserver');assert.equal(await premium.locator('#registrationGeneral').isVisible(),false);assert.match(await premium.locator('#registrationMissions').innerText(),/Vérifie les présences/);
  assert.equal(new URL(premium.url()).searchParams.get('s'),'TESTCODE');assert.match(await premium.locator('#registrationLiveLink').getAttribute('href'),new RegExp('tournament='+current));
  await premium.screenshot({path:path.join(screenshotDir,'premium-production-live.png'),fullPage:true});
  await premium.evaluate(current=>{window.__snapshot.tournaments.find(t=>t.id===current).registration_open=false},current);await premium.locator('#publicJoin').waitFor({state:'hidden',timeout:12000});assert.equal(await premium.locator('#publicLeave').isVisible(),true);
  await premium.evaluate(current=>{window.__snapshot.tournaments.find(t=>t.id===current).status='finished'},current);await premium.waitForFunction(()=>document.querySelector('#publicView').dataset.stage==='purple',{timeout:12000});assert.equal(await premium.locator('#publicJoin').isVisible(),false);assert.equal(await premium.locator('#publicPlayerSelect').isVisible(),true);assert.equal(await premium.locator('#publicRegisteredList').isVisible(),true);await premium.close();
  console.log('Personal briefing, empty cards, automatic 0–0 live transition, completed signup and preserved fields: OK');
  await context.close();assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);console.error('Page errors:',errors);server.close();process.exitCode=1});

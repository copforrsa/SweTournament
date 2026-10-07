const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function setup(){
 const dom=new JSDOM('<div id="matchesList"></div>',{runScripts:'outside-only',url:'https://example.test'});
 const w=dom.window;
 w.scrollTo=({left=0,top=0})=>{w.scrollX=left;w.scrollY=top};
 w.S={activeTour:'t',session:{user:{}},tournaments:[{id:'t',status:'open'}],matches:[{id:'m',tournament_id:'t',home_team_id:'h',away_team_id:'a',home_score:1,away_score:0,status:'finished',substitutions:[]}],teams:[{id:'h',name:'Noirs'},{id:'a',name:'Blancs'}],players:[{id:'p',name:'Baptiste'},{id:'q',name:'Andy'},{id:'r',name:'Rémi'},{id:'x',name:'Alex'}],teamPlayers:[{team_id:'h',player_id:'p'},{team_id:'h',player_id:'q'},{team_id:'a',player_id:'x'}],matchAssignments:[],goals:[{id:'g',match_id:'m',team_id:'h',scorer_player_id:'p',assister_player_id:null}],tPlayers:[{tournament_id:'t',player_id:'r',present:true,is_substitute:true}]};
 w.CSS={escape:s=>s};w.toast=()=>{};w.confirm=()=>true;w.currentTour=()=>w.S.tournaments[0];w.canEditCurrentMatches=()=>w.S.tournaments[0].status!=='finished';w.isAdmin=()=>true;
 w.renderMatches=()=>{};w.loadTournament=async()=>{};
 let calls=[];
 w.sb={rpc:async(method,args)=>{calls.push({method,args});const g=w.S.goals[0];if(args.p_action==='edit')g.assister_player_id=args.p_payload.assister_id;return {data:{match:w.S.matches[0],goals:w.S.goals,assignments:w.S.matchAssignments},error:null}}};
 w.eval(fs.readFileSync(path.join(root,'match-engine-v4300.js'),'utf8'));
 w.eval(fs.readFileSync(path.join(root,'quick-match-v4460.js'),'utf8'));
 return {w,dom,calls};
}
test('score rebuild retains scroll position and the Fast Conquête panel',()=>{
 const {w,dom}=setup();
 const panel=w.document.createElement('section');panel.id='fastConquestPanel';
 w.document.getElementById('matchesList').prepend(panel);
 w.scrollTo({left:0,top:650});
 w.S.matches[0].home_score=2;w.renderMatches(false);
 assert.equal(w.scrollY,650);
 assert.equal(w.document.getElementById('fastConquestPanel'),panel);
 assert.equal(w.document.getElementById('matchesList').style.minHeight,'');
 dom.window.close();
});
test('opening the tournament tab starts at top; clicking the same tab preserves position',()=>{
 const dom=new JSDOM('<div class="view active" id="view-matches"></div><div class="view" id="view-tournaments"></div><nav><button class="tab" data-view="tournaments"></button></nav>',{runScripts:'outside-only'});
 const w=dom.window;
 w.S={lastView:'matches',workspaceFeatures:{tournaments_enabled:true},publicMode:true};
 w.isCoorg=()=>false;w.matchMedia=()=>({matches:true});
 w.scrollTo=({top})=>{w.scrollY=top};w.scrollY=900;
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 w.eval(app.slice(app.indexOf('function setView(v){'),app.indexOf('// `start` is an entry intent')));
 w.setView('tournaments');assert.equal(w.scrollY,0);
 assert.equal(w.document.getElementById('view-tournaments').classList.contains('active'),true);
 w.scrollY=450;w.setView('tournaments');assert.equal(w.scrollY,450);
 dom.window.close();
});
test('one scoring entry, finished match editable for administrator; drafts survive full rebuilds',async()=>{
 const {w,dom,calls}=setup();
 assert.equal(w.document.querySelectorAll('.swe4301-goal-form,.swe4360-quick,.swe4303d,.swe4303m,.swe4300-edit').length,0);
 assert.equal(w.document.querySelectorAll('.swe4460-scorer').length,3);
 let select=w.document.querySelector('select[aria-label="Passeur"]');assert.ok(select);
 select.value='q';select.dispatchEvent(new w.Event('change'));
 for(let i=0;i<10;i++){w.SWE_RENDER_MATCHES_4302(false);assert.equal(w.document.querySelector('select[aria-label="Passeur"]').value,'q')}
 // Full realtime replacement must preserve the draft and the visible field.
 w.document.dispatchEvent(new w.CustomEvent('swe:match-remote-final'));
 assert.equal(w.document.querySelector('select[aria-label="Passeur"]').value,'q');
 const b=[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Enregistrer le passeur');await b.onclick();
 await new Promise(r=>setTimeout(r,0));
 assert.equal(calls[0].args.p_action,'edit');assert.equal(calls[0].args.p_payload.assister_id,'q');
 assert.equal(w.S.matches[0].home_score,1);
 assert.match(w.document.querySelector('.swe4460-goal').textContent,/Andy/);
 dom.window.close();
});
test('closed tournament and missing rights remove every editing entry',()=>{
 const {w,dom}=setup();w.isAdmin=()=>false;w.S.tournaments[0].status='finished';w.SWE_RENDER_MATCHES_4302(false);
 assert.equal(w.document.querySelectorAll('.swe4460 button,.swe4460 select').length,0);
 w.S.tournaments[0].status='open';w.canEditCurrentMatches=()=>false;w.SWE_RENDER_MATCHES_4302(false);
 assert.equal(w.document.querySelectorAll('.swe4460 button,.swe4460 select').length,0);dom.window.close();
});
test('substitute appears in quick scoring and recap with own goals and assists',()=>{
 const {w,dom}=setup(),m=w.S.matches[0];m.substitutions=[{out_id:'p',in_id:'r',team_id:'h'}];
 w.S.matchAssignments=[{match_id:'m',player_id:'p',team_id:null},{match_id:'m',player_id:'r',team_id:'h'},{match_id:'m',player_id:'q',team_id:'h'},{match_id:'m',player_id:'x',team_id:'a'}];
 w.S.goals[0].scorer_player_id='r';w.SWE_RENDER_MATCHES_4302(false);
 const scorers=[...w.document.querySelectorAll('.swe4460-scorer')];
 assert.ok(scorers.some(b=>b.textContent.includes('Rémi · Remplaçant')&&b.classList.contains('swe4460-sub')));
 assert.ok(!scorers.some(b=>b.textContent.includes('Baptiste')));
 assert.match(w.document.body.textContent,/Rémi remplace Baptiste.*1 but\(s\), 0 passe\(s\)/);
 dom.window.close();
});
test('failed save preserves draft and permits retry',async()=>{
 const {w,dom}=setup();w.sb.rpc=async()=>({error:{message:'Offline'}});
 const s=w.document.querySelector('select[aria-label="Passeur"]');s.value='q';s.dispatchEvent(new w.Event('change'));
 await [...w.document.querySelectorAll('button')].find(b=>b.textContent==='Enregistrer le passeur').onclick();
 await new Promise(r=>setTimeout(r,0));
 assert.equal(w.document.querySelector('select[aria-label="Passeur"]').value,'q');
 assert.ok(![...w.document.querySelectorAll('button')].find(b=>b.textContent==='Enregistrer le passeur').disabled);
 dom.window.close();
});
test('unchanged refreshes keep score DOM and focus; changes still update the score',()=>{
 const {w,dom}=setup();const field=w.document.querySelector('select[aria-label="Passeur"]');field.focus();
 for(let i=0;i<8;i++){w.SWE_RENDER_MATCHES_4302(false);w.document.dispatchEvent(new w.CustomEvent('swe:match-remote-final'));}
 assert.equal(w.document.querySelector('select[aria-label="Passeur"]'),field);assert.equal(w.document.activeElement,field);
 w.S.matches[0].home_score=3;w.SWE_RENDER_MATCHES_4302(false);assert.match(w.document.querySelector('.swe4300-result').textContent,/3 - 0/);dom.window.close();
});
test('replacement opens beside the outgoing player, with designated substitutes first and other present players available',()=>{
 const {w,dom}=setup();w.S.players.push({id:'other',name:'Aaron'},{id:'absent',name:'Absent'},{id:'waiting',name:'Waiting'},{id:'playing',name:'Playing'});
 w.S.tPlayers.push({tournament_id:'t',player_id:'other',present:true,is_substitute:false},{tournament_id:'t',player_id:'absent',present:false},{tournament_id:'t',player_id:'waiting',present:true,registration_status:'waitlist'},{tournament_id:'t',player_id:'playing',present:true});
 w.S.matches[0].status='live';w.S.matches[0].pitch='A';w.S.matches.push({pitch:'B',id:'othermatch',tournament_id:'t',home_team_id:'third',away_team_id:'fourth',status:'live'});w.S.teamPlayers.push({team_id:'third',player_id:'playing'});w.SWE_RENDER_MATCHES_4302(false);
 w.document.querySelector('button[aria-label="Remplacer Baptiste"]').click();
 const form=w.document.querySelector('.swe4460-subform');assert.equal(form.previousElementSibling.dataset.replacePlayer,'p');
 const options=[...form.querySelector('select').options];assert.deepEqual(options.map(o=>o.value),['','r','other']);assert.match(options[1].textContent,/prioritaire/);
 dom.window.close();
});

test('championship keeps fifteen matches in five rounds, completed scores and selection survive refresh',()=>{
 const {w,dom}=setup();w.S.tournaments[0].name='Conquête';
 w.S.matches=Array.from({length:15},(_,i)=>({id:'m'+i,tournament_id:'t',home_team_id:'h',away_team_id:'a',match_order:i+1,rotation_role:'championship',round_label:'Tour '+(Math.floor(i/3)+1)+' · '+['Carrefour','Mercedes','Boulogne'][i%3],status:i===0?'finished':'scheduled',home_score:i===0?2:0,away_score:0}));
 w.SWE_RENDER_MATCHES_4302(false);
 const groups=w.document.querySelectorAll('.swe4300-round');assert.equal(groups.length,8);
 for(const group of [...groups].slice(0,5))assert.equal(group.querySelectorAll('[role=tab]').length,3);
 const buttons=w.document.querySelectorAll('.swe4300-round [role=tab]');assert.match(buttons[0].textContent,/Carrefour.*2 – 0 ✓/);
 buttons[14].click();assert.ok(w.document.querySelectorAll('.swe4300-round')[4].querySelector('.swe4300-match'));assert.equal(w.document.querySelector('.swe4300-round [aria-selected=true]').textContent,buttons[14].textContent);
 const selected=w.document.querySelector('.swe4300-round [aria-selected=true]');w.SWE_RENDER_MATCHES_4302(false);assert.equal(w.document.querySelector('.swe4300-round [aria-selected=true]'),selected);
 w.document.querySelector('.swe4300-round [role=tab]').click();assert.match(w.document.querySelector('.swe4300-match').className,/finished/);assert.ok(w.document.querySelector('.swe4300-round').querySelector('.swe4300-match'));assert.ok(w.document.querySelector('.swe4300-round [role=tab]').classList.contains('completed'));dom.window.close();
});

test('finished matches are locked for co-managers and editable by admin or super admin',()=>{
 const {w,dom}=setup();w.isAdmin=()=>false;w.SWE_RENDER_MATCHES_4302(false);assert.equal(w.document.querySelectorAll('.swe4460 button,.swe4460 select,.swe4460 input').length,0);
 w.isAdmin=()=>true;w.SWE_RENDER_MATCHES_4302(false);assert.ok(w.document.querySelector('.swe4460 button'));
 w.isAdmin=()=>false;w.S.isSuperAdmin=true;w.SWE_RENDER_MATCHES_4302(false);assert.ok(w.document.querySelector('.swe4460 button'));dom.window.close();
});

test('finishing selects the next unplayed match and opens history after the final match',()=>{
 const {w,dom}=setup();w.S.tournaments[0].name='Conquête';w.S.matches=Array.from({length:3},(_,i)=>({id:'m'+i,tournament_id:'t',home_team_id:'h',away_team_id:'a',match_order:i+1,rotation_role:'championship',round_label:'Tour 1 · '+['Carrefour','Mercedes','Boulogne'][i],status:i===0?'finished':'scheduled',home_score:0,away_score:0}));
 w.SWE_MATCH_COMMON_4302.selectNextMatch(w.S.matches[0]);w.SWE_RENDER_MATCHES_4302(false);assert.match(w.document.querySelector('[role=tab][aria-selected=true]').textContent,/Mercedes/);
 w.S.matches.forEach(m=>m.status='finished');w.SWE_MATCH_COMMON_4302.selectNextMatch(w.S.matches[2]);w.SWE_RENDER_MATCHES_4302(false);assert.ok(w.document.querySelector('.swe4300-finished-tab.active'));dom.window.close();
});

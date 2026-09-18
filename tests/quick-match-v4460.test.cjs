const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function setup(){
 const dom=new JSDOM('<div id="matchesList"></div>',{runScripts:'outside-only',url:'https://example.test'});
 const w=dom.window;
 w.S={activeTour:'t',session:{user:{}},tournaments:[{id:'t',status:'open'}],matches:[{id:'m',tournament_id:'t',home_team_id:'h',away_team_id:'a',home_score:1,away_score:0,status:'finished',substitutions:[]}],teams:[{id:'h',name:'Noirs'},{id:'a',name:'Blancs'}],players:[{id:'p',name:'Baptiste'},{id:'q',name:'Andy'},{id:'r',name:'Rémi'},{id:'x',name:'Alex'}],teamPlayers:[{team_id:'h',player_id:'p'},{team_id:'h',player_id:'q'},{team_id:'a',player_id:'x'}],matchAssignments:[],goals:[{id:'g',match_id:'m',team_id:'h',scorer_player_id:'p',assister_player_id:null}],tPlayers:[{tournament_id:'t',player_id:'r',present:true,is_substitute:true}]};
 w.CSS={escape:s=>s};w.toast=()=>{};w.confirm=()=>true;w.currentTour=()=>w.S.tournaments[0];w.canEditCurrentMatches=()=>w.S.tournaments[0].status!=='finished';w.isAdmin=()=>false;
 w.renderMatches=()=>{};w.loadTournament=async()=>{};
 let calls=[];
 w.sb={rpc:async(method,args)=>{calls.push({method,args});const g=w.S.goals[0];if(args.p_action==='edit')g.assister_player_id=args.p_payload.assister_id;return {data:{match:w.S.matches[0],goals:w.S.goals,assignments:w.S.matchAssignments},error:null}}};
 w.eval(fs.readFileSync(path.join(root,'match-engine-v4300.js'),'utf8'));
 w.eval(fs.readFileSync(path.join(root,'quick-match-v4460.js'),'utf8'));
 return {w,dom,calls};
}
test('one scoring entry, finished match editable for allowed co-manager; drafts survive full rebuilds',async()=>{
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
 const {w,dom}=setup();w.S.tournaments[0].status='finished';w.SWE_RENDER_MATCHES_4302(false);
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

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../team-draw-room-v4455.js'),'utf8');
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
function setup(){
 const w=new JSDOM('<button data-swe-open-draw-room="t">Ouvrir</button>',{runScripts:'outside-only'}).window;
 w.isAdmin=()=>false;w.setTimeout=()=>0;
 const state={tournament_id:'t',can_admin:false,can_vote:true,current_proposal_id:'p2',voters:[{name:'SECRET',decision:'keep'}],proposals:[1,2].map(sequence=>({id:'p'+sequence,sequence,snapshot:{teams:[{name:'Bleus',average_rating:2.5,players:[{name:'Invité',rating_is_estimate:true}]}]}}))};
 const calls=[];let pending;
 w.sb={rpc:async(name,args)=>{calls.push({name,args});if(pending)return new Promise(resolve=>pending.resolve=resolve);return {data:state}}};
 w.eval(source);
 return {w,state,calls,delay(){pending={};return pending}};
}
test('numbered final choice, private voter names, averages and stable selection after read-only refresh',async()=>{
 const {w,state,calls}=setup();w.document.querySelector('button').click();await flush();
 assert.doesNotMatch(w.document.body.textContent,/SECRET/);assert.match(w.document.body.textContent,/Moyenne : 2,50/);assert.match(w.document.body.textContent,/estimation 2,5/);
 w.document.querySelector('[data-swe-proposal="p1"]').click();
 const panel=w.document.querySelector('.swe-room');panel.scrollTop=123;
 w.document.querySelector('[data-swe-refresh]').click();await flush();
 assert.equal(calls.at(-1).name,'team_draw_room_state_v1');
 assert.equal(w.document.querySelector('.swe-room').scrollTop,123);
 assert.match(w.document.querySelector('[data-swe-vote="keep"]').textContent,/proposition 1/);
 state.my_final_choice={proposal_id:'p1',sequence:1,decision:'keep'};
 w.document.querySelector('[data-swe-vote="keep"]').click();await flush();
 assert.equal(calls.at(-1).args.p_proposal_id,'p1');
 assert.match(w.document.body.textContent,/Ton choix enregistré : conserver la proposition 1/);
});
test('a late refresh response cannot reopen a closed room',async()=>{
 const {w,state,delay}=setup();w.document.querySelector('button').click();await flush();
 const pending=delay();w.document.querySelector('[data-swe-refresh]').click();
 w.document.querySelector('[data-swe-close]').click();
 pending.resolve({data:state});await flush();
 assert.equal(w.document.getElementById('sweDrawRoom4453'),null);
});

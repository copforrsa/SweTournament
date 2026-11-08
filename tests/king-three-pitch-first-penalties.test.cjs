'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function harness(){
 const t={id:'tour',format:'king_of_pitch',rotation_mode:'king_of_pitch',tie_break_method:'shifumi_1',
  reserved_pitch_ids:['p1','p2','p3'],king_pitch_id:'p1',middle_pitch_id:'p2',stream_pitch_id:'p3',
  rotation_state:{initialized:true,version:1,team_count:6,active:{king:'m1',middle:'m2',stream:'m3'},
   king_holder_team_id:'a',queue:[],waiting:{king_winners:[],king_losers:[],middle_winners:[],middle_losers:[],stream_winners:[],stream_losers:[],bottom_entries:[]}}};
 const match={id:'m1',tournament_id:'tour',rotation_role:'king',home_team_id:'a',away_team_id:'b',home_score:1,away_score:1,status:'in_progress'};
 const writes=[];
 const state={tournaments:[t],matches:[match],teams:['a','b','c','d','e','f'].map(id=>({id,tournament_id:'tour'})),sportsPitches:[{id:'p1',name:'Carrefour'},{id:'p2',name:'Mercedes'},{id:'p3',name:'Boulogne'}]};
 const db={from(table){
   let data;
   const query={
     update(next){data=next;return query},
     eq(){return query},
     then(resolve){writes.push({table,data});return Promise.resolve({error:null}).then(resolve)}
   };
   return query;
 }};
 const ctx={window:{},S:state,sb:db,document:{dispatchEvent(){}},CustomEvent:class{},Event:class{},renderMatches(){},console};
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync('match-rotation-v4306.js','utf8'),ctx);
 return {t,match,state,writes,engine:ctx.window.SWE_ROTATION_4306};
}

test('first 3-pitch Carrefour draw requires penalties, and cannot silently award home side',async()=>{
 const h=harness();
 await assert.rejects(h.engine.finish(h.match),/KING_FIRST_PENALTIES_REQUIRED/);
 assert.equal(h.writes.length,0,'no match or tournament state can be mutated before the 3-shooter shootout');
});

test('winner of first Carrefour shootout is persisted as first King',async()=>{
 const h=harness();
 const result=await h.engine.finish(h.match,'b');
 assert.equal(result.winner,'b');
 assert.equal(result.loser,'a');
 const matchWrite=h.writes.find(w=>w.table==='matches');
 assert.equal(matchWrite.data.tie_break_winner_team_id,'b');
 assert.equal(matchWrite.data.tie_break_method_used,'penalties_3');
 assert.equal(matchWrite.data.status,'finished');
 assert.equal(h.t.rotation_state.initialized,true);
});

test('later Carrefour draw keeps incumbent King without a new shootout',async()=>{
 const h=harness();
 h.state.matches.unshift({id:'previous',tournament_id:'tour',rotation_role:'king',status:'finished',home_team_id:'a',away_team_id:'b'});
 const result=await h.engine.finish(h.match);
 assert.equal(result.winner,'a');
 const change=h.writes.find(w=>w.table==='matches').data;
 assert.equal(change.tie_break_method_used,'king_retains');
 assert.equal(change.tie_break_winner_team_id,'a');
});

test('the active pitch roles and tie-break UI remain aligned with tournament rules',()=>{
 const rotation=fs.readFileSync('match-rotation-v4306.js','utf8');
 const extras=fs.readFileSync('match-extras-v4306.js','utf8');
 const loader=fs.readFileSync('hotfix-v4244.js','utf8');
 assert.match(rotation,/q\(s,'king_winners'\)\.shift\(\),q\(s,'middle_winners'\)\.shift\(\)/);
 assert.match(rotation,/q\(s,'king_losers'\)\.shift\(\),q\(s,'stream_winners'\)\.shift\(\)/);
 assert.match(rotation,/q\(s,'middle_losers'\)\.shift\(\),q\(s,'stream_losers'\)\.shift\(\)/);
 assert.match(extras,/3 tireurs obligatoires pour désigner le premier Roi/);
 assert.match(extras,/KING_FIRST_PENALTIES_REQUIRED/);
 assert.match(loader,/match-rotation-v4306\.js\?v=5605-king-custom-ties/);
 assert.match(loader,/match-extras-v4306\.js\?v=5603-king-opening-penalties/);
});

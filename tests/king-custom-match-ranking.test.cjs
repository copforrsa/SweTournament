'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../app.js'),'utf8');
const rules=fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20261108084000_king_ignore_custom_future_matches.sql'),'utf8');
const teams=[{id:'A',name:'Carrefour FC'},{id:'B',name:'South Side'}];
const tour={format:'king_of_pitch',rotation_mode:'king_of_pitch',tournament_date:'2026-11-08'};
function match({id,home='A',away='B',hs=2,as=0,pitch='Carrefour',role='king',custom=false,tie=null}){
 return {id,tournament_id:'t',status:'finished',home_team_id:home,away_team_id:away,home_score:hs,away_score:as,pitch,rotation_role:role,king_custom_match:custom,tie_break_winner_team_id:tie};
}
const official=match({id:'official'});
const custom=match({id:'custom',home:'B',away:'A',custom:true,hs:3,as:1});
const decidedTie=match({id:'customTie',hs:1,as:1,custom:true,tie:'B'});
function getArchive(matches){
 const outer=source.indexOf('async function showTournamentHistory(t){');
 const start=source.indexOf('  // Ne jamais attribuer un point pour un match programmé',outer);
 const end=source.indexOf('  const ps=new Map(',start);
 assert.ok(start>outer&&end>start);
 return new Function('t','teams','matches',source.slice(start,end)+'\nreturn stats;')(tour,teams,matches);
}
function getLive(matches){
 const start=source.indexOf('function renderTeamRanking(){');
 const end=source.indexOf("document.querySelectorAll('.rankMode')",start);
 assert.ok(start>=0&&end>start);
 const view={innerHTML:''};
 const make=new Function('S','currentTour','$','esc',source.slice(start,end)+'\nreturn renderTeamRanking;');
 const render=make({teams,matches},()=>tour,()=>view,x=>String(x));
 render();
 return view.innerHTML;
}
function getPublic(matches){
 const start=source.indexOf('    const publicKingFormat=latest.format');
 const end=source.indexOf('    trs.sort(',start);
 assert.ok(start>=0&&end>start);
 return new Function('latest','lteams','lm',source.slice(start,end)+'\nreturn trs;')(tour,teams,matches);
}
test('official Carrefour win gives 4 and custom Carrefour win gives 3 in all standings',()=>{
 const input=[official,custom];
 const archive=getArchive(input),publicRows=getPublic(input),live=getLive(input);
 for(const scores of [archive,publicRows]){
  assert.equal(scores.find(x=>x.id==='A').pts,4);
  assert.equal(scores.find(x=>x.id==='B').pts,3);
 }
 assert.match(live,/4 pts/);
 assert.match(live,/3 pts/);
});
test('custom Shifumi winner gets 3 points, not a 1-point draw',()=>{
 const input=[decidedTie];
 for(const rows of [getArchive(input),getPublic(input)]){
  assert.equal(rows.find(x=>x.id==='B').pts,3);
  assert.equal(rows.find(x=>x.id==='A').pts,0);
  assert.equal(rows.find(x=>x.id==='B').n,0);
 }
 assert.match(getLive(input),/3 pts/);
});
test('custom fixtures cannot block generation of subsequent official rounds',()=>{
 assert.match(rules,/rotation_generated=true and match_order>3\*v_round/);
 assert.match(source,/kingCircuitStarted\(t\)\?Math\.max\(9999,/);
 const extras=fs.readFileSync(path.resolve(__dirname,'../match-extras-v4306.js'),'utf8');
 assert.match(extras,/t\.rotation_mode==='king_of_pitch'&&m\.rotation_generated/);
 const tie=fs.readFileSync(path.resolve(__dirname,'../king-rotation-auto-ui.js'),'utf8');
 assert.match(tie,/match\.king_custom_match&&!match\.rotation_generated\?'custom'/);
 assert.match(source,/const decision=await window\.SWEKingResolveTie/);
});

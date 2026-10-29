'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

// Exercise the same calculation used by the archived results screen,
// rather than duplicating the ranking rules inside the test.
const source=fs.readFileSync(path.resolve(__dirname,'../app.js'),'utf8');
const outer=source.indexOf('async function showTournamentHistory(t){');
const start=source.indexOf('  // Ne jamais attribuer un point pour un match programmé',outer);
const end=source.indexOf('  const ps=new Map(',start);
assert.ok(outer>=0 && start>outer && end>start,'Archived ranking source is present');
const calculate=new Function('t','teams','matches',source.slice(start,end)+'\nreturn stats;');

const teams=['Noirs','Bleus','Blancs','Rouges'].map(name=>({id:name,name}));
const played=[
 ['Noirs','Bleus',2,3,'Carrefour','king'],
 ['Blancs','Rouges',2,3,'Mercedes','stream'],
 ['Bleus','Rouges',7,2,'Carrefour','king'],
 ['Blancs','Noirs',1,3,'Mercedes','stream'],
 ['Bleus','Noirs',2,3,'Carrefour','king'],
 ['Blancs','Rouges',3,1,'Mercedes','stream'],
 ['Noirs','Blancs',6,1,'Carrefour','king'],
 ['Rouges','Bleus',1,3,'Mercedes','stream']
].map(([home_team_id,away_team_id,home_score,away_score,pitch,rotation_role])=>({
 home_team_id,away_team_id,home_score,away_score,pitch,rotation_role,status:'finished'
}));
const planned=[
 {home_team_id:'Noirs',away_team_id:'Bleus',home_score:0,away_score:0,pitch:'Carrefour',rotation_role:'king',status:'scheduled'},
 {home_team_id:'Rouges',away_team_id:'Blancs',home_score:0,away_score:0,pitch:'Mercedes',rotation_role:'stream',status:'scheduled'}
];
test('2026-10-25 King archive: only finished matches count and Carrefour wins pay 4 points',()=>{
 const results=calculate({format:'king_of_pitch',tournament_date:'2026-10-25'},teams,[...played,...planned]);
 assert.deepEqual(results.map(x=>[x.name,x.mj,x.pts,x.bp,x.bc,x.roi]),[
  ['Bleus',4,11,15,8,2],
  ['Noirs',4,11,14,7,2],
  ['Blancs',4,3,7,13,0],
  ['Rouges',4,3,7,15,0]
 ]);
});
test('classic archives stay at 3 points per win; scheduled 0-0 ignored',()=>{
 const results=calculate({format:'classic',tournament_date:'2026-10-25'},teams,[...played,...planned]);
 assert.equal(results.find(x=>x.name==='Bleus').pts,9);
 assert.equal(results.find(x=>x.name==='Bleus').mj,4);
});
test('King archives before rule adoption keep their original 3-point win barème',()=>{
 const results=calculate({format:'king_of_pitch',tournament_date:'2026-10-20'},teams,[...played,...planned]);
 assert.equal(results.find(x=>x.name==='Bleus').pts,9);
});
test('future King tournaments detect king pitch by rotation role even when renamed',()=>{
 const result=calculate({rotation_mode:'king_of_pitch',tournament_date:'2026-11-01'},teams,
 [{home_team_id:'Bleus',away_team_id:'Noirs',home_score:1,away_score:0,pitch:'Terrain A',rotation_role:'king',status:'finished'}]);
 assert.equal(result[0].name,'Bleus');
 assert.equal(result[0].pts,4);
 assert.equal(result[0].roi,1);
});

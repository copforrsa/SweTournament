const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function environment(initialized=true){
 const t={id:'test',rotation_mode:'king_of_pitch',reserved_pitch_ids:['p1','p2','p3'],king_pitch_id:'p1',middle_pitch_id:'p2',stream_pitch_id:'p3',rotation_state:{initialized,team_count:6,active:{king:'first',middle:null,stream:null},king_holder_team_id:'a',queue:[],waiting:{king_winners:[],king_losers:[],middle_winners:['c'],middle_losers:['d'],stream_winners:['e'],stream_losers:['f']}}};
 const m={id:'first',tournament_id:'test',pitch:'Carrefour',rotation_role:'king',status:'scheduled',home_team_id:'a',away_team_id:'b',home_score:0,away_score:0};
 const inserts=[],writes=[];let next=3;
 const S={tournaments:[t],matches:[m],teams:['a','b','c','d','e','f'].map(id=>({id})),sportsPitches:[{id:'p1',name:'Carrefour'},{id:'p2',name:'Mercedes'},{id:'p3',name:'Boulogne'}]};
 const ctx={window:{},S,document:{dispatchEvent(){}},CustomEvent:class{},Event:class{},sb:{from(table){let row=null;const q={select(){return q},eq(){return q},order(){return q},limit(){return Promise.resolve({data:[{match_order:next++}]})},insert(r){row=r;return q},update(r){writes.push({table,row:r});return q},single(){const data={...row,id:'new'+inserts.length};inserts.push(data);return Promise.resolve({data})},then(resolve){return Promise.resolve({error:null}).then(resolve)}};return q}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('match-rotation-v4306.js','utf8'),ctx);return{ctx,t,m,inserts,writes};
}
test('closing repaired Carrefour resumes all three pitches using preserved previous results',async()=>{
 const h=environment();await h.ctx.window.SWE_ROTATION_4306.finish(h.m);
 assert.equal(h.inserts.length,3);assert.deepEqual(h.inserts.map(x=>x.rotation_role),['king','middle','stream']);
 assert.deepEqual(h.inserts.map(x=>[x.home_team_id,x.away_team_id]),[['a','c'],['b','e'],['d','f']]);
 assert.equal(h.writes.filter(x=>x.table==='matches').length,1);assert.equal(h.m.status,'finished');
});
test('uninitialized circuit cannot consume results or mutate matches',async()=>{const h=environment(false);await assert.rejects(h.ctx.window.SWE_ROTATION_4306.finish(h.m),/Lance le circuit/);assert.equal(h.writes.length,0);assert.equal(h.inserts.length,0);});

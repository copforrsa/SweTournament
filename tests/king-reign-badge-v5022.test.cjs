const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{},S:{},document:{readyState:'loading',addEventListener(){}},renderMatches(){},setTimeout(){},console};vm.createContext(ctx);vm.runInContext(fs.readFileSync('match-engine-v4300.js','utf8'),ctx);
const info=(t,m,all)=>JSON.parse(JSON.stringify(ctx.window.SWE_MATCH_COMMON_4302.kingReign(t,m,all,[])));
const tour={id:'t',rotation_mode:'king_of_pitch'};
const match=(i,home,away,hs,as,extra={})=>({id:'m'+i,match_order:i,tournament_id:'t',rotation_role:'king',home_team_id:home,away_team_id:away,home_score:hs,away_score:as,status:'finished',...extra});
test('crown stays with incumbent during live score changes and counts only finished King matches',()=>{
 const first=match(1,'a','b',2,1),middle=match(2,'b','z',4,0,{rotation_role:'middle'}),draw=match(3,'a','c',1,1),live=match(4,'a','d',0,6,{status:'in_progress'});
 assert.deepEqual(info(tour,live,[first,middle,draw,live]),{teamId:'a',count:2});
});
test('new King takes crown and starts a new series after a defeat',()=>{
 const first=match(1,'a','b',2,0),loss=match(2,'a','c',0,1),next=match(3,'c','d',0,0,{status:'in_progress'});
 assert.deepEqual(info(tour,loss,[first,loss,next]),{teamId:'c',count:1});
 assert.deepEqual(info(tour,next,[first,loss,next]),{teamId:'c',count:1});
});
test('history is scoped by tournament, order and terrain; a first live match has zero completed matches',()=>{
 const other=match(0,'a','z',9,0,{tournament_id:'other'}),live=match(1,'a','b',0,0,{status:'scheduled'}),future=match(3,'a','c',4,0);
 assert.deepEqual(info(tour,live,[future,other,live]),{teamId:'a',count:0});
 assert.equal(info(tour,{...live,rotation_role:'middle'},[live]),null);
 assert.equal(info({...tour,rotation_mode:'standard'},live,[live]),null);
});
test('historical badge ignores current throne holder and reload reconstructs same count without mutation',()=>{
 const first=match(1,'a','b',3,0),second=match(2,'a','c',2,1),third=match(3,'a','d',0,3);
 const t={...tour,rotation_state:{king_holder_team_id:'d',active:{king:'m4'}}},rows=[third,second,first],before=JSON.stringify(rows);
 assert.deepEqual(info(t,second,rows),{teamId:'a',count:2});assert.equal(JSON.stringify(rows),before);
 assert.deepEqual(info(t,second,JSON.parse(JSON.stringify(rows))),{teamId:'a',count:2});
});

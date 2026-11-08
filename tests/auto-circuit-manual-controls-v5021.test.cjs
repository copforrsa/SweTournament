const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const start=app.indexOf("$('#addMatch').onclick=async()=>{");
const end=app.indexOf('\n',app.indexOf("$('#roundRobin').onclick=async()=>{",start));
const helpers=app.slice(app.indexOf('function kingCircuitStarted(t){'),start);
const handlers=helpers+app.slice(start,end);
function env(t){const nodes={};for(const id of ['addMatch','roundRobin','homeTeam','awayTeam','pitch','roundLabel'])nodes['#'+id]={value:{homeTeam:'a',awayTeam:'b',pitch:'Carrefour',roundLabel:''}[id]||''};const requests=[],messages=[],prompts=[];const ctx={confirm:msg=>{prompts.push(msg);return true;},$:id=>nodes[id],currentTour:()=>t,isCoorg:()=>false,S:{teams:[{id:'a'},{id:'b'}],matches:[]},toast:s=>messages.push(s),sb:{from:table=>({insert:async row=>{requests.push({table,row});return {error:null}}})}};vm.createContext(ctx);vm.runInContext(handlers,ctx);return{nodes,requests,messages,prompts};}
test('active King circuit confirms custom 3-point match but blocks bulk generation',async()=>{
 const e=env({id:'t',format:'king_of_pitch',rotation_mode:'king_of_pitch',rotation_state:{initialized:true}});
 await e.nodes['#addMatch'].onclick();await e.nodes['#roundRobin'].onclick();
 assert.equal(e.requests.length,1);
 assert.equal(e.requests[0].row.king_custom_match,true);
 assert.ok(e.requests[0].row.match_order>=10000);
 assert.equal(e.prompts.length,1);
 assert.match(e.prompts[0],/3 points/);
 assert.equal(e.messages.length,1);
 assert.match(e.messages[0],/Termine les matchs/);
});
test('manual first matches remain available before circuit launch',async()=>{const e=env({id:'t',format:'king_of_pitch',rotation_mode:'king_of_pitch',rotation_state:{initialized:false}});await e.nodes['#addMatch'].onclick();assert.equal(e.requests.length,1);assert.equal(e.requests[0].row.pitch,'Carrefour');});
test('classic generation retains its existing behavior',async()=>{const e=env({id:'t',format:'classic',rotation_mode:'standard'});await e.nodes['#roundRobin'].onclick();assert.equal(e.requests.length,1);assert.equal(e.requests[0].row.length,1);});

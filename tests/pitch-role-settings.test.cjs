const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{},S:{sportsPitches:[{id:'a',name:'Carrefour'},{id:'b',name:'Mercedes'},{id:'c',name:'Boulogne'}]}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('tournament-pitch-roles.js','utf8'),ctx);
const api=ctx.window.SWEPitchRoles;
const config={king_pitch_id:'a',middle_pitch_id:'b',stream_pitch_id:'c'};
test('three reserved pitches require three distinct roles',()=>{
 assert.equal(api.validate({},['a','b','c'],config).king_pitch_id,'a');
 assert.throws(()=>api.validate({},['a','b','c'],{...config,middle_pitch_id:'a'}));
 assert.throws(()=>api.validate({},['a','b','c'],{...config,middle_pitch_id:null}));
 assert.throws(()=>api.validate({},['a','b','c'],{...config,king_pitch_id:'outside'}));
});
test('one and two pitches remain supported; initialized circuit cannot lose a role',()=>{
 assert.equal(api.validate({},['a'],{king_pitch_id:'a'}).stream_pitch_id,null);
 assert.equal(api.validate({},['a','c'],{king_pitch_id:'a',stream_pitch_id:'c'}).middle_pitch_id,null);
 assert.throws(()=>api.validate({...config,rotation_state:{initialized:true}},['a','c'],{king_pitch_id:'a',stream_pitch_id:'c'}));
});
test('existing match roles take priority, otherwise configured pitch takes priority over labels',()=>{
 const source=fs.readFileSync('match-rotation-v4306.js','utf8').replace('R.getState=t=>stateOf(t);','R.testRole=roleForMatch;R.getState=t=>stateOf(t);');vm.runInContext(source,ctx);
 const role=ctx.window.SWE_ROTATION_4306.testRole;
 const t={...config,reserved_pitch_ids:['a','b','c']};
 assert.equal(role(t,{pitch:'Carrefour'}),'king');
 assert.equal(role(t,{pitch:'Mercedes',rotation_role:'king'}),'king');
 assert.equal(role({...t,king_pitch_id:'b',middle_pitch_id:'a'},{pitch:'Mercedes',round_label:'Intermédiaire'}),'king');
 assert.equal(role(t,{pitch:'Unknown'}),null);
});
test('stale tournament update is rejected and does not update matches or teams',async()=>{
 const touched=[],filters=[];const q={update(p){assert.equal(p.king_pitch_id,'a');return this},eq(...a){filters.push(a);return this},is(...a){filters.push(a);return this},select(){return this},async maybeSingle(){return {data:null,error:null}}};
 ctx.sb={from(table){touched.push(table);return q}};
 const result=await api.update({id:'t',...config,rotation_state:{initialized:true}},config);
 assert.match(result.error.message,/changé/);assert.deepEqual(touched,['tournaments']);assert.ok(filters.some(x=>x[0]==='rotation_state'));
});

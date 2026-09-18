const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};
const source=fs.readFileSync(path.join(__dirname,'../team-draw-room-v4455.js'),'utf8');
async function setup(admin=false){
 const w=new JSDOM('<button data-swe-open-draw-room="t">Open</button>',{runScripts:'outside-only',pretendToBeVisual:true}).window;
 const scheduled=[];w.setTimeout=(fn,ms)=>{scheduled.push({fn,ms});return scheduled.length};w.clearTimeout=()=>{};w.isAdmin=()=>admin;
 let mine=false;const calls=[];
 w.sb={rpc:async(name,args)=>{calls.push({name,args});if(name==='team_draw_room_ready_v1'){if(args.p_ready!==null)mine=args.p_ready;return {data:{mine,admin_ready:true,participants:[{name:'Secret co-manager',ready:true}]}}}
 return {data:{tournament_id:'t',can_admin:admin,can_vote:true,proposals:[{id:'p',sequence:1,snapshot:{teams:[]}}]}}}};
 w.eval(source);w.document.querySelector('button').click();await flush();return {w,scheduled,calls};
}
test('co-manager sees own ready toggle and admin only; heartbeat leaves proposal DOM intact',async()=>{
 const {w,scheduled,calls}=await setup();
 assert.match(w.document.getElementById('sweRoomReadiness').textContent,/Admin : ● Prêt/);
 assert.doesNotMatch(w.document.body.textContent,/Secret co-manager/);
 const proposal=w.document.querySelector('[data-swe-proposal]');
 w.document.querySelector('[data-swe-ready]').click();await flush();
 assert.equal(w.document.querySelector('[data-swe-ready]').getAttribute('aria-pressed'),'true');
 await scheduled.find(x=>x.ms===15000).fn();await flush();
 assert.equal(w.document.querySelector('[data-swe-proposal]'),proposal);
 assert.equal(calls.at(-1).args.p_ready,true);
 w.document.querySelector('[data-swe-close]').click();await flush();
 assert.equal(calls.at(-1).args.p_ready,false);
});
test('admin can see named co-manager readiness',async()=>{
 const {w}=await setup(true);assert.match(w.document.getElementById('sweRoomReadiness').textContent,/Secret co-manager : ● Prêt/);
});

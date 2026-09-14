const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const root=path.join(__dirname,'../supabase/functions');
const source=stripTypeScriptTypes(fs.readFileSync(path.join(root,'_shared/security.ts'),'utf8').replace(/export /g,''))+'\n'+stripTypeScriptTypes(fs.readFileSync(path.join(root,'stripe-create-invite-coorganizer-checkout/index.ts'),'utf8').replace(/^import .*;\n/gm,''));
const id='00000000-0000-4000-8000-000000000001',origin='https://app.swetournament.fr';
function harness({authenticated=true,invite={},env={},rate=true}={}){
 const calls=[];let handler;
 const row={id,workspace_id:id,email:'invitee@example.invalid',role:'coorganizer',accepted_at:null,payment_responsibility:'invitee',payment_status:'pending',...invite};
 const table={select(){return this},eq(){return this},maybeSingle:async()=>({data:row}),update(){return this},insert:async()=>({error:null})};
 const api={auth:{getUser:async()=>({data:{user:authenticated?{id,email:'invitee@example.invalid'}:null},error:authenticated?null:new Error('expired')})},rpc:async()=>({data:rate}),from:()=>table};
 function Stripe(){this.checkout={sessions:{create:async(body,options)=>{calls.push({body,options});return {id:'cs_test_fixture',url:'https://checkout.stripe.com/test-fixture'}}}}}
 vm.runInNewContext(source,{Request,Response,crypto:require('node:crypto').webcrypto,console:{error(){}},Deno:{env:{get:key=>env[key]},serve:fn=>handler=fn},Stripe,createClient:()=>api});
 return {calls,invoke:(body,options={})=>handler(new Request('https://example.invalid/checkout',{method:options.method||'POST',headers:{Origin:options.origin||origin,...(options.auth===false?{}:{Authorization:'Bearer fixture'}),'Content-Type':'application/json'},...(options.method==='OPTIONS'?{}:{body:JSON.stringify(body)})}))};
}
const body={invite_id:id,request_id:id,billing_period:'month'};
test('canonical app preflight works without optional env, unknown origins rejected',async()=>{
 const h=harness();let r=await h.invoke(null,{method:'OPTIONS'});assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),origin);
 r=await h.invoke(null,{method:'OPTIONS',origin:'https://attacker.invalid'});assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);assert.equal(h.calls.length,0);
});
test('only the authenticated invite recipient can subscribe to a pending self-paid invitation',async()=>{
 for(const opts of [{authenticated:false},{invite:{email:'someone-else@example.invalid'}},{invite:{role:'player'}},{invite:{accepted_at:'2026-09-14'}},{invite:{payment_responsibility:'admin'}},{invite:{payment_status:'paid'}},{rate:false}]){
  const h=harness(opts),r=await h.invoke(body);assert.ok(r.status>=400);assert.equal(h.calls.length,0);assert.equal(r.headers.get('access-control-allow-origin'),origin);
 }
 const h=harness();assert.equal((await h.invoke(body,{auth:false})).status,401);assert.equal(h.calls.length,0);
});
test('month/year keep correct prices, subscription metadata, app return, and idempotency',async()=>{
 for(const period of ['month','year']){const h=harness();const r=await h.invoke({...body,billing_period:period});assert.equal(r.status,200);const {body:b,options}=h.calls[0];assert.equal(b.mode,'subscription');assert.equal(b.line_items[0].quantity,1);assert.equal(b.line_items[0].price_data.unit_amount,period==='year'?1990:199);assert.equal(b.metadata.invite_id,id);assert.equal(b.metadata.payer_user_id,id);assert.equal(b.metadata.type,'swe_coorganizer_invitee');assert.equal(b.success_url,origin+'/?coorg_invite=success&invite='+id);assert.equal(options.idempotencyKey,'swe-coorg-invite-'+id+'-'+id)}
 const h=harness();assert.equal((await h.invoke({...body,billing_period:'unknown'})).status,400);assert.equal(h.calls.length,0);
});

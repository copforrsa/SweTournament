const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const root=path.join(__dirname,'../supabase/functions');
const source=stripTypeScriptTypes(fs.readFileSync(path.join(root,'_shared/security.ts'),'utf8').replace(/export /g,''))+'\n'+stripTypeScriptTypes(fs.readFileSync(path.join(root,'stripe-create-coorganizer-checkout/index.ts'),'utf8').replace(/^import .*;\n/gm,''));
const id='00000000-0000-4000-8000-000000000001',origin='https://app.swetournament.fr';
function harness({role='admin',authenticated=true,env={}}={}){
 const calls=[];let handler;
 const member={select(){return this},eq(){return this},maybeSingle:async()=>({data:{role,active:true}}),insert:async()=>({error:null})};
 const api={auth:{getUser:async()=>({data:{user:authenticated?{id,email:'test@example.invalid'}:null},error:authenticated?null:new Error('expired')})},rpc:async()=>({data:true}),from:()=>member};
 function Stripe(){this.checkout={sessions:{create:async(body,options)=>{calls.push({body,options});return {id:'cs_test_fixture',url:'https://checkout.stripe.com/test-fixture'}}}}}
 vm.runInNewContext(source,{Request,Response,crypto:require('node:crypto').webcrypto,console:{error(){}},Deno:{env:{get:key=>env[key]},serve:fn=>handler=fn},Stripe,createClient:()=>api});
 return {calls,invoke:(body,options={})=>handler(new Request('https://example.invalid/checkout',{method:options.method||'POST',headers:{Origin:options.origin||origin,...(options.auth===false?{}:{Authorization:'Bearer fixture'}),'Content-Type':'application/json'},...(options.method==='OPTIONS'?{}:{body:JSON.stringify(body)})}))};
}
test('checkout preflight accepts only the canonical application when optional origin config is absent',async()=>{
 const h=harness();let r=await h.invoke(null,{method:'OPTIONS'});assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),origin);assert.equal(h.calls.length,0);
 r=await h.invoke(null,{method:'OPTIONS',origin:'https://attacker.invalid'});assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);
});
test('checkout preserves admin authentication, quantity, prices and Stripe idempotency without charging',async()=>{
 for(const period of ['month','year']){const h=harness();const r=await h.invoke({workspace_id:id,quantity:2,billing_period:period,request_id:id});assert.equal(r.status,200);const {body,options}=h.calls[0];assert.equal(body.mode,'subscription');assert.equal(body.line_items[0].quantity,2);assert.equal(body.line_items[0].price_data.unit_amount,period==='year'?1990:199);assert.equal(body.success_url,origin+'/?coorg=success');assert.equal(options.idempotencyKey,'swe-coorg-'+id+'-'+id)}
 for(const opts of [{role:'coorganizer'},{authenticated:false}]){const h=harness(opts);const r=await h.invoke({workspace_id:id,quantity:1,request_id:id});assert.equal(r.status,400);assert.equal(h.calls.length,0);assert.equal(r.headers.get('access-control-allow-origin'),origin)}
});

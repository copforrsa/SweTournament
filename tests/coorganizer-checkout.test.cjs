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

test('purchase click opens checkout without confirmation, blocks duplicates and keeps retry idempotency',async()=>{
 const app=fs.readFileSync(path.resolve(__dirname,'../app.js'),'utf8');
 const click=app.slice(app.indexOf("  const purchaseButton=e.target?.closest?.('#homeBuyCoorg');"),app.indexOf("  if(e.target?.id==='endTrialToPay'){"));
 const calls=[],notices=[],button={disabled:false},state={workspace:{id}};let finish;
 const sandbox={S:state,crypto:{randomUUID:()=>id},isAdmin:()=>true,$:()=>({value:'2'}),coorgBillingPeriod:()=> 'year',refreshCoorgPurchasePrice:()=>{},toast:m=>notices.push(m),confirm:()=>{throw Error('Unexpected native confirmation')},location:{href:''},sb:{functions:{invoke:async(name,args)=>{calls.push({name,args});return new Promise(r=>{finish=r})}}}};
 const handler=vm.runInNewContext('(async e=>{'+click+'})',sandbox),event={target:{closest:()=>button}};
 const pending=handler(event);await handler(event);assert.equal(calls.length,1);assert.equal(button.disabled,true);
 finish({error:{context:{json:async()=>({error:'Service momentanément indisponible'})}}});await pending;
 assert.equal(button.disabled,false);assert.equal(notices[0],'Service momentanément indisponible');
 const retry=handler(event);assert.equal(calls[1].args.body.request_id,calls[0].args.body.request_id);assert.equal(calls[1].args.body.billing_period,'year');assert.equal(calls[1].args.body.quantity,2);
 finish({data:{url:'https://checkout.stripe.com/c/pay/test'}});await retry;assert.equal(sandbox.location.href,'https://checkout.stripe.com/c/pay/test');
});

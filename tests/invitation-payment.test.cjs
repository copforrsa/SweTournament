const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const code=app.slice(app.indexOf('    const publicMoney='),app.indexOf('    function renderTeamInvitationDecision()'));
function setup(){
 const box={className:'hidden',style:{},innerHTML:'',isConnected:true},select={value:'alice'},buttons=new Map();
 const context=vm.createContext({
  $:selector=>selector==='#publicPaymentBox'?box:selector==='#publicPlayerSelect'?select:buttons.get(selector)||buttons.set(selector,{}).get(selector),
  publicPaymentCache:{playerId:null,status:null,html:null},publicPaymentSeq:0,publicPaymentLoadingFor:null,
  registrations:[{tournament_id:'tour',player_id:'alice',present:true},{tournament_id:'tour',player_id:'bob',present:true}],
  regTour:{id:'tour',status:'draft',entry_fee_cents:900},token:'public-token',
  sb:{rpc:async name=>({data:name.endsWith('choice_status')?{}:{available:true,entry_fee_cents:900,total_cents:950,payment_status:'unpaid'}})},
  Number,Date,URL,location:{href:'https://example.invalid/'},toast:()=>{}
 });
 vm.runInContext(code,context);
 return {box,select,context,render:()=>context.renderPublicPaymentBox()};
}
test('payment confirmed on site never presents a new checkout',async()=>{
 const p=setup();p.context.sb.rpc=async name=>({data:name.endsWith('choice_status')?{manual_paid_at:'2026-09-12T12:00:00Z'}:{available:true,entry_fee_cents:900}});
 await p.render();assert.match(p.box.innerHTML,/payée sur place/);assert.doesNotMatch(p.box.innerHTML,/<button/);
});
test('onsite preference survives rendering without online checkout buttons',async()=>{
 const p=setup();p.context.sb.rpc=async name=>({data:name.endsWith('choice_status')?{payment_preference:'onsite'}:{available:true,entry_fee_cents:900}});
 await p.render();assert.match(p.box.innerHTML,/Paiement sur place choisi/);assert.doesNotMatch(p.box.innerHTML,/id="publicPayEntry"/);
});
test('deselection invalidates an in-flight payment response',async()=>{
 const p=setup();let finish;p.context.sb.rpc=name=>name.endsWith('choice_status')?Promise.resolve({data:{}}):new Promise(r=>finish=r);
 const first=p.render();p.select.value='';await p.render();finish({data:{available:true,entry_fee_cents:900,total_cents:950}});await first;
 assert.equal(p.box.className,'hidden');assert.equal(p.box.innerHTML,'');
});
test('slow response for a former player cannot replace the selected player',async()=>{
 const p=setup();let finish;p.context.sb.rpc=(name,args)=>name.endsWith('choice_status')?Promise.resolve({data:{}}):args.p_player_id==='alice'?new Promise(r=>finish=r):Promise.resolve({data:{reason:'free',entry_fee_cents:0}});
 const first=p.render();p.select.value='bob';await p.render();finish({data:{available:true,entry_fee_cents:900,total_cents:950}});await first;
 assert.equal(p.box.className,'hidden');assert.equal(p.box.innerHTML,'');
});
test('unknown payment preference fails closed even after a cached checkout',async()=>{
 const p=setup();await p.render();assert.match(p.box.innerHTML,/id="publicPayEntry"/);
 p.context.sb.rpc=async name=>name.endsWith('choice_status')?{error:{message:'Network error'}}:{data:{available:true,entry_fee_cents:900}};
 await p.render();assert.match(p.box.innerHTML,/Statut indisponible/);assert.doesNotMatch(p.box.innerHTML,/<button/);
});
test('legacy modules leave app-owned payment markup untouched',async()=>{
 for(const [file,start,end] of [
  ['hotfix-v4273-payment-ratings-ui.js','async function renderPublicPayment4273(){','function bindPublicPayment'],
  ['hotfix-v4274-payment-rating-admin.js','async function renderPayment(){','function bindPayment'],
  ['hotfix-v4279-payment-authority.js','async function render(force=false){','function installAuthority'],
  ['hotfix-v4266-public-payment-maps.js','async function repairPaymentIfNeeded(){','async function boot()']
 ]){
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8'),box={dataset:{paymentController:'app'},innerHTML:'Paid'};
  const c=vm.createContext({document:{getElementById:()=>box}});vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),c);
  const name=start.match(/function (\w+)/)[1];await assert.doesNotReject(()=>c[name]());assert.equal(box.innerHTML,'Paid');
 }
});

test('missing onsite price does not suppress checkout or invent a price',async()=>{
 const p=setup();await p.render();assert.match(p.box.innerHTML,/id="publicPayEntry"/);assert.match(p.box.innerHTML,/Tarif à confirmer/);
});

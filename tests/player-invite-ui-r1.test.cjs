const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require(process.env.SWE_TEST_JSDOM||'jsdom');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'coorganizer-selfpay-v4308.js'),'utf8');
const id='00000000-0000-4000-8000-000000000001';
const tick=()=>new Promise(r=>setTimeout(r,10));
function harness(rows=[]){
 const dom=new JSDOM('<div id="inviteBox" class="hidden"><h2>Invitation reçue</h2><div id="inviteList"><div id="free-invite">Invitation prise en charge</div></div></div>',{url:'https://app.swetournament.fr/',runScripts:'outside-only'}),w=dom.window;
 const calls=[];let finish;
 w.S={session:{user:{id,email:'invitee@example.invalid'}},workspace:null};w.toast=()=>{};w.isAdmin=()=>false;
 w.sb={rpc:async()=>({data:rows}),functions:{invoke:async(name,args)=>{calls.push({name,args});return new Promise(resolve=>finish=resolve)}}};
 w.eval(source);return {dom,w,calls,finish:value=>finish(value)};
}
test('player without invitation gets no subscription; self-paid and free invitations coexist',async()=>{
 const h=harness();await tick();assert.equal(h.w.document.querySelectorAll('[data-selfpay-period]').length,0);h.dom.window.close();
 const b=harness([{id,workspace_name:'Sunday <script>danger</script>',payment_status:'pending'}]);await tick();
 assert.ok(b.w.document.getElementById('free-invite'));assert.equal(b.w.document.querySelectorAll('[data-selfpay-period]').length,2);assert.equal(b.w.document.querySelector('details').open,false);assert.equal(b.w.document.querySelector('script'),null);assert.match(b.w.document.body.textContent,/profil joueur reste gratuit/);b.dom.window.close();
});
test('checkout prevents duplicates and retains request ID after failure, with a readable error',async()=>{
 const h=harness([{id,workspace_name:'Sunday',payment_status:'pending'}]);await tick();const button=h.w.document.querySelector('[data-selfpay-period="month"]');
 button.click();button.click();assert.equal(h.calls.length,1);assert.ok(button.disabled);
 h.finish({error:{name:'FunctionsFetchError',message:'Failed to send a request to the Edge Function'}});await tick();
 assert.match(h.w.document.querySelector('[role=status]').textContent,/momentanément inaccessible/);assert.equal(button.disabled,false);
 button.click();assert.equal(h.calls[1].args.body.request_id,h.calls[0].args.body.request_id);
 h.finish({error:{context:{json:async()=>({error:'Invitation déjà utilisée'})}}});await tick();assert.match(h.w.document.querySelector('[role=status]').textContent,/Invitation déjà utilisée/);h.dom.window.close();
});
test('compact sections retain input nodes, values, click handlers and open state across rendering',async()=>{
 const dom=new JSDOM('<div id="view-myplayer"><div class="player-hub-hero"><div class="player-hub-title"><h2>Mon profil</h2></div><div id="swePlayerIdentity4321"><input id="swe4321Nick" value="Alex"><button id="swe4321Edit">Modifier</button></div></div><div class="card"><input id="myPlayerPublic" type="checkbox"></div><div id="swe4338Health"></div></div>',{url:'https://app.swetournament.fr/',runScripts:'outside-only'}),w=dom.window;
 w.S={session:{user:{id}},workspace:null,playerDashboard:{profile:{nickname:'Alex'}}};const input=w.document.getElementById('swe4321Nick');let clicks=0;w.document.getElementById('swe4321Edit').onclick=()=>clicks++;
 w.eval(fs.readFileSync(path.join(root,'player-profile-compact.js'),'utf8'));await new Promise(r=>setTimeout(r,200));
 const details=w.document.getElementById('sweCompact-identity');assert.equal(details.open,false);details.open=true;input.value='Updated';w.document.getElementById('swe4321Edit').click();
 w.document.dispatchEvent(new w.Event('swe:player-ui-ready'));await new Promise(r=>setTimeout(r,200));
 assert.equal(w.document.getElementById('swe4321Nick'),input);assert.equal(input.value,'Updated');assert.equal(details.open,true);assert.equal(clicks,1);assert.equal(w.document.querySelectorAll('#sweCompact-identity').length,1);assert.equal(w.document.documentElement.dataset.swePurchaseRole,'player');
 w.S.workspace={role:'admin'};w.document.dispatchEvent(new w.Event('swe:rendered'));await new Promise(r=>setTimeout(r,200));assert.equal(w.document.documentElement.dataset.swePurchaseRole,'admin');dom.window.close();
});

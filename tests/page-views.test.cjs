const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public-history-views-v4363.js'),'utf8');
function page(fetch){
 const nodes=new Map(),listeners={};
 const document={readyState:'loading',body:{appendChild(el){nodes.set(el.id,el)}},getElementById:id=>nodes.get(id),createElement:()=>({style:{},textContent:''}),addEventListener:(name,fn)=>{listeners[name]=fn}};
 const window={};const context=vm.createContext({window,document,fetch,console:{warn(){}},URLSearchParams,location:{pathname:'/',search:'?s=ABC'}});vm.runInContext(source,context);
 return {track:window.SWEPageViews.track,nodes,window,listeners};
}
test('one registration view despite repeated renders, with resolved short-link context',async()=>{
 const calls=[];const p=page(async(_url,request)=>{calls.push(JSON.parse(request.body));return {ok:true,json:async()=>42}});
 await Promise.all([p.track('registration','token','tournament'),p.track('registration','token','tournament')]);
 await p.track('registration','token','tournament');
 assert.equal(calls.length,1);assert.equal(calls[0].p_entity_id,'tournament');assert.equal(calls[0].p_public_token,'token');assert.match(p.nodes.get('swePageViewCount').textContent,/42 vues/);
});
test('late response for previous page cannot overwrite current footer',async()=>{
 let finishFirst;const p=page(async(_url,r)=>JSON.parse(r.body).p_entity_id==='first'?new Promise(resolve=>{finishFirst=resolve}):{ok:true,json:async()=>7});
 const first=p.track('history','token','first');await p.track('history','token','second');finishFirst({ok:true,json:async()=>99});await first;
 assert.match(p.nodes.get('swePageViewCount').textContent,/7 vues/);assert.equal(p.nodes.size,1);
});
test('a failed counter shows an error and can recover',async()=>{
 let good=false;const p=page(async()=>({ok:good,json:async()=>5}));await p.track('registration','token','id');assert.match(p.nodes.get('swePageViewCount').textContent,/indisponible/);good=true;await p.track('registration','token','id');assert.match(p.nodes.get('swePageViewCount').textContent,/5 vues/);
});

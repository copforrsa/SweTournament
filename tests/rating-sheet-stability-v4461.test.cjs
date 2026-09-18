const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
test('background renders preserve rating controls and validation locks the row',async()=>{
 const dom=new JSDOM('<!doctype html><body></body>',{url:'https://example.com/?rate=t1',runScripts:'outside-only'});
 const w=dom.window,timers=[];let loads=0;
 w.setTimeout=fn=>{timers.push(fn);return timers.length};
 w.S={};w.alert=()=>{};
 w.sb={auth:{getSession:async()=>({data:{session:{user:{id:'u1'}}}})},rpc:async name=>{
  if(name==='get_post_tournament_rating_sheet'){loads++;return {data:{session:{status:'open'},teams:[{team_id:'a',team_name:'Bleus',players:[{player_id:'p1',player_name:'Test'},{player_id:'p2',player_name:'Déjà',existing:{rating:3}}]}]}}}
  return {data:[]};
 }};
 w.eval(fs.readFileSync(require('node:path').join(__dirname,'../hotfix-v4278-rating-cooler-president.js'),'utf8'));
 const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
 await flush();timers.splice(0).forEach(fn=>fn());await flush();
 const select=w.document.querySelector('[data-k="cardio"]');assert.ok(select);select.value='5';
 for(let i=0;i<10;i++)w.document.dispatchEvent(new w.Event('swe:rendered'));
 timers.splice(0).forEach(fn=>fn());await flush();
 assert.equal(loads,1);assert.equal(w.document.querySelector('[data-k="cardio"]'),select);assert.equal(select.value,'5');
 const options=w.document.querySelector('[data-k="appreciation"]').textContent;assert.doesNotMatch(options,/[+-]0[,.]/);
 const b=w.document.querySelector('[data-save-rating]');await b.onclick();assert.ok(b.disabled);assert.ok(select.disabled);
 assert.match(b.closest('[data-player]').textContent,/Déjà noté/);
 await flush();
});

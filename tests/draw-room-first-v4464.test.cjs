const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
test('eligible co-manager can enter an empty first-draw room',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../coorganizer-dashboard-v4399.js'),'utf8');
 const fn=source.slice(source.indexOf('function actionState('),source.indexOf('function actionCard('));
 const state=new Function('current',fn+';return actionState;')(()=>({draw_room_first_enabled:true}));
 assert.equal(state({enabled:true,requested:true,eligible:true,total:0,status:'pending'},'team'),'active');
 assert.notEqual(state({enabled:true,requested:true,eligible:false,total:0,status:'pending'},'team'),'active');
});
test('first draw only runs inside room; double clicks do not duplicate it',async()=>{
 const dom=new JSDOM('<button id="smartAutoTeams">Générer</button>',{runScripts:'outside-only'}),w=dom.window;
 w.S={activeTour:'t',tournaments:[{id:'t',status:'draft',draw_room_first_enabled:true}]};w.isAdmin=()=>true;w.setTimeout=()=>0;
 let calls=[],resolveDraw;
 const empty={tournament_id:'t',can_admin:true,first_draw_pending:true,proposals:[],voters:[],max_redraws:3,redraws_used:0};
 w.sb={rpc:async name=>{calls.push(name);if(name==='team_draw_room_redraw_v1')return new Promise(resolve=>resolveDraw=()=>resolve({data:{...empty,first_draw_pending:false,current_proposal_id:'p',proposals:[{id:'p',sequence:1,snapshot:{teams:[{name:'Bleus',players:[]}]}}]}}));return {data:empty}}};
 w.eval(fs.readFileSync(path.join(__dirname,'../team-draw-room-v4455.js'),'utf8'));
 const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
 w.document.querySelector('#smartAutoTeams').click();await flush();
 assert.deepEqual(calls.filter(x=>x!=='team_draw_room_ready_v1'),['team_draw_room_open_v1']);
 const draw=w.document.querySelector('[data-swe-redraw]');assert.match(draw.textContent,/premier tirage/);assert.equal(w.document.querySelector('[data-swe-publish]'),null);
 draw.click();draw.click();assert.equal(calls.filter(x=>x==='team_draw_room_redraw_v1').length,1);assert.equal(w.document.querySelector('[aria-busy="true"]').id,'sweDrawRoom4453');
 resolveDraw();await flush();assert.ok(w.document.querySelector('[data-swe-publish="p"]'));assert.ok(w.document.querySelector('.swe-reveal .swe-team'));
 assert.match(w.document.querySelector('style').textContent,/prefers-reduced-motion/);
});
test('admin room action is first on home and opening links does not generate teams',()=>{
 const dom=new JSDOM('<div id="view-home"><section>Ancien bloc</section></div>',{runScripts:'outside-only'}),w=dom.window;
 w.S={tournaments:[{id:'t',name:'Test',format:'classic',team_review_status:'pending'}]};w.isAdmin=()=>true;w.isCoorg=()=>false;const callbacks=[];w.setTimeout=fn=>{callbacks.push(fn)};
 w.eval(fs.readFileSync(path.join(__dirname,'../team-draw-room-access-v4452.js'),'utf8'));callbacks.splice(0).forEach(fn=>fn());
 assert.equal(w.document.querySelector('#view-home').firstElementChild.id,'sweDrawRoomAdminAccess4452');
 assert.match(w.document.querySelector('#view-home').firstElementChild.textContent,/Actions à réaliser/);
});

const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('Ivory dashboard opens Fast notes despite inactive legacy appreciation request',async()=>{
 const d=new JSDOM('<main><header class="top"><div class="row"><div></div></div></header><div id="view-home"></div></main>',{url:'https://app.swetournament.fr',runScripts:'outside-only'}),w=d.window;
 try{
 const tour={id:'fast',format:'fast_conquest',status:'finished',name:'Fast test'};
 w.S={session:{user:{}},workspace:{id:'ws'},tournaments:[tour],activeTour:'fast',players:[],teams:[],matches:[],tPlayers:[],memberships:[],workspaceFeatures:{}};
 w.isCoorg=()=>true;let opened=null;w.SWE_FAST_CONQUEST={openNotes:id=>{opened=id}};
 w.sb={rpc:async name=>({data:name==='fast_conquest_context'?{can_note:true,notes_open:true,participants:Array.from({length:31},(_,i)=>'p'+i),my_notes:[]}:name==='get_my_coorganizer_tournament_action_progress_v1'?{tournament:tour,rating_action:{selected:false,total:0,done:0,status:'not_started'}}:{}})};
 w.eval(fs.readFileSync('coorganizer-dashboard-v4399.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await new Promise(r=>setTimeout(r,260));
 const b=w.document.querySelector('[data-coorg-action="rating"]');assert(b);assert.equal(b.disabled,false);assert.match(b.closest('article').textContent,/0 \/ 31 joueurs notés/);b.click();assert.equal(opened,'fast');
 }finally{w.close()}
});

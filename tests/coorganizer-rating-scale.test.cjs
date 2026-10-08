const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('co-manager rating displays 7 / 10 for internal 3.5 without changing data',async()=>{
 const d=new JSDOM('<main id="main"><div id="view-home"></div></main>',{runScripts:'outside-only'}),w=d.window;
 try{
 w.isCoorg=()=>true;
 w.S={workspace:{id:'w'},session:{user:{id:'u'}},activeTour:'t',tournaments:[{id:'t',status:'live'}],myLinkedPlayerId:'p',players:[{id:'p',name:'Test'}],skillAggregates:[{player_id:'p',avg_rating:3.5,voter_count:2}],matches:[],matchAssignments:[],tPlayers:[],teams:[],memberships:[],myPermissions:{},workspaceFeatures:{}};
 w.eval(fs.readFileSync('coorganizer-dashboard-v4399.js','utf8'));
 w.document.dispatchEvent(new w.Event('swe:rendered'));
 await new Promise(r=>setTimeout(r,230));
 assert.match(w.document.querySelector('.swe-coorg-note strong').textContent,/7\.0 \/ 10/);
 assert.equal(w.S.skillAggregates[0].avg_rating,3.5);
 }finally{w.close()}
});

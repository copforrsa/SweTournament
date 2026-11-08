'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('presence receives the room state without querying Supabase every second',()=>{
 const s=read('team-draw-room-presence-ui-v5072.js');
 assert.doesNotMatch(s,/\.rpc\(/);
 assert.doesNotMatch(s,/team_draw_room_state_v2/);
 assert.match(s,/addEventListener\('swe:draw-room-state'/);
 assert.match(s,/renderAdmin\(data\)/);
 assert.match(s,/updateClock\(data\)/);
 assert.match(s,/setInterval\([\s\S]*?,1000\)/);
});

test('room fetches at a safe interval, stays up to date after user actions and shares state',()=>{
 const s=read('team-draw-room-salon-v5037.js');
 assert.match(s,/rpc\('team_draw_room_state_v2'/);
 assert.match(s,/CustomEvent\('swe:draw-room-state',\{detail:data\}\)/);
 assert.match(s,/scheduleRefresh\(\)/);
 assert.match(s,/E\('sweDrawRoomV2'\)[\s\S]*?refreshRoom\(\);\},30000\)/);
 assert.match(s,/document\.visibilityState==='visible'&&navigator\.onLine/);
 assert.match(s,/visibilitychange/);
});

test('coorganizer room access cannot trigger overlapping or frequent queries',()=>{
 const s=read('team-draw-room-home-access-v5070.js');
 assert.match(s,/if\(refreshBusy\|\|document\.visibilityState==='hidden'\|\|!navigator\.onLine\)return;/);
 assert.match(s,/Date\.now\(\)-lastRefreshAt<60000/);
 assert.match(s,/refreshBusy=true/);
 assert.match(s,/finally\{refreshBusy=false;\}/);
 assert.match(s,/\},60000\)/);
});

test('the production bundle and browser cache include the corrected presence module',()=>{
 const bundle=read('assets/generated/swe-runtime-r550-part2.js');
 for(const name of ['team-draw-room-home-access-v5070.js','team-draw-room-presence-ui-v5072.js','team-draw-room-v4455.js']){
  const s=read(name);
  assert.ok(bundle.includes('/* SOURCE '+name+' */\n'+s),name+' bundle source is stale');
 }
 assert.match(read('index.html'),/swe-runtime-r550-part2\.js\?v=5601-io-fix/);
 assert.match(read('team-draw-room-v4455.js'),/team-draw-room-salon-v5037\.js\?v=5601-io-fix/);
 assert.match(read('sw.js'),/SW_BUILD='56\.1-draw-room-io-fix'/);
});

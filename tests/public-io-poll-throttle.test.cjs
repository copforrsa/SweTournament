'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('public registration does not overlap costly workspace snapshots',()=>{
 const s=read('app.js');
 assert.match(s,/if\(publicRefreshBusy\)return;/);
 assert.match(s,/publicRefreshBusy=true;/);
 assert.match(s,/finally\{publicRefreshBusy=false;\}/);
 assert.match(s,/window\.__swePublicRegistrationInterval=window\.setInterval\([\s\S]*?,120000\);/);
 assert.match(s,/visibilitychange',window\.__swePublicRegistrationVisibilityHandler/);
 assert.match(s,/document\.visibilityState==='visible'&&navigator\.onLine/);
});

test('live polling updates active matches without repeatedly fetching finished tournaments',()=>{
 const s=read('live.js');
 assert.match(s,/timer=setInterval\([\s\S]*?testMatchId\?5000:30000\);/);
 assert.match(s,/tournamentFinished&&!testMatchId&&Date\.now\(\)-lastSyncAt<300000/);
 assert.match(s,/busy\|\|testActionBusy/);
 assert.match(s,/lastSyncAt=Date\.now\(\)/);
 assert.match(s,/get_public_workspace_snapshot_v2/);
});

test('HTML and service worker invalidate old script caches',()=>{
 assert.match(read('index.html'),/app\.js\?v=560-io-throttle/);
 assert.match(read('live.html'),/live\.js\?v=20261108-io-throttle/);
 assert.match(read('sw.js'),/SW_BUILD='56\.0-public-io-throttle'/);
});

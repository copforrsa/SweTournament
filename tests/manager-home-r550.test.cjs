'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const index=read('index.html');
const app=read('app.js');
const notif=read('organizer-notifications-v54.js');
const requests=read('organizer-pending-requests-v5203.js');
const sw=read('sw.js');
const manifest=JSON.parse(read('assets/generated/swe-bundle-manifest-r550.json'));
test('main shell makes 10 ordered JS requests instead of 61',()=>{
 const scripts=[...index.matchAll(/<script\b[^>]*\bsrc=(["'])(.*?)\1[^>]*><\/script>/g)].map(m=>m[2]);
 assert.equal(scripts.length,10);
 const own=['swe-preapp-r550.js','app.js?v=550-manager-dashboard','swe-runtime-r550-part1.js','swe-runtime-r550-part2.js','swe-runtime-r550-part3.js'];
 for(const name of own)assert.ok(scripts.some(s=>s.includes(name)),name);
 assert.deepEqual(manifest.runtime.map(x=>x.length),[17,17,19]);
 assert.equal(manifest.pre.length,4);
 assert.ok(scripts.findIndex(s=>s.includes('swe-preapp'))<scripts.findIndex(s=>s.includes('app.js?')));
});
test('manager home shows next SWÉ and urgent operations before commercial offers',()=>{
 const home=index.indexOf('id="view-home"');
 const next=index.indexOf('id="homeNextTournamentCard"',home);
 const actions=index.indexOf('id="homeActionCenter"',home);
 const offers=index.indexOf('id="homeSettingsDisclosure"',home);
 assert.ok(home>=0&&home<next&&next<actions&&actions<offers);
 assert.match(index,/id="homeNextTournamentContent"/);
 assert.match(app,/function renderHomeNextTournament\(/);
 assert.match(app,/swe-home-shortcuts-card/);
});
test('manager notifications are separate from homepage and mark read on open',()=>{
 assert.match(index,/id="view-notifications"/);
 assert.match(index,/data-view="notifications"/);
 assert.match(notif,/manager\?E\('sweNotificationsContainer'\)/);
 assert.match(notif,/if\(dedicated&&items\.length\)/);
 assert.match(notif,/sweNotificationsUnreadBadge/);
 assert.doesNotMatch(notif,/root\.prepend\(card\)/);
});
test('pending requests are rendered only when actionable',()=>{
 assert.match(requests,/if\(!rows\.length\)\{box\?\.remove\(\)/);
 assert.match(requests,/homeActionCenter/);
 assert.match(app,/SWERefreshHomeActionCenter/);
});
test('PWA updates do not reload automatically while scoring',()=>{
 assert.match(sw,/SW_BUILD='55\.(?:0-manager-dashboard-single-runtime|1-single-player-navigation|2-merged-player-swes)'/);
 assert.match(app,/sweNewVersionReady550/);
 assert.match(app,/button\.onclick=\(\)=>location\.reload\(\)/);
 assert.doesNotMatch(app,/SW_BUILD_RELOAD_5132/);
});

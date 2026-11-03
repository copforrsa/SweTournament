'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const file=name=>fs.readFileSync(path.resolve(__dirname,'..',name),'utf8');
const cards=file('admin-player-cards-v52.js');
const notifications=file('organizer-notifications-v54.js');
const home=file('index.html');

test('the organizer homepage has no administrative player/withdrawal roster',()=>{
 assert.doesNotMatch(cards,/home\.append\(block\)/);
 assert.doesNotMatch(cards,/\$\('view-home'\)/);
 assert.match(cards,/const view=\$\('view-players'\)/);
 assert.match(cards,/view\.append\(replacement\)/);
 assert.match(cards,/block\.tagName!=='DETAILS'/);
});
test('the administrative player panel is protected, moved and lazy-loaded',()=>{
 assert.match(cards,/s\.workspace\.role!=='admin'/);
 assert.match(cards,/!view\.classList\.contains\('active'\)/);
 assert.match(cards,/admin_player_identity_cards_v52/);
 assert.match(cards,/sweAdminPlayerSearch52/);
 assert.match(home,/id="view-players"/);
});
test('recent withdrawal alerts are available in private player area, not homepage notification card',()=>{
 assert.doesNotMatch(notifications,/\.from\('community_swe_organizer_alerts_v1'\)/);
 assert.match(cards,/\.from\('community_swe_organizer_alerts_v1'\)/);
 assert.match(cards,/sweAdminRecentWithdrawals52/);
 assert.match(notifications,/E\('sweHomeLateWithdrawalsV1'\)\?\.remove\(\)/);
});
test('PWA delivery invalidates the moved panels',()=>{
 assert.match(home,/admin-player-cards-v52\.js\?v=20261103-move-to-players/);
 assert.match(home,/organizer-notifications-v54\.js\?v=20261103-withdrawals-under-player-admin/);
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('historical notifications are never replayed as local push alerts',()=>{
 const ui=read('organizer-notifications-v54.js');
 assert.match(ui,/my_swe_organizer_notifications_v54/);
 assert.match(ui,/sweOrganizerNotificationsListV54/);
 assert.doesNotMatch(ui,/showNotification\(/);
 assert.doesNotMatch(ui,/swe_org_push_notified_v54/);
 const serviceWorker=read('sw.js');
 assert.match(serviceWorker,/showNotification\(/);
 assert.match(serviceWorker,/tag:message\.id\?'swe-'\+message\.id/);
});

test('push service sends only fresh alerts and claims each device delivery once',()=>{
 const fn=read('supabase/functions/swe-push/index.ts');
 assert.match(fn,/Date\.now\(\)-15\*60\*1000/);
 assert.match(fn,/\.gte\("created_at",cutoff\)/);
 assert.match(fn,/\{TTL:300\}/);
 assert.match(fn,/\.insert\(\{notification_id:event\.id,endpoint:sub\.endpoint\}\)/);
 assert.match(fn,/claimError\.code==='23505'/);
 assert.doesNotMatch(fn,/\.upsert\(\{notification_id:/);
 assert.match(fn,/subscriptionsByUser\.get\(String\(event\.recipient_user_id\)\)/);
 assert.match(fn,/for\(let offset=0;offset<eventIds\.length;offset\+=100\)/);
});

test('provisional room assignments cannot notify users before validation',()=>{
 const sql=read('supabase/migrations/20261108080000_swe_push_prevent_provisional_team_alerts.sql');
 assert.match(sql,/coalesce\(v_draw_first,false\) and v_review is distinct from 'approved'/);
 assert.match(sql,/private\.swe_notify_team_assignment_v1\(\)/);
});

test('dispatchers are serialized and browser caches refresh',()=>{
 const workflow=read('.github/workflows/swe-push-dispatch.yml');
 assert.match(workflow,/group: swe-push-dispatch/);
 assert.match(workflow,/cancel-in-progress: false/);
 const bundle=read('assets/generated/swe-runtime-r550-part3.js');
 assert.ok(bundle.includes('/* SOURCE organizer-notifications-v54.js */\n'+read('organizer-notifications-v54.js')));
 assert.match(read('index.html'),/swe-runtime-r550-part3\.js\?v=5605-king-custom-ties/);
 assert.match(read('sw.js'),/SW_BUILD='56\.3-king-custom-3pts'/);
});

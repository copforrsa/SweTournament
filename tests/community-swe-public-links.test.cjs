'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('simple SWÉ creator uses super-admin pitch list and a public link',()=>{
 const page=read('simple-swe-page-v4350.js');
 assert.match(page,/swe4351Terrain"[^>]*><option/);
 assert.match(page,/v\.item\.pitches/);
 assert.match(page,/data-simple-copy/);
 assert.match(page,/swe-public\.html\?swe=/);
 assert.match(page,/showCreatedLink\(data\?\.id,visibility\)/);
});
test('public registration offers name-only guest and account sign-in',()=>{
 const html=read('swe-public.html'),js=read('swe-public.js');
 assert.match(html,/id="guestForm"/);
 assert.match(html,/id="loginForm"/);
 assert.match(js,/public_join_community_swe_guest_v1/);
 assert.match(js,/public_join_community_swe_member_v1/);
});
test('migration enforces rates, capacity, and anonymous role isolation',()=>{
 const sql=read('supabase/migrations/20261103160000_community_swe_public_links_weekend_rates.sql');
 assert.match(sql,/extract\(isodow from v_local\) in \(6,7\) then 500/);
 assert.match(sql,/time '21:30' then 700/);
 assert.match(sql,/for update/);
 assert.match(sql,/revoke all on function public.public_join_community_swe_member_v1\(uuid\) from public,anon,authenticated/);
 assert.match(sql,/guest_names/);
});
test('weekday rates before 21:30 are 10 euros',()=>{assert.match(read('simple-swe-page-v4350.js'),/time>='21:30'\?700:1000/);assert.match(read('supabase/migrations/20261103170000_community_swe_weekday_10eur.sql'),/then 700 else 1000 end;/);});

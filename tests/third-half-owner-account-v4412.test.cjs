const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sql=fs.readFileSync(path.join(root,'supabase/migrations/20260916003000_third_half_owner_account_link_v4412.sql'),'utf8');

test('anonymous cooler owner gets account creation and login choices',()=>{
  assert.match(app,/Créer mon compte gratuitement/);
  assert.match(app,/J’ai déjà un compte/);
  assert.match(app,/Aucun abonnement organisateur n’est nécessaire/);
  assert.match(html,/coolerAccountCard/);
});

test('authentication returns to the original public tournament',()=>{
  assert.match(app,/coolerReturnFromUrl/);
  assert.match(app,/location\.replace\(target\.toString\(\)\)/);
  assert.match(app,/request_my_third_half_owner_link_v1/);
});

test('unlinked identities require organizer approval',()=>{
  assert.match(sql,/auth\.uid\(\)/);
  assert.match(sql,/request_my_group_player_link/);
  assert.match(sql,/revoke all on function public\.request_my_third_half_owner_link_v1\(uuid\) from public,anon/);
  assert.match(sql,/grant execute on function public\.request_my_third_half_owner_link_v1\(uuid\) to authenticated/);
  assert.match(app,/admin_decide_identity_link_request/);
});

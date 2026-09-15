const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('profile save verifies and synchronizes the nickname',()=>{
  const source=read('player-contact-profile-v4321.js');
  assert.match(source,/saved\.nickname/);
  assert.match(source,/playerDashboard\.profile/);
  assert.match(source,/p_nickname:nick\|\|null/);
});

test('three signature football avatars are available to players and super admins',()=>{
  for(const file of ['ballon-feu.webp','ballon-glace.webp','ballon-electricite.webp']){
    assert.ok(fs.statSync(path.join(root,'assets/avatars-v4405',file)).size>10000);
  }
  assert.match(read('football-avatar-picker-v4404.js'),/Ballon Inferno/);
  assert.match(read('forssadmin/admin-player-identity-v4321.js'),/super_admin_set_player_avatar_v1/);
  assert.match(read('forssadmin/admin-player-identity-v4321.js'),/getElementById\('playersBody'\)/);
  assert.doesNotMatch(read('forssadmin/admin-player-identity-v4321.js'),/querySelector\('#content table'\)/);
});

test('ranking controls use a forced hidden state and WhatsApp direct link',()=>{
  const source=read('navigation-ranking-r9.js');
  assert.match(source,/\.rank\[hidden\]\{display:none!important\}/);
  assert.match(source,/https:\/\/wa\.me\/\?text=/);
  assert.match(source,/style\.setProperty\('display'/);
});

test('premium visuals use the selected tournament data',()=>{
  const source=read('ranking-premium-visuals-v4405.js');
  assert.match(source,/rankingTournamentId/);
  assert.match(source,/m\.tournament_id/);
  assert.match(source,/querySelectorAll\('\.rank'\)/);
  assert.match(source,/navigator\.share/);
});

test('super admin photo functions enforce platform authorization',()=>{
  const sql=read('supabase/migrations/20260915104500_super_admin_player_photos_v4405.sql');
  assert.match(sql,/private\.is_platform_super_admin\(\)/);
  assert.match(sql,/revoke all on function public\.super_admin_set_player_avatar_v1/);
  assert.match(sql,/to authenticated/);
});

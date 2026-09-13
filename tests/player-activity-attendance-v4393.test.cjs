const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(root,'player-activity-attendance-v4393.js'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260913223000_player_activity_attendance_v4393.sql'),'utf8');

test('evaluation dashboard counts members and guests with one denominator',()=>{
  assert.match(js,/const players=\(s\.players\|\|\[\]\)\.slice\(\)/);
  assert.ok(js.includes("+r.count+'</b> / '+players.length+"));
  assert.match(js,/membres \+ invités/);
  assert.match(js,/Guest de/);
  assert.match(js,/r\.missing\.length/);
  assert.match(js,/get_admin_evaluation_progress_v1/);
  assert.match(js,/evalProgressWorkspace/);
  assert.match(js,/stableEvaluationHtml/);
  assert.ok(js.includes("+pct+' %</strong>"));
});

test('attendance controls are admin-only and publish delay incidents',()=>{
  assert.match(js,/admin_set_tournament_attendance_v1/);
  assert.match(js,/Seul l’administrateur confirme les présences/);
  assert.match(js,/Retard annoncé/);
  assert.match(migration,/not private\.is_workspace_admin\(t\.workspace_id\)/);
  assert.match(migration,/perform private\.recalculate_tournament_substitute_flags/);
});

test('automatic inactivity waits for four finished missed tournaments',()=>{
  assert.match(migration,/select count\(\*\)=4/);
  assert.match(migration,/t\.status='finished'/);
  assert.match(migration,/automatic_missed_4/);
  assert.match(migration,/after update of status on public\.tournaments/);
});

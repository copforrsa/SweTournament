const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const presentation=fs.readFileSync(path.join(root,'registration-presentation.js'),'utf8');
const css=fs.readFileSync(path.join(root,'registration-presentation.css'),'utf8');
const sql=fs.readFileSync(path.join(root,'supabase/migrations/20260916130000_public_third_half_participation_flow_v4419.sql'),'utf8');

test('registration follows the practical player sequence',()=>{
  for(const id of ['registrationIdentityStep','registrationAttendanceStep','registrationGuestsStep','registrationThirdHalfStep','registrationStatsStep'])assert.match(presentation,new RegExp(id));
  assert.ok(presentation.indexOf("flow.append(identityStep,attendanceStep,guestsStep,thirdHalfStep,statsStep)")>-1);
  assert.match(presentation,/Oui, j’ai des invités/);
  assert.match(presentation,/Non, je viens seul/);
  assert.match(css,/\.sp-registration-flow/);
  assert.match(css,/\.sp-flow-step\.is-current/);
});

test('co-manager access stays secondary and collapsed',()=>{
  assert.match(presentation,/<summary>Accès co-gestionnaire<\/summary>/);
  assert.match(presentation,/let open=false/);
});

test('ordinary registrants can save a third-half answer without an account',()=>{
  assert.match(app,/Participeras-tu à la 3e mi-temps/);
  assert.match(app,/J’apporte quelque chose/);
  assert.match(app,/save_public_third_half_participation_v1/);
  assert.match(app,/get_public_third_half_participation_v1/);
  assert.match(sql,/third_half_participating boolean/);
  assert.match(sql,/w\.public_token = p_token/);
  assert.match(sql,/tp\.present = true/);
  assert.match(sql,/grant execute on function public\.save_public_third_half_participation_v1[\s\S]*to anon, authenticated/);
  assert.match(sql,/revoke all on function public\.save_public_third_half_participation_v1[\s\S]*from public, anon, authenticated/);
});

test('an unsaved third-half contribution choice survives background renders',()=>{
  assert.match(app,/rememberPreferenceDraft\(\{contribution_mode:input\.value\}\)/);
  assert.match(app,/rememberPreferenceDraft\(\{contribution_amount_cents:Number\(preferenceAmount\.value\|\|0\)\}\)/);
  assert.match(app,/rememberPreferenceDraft\(\{contribution_item:preferenceItem\.value\|\|''\}\)/);
});

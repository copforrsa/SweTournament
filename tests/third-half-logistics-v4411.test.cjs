const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const sql=fs.readFileSync(path.join(root,'supabase/migrations/20260915230000_third_half_logistics_v4411.sql'),'utf8');

test('public refresh avoids rebuilding unchanged registration blocks',()=>{
  assert.match(app,/function setStableHtml\(el,html\)/);
  assert.match(app,/setStableHtml\(box,[\s\S]*Participation/);
  assert.match(app,/setStableHtml\(list,listRows/);
  assert.match(app,/setStableHtml\(wlist,waitRows\)/);
  assert.match(app,/const thirdHalfHtml='<div class="third-half-registration-head/);
  assert.match(app,/setStableHtml\(box,thirdHalfHtml\)/);
});

test('cooler owner configures a contribution and delegates required logistics',()=>{
  assert.match(app,/Ta participation personnelle/);
  assert.match(app,/Qui apporte quoi/);
  assert.match(app,/Au moins 12 bières/);
  assert.match(app,/save_my_third_half_plan_v1/);
  assert.match(css,/\.third-half-task-grid/);
  assert.match(sql,/responsible_contribution_mode/);
  assert.match(sql,/logistics_assignments/);
  assert.match(sql,/'beers'.*'quantity', 12/s);
});

test('cooler heading has a clear premium hierarchy and identifies its owner',()=>{
  assert.match(app,/third-half-head-icon/);
  assert.match(app,/ORGANISATION • 3E MI-TEMPS/);
  assert.match(app,/Boissons, glaçons et missions : tout est organisé ici/);
  assert.match(app,/Responsable désigné/);
  assert.match(app,/third-half-owner-avatar/);
  assert.match(css,/\.third-half-registration-head[^{]*\{[^}]*border-top:4px solid #f0b429/);
  assert.match(css,/@media\(max-width:700px\)[^{]*\{[^}]*\.cooler-package-grid[\s\S]*\.third-half-registration-head\{display:grid/);
});

test('only the linked responsible account may save the logistics plan',()=>{
  assert.match(sql,/gp\.user_id = auth\.uid\(\)/);
  assert.match(sql,/Chaque mission doit être confiée à un joueur inscrit/);
  assert.match(sql,/revoke all on function public\.save_my_third_half_plan_v1[\s\S]*from public, anon, authenticated/);
  assert.match(sql,/grant execute on function public\.save_my_third_half_plan_v1[\s\S]*to authenticated/);
});

test('admin assigns cooler and ice to members or non-members while payment requires registration',()=>{
  const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260916150000_admin_third_half_assignments_v4422.sql'),'utf8');
  assert.match(app,/admin_get_third_half_assignments_v1/);
  assert.match(app,/admin_save_third_half_assignments_v1/);
  assert.match(app,/Responsable de la glacière/);
  assert.match(app,/Responsable des glaçons/);
  assert.match(app,/Non-membre/);
  assert.match(app,/gérera la glacière hors plateforme/);
  assert.match(migration,/p\.workspace_id = v_workspace and p\.active = true/);
  assert.match(migration,/responsible_registered/);
  assert.match(migration,/payment_link = case when v_responsible_changed or not v_registered then null/);
  assert.match(migration,/'can_manage',[\s\S]*owner_tp\.present = true/);
});

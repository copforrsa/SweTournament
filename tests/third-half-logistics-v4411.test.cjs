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

test('only the linked responsible account may save the logistics plan',()=>{
  assert.match(sql,/gp\.user_id = auth\.uid\(\)/);
  assert.match(sql,/Chaque mission doit être confiée à un joueur inscrit/);
  assert.match(sql,/revoke all on function public\.save_my_third_half_plan_v1[\s\S]*from public, anon, authenticated/);
  assert.match(sql,/grant execute on function public\.save_my_third_half_plan_v1[\s\S]*to authenticated/);
});

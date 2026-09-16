const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const sql=fs.readFileSync(path.join(root,'supabase/migrations/20260915230000_third_half_logistics_v4411.sql'),'utf8');
const rolesSql=fs.readFileSync(path.join(root,'supabase/migrations/20260916153000_admin_third_half_roles_v4423.sql'),'utf8');

test('public refresh avoids rebuilding unchanged registration blocks',()=>{
  assert.match(app,/function setStableHtml\(el,html\)/);
  assert.match(app,/setStableHtml\(box,[\s\S]*Participation/);
  assert.match(app,/setStableHtml\(list,listRows/);
  assert.match(app,/setStableHtml\(wlist,waitRows\)/);
  assert.match(app,/const thirdHalfHtml='<div class="third-half-registration-head/);
  assert.match(app,/setStableHtml\(box,thirdHalfHtml\)/);
  assert.match(app,/let publicSnapshotSignature=''/);
  assert.match(app,/if\(nextSignature===publicSnapshotSignature\)/);
  assert.match(app,/\},30000\);/);
});

test('render notifications do not restart the interface after every click',()=>{
  const stability=fs.readFileSync(path.join(root,'ui-stability-v4234.js'),'utf8');
  assert.match(stability,/const wrapped=function\(\.\.\.args\)\{const out=original\.apply\(this,args\);dispatchRendered\(\);return out;\}/);
  assert.match(stability,/renderDispatchTimer=setTimeout/);
  assert.match(stability,/swe-coorg-dashboard4399/);
  assert.doesNotMatch(stability,/document\.addEventListener\('click'/);
  assert.doesNotMatch(stability,/function boot\(\)\{wrapRenderAll\(\);dispatchRendered\(\);\}/);
});

test('payment owner configures a contribution while admin owns logistics',()=>{
  assert.match(app,/Ta participation personnelle/);
  assert.doesNotMatch(app,/id="publicCoolerTaskCooler"/);
  assert.match(app,/Au moins 12 bières/);
  assert.match(app,/save_my_third_half_plan_v1/);
  assert.match(css,/\.third-half-public-plan-grid/);
  assert.match(sql,/responsible_contribution_mode/);
  assert.match(sql,/logistics_assignments/);
  assert.match(sql,/'beers'.*'quantity', 12/s);
});

test('cooler heading has a clear premium hierarchy and identifies its owner',()=>{
  assert.match(app,/third-half-head-icon/);
  assert.match(app,/ORGANISATION • 3E MI-TEMPS/);
  assert.match(app,/Boissons, glaçons et missions : tout est organisé ici/);
  assert.match(app,/Lien de participation/);
  assert.match(app,/third-half-owner-avatar/);
  assert.match(css,/\.third-half-registration-head[^{]*\{[^}]*border-top:4px solid #f0b429/);
  assert.match(css,/@media\(max-width:700px\)[^{]*\{[^}]*\.cooler-package-grid[\s\S]*\.third-half-registration-head\{display:grid/);
});

test('only the linked payment owner saves a contribution without overwriting admin logistics',()=>{
  assert.match(rolesSql,/gp\.user_id = auth\.uid\(\)/);
  assert.match(rolesSql,/Ce profil n’est pas autorisé à gérer le lien/);
  assert.match(rolesSql,/revoke all on function public\.save_my_third_half_plan_v1[\s\S]*from public, anon, authenticated/);
  assert.match(rolesSql,/grant execute on function public\.save_my_third_half_plan_v1[\s\S]*to authenticated/);
  const ownerPlan=rolesSql.match(/create or replace function public\.save_my_third_half_plan_v1[\s\S]*?revoke all on function public\.admin_get_third_half_assignments_v1/)?.[0]||'';
  assert.doesNotMatch(ownerPlan,/logistics_assignments\s*=/);
});

test('admin independently assigns cooler, ice and payment owner',()=>{
  assert.match(app,/admin_get_third_half_assignments_v1/);
  assert.match(app,/admin_save_third_half_assignments_v2/);
  assert.match(app,/Qui apporte la glacière/);
  assert.match(app,/Qui apporte les glaçons/);
  assert.match(app,/Qui met son lien de paiement/);
  assert.match(app,/Non-membre/);
  assert.match(app,/paiement sera géré hors plateforme/);
  assert.match(rolesSql,/p_payment_player_id uuid/);
  assert.match(rolesSql,/'payment_player_id', f\.responsible_player_id/);
  assert.match(rolesSql,/logistics_assignments #>> '\{cooler,player_id\}'/);
  assert.match(rolesSql,/p\.workspace_id = v_workspace and p\.active = true/);
  assert.match(rolesSql,/payment_responsible_registered/);
  assert.match(rolesSql,/payment_link = case when v_payment_player_changed or not v_payment_registered then null/);
});

test('players always see the planned cooler organization',()=>{
  assert.match(app,/aria-label="Organisation prévue"/);
  assert.match(app,/Visible par tous les joueurs/);
  assert.match(app,/LIEN DE PARTICIPATION/);
  assert.match(app,/Gestion hors plateforme/);
  assert.doesNotMatch(app,/Voir l’organisation prévue/);
});

test('the group can see announced donations and the visible pool',()=>{
  const publicContributions=fs.readFileSync(path.join(root,'supabase/migrations/20260916170000_third_half_public_contributions_v4427.sql'),'utf8');
  const acceptedContributions=fs.readFileSync(path.join(root,'supabase/migrations/20260916171000_accept_extended_third_half_contributions_v4428.sql'),'utf8');
  assert.match(app,/get_public_third_half_contributions_v1/);
  assert.match(app,/CAGNOTTE ANNONCÉE/);
  assert.match(app,/Ce que le groupe apporte/);
  assert.match(app,/Voir les '\+\(donors\.length-4\)\+' autres contributions/);
  assert.match(app,/beers_3.*3 bières/);
  assert.match(app,/ti_punch.*Du ti-punch/);
  assert.match(app,/amuse-gueules/);
  assert.match(publicContributions,/money_pool_cents/);
  assert.match(publicContributions,/beers_3/);
  assert.match(publicContributions,/ti_punch/);
  assert.match(acceptedContributions,/save_public_third_half_participation_v1/);
  assert.match(acceptedContributions,/beers_3/);
  assert.match(acceptedContributions,/fruits/);
});

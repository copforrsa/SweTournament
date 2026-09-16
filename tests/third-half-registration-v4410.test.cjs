const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sql=fs.readFileSync(path.join(root,'supabase/migrations/20260915160000_third_half_registration_owner_v4410.sql'),'utf8');

test('the registration page owns the cooler contribution flow',()=>{
  assert.match(app,/id="publicThirdHalfRegistration"/);
  assert.match(app,/get_public_third_half_registration_v2/);
  assert.match(app,/save_my_third_half_payment_link_v1/);
  assert.match(app,/Participer à la glacière/);
  assert.match(app,/Math\.min\(500/);
  assert.match(html,/tourCoolerSuggested" type="number" min="0" max="5"/);
});

test('the payment link draft survives refreshes and reports validation inline',()=>{
  assert.match(app,/let publicThirdHalfPaymentDraft=null/);
  assert.match(app,/publicThirdHalfPaymentDraft\?\.dirty/);
  assert.match(app,/keepPaymentEditor/);
  assert.match(app,/id="publicCoolerProvider" required/);
  assert.match(app,/id="publicCoolerLinkStatus"/);
  assert.match(app,/Le lien saisi est conservé/);
  assert.match(app,/data\?\.saved!==true/);
  assert.match(app,/Lien enregistré\. Il est maintenant visible par les autres inscrits/);
});

test('only the selected linked player can configure a fixed HTTPS payment link',()=>{
  assert.match(sql,/responsible_player_id uuid references public\.players/);
  assert.match(sql,/gp\.user_id = auth\.uid\(\)/);
  assert.match(sql,/v_amount < 50 or v_amount > 500/);
  assert.match(sql,/lower\(v_link\) !~ '\^https:\/\//);
  assert.match(sql,/revoke all on function public\.save_my_third_half_payment_link_v1/);
  assert.match(sql,/grant execute on function public\.save_my_third_half_payment_link_v1[\s\S]*to authenticated/);
});

test('complex packs are exposed without internal pricing data',()=>{
  assert.match(sql,/'packages', coalesce/);
  assert.match(sql,/'public_price_cents', p\.public_price_cents/);
  const publicFunction=sql.split('create or replace function public.get_public_third_half_registration_v1')[1];
  assert.ok(publicFunction);
  assert.doesNotMatch(publicFunction.split('create or replace function public.save_my_third_half_payment_link_v1')[0],/internal_cost_cents/);
});

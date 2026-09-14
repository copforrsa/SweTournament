const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const reconcile=fs.readFileSync(path.join(root,'supabase/functions/stripe-reconcile-invite-coorganizer/index.ts'),'utf8');
const webhook=fs.readFileSync(path.join(root,'supabase/functions/stripe-coorganizer-webhook/index.ts'),'utf8');
const client=fs.readFileSync(path.join(root,'coorganizer-selfpay-v4308.js'),'utf8');
const css=fs.readFileSync(path.join(root,'player-home.css'),'utf8');

test('reconciliation verifies the authenticated recipient and a paid active Stripe subscription',()=>{
 assert.match(reconcile,/admin\.auth\.getUser\(token\)/);
 assert.match(reconcile,/inv\.email[\s\S]*user\.email/);
 assert.match(reconcile,/subscriptions\.search/);
 assert.match(reconcile,/eligible\.has\(s\.status\)/);
 assert.match(reconcile,/s\.payment_status==='paid'/);
 assert.match(reconcile,/activate_paid_coorganizer_invite/);
});
test('client auto-recovers pending payments and invitation action is green',()=>{
 assert.match(client,/stripe-reconcile-invite-coorganizer/);
 assert.match(client,/preferred_billing_period/);
 assert.match(client,/background:linear-gradient\(120deg,#16834f,#20a566\)/);
 assert.match(css,/#inviteBox \.primary[\s\S]*#16834f/);
});
test('webhook resumes failed ledger entries and accepts asynchronous payment success',()=>{
 assert.match(webhook,/processing_status==='processed'/);
 assert.match(webhook,/processing_status:'processing',processed_at:null,last_error:null/);
 assert.match(webhook,/checkout\.session\.async_payment_succeeded/);
});

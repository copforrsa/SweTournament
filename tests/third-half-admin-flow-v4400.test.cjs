const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const rolesSql = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260918120000_require_registered_third_half_payment_owner_v4400.sql'),
  'utf8',
);

assert.match(app, /<h3>👥 Inscriptions<\/h3>/, 'the registration section is labelled');
assert.match(app, /<h3>⚽ Organisation du match<\/h3>/, 'the match section is labelled');
assert.match(app, /<h3>🧊 Glacière &amp; 3e mi-temps<\/h3>/, 'the cooler section is labelled');
assert.match(app, /<summary><span>Actions après le tournoi<\/span>/, 'post-tournament actions use a discreet disclosure');

for (const role of [
  'Qui apporte la glacière ?',
  'Qui apporte les glaçons ?',
  'Qui met son lien de paiement ?',
]) assert.match(app, new RegExp(role.replace('?', '\\?')), `missing distinct role: ${role}`);

assert.match(app, /paymentCandidates=candidates\.filter\(p=>registeredIds\.has/, 'payment owners are selected from registered players');
assert.match(app, /admin_save_third_half_assignments_v2/, 'the three assignments use the persisted RPC');
assert.match(app, /await loadAll\(\);toast\(data\?\.payment_responsible_registered/, 'assignments are reloaded after save');
assert.match(rolesSql, /raise exception 'Le responsable du lien doit être inscrit au tournoi'/, 'registration is enforced server-side');

assert.match(app, /type="url"[^>]+placeholder="https:\/\/\.\.\."/, 'the player editor asks for an HTTPS URL');
assert.match(app, /state\.payment_link_ready&&state\.payment_link/, 'the payment link is only shared when activated');
assert.match(app, /\[50,100,150,200,250,300,350,400,450,500\]/, 'the player amount remains capped at five euros');

assert.match(css, /@media\(max-width:720px\)/, 'the flow has a mobile layout');
assert.match(css, /\.tournament-cooler-role-grid\{grid-template-columns:1fr!important\}/, 'roles stack on mobile');

console.log('third-half admin flow tests: ok');

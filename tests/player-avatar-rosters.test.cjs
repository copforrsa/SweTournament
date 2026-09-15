const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('player avatars are rendered in registration and team composition lists', () => {
  assert.match(app, /function playerAvatarHtml\(pl,size='sm'\)/);
  assert.match(app, /d\.innerHTML='<b style="min-width:28px">'.*playerAvatarHtml\(pl\)/s);
  assert.match(app, /r\.innerHTML=playerAvatarHtml\(pl\)/);
  assert.match(app, /public-team-player swe-player-with-avatar/);
  assert.match(css, /\.swe-player-avatar-sm\{width:42px;height:42px\}/);
});

test('the premium group collection contains one optimized avatar per active member', () => {
  const dir = path.join(root, 'assets', 'group-avatars-v4409');
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.webp'));
  assert.equal(files.length, 41);
  for (const file of files) {
    assert.ok(fs.statSync(path.join(dir, file)).size > 10_000, `${file} is unexpectedly small`);
  }
});

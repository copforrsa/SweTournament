const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const engine = fs.readFileSync(path.join(root, 'match-engine-v4300.js'), 'utf8');
const refresh = fs.readFileSync(path.join(root, 'match-refresh-coorg-v4458.js'), 'utf8');
const quick = fs.readFileSync(path.join(root, 'quick-match-v4460.js'), 'utf8');
const extras = fs.readFileSync(path.join(root, 'match-extras-v4306.js'), 'utf8');
const permissions = fs.readFileSync(path.join(root, 'supabase/quick-match-permissions-v4472.sql'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'hotfix-v4244.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const remount = 'window.SWE_MOUNT_MATCH_EXTRAS_4306?.(true)';

assert.match(engine, /finally\{[\s\S]*renderStableMatches\(false\);[\s\S]*SWE_MOUNT_MATCH_EXTRAS_4306/,
  'a mobile/remote hydration must rebuild the launch counter');
assert.ok(engine.split(remount).length >= 3,
  'both hydration and ordinary stable rendering must rebuild the launch counter');
assert.match(refresh, /renderMatches\(\);[\s\S]*SWE_MOUNT_MATCH_EXTRAS_4306\?\.\(true\)/,
  'the desktop targeted refresh must rebuild the launch counter');
assert.ok(loader.includes('/match-engine-v4300.js?v=4472'),
  'the corrected match engine must use a fresh browser cache key');
assert.ok(index.includes('match-refresh-coorg-v4458.js?v=4472'),
  'the corrected desktop refresh must use a fresh browser cache key');
assert.match(engine, /swe4300-pitch-tabs[\s\S]*role','tablist'/,
  'matches must expose one accessible tab per pitch/match');
assert.match(engine, /box\.appendChild\(buildCard\(selected,rows\.indexOf\(selected\)\)\)/,
  'only the selected match must be rendered');
assert.ok(extras.includes("b.textContent='🏁 Terminer le match'"),
  'the rotation action must expose the finish-match button');
assert.match(quick, /if\(String\(m\.status\)==='finished'\)return groupAdmin\(\)/,
  'finished matches must only be editable by the group admin in the workspace UI');
assert.match(permissions, /m\.status='finished' and not \(is_super or is_operational_admin\)/,
  'the database must reject co-manager corrections on finished matches');
assert.match(permissions, /t\.status='finished' and not is_super/,
  'only the platform super admin may edit after tournament closure');

console.log('king launch refresh v4471: ok');

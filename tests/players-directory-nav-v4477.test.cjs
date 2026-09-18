const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'players-directory-nav-v4477.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'hotfix-v4244.js'),'utf8');

assert.match(source,/swe4477PlayerAlphabet/,'the player list must expose an alphabetical directory');
assert.match(source,/avatar_url/,'the directory must use the player profile photo');
assert.match(source,/swe4477-player-name/,'player names must receive the prominent name style');
assert.match(source,/scrollIntoView\(\{behavior:'smooth',block:'center'\}\)/,'alphabet navigation must jump to the selected player');
assert.ok(loader.includes("players-directory-nav-v4477.js?v=4477"),'the directory enhancement must load in the app');
console.log('players directory nav v4477: ok');

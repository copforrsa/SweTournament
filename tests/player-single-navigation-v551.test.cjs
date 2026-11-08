'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const nav=read('navigation-spaces.js');
const home=read('player-home.js');
const css=read('player-home.css');
const index=read('index.html');
const sw=read('sw.js');
const bundle=read('assets/generated/swe-runtime-r550-part1.js');

test('only player-home owns the player navigation; no duplicate ID from space router',()=>{
 assert.doesNotMatch(nav,/nav\.id='swePlayerNav'/);
 assert.match(nav,/duplicate&&!duplicate\.closest\('#swePlayerHeader'\)/);
 assert.match(home,/<nav id="swePlayerNav"/);
 assert.match(home,/navPanels\.map/);
 assert.match(home,/view\.querySelectorAll\('#swePlayerNav button'\)/);
 assert.equal((home.match(/<nav id="swePlayerNav"/g)||[]).length,1);
 assert.match(nav,/#sweSpaceBar\[hidden\]\{display:none!important\}/);
});
test('one menu exposes group, profile and all player destinations',()=>{
 assert.match(home,/const navPanels=\['home','mine','stats','group','profile','organizer'\]/);
 assert.match(home,/group\(card\('myPlayerGroups'\),'profile group',50\)/);
 assert.match(home,/data-player-panel="preferences">Mes préférences/);
 assert.match(home,/view\.dataset\.playerPanel=selected/);
 assert.match(home,/if\(panel==='registrations'\)panel='mine'/);
 assert.match(home,/regs\.append\(created\)/);
});
test('mobile bottom navigation is one row, with five core tabs',()=>{
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(css,/button\[data-player-panel="registrations"\]/);
 assert.match(css,/button\[data-player-panel="organizer"\]/);
 assert.match(css,/button\[data-player-panel="group"\]/);
 assert.match(css,/html\.swe-player-home-active #sweSpaceBar/);
});
test('PWA loads the new single navigation instead of stale r55 code',()=>{
 assert.match(index,/player-home\.css\?v=552-merged-swes/);
 assert.match(index,/swe-runtime-r550-part1\.js\?v=552-merged-swes/);
 assert.match(sw,/SW_BUILD='(?:55\.2-merged-player-swes|56\.1-draw-room-io-fix)'/);
 assert.ok(bundle.includes("if(duplicate&&!duplicate.closest('#swePlayerHeader'))duplicate.remove()"));
 assert.ok(bundle.includes("const navPanels=['home','mine','stats','group','profile','organizer']"));
 assert.equal([...index.matchAll(/<script\b[^>]*\bsrc=/g)].length,10);
});

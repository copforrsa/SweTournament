'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('the old startup loader never repeats a bundled module or the same file twice',()=>{
 const manifest=JSON.parse(read('assets/generated/swe-bundle-manifest-r550.json'));
 const bundled=new Set([...manifest.pre,...manifest.runtime.flat()]);
 const loader=read('hotfix-v4244.js');
 const loads=[...loader.matchAll(/await load\('([^']+)','([^']+)'\)/g)]
  .map(m=>({path:m[1].split('?')[0].replace(/^\//,''),key:m[2]}));
 assert.equal(loads.length,74,'only additional, required modules should load');
 assert.equal(new Set(loads.map(x=>x.path)).size,loads.length,'duplicate dynamic scripts');
 assert.deepEqual(loads.filter(x=>bundled.has(x.path)),[],'bundle modules must not reload');
 assert.ok(bundled.has('player-home.js'));
 assert.ok(bundled.has('simple-swe-page-v4350.js'));
 assert.ok(bundled.has('match-engine-v4300.js'));
});

test('the startup loader in the production bundle matches the maintained source',()=>{
 const source=read('hotfix-v4244.js');
 const bundle=read('assets/generated/swe-runtime-r550-part2.js');
 assert.ok(bundle.includes('/* SOURCE hotfix-v4244.js */\n'+source));
 const main=read('index.html');
 assert.equal([...main.matchAll(/<script\b[^>]*\bsrc=/g)].length,10);
});

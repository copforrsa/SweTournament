const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

test('season page uses the premium competitive presentation',()=>{
  const html=fs.readFileSync(path.join(root,'season.html'),'utf8');
  for(const marker of ['SWÉ • Tableau d’honneur','podium-card','season-toolbar','ranking-head','Top Players • meilleures moyennes','@media(max-width:460px)'])assert.match(html,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(html,/linear-gradient\(125deg,var\(--season-deep\)/);
  assert.match(html,/season\.js\?v=4391/);
});

test('season rendering keeps full-season aggregation and enriches rows',()=>{
  const js=fs.readFileSync(path.join(root,'season.js'),'utf8');
  assert.match(js,/String\(t\.season_id\)===String\(season\.id\)&&t\.format!==\'league\'/);
  assert.match(js,/rank-position/);
  assert.match(js,/podium-stats/);
  assert.match(js,/Champion de la saison/);
});

test('newcomer hotfix follows premium ranking markup',()=>{
  const js=fs.readFileSync(path.join(root,'season-hotfix-v4244.js'),'utf8');
  assert.match(js,/rank-position/);
  assert.match(js,/rank-value/);
  assert.match(js,/closest\('\.season-card,\.card'\)/);
});

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const sources=['player-experience-v4349.js','player-experience-v4340.js','player-health-badge-fix-v4358.js']
  .map(file=>fs.readFileSync(path.join(root,file),'utf8'));

test('health badges never appear in the cooler assignment panel',()=>{
  for(const source of sources)assert.match(source,/\.tournament-cooler-assignments/);
  assert.match(sources[2],/closest\('\.tournament-cooler-assignments'\).*remove\(\)/);
});

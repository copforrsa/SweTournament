const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(root,'rating-report-reliability-v4394.js'),'utf8');

test('rating report buttons use one reliable v2 opener',()=>{
  assert.match(js,/\[data-swe-report\],\[data-report\]/);
  assert.match(js,/admin_get_tournament_rating_report_v2/);
  assert.match(js,/stopImmediatePropagation/);
});

test('an empty tournament report still opens with evaluator progress',()=>{
  assert.match(js,/Le rapport est ouvert, mais aucune note n’a encore été envoyée/);
  assert.match(js,/État des évaluateurs/);
  assert.match(js,/ratings_count/);
  assert.match(js,/Guest de/);
});

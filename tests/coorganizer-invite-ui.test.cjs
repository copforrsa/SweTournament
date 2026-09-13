const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

test('administrator invite trusts the server quota and exposes progress',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const app=fs.readFileSync(path.join(root,'coorganizer-invite-reliability-v4392.js'),'utf8');
  assert.match(html,/id="coorgInviteFeedback"[^>]+role="status"[^>]+aria-live="polite"/);
  assert.match(app,/button\.disabled=true;button\.textContent='Création…'/);
  assert.match(app,/if\(!inv\?\.id\)throw new Error/);
  assert.match(app,/Elle apparaît ci-dessous/);
  assert.doesNotMatch(app,/coorgCount>=/);
  assert.match(fs.readFileSync(path.join(root,'hotfix-v4244.js'),'utf8'),/coorganizer-invite-reliability-v4392\.js\?v=4392/);
});

test('self-paid invite reloads organizer data before confirming success',()=>{
  const js=fs.readFileSync(path.join(root,'coorganizer-selfpay-v4308.js'),'utf8');
  assert.match(js,/if\(typeof loadAll==='function'\)await loadAll\(\)/);
  assert.match(js,/if\(!email\|\|!input\?\.checkValidity\(\)\)/);
  assert.match(js,/Invitation créée ✅ Elle apparaît ci-dessous/);
});

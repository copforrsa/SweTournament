const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

test('the substitute fair-play rule is visible in registration and tournament rules',()=>{
 const source=fs.readFileSync(path.join(root,'substitute-fair-play-rules-v4406.js'),'utf8');
 const loader=fs.readFileSync(path.join(root,'hotfix-v4244.js'),'utf8');
 assert.match(source,/ne peut pas jouer deux matchs consécutifs pour la même équipe/);
 assert.match(source,/blessure ou de départ prématuré/);
 assert.match(source,/chacune des autres équipes du tournoi/);
 assert.match(source,/registrationParticipationRules/);
 assert.match(source,/registrationRules/);
 assert.match(loader,/substitute-fair-play-rules-v4406\.js\?v=4406/);
});

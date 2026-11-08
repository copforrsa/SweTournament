'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../app.js'),'utf8');
const sql=fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20261108083000_king_custom_match_three_points.sql'),'utf8');

const begin=app.indexOf('function kingCircuitStarted(t){');
const end=app.indexOf("$('#addMatch').onclick=async()=>{",begin);
assert.ok(begin>0&&end>begin,'king warning helper must be in app');
function warning(confirmResult){
 const prompts=[];
 const fn=new Function('confirm',app.slice(begin,end)+';return {kingCircuitStarted,confirmKingMatchChange};');
 return {...fn(msg=>{prompts.push(msg);return confirmResult}),prompts};
}
const king={format:'king_of_pitch',rotation_mode:'king_of_pitch',rotation_state:{initialized:true}};
const notStarted={...king,rotation_state:{initialized:false}};

test('before launch create and edit do not require a confirmation',()=>{
 const h=warning(false);
 assert.equal(h.confirmKingMatchChange(notStarted,'créer'),true);
 assert.equal(h.confirmKingMatchChange(notStarted,'modifier'),true);
 assert.equal(h.prompts.length,0);
});

test('after launch creation and edits explicitly warn Carrefour is 3 rather than 4 points',()=>{
 const h=warning(true);
 assert.equal(h.confirmKingMatchChange(king,'créer'),true);
 assert.equal(h.confirmKingMatchChange(king,'modifier',{rotation_generated:true}),true);
 assert.equal(h.prompts.length,2);
 assert.match(h.prompts[0],/Carrefour/);
 assert.match(h.prompts[0],/3 points/);
 assert.match(h.prompts[0],/4 pour un match officiel/);
 assert.match(h.prompts[1],/circuit automatique/);
 const cancel=warning(false);
 assert.equal(cancel.confirmKingMatchChange(king,'modifier'),false);
});

test('after launch deleting a generated game warns about existing goals and rotations',()=>{
 const h=warning(true);
 assert.equal(h.confirmKingMatchChange(king,'supprimer',{rotation_generated:true}),true);
 assert.match(h.prompts[0],/buts liés/);
 assert.match(h.prompts[0],/rotations/);
});

test('edited and manually created matches are explicitly marked as custom',()=>{
 assert.match(app,/if\(kingCircuitStarted\(current\)\)payload\.king_custom_match=true/);
 assert.match(app,/kingCircuitStarted\(t\)\?\{king_custom_match:true\}:\{\}/);
 assert.match(app,/if\(!confirmKingMatchChange\(t,'créer'\)\)return/);
 assert.match(app,/if\(!confirmKingMatchChange\(current,'modifier',m\)\)return/);
 assert.match(app,/if\(!confirmKingMatchChange\(current,'supprimer',m\)\)return/);
});

test('server marks only post-launch manual insert or structural changes as custom',()=>{
 assert.match(sql,/add column if not exists king_custom_match boolean not null default false/);
 assert.match(sql,/if not coalesce\(new\.rotation_generated,false\) then new\.king_custom_match:=true/);
 assert.match(sql,/old\.home_team_id is distinct from new\.home_team_id/);
 assert.match(sql,/old\.pitch is distinct from new\.pitch/);
 assert.match(sql,/not coalesce\(new\.king_custom_match,false\)/);
 assert.match(sql,/MATCH_TEAM_ALREADY_ACTIVE/);
});

test('live, archive and public standings give Carrefour 4 only if the match was untouched',()=>{
 assert.match(app,/const onKing=m=>!m\.king_custom_match/);
 assert.match(app,/const isRoyalPitch=m=>!m\.king_custom_match/);
 assert.match(app,/const publicKingOfficialCarrefour=m=>!m\.king_custom_match/);
 assert.match(app,/const winPoints=publicKingFourPoints&&publicKingOfficialCarrefour\(m\)\?4:3/);
 assert.match(app,/const victoryPoints=\(fourPointRule&&royal\)\?4:3/);
 assert.match(app,/const hs=Number\(m\.home_score\|\|0\),as=Number\(m\.away_score\|\|0\),winPoints=fourPoints&&onKing\(m\)\?4:3/);
});

test('browser picks up new scoring code',()=>{
 assert.match(fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8'),/app\.js\?v=5604-king-custom-3pts/);
 assert.match(fs.readFileSync(path.resolve(__dirname,'../sw.js'),'utf8'),/SW_BUILD='56\.3-king-custom-3pts'/);
});

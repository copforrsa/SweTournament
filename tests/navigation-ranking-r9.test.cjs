const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const js=fs.readFileSync(path.join(__dirname,'..','navigation-ranking-r9.js'),'utf8');

test('archived ranking is isolated from the active tournament and player rows stay clickable',async()=>{
  const dom=new JSDOM(`<!doctype html><body>
    <div id="view-ranking"><div class="card"><div><button class="rankMode" data-mode="day">Tournoi</button><button class="rankMode primary" data-mode="season">Saison</button></div></div><div class="card"><h2 class="sectiontitle">Partager</h2><textarea id="shareText"></textarea><div class="space"></div><button id="shareWhatsapp">Partager</button></div><div id="teamRank"></div></div>
    <div id="view-players"><div id="playersList"><div class="player" id="zoe"><div class="row"><b>Zoé</b></div></div><div class="player" id="alice"><div class="row"><b>Alice</b></div></div></div></div>
  </body>`,{url:'https://app.swetournament.fr',runScripts:'outside-only'});
  const w=dom.window,d=w.document,queries=[];
  w.S={activeTour:'live',rankingTournamentId:null,rankMode:'season',tournaments:[{id:'live',name:'SWÉ actuel',status:'open',tournament_date:'2026-09-15'},{id:'old',name:'Finale été',status:'finished',tournament_date:'2026-07-10'}]};
  const chain={select(){return this},eq(field,value){queries.push([field,value]);return this},in(){return this},order(){return Promise.resolve({data:[]})},then(resolve){resolve({data:[]})}};
  w.sb={from:()=>Object.create(chain)};
  w.rankingDataset=async()=>({goals:[],matches:[],tournaments:[]});w.renderTeamRanking=()=>{};
  w.renderRanking=async()=>{await w.rankingDataset();w.renderTeamRanking()};w.renderPlayers=()=>{};
  let clicks=0;d.getElementById('zoe').onclick=()=>clicks++;
  w.eval(js);
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  const select=d.getElementById('sweRankingTournamentSelectR9');
  assert.ok(select);assert.equal(select.querySelectorAll('optgroup').length,2);assert.match(select.textContent,/Finale été/);
  assert.equal(d.querySelector('#playersList .player').id,'alice');d.getElementById('zoe').click();assert.equal(clicks,1);
  assert.ok(d.getElementById('shareText').closest('.card').classList.contains('swe-premium-share'));
  select.value='old';select.dispatchEvent(new w.Event('change'));await new Promise(r=>setTimeout(r,20));
  assert.equal(w.S.activeTour,'live');assert.equal(w.S.rankingTournamentId,'old');assert.equal(w.S.rankMode,'day');assert.ok(queries.some(([,value])=>value==='old'));
  dom.window.close();
});

test('all co-manager permission layers expose ranking when the module is enabled',()=>{
  const root=path.join(__dirname,'..');
  for(const name of ['coorg-tab-rights-v4319.js','auth-access-clean-v4352.js','mobile-coorg-rights-v4362.js']){
    const source=fs.readFileSync(path.join(root,name),'utf8');
    assert.match(source,/ranking[^\n]+return true|return true[^\n]+ranking/);
  }
});

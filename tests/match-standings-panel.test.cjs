const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const pitches=['Carrefour','Mercedes','Boulogne'];
const fixtures=[
 ['Family','Noirs'],['Verts','Blancs'],['Rouges','Bleus'],
 ['Family','Blancs'],['Noirs','Bleus'],['Verts','Rouges'],
 ['Family','Bleus'],['Blancs','Rouges'],['Noirs','Verts'],
 ['Family','Rouges'],['Bleus','Verts'],['Blancs','Noirs'],
 ['Family','Verts'],['Rouges','Noirs'],['Bleus','Blancs']
];

function setup(){
 const dom=new JSDOM('<select id="matchCompetitionSelect"></select><div id="matchesList"></div>',{runScripts:'outside-only',url:'https://example.test'}),w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){this.open=false};
 const names=['Family','Verts','Rouges','Bleus','Blancs','Noirs'];
 const teams=names.map((name,index)=>({id:'team-'+index,tournament_id:'tour',name}));
 const teamId=name=>teams.find(team=>team.name===name).id;
 const players=names.flatMap((name,index)=>Array.from({length:5},(_,slot)=>({id:'player-'+index+'-'+slot,name:name+' '+(slot+1)})));
 const matches=fixtures.map(([home,away],index)=>({
  id:'match-'+index,tournament_id:'tour',home_team_id:teamId(home),away_team_id:teamId(away),match_order:index+1,
  competition_type:'championship_qualification',format_stage:'qualification',round_label:'Poule '+(Math.floor(index/3)+1),pitch:pitches[index%3],status:'scheduled',home_score:0,away_score:0
 }));
 w.S={activeTour:'tour',workspace:{public_token:'public-token'},tournaments:[{id:'tour',name:'Championnat Conquête',short_code:'conq15'}],teams,players,matches,goals:[
  {match_id:'match-0',scorer_player_id:'player-0-0',assister_player_id:'player-0-1'},
  {match_id:'match-1',scorer_player_id:'player-0-0',assister_player_id:'player-2-0'},
  {match_id:'match-2',scorer_player_id:'player-2-0',assister_player_id:'player-0-1'},
  {match_id:'outside',scorer_player_id:'player-5-0',assister_player_id:'player-5-1'}
 ]};
 w.currentTour=()=>w.S.tournaments[0];
 w.eval(fs.readFileSync(path.join(root,'match-standings-panel.js'),'utf8'));
 return {w,dom};
}

test('standings sidebar adds the live link and tournament scorers/passers without changing the standings view',()=>{
 const {w,dom}=setup();
 w.document.getElementById('sweMatchStandingsButton').click();
 const panel=w.document.getElementById('sweStandingsDialog');
 assert.equal(panel.open,true);
 assert.match(panel.textContent,/Buteurs du tournoi/);
 assert.match(panel.textContent,/Passeurs du tournoi/);
 assert.match(panel.textContent,/Family 1/);
 assert.match(panel.textContent,/2 buts/);
 assert.match(panel.textContent,/2 passes décisives/);
 const live=panel.querySelector('.swe-standings-live');
 assert.equal(live.href,'https://app.swetournament.fr/live.html?s=CONQ15');
 assert.equal(panel.querySelectorAll('.swe-standings-fixtures').length,0);
 dom.window.close();
});

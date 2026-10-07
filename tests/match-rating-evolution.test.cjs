const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
function render(oldScores,newScores){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://app.swetournament.fr/'}),w=dom.window;
 const form=w.document.createElement('div');form.id='publicRegistration';form.innerHTML='<select id="publicPlayerSelect"><option value="p">Joueur</option></select>';w.document.getElementById('publicRegistrationCard').append(form);
 w.eval(fs.readFileSync(path.join(root,'registration-presentation.js'),'utf8'));
 const tours=[{id:'old',format:'fast_conquest',status:'finished',season_id:'s',tournament_date:'2026-10-01'},{id:'new',format:'fast_conquest',status:'finished',season_id:'s',tournament_date:'2026-10-07'}];
 const matches=[...newScores.map((r,i)=>({id:'new'+i,tournament_id:'new',rating:r})),...oldScores.map((r,i)=>({id:'old'+i,tournament_id:'old',rating:r}))].map(m=>({...m,status:'finished',home_team_id:'home',away_team_id:'away'}));
 const data={tournament:{id:'current',format:'fast_conquest',status:'draft',registration_open:true,season_id:'s'},tournaments:tours,seasons:[{id:'s',is_active:true}],matches,teams:[],registrations:[],teamPlayers:[],players:[{id:'p',name:'Joueur'}],pitches:[],goals:[],matchAssignments:matches.map(m=>({match_id:m.id,player_id:'p',team_id:'home'}))};
 w.SWERegistrationPresentation.mount({data:()=>data,appUrl:'https://app.swetournament.fr/',token:'x',setEntryMode:()=>{},rateMatch:m=>({rating:m.rating})});
 const card=w.document.querySelector('.sp-match-rating'),text=card.textContent,badge=card.querySelector('.sp-rating-change');const result={text,badge:badge?.textContent,classes:badge?.className};w.close();return result;
}
test('latest tournament updates weighted seasonal mean independently of match order',()=>{const r=render([4,4],[10]);assert.match(r.text,/6,0/);assert.match(r.badge,/↑ \+2,00/);assert.match(r.classes,/up/)});
test('lower latest scores show red decrease',()=>{const r=render([8],[4]);assert.match(r.badge,/↓ −?\-?2,00/);assert.match(r.classes,/down/)});
test('unchanged scores show stable indicator',()=>{const r=render([6],[6]);assert.match(r.badge,/→ 0,00/);assert.match(r.classes,/stable/)});
test('first rated tournament never invents a previous average',()=>{const r=render([],[7]);assert.match(r.text,/7,0/);assert.equal(r.badge,undefined)});

(()=>{
'use strict';
let busy=false;
const esc37=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
function activeMatches(){return document.getElementById('view-matches')?.classList.contains('active');}
function teamName(id){try{return (S.teams||[]).find(t=>String(t.id)===String(id))?.name||'Équipe';}catch(_){return 'Équipe';}}
async function createRematch(match,button){
  if(busy)return;
  const t=typeof currentTour==='function'?currentTour():null;
  if(!t||t.status==='finished')return toast('Le tournoi est terminé.');
  if(typeof canEditCurrentMatches==='function'&&!canEditCurrentMatches())return toast('Tu n’es pas autorisé à créer un match.');
  busy=true;button.disabled=true;
  try{
    const order=(S.matches||[]).length+1;
    const {error}=await sb.from('matches').insert({
      tournament_id:t.id,
      home_team_id:match.home_team_id,
      away_team_id:match.away_team_id,
      match_order:order,
      pitch:match.pitch||null,
      round_label:'Rematch '+teamName(match.home_team_id)+' / '+teamName(match.away_team_id)
    });
    if(error)throw error;
    await loadTournament();
    renderMatches();
    toast('Rematch créé ✅');
  }catch(e){toast(e?.message||'Impossible de recréer ce match.');}
  finally{busy=false;button.disabled=false;}
}
function decorateScoreGrid(card,match){
  if(card.dataset.scoreReadable37==='1')return;
  const buttons=[...card.querySelectorAll('button')];
  const scoreBtn=buttons.find(b=>/score/i.test(b.textContent||''));
  if(!scoreBtn)return;
  const grid=scoreBtn.parentElement;
  if(!grid||grid.querySelector('[data-swe-score-title]'))return;
  const inputs=[...grid.querySelectorAll('input[type="number"]')];
  if(inputs.length<2)return;
  card.dataset.scoreReadable37='1';
  const home=teamName(match.home_team_id),away=teamName(match.away_team_id);
  const title=document.createElement('div');
  title.dataset.sweScoreTitle='1';
  title.style.cssText='margin:10px 0 6px;font-weight:900;font-size:13px';
  title.textContent='⚡ Score manuel • '+home+' vs '+away;
  grid.insertAdjacentElement('beforebegin',title);
  [[inputs[0],home],[inputs[1],away]].forEach(([input,name])=>{
    if(input.parentElement?.dataset?.sweScoreLabel)return;
    const label=document.createElement('label');label.dataset.sweScoreLabel='1';label.style.cssText='display:block;min-width:0';
    const span=document.createElement('span');span.textContent=name;span.style.cssText='display:block;font-size:11px;font-weight:800;margin:0 0 4px;color:#52645a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    input.insertAdjacentElement('beforebegin',label);label.append(span,input);
  });
  scoreBtn.textContent='💾 Enregistrer';
}
function collapsePlayerPanel(card){
  if(card.dataset.compactPlayers37==='1')return;
  const marker=[...card.querySelectorAll('b,strong,h3')].find(x=>/Joueurs de ce match/i.test(x.textContent||''));
  if(!marker)return;
  let panel=marker.closest('.player');
  if(!panel){panel=marker.parentElement?.parentElement;}
  if(!panel||panel===card||panel.closest('details[data-swe-compact-players]'))return;
  const details=document.createElement('details');details.dataset.sweCompactPlayers='1';details.style.cssText='margin-top:9px;border:1px solid #e4ebe7;border-radius:12px;padding:8px 10px;background:#fbfdfc';
  const summary=document.createElement('summary');summary.style.cssText='cursor:pointer;font-weight:900';summary.textContent='🔄 Remplacements & joueurs du match';
  panel.insertAdjacentElement('beforebegin',details);details.append(summary,panel);panel.style.marginTop='8px';
  card.dataset.compactPlayers37='1';
}
function addRematchButton(card,match){
  if(card.querySelector('[data-swe-rematch37]'))return;
  const row=document.createElement('div');row.style.cssText='display:flex;justify-content:flex-end;margin-top:8px';
  const b=document.createElement('button');b.type='button';b.dataset.sweRematch37='1';b.textContent='🔁 Recréer ce match';b.style.cssText='font-weight:800';
  b.onclick=()=>createRematch(match,b);row.appendChild(b);card.appendChild(row);
}
function enhanceMatches37(){
  if(typeof S==='undefined'||!activeMatches())return;
  const cards=[...document.querySelectorAll('#matchesList .match')];
  cards.forEach((card,i)=>{
    const match=(S.matches||[])[i];if(!match)return;
    decorateScoreGrid(card,match);
    collapsePlayerPanel(card);
    addRematchButton(card,match);
  });
}
function tick37(){enhanceMatches37();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick37,{once:true});else tick37();
document.addEventListener('swe:rendered',tick37);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="matches"],.tab'))setTimeout(tick37,250)},true);
})();

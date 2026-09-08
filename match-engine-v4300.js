(()=>{
'use strict';
if(window.__SWE_MATCH_ENGINE_4300)return;
window.__SWE_MATCH_ENGINE_4300=true;

const E=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let hydrating=false;

function teamById(id){
  return (S.teams||[]).find(t=>String(t.id)===String(id))||null;
}
function canEditScores(){
  try{return typeof canEditCurrentMatches==='function'?!!canEditCurrentMatches():false}catch(_){return false}
}
function adminUser(){
  try{return typeof isAdmin==='function'?!!isAdmin():false}catch(_){return false}
}
function current(){
  try{return typeof currentTour==='function'?currentTour():null}catch(_){return null}
}
function installCss(){
  if(E('sweMatchEngine4300Css'))return;
  const s=document.createElement('style');s.id='sweMatchEngine4300Css';s.textContent=`
  #matchesList .swe4300-match{background:#fff;border:1px solid #dfe7ef;border-radius:18px;padding:15px;margin:12px 0;box-shadow:0 5px 16px rgba(15,23,42,.06)}
  #matchesList .swe4300-match.finished{opacity:.58;background:#f3f4f6;order:99}
  .swe4300-top{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:12px;font-size:12px;font-weight:800;color:#64748b}
  .swe4300-score{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:10px;align-items:center}
  .swe4300-team{font-size:17px;font-weight:900}.swe4300-team.right{text-align:right}.swe4300-result{font-size:25px;font-weight:950;white-space:nowrap}
  .swe4300-edit{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-top:12px}.swe4300-edit input{min-width:0;text-align:center;font-weight:900}
  .swe4300-note{margin-top:9px;font-size:11px;color:#64748b}.swe4300-finished{font-size:11px;font-weight:900;color:#475569}
  @media(max-width:650px){.swe4300-match{padding:13px}.swe4300-team{font-size:15px}.swe4300-result{font-size:22px}.swe4300-edit{grid-template-columns:1fr 1fr}.swe4300-edit button{grid-column:1/-1;min-height:44px}}
  `;document.head.appendChild(s);
}
async function hydrate(tid){
  if(hydrating||!tid)return;hydrating=true;
  try{
    const [mr,tr]=await Promise.all([
      sb.from('matches').select('*').eq('tournament_id',tid).order('match_order'),
      sb.from('teams').select('*').eq('tournament_id',tid).order('created_at')
    ]);
    if(!mr.error)S.matches=mr.data||[];
    if(!tr.error)S.teams=tr.data||[];
  }catch(e){console.error('SWÉ V43 hydrate matchs',e)}
  finally{hydrating=false;renderStableMatches(false)}
}
async function saveScore(m,homeInput,awayInput,btn){
  const home=Math.max(0,parseInt(homeInput.value||'0',10)||0),away=Math.max(0,parseInt(awayInput.value||'0',10)||0);
  btn.disabled=true;
  try{
    const r=await sb.from('matches').update({home_score:home,away_score:away}).eq('id',m.id);
    if(r.error)throw r.error;
    m.home_score=home;m.away_score=away;
    const score=btn.closest('.swe4300-match')?.querySelector('.swe4300-result');if(score)score.textContent=home+' - '+away;
    if(typeof toast==='function')toast('Score enregistré ✅');
  }catch(e){if(typeof toast==='function')toast(e?.message||'Erreur lors de l’enregistrement')}
  finally{btn.disabled=false}
}
function buildCard(m,index){
  const h=teamById(m.home_team_id),a=teamById(m.away_team_id);
  const d=document.createElement('div');
  const finished=String(m.status||'').toLowerCase()==='finished';
  d.className='swe4300-match'+(finished?' finished':'');d.dataset.matchId=String(m.id||'');
  d.innerHTML='<div class="swe4300-top"><span>⚽ MATCH '+(index+1)+'</span><span>'+safe(m.pitch||'Terrain non indiqué')+(m.round_label?' • '+safe(m.round_label):'')+'</span></div>'+
    '<div class="swe4300-score"><span class="swe4300-team">'+safe(h?.name||'Équipe domicile')+'</span><span class="swe4300-result">'+Number(m.home_score||0)+' - '+Number(m.away_score||0)+'</span><span class="swe4300-team right">'+safe(a?.name||'Équipe extérieure')+'</span></div>'+
    (finished?'<div class="swe4300-note swe4300-finished">✓ MATCH TERMINÉ</div>':'');
  const editable=canEditScores()&&(!finished||adminUser());
  if(editable){
    const row=document.createElement('div');row.className='swe4300-edit';
    const hi=document.createElement('input'),ai=document.createElement('input'),b=document.createElement('button');
    hi.type='number';hi.min='0';hi.value=Number(m.home_score||0);ai.type='number';ai.min='0';ai.value=Number(m.away_score||0);
    b.type='button';b.className='primary';b.textContent='💾 Enregistrer le score';b.onclick=()=>saveScore(m,hi,ai,b);
    row.append(hi,ai,b);d.appendChild(row);
  }
  return d;
}
function renderStableMatches(allowHydrate=true){
  installCss();
  const t=current(),box=E('matchesList'),selector=E('matchCompetitionSelect'),status=E('matchCompetitionStatus');
  if(!box)return;
  const eligible=(S.tournaments||[]).filter(x=>x.status!=='finished').sort((a,b)=>String(a.tournament_date||'').localeCompare(String(b.tournament_date||'')));
  if(selector){
    const selected=t?.id||'';
    selector.innerHTML='<option value="">Choisir une compétition</option>'+eligible.map(x=>'<option value="'+safe(x.id)+'"'+(String(x.id)===String(selected)?' selected':'')+'>'+safe(x.name||x.tournament_date||'Compétition')+'</option>').join('');
    selector.onchange=async()=>{S.activeTour=selector.value||null;try{await loadTournament()}catch(e){console.error('SWÉ V43 changement tournoi',e)}renderStableMatches(true)};
  }
  if(!t){box.innerHTML='<div class="card"><p class="muted">Choisis d’abord un tournoi ou un Swé de Ligue.</p></div>';if(status)status.textContent='Aucune compétition sélectionnée';return}
  const rows=[...(S.matches||[])].sort((a,b)=>{
    const af=String(a.status||'')==='finished'?1:0,bf=String(b.status||'')==='finished'?1:0;
    return af-bf||Number(a.match_order||0)-Number(b.match_order||0);
  });
  if(status)status.innerHTML=(t.format==='league'?'Swé de Ligue : ':'Tournoi : ')+safe(t.name||t.tournament_date||'Compétition')+' • '+rows.length+' match'+(rows.length>1?'s':'');
  box.innerHTML='';
  if(!rows.length){box.innerHTML='<div class="card"><p class="muted">Chargement des matchs…</p></div>';if(allowHydrate)hydrate(t.id);return}
  rows.forEach((m,i)=>box.appendChild(buildCard(m,i)));
}

try{window.__SWE_NATIVE_RENDER_MATCHES=typeof renderMatches==='function'?renderMatches:null;renderMatches=renderStableMatches}catch(e){console.error('SWÉ V43 remplacement renderMatches',e)}
window.SWE_RENDER_MATCHES_4300=renderStableMatches;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>renderStableMatches(true),100),{once:true});else setTimeout(()=>renderStableMatches(true),100);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="matches"]'))setTimeout(()=>renderStableMatches(true),80)},true);
})();

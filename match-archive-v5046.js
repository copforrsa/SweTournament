(()=>{
'use strict';
if(window.__SWE_MATCH_ARCHIVE_5046)return;
window.__SWE_MATCH_ARCHIVE_5046=true;
const E=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let restoreTournamentId=null;
let opening=false;

function canUseArchive(){
  try{return !!S?.session&&(S.isSuperAdmin===true||(typeof isAdmin==='function'&&isAdmin()));}
  catch(_){return false;}
}
function current(){try{return typeof currentTour==='function'?currentTour():null;}catch(_){return null;}}
function isPast(t){return String(t?.status||'').toLowerCase()==='finished';}
function kind(t){return t?.league_id?'🏁 Championnat':'⚽ SWÉ';}
function label(t){return t?.name||('Tournoi du '+String(t?.tournament_date||''));}
function date(t){try{return t?.tournament_date?new Date(String(t.tournament_date)+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}):'Date non renseignée';}catch(_){return t?.tournament_date||'Date non renseignée';}}
function installCss(){
  if(E('sweMatchArchive5046Css'))return;
  const style=document.createElement('style');
  style.id='sweMatchArchive5046Css';
  style.textContent='#sweMatchArchive5046{margin-bottom:12px;border:1px solid #b9cde0;background:linear-gradient(135deg,#f7fbff,#eef6fc)}#sweMatchArchive5046 summary{cursor:pointer;font-weight:900;padding:2px 0}#sweMatchArchive5046 .swearchive-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}#sweMatchArchive5046 .swearchive-list{display:grid;gap:8px;margin-top:12px}#sweMatchArchive5046 .swearchive-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px 12px;background:#fff;border:1px solid #d7e4ef;border-radius:12px}#sweMatchArchive5046 .swearchive-row b{display:block}#sweMatchArchive5046 .swearchive-meta{font-size:12px;color:#526b84;margin-top:3px}#sweMatchArchive5046 .swearchive-open{min-height:40px;font-weight:850}@media(max-width:560px){#sweMatchArchive5046 .swearchive-row{grid-template-columns:1fr}#sweMatchArchive5046 .swearchive-open{width:100%}}';
  document.head.appendChild(style);
}
async function switchTo(tournamentId){
  if(opening||String(S.activeTour)===String(tournamentId))return;
  const before=current();
  if(before&&!isPast(before))restoreTournamentId=before.id;
  opening=true;
  try{
    S.activeTour=tournamentId;
    S.teamCompetitionId=tournamentId;
    await loadTournament();
    if(typeof renderMatches==='function')renderMatches();
    document.dispatchEvent(new Event('swe:rendered'));
    const opened=current();
    if(typeof toast==='function')toast('Archive ouverte : '+(opened?.name||'tournoi'));
  }catch(error){
    if(typeof toast==='function')toast(error?.message||'Impossible d’ouvrir cette archive.');
  }finally{
    opening=false;
    mount();
  }
}
async function restore(){
  if(!restoreTournamentId)return;
  const id=restoreTournamentId;
  restoreTournamentId=null;
  await switchTo(id);
}
function mount(){
  const host=E('view-matches');
  if(!host)return;
  if(!canUseArchive()){E('sweMatchArchive5046')?.remove();return;}
  installCss();
  let box=E('sweMatchArchive5046');
  if(!box){
    box=document.createElement('section');
    box.id='sweMatchArchive5046';
    box.className='card';
    const first=host.querySelector('.card');
    if(first)host.insertBefore(box,first);else host.prepend(box);
  }
  const selected=current();
  const archives=(S.tournaments||[]).filter(isPast).sort((a,b)=>String(b.tournament_date||'').localeCompare(String(a.tournament_date||'')));
  const archiveMode=!!selected&&isPast(selected);
  box.innerHTML='<div class="swearchive-head"><div><b>🗂 Archives des matchs</b><div class="muted" style="margin-top:4px">Retrouve les résultats des SWÉ et championnats terminés. L’administrateur peut corriger le score, les buteurs et les passeurs.</div></div>'+(archiveMode&&restoreTournamentId?'<button type="button" id="sweArchiveRestore5046">↩ Retour au tournoi en cours</button>':'')+'</div>'+
    '<details '+(archiveMode?'open':'')+'><summary>'+archives.length+' tournoi'+(archives.length>1?'s':'')+' archivé'+(archives.length>1?'s':'')+'</summary><div class="swearchive-list">'+
    (archives.length?archives.map(t=>'<div class="swearchive-row"><div><b>'+esc(label(t))+'</b><div class="swearchive-meta">'+kind(t)+' · '+esc(date(t))+' · '+(t.format==='king_of_pitch'?'Roi du terrain':t.format==='league'?'Championnat':'Tournoi')+'</div></div><button type="button" class="swearchive-open" data-swe-archive="'+esc(t.id)+'" '+(String(t.id)===String(selected?.id)?'disabled':'')+'>'+(String(t.id)===String(selected?.id)?'Archive ouverte':'Ouvrir les matchs')+'</button></div>').join(''):'<div class="muted">Aucun tournoi terminé pour le moment.</div>')+
    '</div></details>';
  box.querySelector('#sweArchiveRestore5046')?.addEventListener('click',restore);
  box.querySelectorAll('[data-swe-archive]').forEach(button=>button.addEventListener('click',()=>switchTo(button.dataset.sweArchive)));
}
document.addEventListener('swe:rendered',()=>setTimeout(mount,0));
document.addEventListener('click',event=>{if(event.target.closest?.('[data-view="matches"]'))setTimeout(mount,120);},true);
window.addEventListener('pageshow',()=>setTimeout(mount,180));
[250,1000,2200].forEach(delay=>setTimeout(mount,delay));
})();
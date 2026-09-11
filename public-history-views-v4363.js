(()=>{
'use strict';
if(window.__SWE_PUBLIC_HISTORY_VIEWS_4363)return;window.__SWE_PUBLIC_HISTORY_VIEWS_4363=true;
let countedTournamentId=null,busy=false,lastState=null,lastViewCount=null,lastHydratedAt=0;
const qp=()=>new URLSearchParams(location.search);
const resolved=()=>window.__sweResolvedShortLink||{};
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
function context(){
 const q=qp(),r=resolved();
 return {token:r.public_token||q.get('public')||null,tournamentId:r.tournament_id||q.get('tournament')||null,historyId:q.get('history')||null};
}
function fmtDate(v){
 if(!v)return '';
 const d=new Date(String(v).slice(0,10)+'T12:00:00');
 return Number.isFinite(d.getTime())?d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}):String(v);
}
function historyUrl(token,id,currentTid){
 const u=new URL(location.href);u.search='';
 u.searchParams.set('public',token);u.searchParams.set('history',id);
 if(currentTid)u.searchParams.set('from_tournament',currentTid);
 u.searchParams.set('from_view','tournament');
 return u.toString();
}
function openHistory(token,id,currentTid){
 const w=window.open(historyUrl(token,id,currentTid),'_blank','noopener,noreferrer');
 if(w)w.opener=null;
}
function counterText(n){n=Number(n||0);return '👁 '+n.toLocaleString('fr-FR')+' vue'+(n>1?'s':'')+' de cette page'}
function ensureCounter(){
 const view=document.getElementById('publicView');
 if(!view||qp().get('history'))return null;
 let c=document.getElementById('sweRegistrationViewCounter4363');
 if(!c){
   c=document.createElement('div');c.id='sweRegistrationViewCounter4363';c.className='muted';
   c.style.cssText='text-align:center;margin:20px 0 8px;padding:8px 10px;font-size:12px;opacity:.82';
   c.textContent=lastViewCount==null?'👁 Chargement des vues…':counterText(lastViewCount);view.appendChild(c);
 }else if(lastViewCount!=null)c.textContent=counterText(lastViewCount);
 return c;
}
async function recordView(token,tournamentId){
 if(!token||!tournamentId)return;
 if(countedTournamentId===String(tournamentId)){ensureCounter();return}
 countedTournamentId=String(tournamentId);
 const counter=ensureCounter();
 try{
   const r=await sb.rpc('record_public_registration_page_view',{p_public_token:token,p_tournament_id:tournamentId});
   if(r.error)throw r.error;
   lastViewCount=Number(r.data||0);
   if(counter)counter.textContent=counterText(lastViewCount);
 }catch(e){
   console.warn('SWÉ V43.63 compteur vues',e);
   countedTournamentId=null;
   if(counter)counter.remove();
 }
}
function tournamentName(t){return t?.name||('Tournoi du '+fmtDate(t?.tournament_date))}
function renderHistory(token,current,finished,season){
 const toggle=document.getElementById('toggleLastTournamentPublic');
 const details=document.getElementById('publicLastTournamentDetails');
 const last=finished[0]||null;
 if(details){details.innerHTML='';details.classList.add('hidden')}
 if(toggle){
   toggle.textContent=last?'👁 Ouvrir':'Aucun résultat';
   toggle.disabled=!last;
   toggle.title=last?'Ouvrir les résultats du dernier tournoi dans un nouvel onglet':'Aucun tournoi terminé dans cette saison';
   toggle.onclick=last?()=>openHistory(token,last.id,current.id):null;
 }
 const hist=document.getElementById('publicHistory');
 if(!hist)return;
 hist.innerHTML='';
 const card=hist.closest('.card');
 const title=card?.querySelector('.sectiontitle');
 if(title)title.textContent='📁 Historique'+(season?.name?' • '+season.name:' de la saison');
 if(!finished.length){hist.innerHTML='<p class="muted">Aucun tournoi terminé dans cette saison.</p>';return}
 finished.forEach((t,i)=>{
   const row=document.createElement('div');row.className='player';
   row.style.cssText='display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:9px 0';
   row.innerHTML='<div><b>'+(i===0?'🏆 ':'')+esc(tournamentName(t))+'</b><div class="muted" style="margin-top:3px">'+esc(fmtDate(t.tournament_date))+(t.format==='king_of_pitch'?' • Roi du terrain':'')+'</div></div>';
   const b=document.createElement('button');b.type='button';b.textContent='Voir les résultats ↗';b.onclick=()=>openHistory(token,t.id,current.id);row.appendChild(b);hist.appendChild(row);
 });
}
function renderState(){
 if(!lastState)return false;
 renderHistory(lastState.token,lastState.current,lastState.finished,lastState.season);
 ensureCounter();return true;
}
async function hydrate(force=false){
 if(busy)return;
 const c=context();
 if(!c.token||c.historyId||typeof sb==='undefined')return;
 const key=c.token+'|'+(c.tournamentId||'');
 if(!force&&lastState?.key===key&&Date.now()-lastHydratedAt<30000){renderState();return}
 busy=true;
 try{
   const r=await sb.rpc('get_public_workspace_snapshot_v2',{p_public_token:c.token});
   if(r.error)throw r.error;
   const snap=r.data||{},tournaments=Array.isArray(snap.tournaments)?snap.tournaments:[],seasons=Array.isArray(snap.seasons)?snap.seasons:[];
   let current=tournaments.find(t=>String(t.id)===String(c.tournamentId));
   if(!current)current=tournaments.filter(t=>t.registrations_open!==false&&t.status!=='finished').sort((a,b)=>String(a.tournament_date||'').localeCompare(String(b.tournament_date||'')))[0]||tournaments.filter(t=>t.status!=='finished').sort((a,b)=>String(a.tournament_date||'').localeCompare(String(b.tournament_date||'')))[0]||null;
   if(!current)return;
   const season=seasons.find(s=>String(s.id)===String(current.season_id))||seasons.find(s=>s.is_active)||null;
   const seasonId=current.season_id||season?.id||null;
   const finished=tournaments.filter(t=>t.status==='finished'&&t.format!=='league'&&(!seasonId||String(t.season_id)===String(seasonId))).sort((a,b)=>String(b.tournament_date||'').localeCompare(String(a.tournament_date||'')));
   lastState={key,token:c.token,current,finished,season};lastHydratedAt=Date.now();
   renderState();
   await recordView(c.token,current.id);
 }catch(e){console.warn('SWÉ V43.63 historique public',e)}finally{busy=false}
}
function schedule(){[450,1200,2600,5000].forEach(ms=>setTimeout(()=>hydrate(false),ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.addEventListener('pageshow',schedule);
document.addEventListener('swe:rendered',()=>setTimeout(()=>{if(!renderState())hydrate(false)},250));
})();

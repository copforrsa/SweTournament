(()=>{
'use strict';
if(window.__SWE_MATCH_TAB_RECOVERY_4355)return;window.__SWE_MATCH_TAB_RECOVERY_4355=true;
const E=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let busy=false,timer=null;
function st(){try{return typeof S!=='undefined'?S:null}catch(_){return null}}
function cli(){try{return typeof sb!=='undefined'?sb:null}catch(_){return null}}
function matchViewActive(){const v=E('view-matches');return !!(v&&v.classList.contains('active'))}
function eligible(){const s=st();return (s?.tournaments||[]).filter(t=>String(t.status||'').toLowerCase()!=='finished').sort((a,b)=>String(a.tournament_date||'').localeCompare(String(b.tournament_date||'')))}
function activeTournament(){const s=st();if(!s)return null;return (s.tournaments||[]).find(t=>String(t.id)===String(s.activeTour))||null}
function syncSelector(rows,t){const sel=E('matchCompetitionSelect');if(!sel)return;const wanted=t?.id||'';const html='<option value="">Choisir une compétition</option>'+rows.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name||x.tournament_date||'Compétition')+'</option>').join('');if(sel.innerHTML!==html)sel.innerHTML=html;if(wanted&&[...sel.options].some(o=>String(o.value)===String(wanted)))sel.value=String(wanted)}
function renderEngine(){try{if(typeof window.SWE_RENDER_MATCHES_4302==='function')return window.SWE_RENDER_MATCHES_4302(false);if(typeof renderMatches==='function')return renderMatches()}catch(e){console.error('SWÉ V43.55 rendu matchs',e)}}
function emptyMessage(msg){const box=E('matchesList');if(box)box.innerHTML='<div class="card"><p class="muted">'+esc(msg)+'</p></div>'}
async function hydrate(t){
 const s=st(),c=cli();if(!s||!c||!t||busy)return;busy=true;
 const status=E('matchCompetitionStatus'),sel=E('matchCompetitionSelect');
 if(sel)sel.disabled=true;if(status)status.textContent='Chargement des matchs…';
 try{
   const [tp,tr,mr]=await Promise.all([
     c.from('tournament_players').select('*').eq('tournament_id',t.id),
     c.from('teams').select('*').eq('tournament_id',t.id).order('created_at'),
     c.from('matches').select('*').eq('tournament_id',t.id).order('match_order')
   ]);
   if(tp.error)throw tp.error;if(tr.error)throw tr.error;if(mr.error)throw mr.error;
   s.tPlayers=tp.data||[];s.teams=tr.data||[];s.matches=mr.data||[];
   const teamIds=s.teams.map(x=>x.id),matchIds=s.matches.map(x=>x.id);
   if(teamIds.length){const r=await c.from('team_players').select('*').in('team_id',teamIds);if(r.error)throw r.error;s.teamPlayers=r.data||[]}else s.teamPlayers=[];
   if(matchIds.length){
     const [gr,ar]=await Promise.all([c.from('goals').select('*').in('match_id',matchIds).order('created_at'),c.from('match_player_assignments').select('*').in('match_id',matchIds)]);
     if(gr.error)throw gr.error;if(ar.error)throw ar.error;s.goals=gr.data||[];s.matchAssignments=ar.data||[];
   }else{s.goals=[];s.matchAssignments=[]}
   renderEngine();
   if(!s.matches.length){if(status)status.textContent=(t.name||t.tournament_date||'Compétition')+' • aucun match';emptyMessage('Aucun match créé pour cette compétition.')}
 }catch(e){
   console.error('SWÉ V43.55 récupération matchs',e);
   if(status)status.textContent='Impossible de charger les matchs';
   emptyMessage('Impossible de charger les matchs. Réessaie ou recharge la page.');
 }finally{busy=false;if(sel)sel.disabled=false}
}
async function recover(force=false){
 const s=st();if(!s?.session||!s?.workspace)return;
 if(!force&&!matchViewActive())return;
 const rows=eligible();
 if(!rows.length){syncSelector([],null);emptyMessage('Aucune compétition en cours.');const status=E('matchCompetitionStatus');if(status)status.textContent='Aucune compétition en cours';return}
 let t=activeTournament();
 if(!t||String(t.status||'').toLowerCase()==='finished'){
   const sel=E('matchCompetitionSelect');const fromSel=rows.find(x=>String(x.id)===String(sel?.value||''));t=fromSel||rows[0];s.activeTour=t.id;
 }
 syncSelector(rows,t);
 const currentRows=(s.matches||[]).filter(m=>String(m.tournament_id)===String(t.id));
 const stale=(s.matches||[]).some(m=>String(m.tournament_id)!==String(t.id));
 if(force||stale||!currentRows.length){await hydrate(t);return}
 if(currentRows.length!==(s.matches||[]).length)s.matches=currentRows;
 renderEngine();
}
function schedule(force=false,ms=80){clearTimeout(timer);timer=setTimeout(()=>recover(force),ms)}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="matches"]'))schedule(true,120)},true);
document.addEventListener('change',e=>{if(e.target?.id!=='matchCompetitionSelect')return;const s=st(),rows=eligible(),t=rows.find(x=>String(x.id)===String(e.target.value));if(!s||!t)return;s.activeTour=t.id;setTimeout(()=>hydrate(t),30)},true);
document.addEventListener('swe:rendered',()=>{if(matchViewActive())schedule(false,100)});
window.addEventListener('pageshow',()=>{if(matchViewActive())schedule(true,160)});
setTimeout(()=>{if(matchViewActive())recover(true)},1000);
})();
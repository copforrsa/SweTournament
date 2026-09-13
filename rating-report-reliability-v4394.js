(()=>{
'use strict';
if(window.__SWE_RATING_REPORT_RELIABILITY_4394)return;window.__SWE_RATING_REPORT_RELIABILITY_4394=true;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
const client=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};
const isAdminUser=()=>{try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}};
const fmt=v=>{if(!v)return '—';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):String(v)};
function playerName(id,fallback){const s=state(),p=(s?.players||[]).find(x=>String(x.id)===String(id));if(!p)return fallback||'Joueur';if(p.is_group_member!==false)return p.name;const host=(s.players||[]).find(x=>String(x.id)===String(p.guest_of_player_id||''));return host?p.name+' • Guest de '+host.name:p.name+' • Guest — invitant non renseigné'}
function close(){document.getElementById('sweRatingReportModal4394')?.remove()}
function show(report){
 const rows=Array.isArray(report.player_summary)?report.player_summary:[],evaluators=Array.isArray(report.evaluators)?report.evaluators:[],ratings=Array.isArray(report.ratings)?report.ratings:[];
 close();const modal=document.createElement('div');modal.id='sweRatingReportModal4394';modal.className='swe-rating-report-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
 modal.innerHTML='<div class="swe-rating-report-panel"><button type="button" class="swe-rating-report-close" data-close-report>✕ Fermer</button><h2>⭐ Rapport des notes — '+esc(report.tournament_name||'Swé')+'</h2><div class="muted">'+esc(report.tournament_date||'')+' • '+(report.expired?'Période terminée':'Notation ouverte jusqu’au '+esc(fmt(report.closes_at)))+'</div><div class="swe-eval-summary" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px"><div class="swe-eval-kpi"><b>'+rows.length+'</b><small>profils notés</small></div><div class="swe-eval-kpi"><b>'+evaluators.length+'</b><small>évaluateurs invités</small></div><div class="swe-eval-kpi"><b>'+ratings.length+'</b><small>notes reçues</small></div></div><h3>État des évaluateurs</h3><div>'+((evaluators.length?evaluators.map(e=>'<div class="player row" style="justify-content:space-between"><span>'+esc(e.email||'Co-gestionnaire')+'</span><b>'+(e.completed_at?'✅ Terminé':'⏳ En attente')+(Number(e.ratings_count||0)?' • '+Number(e.ratings_count)+' note(s)':'')+'</b></div>').join(''):'<p class="muted">Aucun évaluateur désigné.</p>'))+'</div><h3>Moyennes par joueur</h3><div style="overflow:auto"><table class="swe-rating-report-table"><thead><tr><th>Joueur</th><th>Votants</th><th>Moyenne</th></tr></thead><tbody>'+(rows.length?rows.map(r=>'<tr><td><b>'+esc(playerName(r.player_id,r.player_name))+'</b></td><td>'+Number(r.voters||0)+'</td><td>'+(r.avg_rating==null?'—':Number(r.avg_rating).toFixed(2)+'/5')+'</td></tr>').join(''):'<tr><td colspan="3">Le rapport est ouvert, mais aucune note n’a encore été envoyée pour ce tournoi.</td></tr>')+'</tbody></table></div></div>';
 document.body.appendChild(modal);modal.querySelector('[data-close-report]').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};modal.querySelector('[data-close-report]').focus();
}
async function open(tournamentId,button){
 if(!isAdminUser()||!tournamentId)return;const c=client();if(!c)return;const old=button.textContent;button.disabled=true;button.textContent='Ouverture…';
 try{const r=await c.rpc('admin_get_tournament_rating_report_v2',{p_tournament_id:tournamentId});if(r.error)throw r.error;if(!r.data)throw new Error('Rapport indisponible');show(r.data)}catch(error){if(typeof toast==='function')toast('Rapport impossible à ouvrir : '+(error.message||error));else alert(error.message||error)}finally{button.disabled=false;button.textContent=old}
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-swe-report],[data-report]');if(!b||!isAdminUser())return;e.preventDefault();e.stopImmediatePropagation();open(b.dataset.sweReport||b.dataset.report,b)},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
})();

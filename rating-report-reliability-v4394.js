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
 const players=Array.isArray(report.player_addons)?report.player_addons:[],evaluators=Array.isArray(report.evaluators)?report.evaluators:[];
 const completed=evaluators.filter(e=>e.has_voted||e.completed_at).length;
 close();const modal=document.createElement('div');modal.id='sweRatingReportModal4394';modal.className='swe-rating-report-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
 modal.innerHTML='<div class="swe-rating-report-panel"><button type="button" class="swe-rating-report-close" data-close-report>✕ Fermer</button><h2>⭐ Suivi des notations — '+esc(report.tournament_name||'Swé')+'</h2><div class="muted">'+esc(report.tournament_date||'')+' • '+(report.expired?'Période terminée':'Notation ouverte jusqu’au '+esc(fmt(report.closes_at)))+'</div><p class="muted" style="margin-top:10px">Réservé à l’administrateur : la progression des votes est visible, mais aucune note, moyenne ou appréciation individuelle ne l’est.</p><div class="swe-eval-summary" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px"><div class="swe-eval-kpi"><b>'+evaluators.length+'</b><small>personnes attendues</small></div><div class="swe-eval-kpi"><b>'+completed+'</b><small>votes finalisés</small></div><div class="swe-eval-kpi"><b>'+players.length+'</b><small>profils enrichis</small></div></div><h3>État des votants</h3><div>'+((evaluators.length?evaluators.map(e=>'<div class="player row" style="justify-content:space-between"><span><b>'+esc(e.display_name||'Membre')+'</b><small class="muted"> • '+esc(e.role||'Co-gestionnaire')+'</small></span><b>'+(e.has_voted||e.completed_at?'✅ A finalisé':Number(e.submitted_ratings||0)>0?'🟡 '+Number(e.submitted_ratings)+' joueur(s) noté(s) — à finaliser':'⏳ En attente')+'</b></div>').join(''):'<p class="muted">Aucun évaluateur désigné.</p>'))+'</div><h3>Add-on attribué aux joueurs notés</h3><p class="muted">Leur évaluation sera prise en compte lors des prochains tirages équilibrés.</p><div style="overflow:auto"><table class="swe-rating-report-table"><thead><tr><th>Joueur</th><th>Avantage</th></tr></thead><tbody>'+(players.length?players.map(p=>'<tr><td><b>'+esc(playerName(p.player_id,p.player_name))+'</b></td><td><b>'+esc(p.addon_label||'Profil SWÉ enrichi')+'</b><br><small>'+esc(p.addon_description||'Évaluation prise en compte pour les prochains tirages équilibrés.')+'</small></td></tr>').join(''):'<tr><td colspan="2">Aucun profil noté pour le moment.</td></tr>')+'</tbody></table></div></div>';
 document.body.appendChild(modal);modal.querySelector('[data-close-report]').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};modal.querySelector('[data-close-report]').focus();
}
async function open(tournamentId,button){
 if(!isAdminUser()||!tournamentId)return;const c=client();if(!c)return;const old=button.textContent;button.disabled=true;button.textContent='Ouverture…';
 try{const r=await c.rpc('admin_get_tournament_rating_report_v2',{p_tournament_id:tournamentId});if(r.error)throw r.error;if(!r.data)throw new Error('Rapport indisponible');show(r.data)}catch(error){if(typeof toast==='function')toast('Rapport impossible à ouvrir : '+(error.message||error));else alert(error.message||error)}finally{button.disabled=false;button.textContent=old}
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-swe-report],[data-report]');if(!b||!isAdminUser())return;e.preventDefault();e.stopImmediatePropagation();open(b.dataset.sweReport||b.dataset.report,b)},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
})();

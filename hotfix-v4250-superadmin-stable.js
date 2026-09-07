(()=>{
'use strict';
const E=id=>document.getElementById(id);
let activeView=sessionStorage.getItem('SWE_SA_ACTIVE_VIEW')||'overview';
let allGroupPlayers=[];
let playersLoaded=false;
let playersLoading=false;
let reinforcing=false;
function isSA(){try{return typeof S!=='undefined'&&S.isSuperAdmin===true}catch(_){return false}}
function esc(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function syncActive(){
  E('sweSa4250Side')?.querySelectorAll('[data-sa50]').forEach(b=>b.classList.toggle('active',b.dataset.sa50===activeView));
  document.querySelectorAll('#sa48Sidebar [data-sa48]').forEach(b=>b.classList.toggle('active',b.dataset.sa48===activeView));
}
function oldButton(view){return document.querySelector(`#sa48Sidebar [data-sa48="${view}"]`)}
function invokeLegacy(view){const b=oldButton(view);if(!b)return false;b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true}
function venueCard(){return E('saVenueList')?.closest('.card')||null}
function settingsCards(){return [E('saConsentControl'),document.querySelector('.sa-footer-editor')].filter(Boolean)}
function hideEverything(){
  document.querySelectorAll('.sa48-view').forEach(x=>x.classList.remove('active'));
  ['saSpacesSection','saPlayersSection','saPreviewSection47','swePublicVisualCatalog'].forEach(id=>E(id)?.classList.add('hidden'));
  venueCard()?.classList.add('hidden');
  settingsCards().forEach(x=>x.classList.add('hidden'));
}
function forceVisibleView(view){
  if(!isSA()||reinforcing)return;
  reinforcing=true;
  try{
    hideEverything();
    if(view==='spaces')E('saSpacesSection')?.classList.remove('hidden');
    else if(view==='players')E('saPlayersSection')?.classList.remove('hidden');
    else if(view==='venues')venueCard()?.classList.remove('hidden');
    else if(view==='visuals')E('swePublicVisualCatalog')?.classList.remove('hidden');
    else if(view==='settings')settingsCards().forEach(x=>x.classList.remove('hidden'));
    else E('sa48-'+view)?.classList.add('active');
    syncActive();
  }finally{reinforcing=false}
}
function reinforceSoon(){
  queueMicrotask(()=>forceVisibleView(activeView));
  setTimeout(()=>forceVisibleView(activeView),30);
  setTimeout(()=>forceVisibleView(activeView),140);
}
function playerSearchValue(){return (E('saSearchPlayer')?.value||'').trim().toLowerCase()}
function renderAllGroupPlayers(){
  const box=E('saPlayersList');if(!box)return;
  const q=playerSearchValue();
  const rows=allGroupPlayers.filter(r=>!q||[r.player_name,r.workspace_name,r.group_player_code,r.swe_player_id,r.player_id].some(v=>String(v||'').toLowerCase().includes(q)));
  const pill=E('saPlayersCountPill');if(pill)pill.textContent=allGroupPlayers.length+' inscription'+(allGroupPlayers.length>1?'s':'')+' joueurs';
  const stats=E('saPlayerStats');if(stats){const swe=allGroupPlayers.filter(r=>r.swe_player_id).length;const groups=new Set(allGroupPlayers.map(r=>r.workspace_id)).size;stats.innerHTML='<div><span>👥</span><b>'+allGroupPlayers.length+'</b><small>Inscriptions groupes</small></div><div><span>🪪</span><b>'+swe+'</b><small>ID SWÉ créés</small></div><div><span>🏟️</span><b>'+groups+'</b><small>Groupes</small></div>';}
  box.innerHTML=rows.length?`<div style="overflow:auto"><table class="sa48-table" style="width:100%"><thead><tr><th>Joueur</th><th>Groupe</th><th>ID groupe</th><th>ID SWÉ</th><th>Statut</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.player_name||'Joueur')}</b></td><td>${esc(r.workspace_name||'—')}</td><td><code>${esc(r.group_player_code||'—')}</code></td><td>${r.swe_player_id?`<code>${esc(r.swe_player_id)}</code>`:'<span class="muted">Non créé</span>'}</td><td>${r.active===false?'🔴 Inactif':r.is_group_member===false?'🟠 Invité':'🟢 Membre'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="muted" style="padding:18px">Aucun joueur trouvé.</div>';
}
async function loadAllGroupPlayers(force=false){
  if(playersLoading||(!force&&playersLoaded))return;
  playersLoading=true;
  try{
    const r=await sb.rpc('super_admin_get_all_group_players_v1');
    if(r.error)throw r.error;
    allGroupPlayers=Array.isArray(r.data)?r.data:[];
    playersLoaded=true;
    renderAllGroupPlayers();
  }catch(e){console.warn('super admin all players',e);const box=E('saPlayersList');if(box)box.innerHTML='<div class="muted">Impossible de charger l’annuaire global des joueurs.</div>'}
  finally{playersLoading=false}
}
async function navigate(view){
  if(!isSA())return;
  activeView=view||'overview';
  sessionStorage.setItem('SWE_SA_ACTIVE_VIEW',activeView);
  syncActive();
  if(activeView==='visuals'){
    if(typeof ensureCatalog==='function')ensureCatalog();
    forceVisibleView('visuals');
    window.scrollTo({top:0,behavior:'smooth'});
    return;
  }
  invokeLegacy(activeView);
  forceVisibleView(activeView);
  if(activeView==='players'){
    await loadAllGroupPlayers();
    renderAllGroupPlayers();
    forceVisibleView('players');
  }
  reinforceSoon();
  window.scrollTo({top:0,behavior:'smooth'});
}
function wire(){
  if(window.__SWE_SA_ONE_ROUTER_V2)return;window.__SWE_SA_ONE_ROUTER_V2=true;
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#sweSa4250Side [data-sa50]');if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();navigate(b.dataset.sa50);
  },true);
  document.addEventListener('input',e=>{if(e.target?.id==='saSearchPlayer')renderAllGroupPlayers()});
  document.addEventListener('swe:rendered',()=>{
    if(!isSA())return;
    reinforceSoon();
    if(activeView==='players'){setTimeout(()=>{renderAllGroupPlayers();forceVisibleView('players')},80)}
  });
}
function boot(){
  if(!isSA())return;
  wire();syncActive();
  setTimeout(()=>navigate(activeView),100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1200),{once:true});else setTimeout(boot,1200);
window.addEventListener('pageshow',()=>setTimeout(()=>{if(isSA()){wire();navigate(activeView)}},420));
})();

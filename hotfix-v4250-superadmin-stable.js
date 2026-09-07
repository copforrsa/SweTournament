(()=>{
'use strict';
const E=id=>document.getElementById(id);
let activeView=sessionStorage.getItem('SWE_SA_ACTIVE_VIEW')||'overview';
let allGroupPlayers=[];
let playersLoaded=false;
let playersLoading=false;
function isSA(){try{return typeof S!=='undefined'&&S.isSuperAdmin===true}catch(_){return false}}
function esc(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function syncActive(){E('sweSa4250Side')?.querySelectorAll('[data-sa50]').forEach(b=>b.classList.toggle('active',b.dataset.sa50===activeView))}
function oldButton(view){return document.querySelector(`#sa48Sidebar [data-sa48="${view}"]`)}
function invokeLegacy(view){const b=oldButton(view);if(!b)return false;b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true}
function hideCatalog(){E('swePublicVisualCatalog')?.classList.add('hidden')}
function showCatalog(){
  const p=E('superAdminPanel');if(!p)return;
  document.querySelectorAll('.sa48-view').forEach(x=>x.classList.remove('active'));
  ['saSpacesSection','saPlayersSection','saPreviewSection47'].forEach(id=>E(id)?.classList.add('hidden'));
  if(typeof ensureVisualCatalog==='function')ensureVisualCatalog();
  E('swePublicVisualCatalog')?.classList.remove('hidden');
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
function installPlayerRenderer(){
  if(window.__SWE_SA_PLAYER_RENDER_OVERRIDDEN)return;
  window.__SWE_SA_PLAYER_RENDER_OVERRIDDEN=true;
  if(typeof window.renderSuperAdminPlayers==='function')window.__SWE_ORIGINAL_RENDER_SUPER_PLAYERS=window.renderSuperAdminPlayers;
  window.renderSuperAdminPlayers=function(){renderAllGroupPlayers();if(!playersLoaded)loadAllGroupPlayers()};
  document.addEventListener('input',e=>{if(e.target?.id==='saSearchPlayer')renderAllGroupPlayers()});
}
async function navigate(view){
  if(!isSA())return;
  activeView=view||'overview';
  sessionStorage.setItem('SWE_SA_ACTIVE_VIEW',activeView);
  syncActive();
  if(activeView==='visuals'){showCatalog();window.scrollTo({top:0,behavior:'smooth'});return;}
  hideCatalog();
  invokeLegacy(activeView);
  if(activeView==='players'){
    E('saPlayersSection')?.classList.remove('hidden');
    await loadAllGroupPlayers();
    renderAllGroupPlayers();
  }
  window.scrollTo({top:0,behavior:'smooth'});
}
function wire(){
  if(window.__SWE_SA_ONE_ROUTER)return;window.__SWE_SA_ONE_ROUTER=true;
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#sweSa4250Side [data-sa50]');if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();navigate(b.dataset.sa50);
  },true);
  document.addEventListener('swe:rendered',()=>{
    if(activeView==='players'&&isSA())setTimeout(renderAllGroupPlayers,80);
  });
}
function boot(){if(!isSA())return;installPlayerRenderer();wire();syncActive();setTimeout(()=>navigate(activeView),120)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1200),{once:true});else setTimeout(boot,1200);
window.addEventListener('pageshow',()=>setTimeout(()=>{if(isSA()){installPlayerRenderer();syncActive()}},350));
})();

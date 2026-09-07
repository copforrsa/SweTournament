(()=>{
'use strict';
const E=id=>document.getElementById(id);
let activeView=sessionStorage.getItem('SWE_SA_ACTIVE_VIEW')||'overview';
let applying=false;
function isSA(){try{return typeof S!=='undefined'&&S.isSuperAdmin===true}catch(_){return false}}
function syncActive(){E('sweSa4250Side')?.querySelectorAll('[data-sa50]').forEach(b=>b.classList.toggle('active',b.dataset.sa50===activeView));}
function oldButton(view){return document.querySelector(`#sa48Sidebar [data-sa48="${view}"]`)}
function clickOld(view){const b=oldButton(view);if(!b)return false;b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true}
async function ensurePlayers(){
  try{
    if((!Array.isArray(S.superPlayers)||!S.superPlayers.length)&&typeof loadSuperAdminWorkspaces==='function')await loadSuperAdminWorkspaces();
    if(typeof renderSuperAdminPlayers==='function')renderSuperAdminPlayers();
  }catch(e){console.warn('SA players refresh',e)}
}
function hideCustomVisuals(){E('swePublicVisualCatalog')?.classList.add('hidden')}
async function enforce(view){
  if(applying||!isSA())return;applying=true;
  try{
    activeView=view||activeView||'overview';
    sessionStorage.setItem('SWE_SA_ACTIVE_VIEW',activeView);
    syncActive();
    if(activeView==='visuals'){
      clickOld('visuals');
      setTimeout(()=>{try{document.querySelectorAll('.sa48-view').forEach(x=>x.classList.remove('active'));['saSpacesSection','saPlayersSection','saPreviewSection47'].forEach(id=>E(id)?.classList.add('hidden'));if(typeof ensureVisualCatalog==='function')ensureVisualCatalog();E('swePublicVisualCatalog')?.classList.remove('hidden');syncActive();}catch(_){ }},20);
      return;
    }
    hideCustomVisuals();
    clickOld(activeView);
    if(activeView==='players'){
      await ensurePlayers();
      E('saPlayersSection')?.classList.remove('hidden');
    }
  }finally{setTimeout(()=>{applying=false},40)}
}
function wire(){
  if(window.__SWE_SA_STABLE_WIRED)return;window.__SWE_SA_STABLE_WIRED=true;
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#sweSa4250Side [data-sa50]');if(!b)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    enforce(b.dataset.sa50);
  },true);
  document.addEventListener('swe:rendered',()=>setTimeout(()=>enforce(activeView),160));
  window.addEventListener('pageshow',()=>setTimeout(()=>enforce(activeView),250));
}
function boot(){if(!isSA())return;wire();setTimeout(()=>enforce(activeView),120)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1100),{once:true});else setTimeout(boot,1100);
})();

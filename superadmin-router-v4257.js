(()=>{
'use strict';
// Autorité unique de navigation Super Admin.
window.__SWE_SA_ONE_ROUTER_V4=true;
window.SWE_SUPERADMIN_ROUTER='superadmin-router-v4257.js';
const E=id=>document.getElementById(id);
let current=sessionStorage.getItem('SWE_SA_ACTIVE_VIEW')||'overview';
let busy=false;
const CUSTOM={
  players:'sweSaPlayersDirectory',
  venues:'sweSaVenues',
  payments:'sweSaPayments',
  visuals:'swePublicVisualCatalog',
  organizers:'sweSaOrganizersPage',
  subscriptions:'sweSaCatalogPage'
};
function isSA(){try{return typeof S!=='undefined'&&S.isSuperAdmin===true}catch(_){return false}}
function side(){return E('sweSa4250Side')}
function setActive(view){
  current=view||'overview';
  sessionStorage.setItem('SWE_SA_ACTIVE_VIEW',current);
  document.body.dataset.sweSaView=current;
  side()?.querySelectorAll('[data-sa50]').forEach(b=>b.classList.toggle('active',b.dataset.sa50===current));
}
function hideAll(){
  document.querySelectorAll('.sa48-view').forEach(x=>x.classList.remove('active'));
  ['saSpacesSection','saPlayersSection','saPreviewSection47','swePublicVisualCatalog','sweSaPlayersDirectory','sweSaVenues','sweSaPayments','sweSaWelcomeSetting','sweSaCatalogPage','sweSaOrganizersPage','sweSaSubscriptionsPage'].forEach(id=>{const x=E(id);if(x){x.classList.add('hidden');x.classList.remove('active')}});
  const venue=E('saVenueList')?.closest('.card');if(venue)venue.classList.add('hidden');
  E('saConsentControl')?.classList.add('hidden');
  document.querySelector('.sa-footer-editor')?.classList.add('hidden');
  document.querySelectorAll('#superAdminPanel > .sa-stats-grid').forEach(x=>x.style.display=current==='overview'?'':'none');
}
function show(id){const x=E(id);if(x){x.classList.remove('hidden');x.classList.add('active')}return x}
function oldButton(view){return document.querySelector(`#sa48Sidebar [data-sa48="${view}"]`)}
function proxyLegacy(view){
  const b=oldButton(view);
  if(b)b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
}
function refreshCustom(view){
  if(view==='players')E('sweSaPlayersRefresh')?.click();
  if(view==='venues')E('sweSaVenuesRefresh')?.click();
  if(view==='payments')E('sweSaPaymentsRefresh')?.click();
}
async function navigate(view){
  if(!isSA()||busy)return;
  busy=true;
  try{
    setActive(view);
    // Pour les vues commerce, la classe active est le signal unique au renderer commerce.
    if(view==='organizers'||view==='subscriptions'){
      hideAll();
      // Le renderer commerce est chargé après ce routeur : lui laisser un cycle puis forcer sa vue si elle existe déjà.
      setTimeout(()=>{
        const id=CUSTOM[view];
        if(E(id)){hideAll();show(id)}
      },70);
      document.dispatchEvent(new CustomEvent('swe:superadmin:navigate',{detail:{view}}));
      return;
    }
    hideAll();
    if(CUSTOM[view]){
      show(CUSTOM[view]);
      refreshCustom(view);
      return;
    }
    if(view==='settings'){
      proxyLegacy('settings');
      setTimeout(()=>{
        hideAll();
        show('sweSaWelcomeSetting');
        E('saConsentControl')?.classList.remove('hidden');
        document.querySelector('.sa-footer-editor')?.classList.remove('hidden');
      },30);
      return;
    }
    // Vue d'ensemble, espaces, sécurité, support : conserver les renderers historiques,
    // mais une seule autorité décide de la navigation.
    proxyLegacy(view);
    setTimeout(()=>{
      if(view==='spaces')show('saSpacesSection');
      else E('sa48-'+view)?.classList.add('active');
    },20);
  }finally{busy=false}
}
function wire(){
  if(window.__SWE_SUPERADMIN_ROUTER_4257_WIRED)return;
  window.__SWE_SUPERADMIN_ROUTER_4257_WIRED=true;
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#sweSa4250Side [data-sa50]');
    if(!b)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    navigate(b.dataset.sa50);
  },true);
  document.addEventListener('swe:rendered',()=>setTimeout(()=>navigate(current),80));
  window.addEventListener('pageshow',()=>setTimeout(()=>navigate(current),120));
}
function boot(){
  if(!isSA()){setTimeout(boot,250);return}
  wire();
  setTimeout(()=>navigate(current),300);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900),{once:true});else setTimeout(boot,900);
window.SWE_SUPERADMIN_NAVIGATE=navigate;
})();
(()=>{
'use strict';
const E=id=>document.getElementById(id);
let enforcing=false;
function isSA(){try{return typeof S!=='undefined'&&S.isSuperAdmin===true}catch(_){return false}}
function activeView(){return sessionStorage.getItem('SWE_SA_ACTIVE_VIEW')||E('sweSa4250Side')?.querySelector('[data-sa50].active')?.dataset.sa50||'overview'}
function hideLegacy(){
 document.querySelectorAll('.sa48-view').forEach(x=>x.classList.remove('active'));
 ['sweSaSubscriptionsPage','saSpacesSection','saPlayersSection','saPreviewSection47','swePublicVisualCatalog','sweSaPlayersDirectory','sweSaVenues','sweSaPayments','sweSaWelcomeSetting','sweSaWelcomeQuick','sweSaConsentQuick'].forEach(id=>{const x=E(id);if(x){x.classList.add('hidden');x.classList.remove('active')}});
 document.querySelectorAll('#superAdminPanel > .sa-stats-grid').forEach(x=>x.style.display='none');
}
function setActiveButton(view){E('sweSa4250Side')?.querySelectorAll('[data-sa50]').forEach(b=>b.classList.toggle('active',b.dataset.sa50===view))}
async function forceCommerce(view){
 if(!isSA()||!['organizers','subscriptions'].includes(view)||enforcing)return;
 enforcing=true;
 try{
  sessionStorage.setItem('SWE_SA_ACTIVE_VIEW',view);
  document.body.dataset.sweSaView=view;
  setActiveButton(view);
  hideLegacy();
  const cat=E('sweSaCatalogPage'),org=E('sweSaOrganizersPage');
  if(view==='subscriptions'){
    org?.classList.remove('active');org?.classList.add('hidden');
    if(cat){cat.classList.remove('hidden');cat.classList.add('active')}
  }else{
    cat?.classList.remove('active');cat?.classList.add('hidden');
    if(org){org.classList.remove('hidden');org.classList.add('active')}
  }
 }finally{enforcing=false}
}
function wire(){
 if(window.__SWE_SA_COMMERCE_AUTHORITY_4251)return;window.__SWE_SA_COMMERCE_AUTHORITY_4251=true;
 document.addEventListener('click',e=>{
   const b=e.target.closest?.('#sweSa4250Side [data-sa50]');if(!b)return;
   const v=b.dataset.sa50;
   if(v==='organizers'||v==='subscriptions'){
     sessionStorage.setItem('SWE_SA_ACTIVE_VIEW',v);
     setTimeout(()=>forceCommerce(v),40);setTimeout(()=>forceCommerce(v),180);setTimeout(()=>forceCommerce(v),500);
   }
 },true);
 document.addEventListener('swe:rendered',()=>{const v=activeView();if(v==='organizers'||v==='subscriptions')setTimeout(()=>forceCommerce(v),60)});
 window.addEventListener('pageshow',()=>{const v=activeView();if(v==='organizers'||v==='subscriptions')setTimeout(()=>forceCommerce(v),120)});
 const side=E('sweSa4250Side');if(side)new MutationObserver(()=>{const v=activeView();if(v==='organizers'||v==='subscriptions')setTimeout(()=>forceCommerce(v),20)}).observe(side,{subtree:true,attributes:true,attributeFilter:['class']});
}
function boot(){if(!isSA())return;wire();const v=activeView();if(v==='organizers'||v==='subscriptions')setTimeout(()=>forceCommerce(v),120)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1900),{once:true});else setTimeout(boot,1900);
})();
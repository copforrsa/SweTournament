(()=>{
'use strict';
const ADMIN_PATH='/forssadmin/';
const entryFromQuery=new URLSearchParams(location.search).get('swe_admin_entry')==='1';
const entryFromPath=location.pathname.replace(/\/+$/,'/')===ADMIN_PATH;
const adminEntry=entryFromQuery||entryFromPath||sessionStorage.getItem('SWE_ADMIN_ENTRY')==='1';
window.SWE_ADMIN_ENTRY_ACTIVE=!!adminEntry;

function ensureBase(){
  if(document.querySelector('base[data-swe-admin-base]'))return;
  const b=document.createElement('base');b.href='/';b.dataset.sweAdminBase='1';
  document.head.prepend(b);
}
function hideLegacyAdmin(){
  const p=document.getElementById('superAdminPanel');
  if(!p)return;
  p.querySelector(':scope > .sa-hero')?.classList.add('hidden');
  p.querySelector(':scope > .sa-admin-tabs')?.classList.add('hidden');
  const oldSummary=document.getElementById('saSummaryCards');if(oldSummary)oldSummary.style.display='none';
  document.getElementById('sa48Sidebar')?.classList.add('hidden');
}
function installCss(){
  if(document.getElementById('sweAdminGateStyle'))return;
  const s=document.createElement('style');s.id='sweAdminGateStyle';
  s.textContent=`body:not(.swe-admin-entry) #superAdminPanel,body:not(.swe-admin-entry) #sweSa4250Side,body:not(.swe-admin-entry) #sa48Sidebar{display:none!important}body.swe-admin-entry #superAdminPanel>.sa-hero,body.swe-admin-entry #superAdminPanel>.sa-admin-tabs,body.swe-admin-entry #saSummaryCards{display:none!important}`;
  document.head.appendChild(s);
}
function showAppLogin(message){
  document.getElementById('main')?.classList.add('hidden');
  document.getElementById('auth')?.classList.remove('hidden');
  document.getElementById('superAdminPanel')?.classList.add('hidden');
  document.getElementById('sweSa4250Side')?.classList.add('hidden');
  document.body.classList.remove('swe-sa4250','swe-super48');
  if(message){
    const t=document.getElementById('toast');
    if(t){t.textContent=message;t.style.display='block';setTimeout(()=>t.style.display='none',4200)}
  }
}
async function denySuperAdminOnPublicApp(){
  try{
    if(typeof sb==='undefined'||!sb?.auth)return false;
    const {data:check,error}=await sb.rpc('is_platform_super_admin');
    if(error||check!==true)return false;
    try{if(typeof S!=='undefined')S.isSuperAdmin=false}catch(_){}
    try{await sb.auth.signOut({scope:'local'})}catch(_){try{await sb.auth.signOut()}catch(__){}}
    showAppLogin('Accès Super Admin réservé à /forssadmin.');
    return true;
  }catch(_){return false}
}
function installInitGate(){
  if(window.__SWE_ADMIN_INIT_GATE_4258)return;
  window.__SWE_ADMIN_INIT_GATE_4258=true;
  const original=typeof initSuperAdmin==='function'?initSuperAdmin:null;
  if(!original)return;
  window.initSuperAdmin=async function(){
    if(window.SWE_ADMIN_ENTRY_ACTIVE===true){
      const ok=await original();
      if(ok){document.body.classList.add('swe-admin-entry');hideLegacyAdmin()}
      return ok;
    }
    return await denySuperAdminOnPublicApp();
  };
}
function normalizeAdminUrl(){
  if(!adminEntry)return;
  sessionStorage.setItem('SWE_ADMIN_ENTRY','1');
  ensureBase();
  document.body.classList.add('swe-admin-entry');
  if(location.pathname!==ADMIN_PATH||entryFromQuery){
    history.replaceState({},'',ADMIN_PATH);
  }
}
function boot(){
  installCss();
  if(adminEntry){normalizeAdminUrl();hideLegacyAdmin()}else{
    sessionStorage.removeItem('SWE_ADMIN_ENTRY');
    document.body.classList.remove('swe-admin-entry');
  }
  installInitGate();
  if(adminEntry){
    const mo=new MutationObserver(()=>hideLegacyAdmin());
    mo.observe(document.documentElement,{subtree:true,childList:true});
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
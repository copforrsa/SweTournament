(()=>{
'use strict';
const E=id=>document.getElementById(id);
let stableState='unknown';
let lastSession=null;
let busy=false;
let enforceTimer=null;
let nullConfirmTimer=null;
function publicContext(){
  try{
    if(typeof S!=='undefined'&&S.publicMode===true)return true;
    const q=new URLSearchParams(location.search);
    return q.has('public')||q.has('s')||q.has('pay')||q.has('paydesk')||q.has('paydesk_session')||q.has('history')||q.has('season');
  }catch(_){return false}
}
function enforcePublicUi(){
  if(!publicContext())return false;
  E('auth')?.classList.add('hidden');
  E('main')?.classList.add('hidden');
  E('publicView')?.classList.remove('hidden');
  hideSuperAdminShell();
  document.body.classList.add('swe-public-only');
  return true;
}
function hideSuperAdminShell(){
  E('sweSa4250Side')?.classList.add('hidden');
  E('sa48Sidebar')?.classList.add('hidden');
  document.body.classList.remove('swe-sa4250','swe-super48');
}
function applyAuthenticated(session){
  if(!session)return;
  stableState='authenticated';
  lastSession=session;
  try{if(typeof S!=='undefined')S.session=session}catch(_){}
  if(enforcePublicUi())return;
  E('auth')?.classList.add('hidden');
  E('main')?.classList.remove('hidden');
  try{
    if(typeof S!=='undefined'&&S.isSuperAdmin===true){
      E('sweSa4250Side')?.classList.remove('hidden');
      document.body.classList.add('swe-sa4250');
    }
  }catch(_){}
}
function applyLoggedOut(){
  stableState='loggedout';
  lastSession=null;
  try{if(typeof S!=='undefined')S.session=null}catch(_){}
  if(enforcePublicUi())return;
  E('main')?.classList.add('hidden');
  E('auth')?.classList.remove('hidden');
  hideSuperAdminShell();
}
function enforceStableUi(){
  if(enforcePublicUi())return;
  if(stableState==='authenticated'&&lastSession){
    E('auth')?.classList.add('hidden');
    E('main')?.classList.remove('hidden');
    try{
      if(typeof S!=='undefined'&&S.isSuperAdmin===true){
        E('sweSa4250Side')?.classList.remove('hidden');
        document.body.classList.add('swe-sa4250');
      }
    }catch(_){}
  }else if(stableState==='loggedout'){
    E('main')?.classList.add('hidden');
    E('auth')?.classList.remove('hidden');
    hideSuperAdminShell();
  }
}
function confirmNullSession(){
  clearTimeout(nullConfirmTimer);
  nullConfirmTimer=setTimeout(async()=>{
    if(enforcePublicUi())return;
    if(typeof sb==='undefined'||!sb?.auth?.getSession)return;
    try{
      const {data,error}=await sb.auth.getSession();
      if(error)return;
      if(data?.session)applyAuthenticated(data.session);
      else if(stableState!=='authenticated'||!lastSession)applyLoggedOut();
    }catch(_){}
  },700);
}
async function reconcile({allowLogout=false}={}){
  if(enforcePublicUi())return;
  if(busy||typeof sb==='undefined'||!sb?.auth?.getSession)return;
  busy=true;
  try{
    const {data,error}=await sb.auth.getSession();
    if(error)return;
    const session=data?.session||null;
    if(session)applyAuthenticated(session);
    else if(allowLogout)confirmNullSession();
    else if(stableState==='unknown')confirmNullSession();
  }catch(_){}finally{busy=false}
}
function boot(){
  if(typeof sb==='undefined'||!sb?.auth){setTimeout(boot,120);return}
  if(enforcePublicUi()){
    // Sur une URL publique, la session éventuellement ouverte de l'organisateur
    // ne doit jamais remettre en scène #main ni la navigation privée.
    const mo=new MutationObserver(()=>{
      clearTimeout(enforceTimer);
      enforceTimer=setTimeout(enforcePublicUi,20);
    });
    mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    return;
  }
  sb.auth.onAuthStateChange((event,session)=>{
    if(publicContext()){enforcePublicUi();return}
    if(event==='SIGNED_OUT'){
      clearTimeout(nullConfirmTimer);
      applyLoggedOut();
      return;
    }
    if(session&&(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||event==='INITIAL_SESSION'||event==='USER_UPDATED'||event==='PASSWORD_RECOVERY')){
      clearTimeout(nullConfirmTimer);
      applyAuthenticated(session);
      return;
    }
    if(event==='INITIAL_SESSION'&&!session)confirmNullSession();
  });
  reconcile({allowLogout:false});
  const mo=new MutationObserver(()=>{
    clearTimeout(enforceTimer);
    enforceTimer=setTimeout(enforceStableUi,30);
  });
  mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('pageshow',()=>setTimeout(()=>reconcile({allowLogout:true}),120));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')setTimeout(()=>reconcile({allowLogout:true}),120);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,250),{once:true});else setTimeout(boot,250);
})();
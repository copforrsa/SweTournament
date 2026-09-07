(()=>{
'use strict';
const E=id=>document.getElementById(id);
let stableState='unknown';
let lastSession=null;
let busy=false;
let enforceTimer=null;
let nullConfirmTimer=null;
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
  E('main')?.classList.add('hidden');
  E('auth')?.classList.remove('hidden');
  hideSuperAdminShell();
}
function enforceStableUi(){
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
  sb.auth.onAuthStateChange((event,session)=>{
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
  // Une seule autorité visuelle : si un ancien hotfix tente de réafficher le login,
  // on réapplique l'état stable sans relire la session en boucle.
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
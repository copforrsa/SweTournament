(()=>{
'use strict';
const E=id=>document.getElementById(id);
let lastSession=null;
let busy=false;
function hideSuperAdminShell(){
  E('sweSa4250Side')?.classList.add('hidden');
  E('sa48Sidebar')?.classList.add('hidden');
  document.body.classList.remove('swe-sa4250','swe-super48');
}
function showAuthenticatedShell(session){
  if(!session)return;
  lastSession=session;
  try{if(typeof S!=='undefined')S.session=session}catch(_){}
  E('auth')?.classList.add('hidden');
  E('main')?.classList.remove('hidden');
  // Le menu Super Admin n'est réaffiché que si l'application a confirmé le rôle.
  try{
    if(typeof S!=='undefined'&&S.isSuperAdmin===true){
      E('sweSa4250Side')?.classList.remove('hidden');
      document.body.classList.add('swe-sa4250');
    }
  }catch(_){}
}
function showLoggedOutShell(){
  lastSession=null;
  try{if(typeof S!=='undefined')S.session=null}catch(_){}
  E('main')?.classList.add('hidden');
  E('auth')?.classList.remove('hidden');
  hideSuperAdminShell();
}
async function reconcile(){
  if(busy||typeof sb==='undefined'||!sb?.auth?.getSession)return;
  busy=true;
  try{
    const {data,error}=await sb.auth.getSession();
    if(error)return;
    const session=data?.session||null;
    if(session)showAuthenticatedShell(session);else showLoggedOutShell();
  }catch(_){}finally{busy=false}
}
function boot(){
  if(typeof sb==='undefined'||!sb?.auth){setTimeout(boot,120);return}
  sb.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT')showLoggedOutShell();
    else if(session&&(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||event==='INITIAL_SESSION'||event==='USER_UPDATED'))showAuthenticatedShell(session);
    setTimeout(reconcile,80);
  });
  reconcile();
  setInterval(()=>{
    const authVisible=E('auth')&&!E('auth').classList.contains('hidden');
    const menuVisible=E('sweSa4250Side')&&!E('sweSa4250Side').classList.contains('hidden');
    // On ne fait une vérification que si l'UI est incohérente ou après une session connue.
    if(lastSession||authVisible||menuVisible)reconcile();
  },2500);
  window.addEventListener('pageshow',()=>setTimeout(reconcile,100));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(reconcile,100)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,300),{once:true});else setTimeout(boot,300);
})();
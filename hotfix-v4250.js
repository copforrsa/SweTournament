(()=>{
'use strict';
let timer=null;
let cleanupDone=false;
async function cleanupLegacyRuntime(){
  if(cleanupDone)return;
  cleanupDone=true;
  try{
    if('serviceWorker' in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister().catch(()=>false)));
    }
  }catch(_){}
  try{
    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
  }catch(_){}
}
function injectAuthStability(){
  if(document.getElementById('sweAuth4250Style'))return;
  const s=document.createElement('style');
  s.id='sweAuth4250Style';
  s.textContent=`
    html,body{min-height:100%;overflow-y:auto!important}
    #auth.auth{margin:3vh auto 4vh!important;max-width:460px}
    #auth .top{margin-bottom:12px!important}
    #auth .card{margin-top:10px!important}
    @media (min-width:651px) and (max-height:760px){
      #auth.auth{margin:10px auto 20px!important}
      #auth .top{padding:14px 18px!important;border-radius:18px!important;margin-bottom:8px!important}
      #auth .top h1{font-size:21px!important}
      #auth .top .muted{margin:5px 0 0!important}
      #auth .auth-login-card{padding:16px 20px!important}
      #auth .auth-login-brand{margin-bottom:10px!important;padding-bottom:10px!important}
      #auth input{min-height:42px!important;padding-top:8px!important;padding-bottom:8px!important}
      #auth .space{height:6px!important}
      #auth button{min-height:40px!important;padding-top:8px!important;padding-bottom:8px!important}
      #auth .signup-consent{padding:10px!important;margin-top:8px!important}
      #auth .signup-consent small{font-size:11px!important;line-height:1.3!important}
      #auth .auth-social-sep{margin:9px 0!important}
      #auth .muted{line-height:1.35!important}
    }
  `;
  document.head.appendChild(s);
}
function settleBuild(){
  clearTimeout(timer);
  
  injectAuthStability();
  cleanupLegacyRuntime();
  timer=setTimeout(()=>{injectAuthStability();},220);
}
cleanupLegacyRuntime();

injectAuthStability();
document.addEventListener('DOMContentLoaded',settleBuild,{once:true});
window.addEventListener('pageshow',settleBuild);
document.addEventListener('swe:rendered',settleBuild);
})();

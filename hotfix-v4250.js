(()=>{
'use strict';
const BUILD='42.50';
window.SWE_BUILD_VERSION=BUILD;
let timer=null;
function applyBuild(){
  const wanted='V'+BUILD;
  const nextTitle=document.title.replace(/V42\.\d+/g,wanted);
  if(document.title!==nextTitle)document.title=nextTitle;
  document.querySelectorAll('h1 span').forEach(el=>{
    const txt=(el.textContent||'').trim();
    if(/^V42\./.test(txt)&&txt!==wanted)el.textContent=wanted;
  });
  document.querySelectorAll('.build-badge').forEach(el=>{
    const txt='MAJ '+BUILD;
    if(el.textContent!==txt)el.textContent=txt;
  });
  if(document.documentElement.dataset.sweVersion!==BUILD)document.documentElement.dataset.sweVersion=BUILD;
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
  applyBuild();
  injectAuthStability();
  timer=setTimeout(()=>{applyBuild();injectAuthStability();},220);
}
applyBuild();
injectAuthStability();
document.addEventListener('DOMContentLoaded',settleBuild,{once:true});
window.addEventListener('pageshow',settleBuild);
document.addEventListener('swe:rendered',settleBuild);
})();

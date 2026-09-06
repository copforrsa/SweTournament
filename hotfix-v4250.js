(()=>{
'use strict';
const BUILD='42.50';
window.SWE_BUILD_VERSION=BUILD;
let timer=null;
function applyBuild(){
  const wanted='V'+BUILD;
  if(document.title!==document.title.replace(/V42\.\d+/g,wanted))document.title=document.title.replace(/V42\.\d+/g,wanted);
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
function settleBuild(){
  clearTimeout(timer);
  applyBuild();
  timer=setTimeout(applyBuild,220);
}
applyBuild();
document.addEventListener('DOMContentLoaded',settleBuild,{once:true});
window.addEventListener('pageshow',settleBuild);
document.addEventListener('swe:rendered',settleBuild);
})();

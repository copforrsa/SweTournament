(()=>{
'use strict';
const BUILD='42.50';
window.SWE_BUILD_VERSION=BUILD;
function applyBuild(){
  const wanted='V'+BUILD;
  if(/V42\.\d+/.test(document.title))document.title=document.title.replace(/V42\.\d+/g,wanted);
  document.querySelectorAll('h1 span').forEach(el=>{if(/^V42\./.test((el.textContent||'').trim()))el.textContent=wanted;});
  document.querySelectorAll('.build-badge').forEach(el=>el.textContent='MAJ '+BUILD);
  document.documentElement.dataset.sweVersion=BUILD;
}
let pending=false;
function scheduleApply(){
  if(pending)return;
  pending=true;
  queueMicrotask(()=>{pending=false;applyBuild();});
}
applyBuild();
document.addEventListener('DOMContentLoaded',applyBuild,{once:true});
window.addEventListener('pageshow',applyBuild);
document.addEventListener('swe:rendered',scheduleApply);
const obs=new MutationObserver(muts=>{
  for(const m of muts){
    const t=m.target;
    if(t?.nodeType===1&&(t.matches?.('h1 span,.build-badge,title')||t.closest?.('h1,.build-badge'))){scheduleApply();break;}
  }
});
obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();

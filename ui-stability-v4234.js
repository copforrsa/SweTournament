(()=>{
'use strict';
const BUILD='42.50';
window.SWE_BUILD_VERSION=BUILD;
let renderDispatchQueued=false;
function setVersion(){
  const wanted='V'+BUILD;
  document.title=document.title.replace(/V42\.\d+/g,wanted);
  document.querySelectorAll('h1 span').forEach(el=>{if(/^V42\./.test((el.textContent||'').trim()))el.textContent=wanted;});
  document.querySelectorAll('.build-badge').forEach(el=>el.textContent='MAJ '+BUILD);
  document.documentElement.dataset.sweVersion=BUILD;
}
function dispatchRendered(){
  if(renderDispatchQueued)return;
  renderDispatchQueued=true;
  requestAnimationFrame(()=>{
    renderDispatchQueued=false;
    document.dispatchEvent(new CustomEvent('swe:rendered'));
  });
}
function wrapRenderAll(){
  try{
    if(typeof window.renderAll!=='function'||window.renderAll.__sweStable4234)return;
    const original=window.renderAll;
    const wrapped=function(...args){const out=original.apply(this,args);dispatchRendered();return out;};
    wrapped.__sweStable4234=true;
    window.renderAll=wrapped;
  }catch(_){ }
}
function loadScript(src,key){
  if(document.querySelector('script[data-'+key+']'))return;
  const s=document.createElement('script');
  s.src=src;
  s.dataset[key]='1';
  document.body.appendChild(s);
}
function loadLatestModules(){
  loadScript('./hotfix-v4246.js?v=4250','v4246');
  loadScript('./hotfix-v4248.js?v=4250','v4248');
  loadScript('./hotfix-v4250.js?v=4250','v4250');
}
function boot(){setVersion();wrapRenderAll();dispatchRendered();loadLatestModules();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>{setVersion();wrapRenderAll();loadLatestModules();});
document.addEventListener('click',e=>{
  if(e.target.closest?.('.tab,[data-view],button,a.button')) setTimeout(dispatchRendered,650);
},true);
})();

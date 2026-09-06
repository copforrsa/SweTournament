(()=>{
'use strict';
const VERSION='42.37';
let renderDispatchQueued=false;
function setVersion(){
  const wanted='V'+VERSION;
  if(document.title.includes('V42.')) document.title=document.title.replace(/V42\.\d+/g,wanted);
  document.querySelectorAll('h1 span').forEach(el=>{if(/^V42\./.test(el.textContent.trim()))el.textContent=wanted;});
  document.querySelectorAll('.build-badge').forEach(el=>el.textContent='MAJ '+VERSION);
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
function loadV4246(){
  if(document.querySelector('script[data-v4246]'))return;
  const s=document.createElement('script');
  s.src='./hotfix-v4246.js?v=4246';
  s.dataset.v4246='1';
  document.body.appendChild(s);
}
function boot(){setVersion();wrapRenderAll();dispatchRendered();loadV4246();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>{setVersion();wrapRenderAll();loadV4246();});
document.addEventListener('click',e=>{
  if(e.target.closest?.('.tab,[data-view],button,a.button')) setTimeout(dispatchRendered,650);
},true);
})();

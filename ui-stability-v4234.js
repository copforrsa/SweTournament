(()=>{
'use strict';
let renderDispatchTimer=null;
let lastRenderDispatch=0;
function dispatchRendered(){
  // Le tableau de bord co-gestionnaire possède ses propres données et ses
  // propres mises à jour. Relancer tous les modules après un renderAll y
  // reconstruisait la page entière et créait un clignotement visible.
  if(document.body?.classList.contains('swe-coorg-dashboard4399'))return;
  // Plusieurs modules écoutent cet événement et reconstruisent une partie de
  // la page. On le réserve donc à un vrai renderAll et on regroupe les
  // rendus rapprochés : il ne doit jamais être déclenché par un simple clic.
  if(renderDispatchTimer)clearTimeout(renderDispatchTimer);
  renderDispatchTimer=setTimeout(()=>{
    renderDispatchTimer=null;
    const now=Date.now();
    if(now-lastRenderDispatch<250)return;
    lastRenderDispatch=now;
    document.dispatchEvent(new CustomEvent('swe:rendered'));
  },180);
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
// hotfix-v4244.js owns loading these modules, including their order and cache key.
function boot(){wrapRenderAll();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',wrapRenderAll);
})();

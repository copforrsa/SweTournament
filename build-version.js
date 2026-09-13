// Single source for the loaded build and all visible version labels.
window.SWE_BUILD_VERSION='43.87';
(()=>{
'use strict';
const build=window.SWE_BUILD_VERSION;
window.SWEApplyBuild=()=>{
 document.title=document.title.replace(/V(?:42|43)\.\d+/g,'V'+build);
 document.querySelectorAll('h1 span').forEach(el=>{if(/^V(?:42|43)\./.test(el.textContent.trim()))el.textContent='V'+build;});
 document.querySelectorAll('.build-badge').forEach(el=>{el.textContent='MAJ '+build;el.title='Version chargée : '+build;});
 document.documentElement.dataset.sweVersion=build;
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',window.SWEApplyBuild,{once:true});else window.SWEApplyBuild();
document.addEventListener('swe:rendered',window.SWEApplyBuild);
window.addEventListener('pageshow',window.SWEApplyBuild);
})();

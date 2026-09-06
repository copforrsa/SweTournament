(()=>{
'use strict';
const BUILD='42.50';
window.SWE_BUILD_VERSION=BUILD;
function applyBuild(){
  const wanted='V'+BUILD;
  document.title=document.title.replace(/V42\.\d+/g,wanted);
  document.querySelectorAll('h1 span').forEach(el=>{if(/^V42\./.test((el.textContent||'').trim()))el.textContent=wanted;});
  document.querySelectorAll('.build-badge').forEach(el=>el.textContent='MAJ '+BUILD);
  document.documentElement.dataset.sweVersion=BUILD;
}
function load(src,key){
  return new Promise(resolve=>{
    if(document.querySelector('script[data-swe-loader="'+key+'"]'))return resolve();
    const s=document.createElement('script');
    s.src=src;
    s.async=false;
    s.dataset.sweLoader=key;
    s.onload=()=>{applyBuild();resolve();};
    s.onerror=()=>resolve();
    document.body.appendChild(s);
  });
}
async function boot(){
  applyBuild();
  await load('./legacy-hotfix-v4244.js?v=4250','legacy4244');
  await load('./hotfix-v4246.js?v=4250','v4246');
  await load('./hotfix-v4248.js?v=4250','v4248');
  await load('./hotfix-v4250.js?v=4250','v4250');
  applyBuild();
  setTimeout(applyBuild,250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>setTimeout(applyBuild,50));
})();

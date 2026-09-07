(()=>{
'use strict';
const BUILD='42.68';
window.SWE_BUILD_VERSION=BUILD;
let observer=null;
let enforcing=false;
function applyBuild(){if(enforcing)return;enforcing=true;try{const wanted='V'+BUILD;const nextTitle=document.title.replace(/V42\.\d+/g,wanted);if(document.title!==nextTitle)document.title=nextTitle;document.querySelectorAll('h1 span').forEach(el=>{const txt=(el.textContent||'').trim();if(/^V42\./.test(txt)&&txt!==wanted)el.textContent=wanted});document.querySelectorAll('.build-badge').forEach(el=>{const txt='MAJ '+BUILD;if((el.textContent||'').trim()!==txt)el.textContent=txt});document.documentElement.dataset.sweVersion=BUILD}finally{enforcing=false}}
async function purgeLegacyClient(){try{if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.unregister()))}}catch(_){}try{if(window.caches){const keys=await caches.keys();await Promise.all(keys.filter(k=>/swe|tournoi-foot/i.test(k)).map(k=>caches.delete(k)))}}catch(_){}}
function installAuthorityObserver(){if(observer||!document.documentElement)return;observer=new MutationObserver(()=>{if(enforcing)return;let needs=/V42\.(?!68\b)\d+/.test(document.title);if(!needs){document.querySelectorAll('h1 span,.build-badge').forEach(el=>{const t=(el.textContent||'').trim();if(/^V42\./.test(t)&&t!=='V42.68')needs=true;if(/^MAJ 42\./.test(t)&&t!=='MAJ 42.68')needs=true})}if(needs)queueMicrotask(applyBuild)});observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true})}
function load(src,key){return new Promise(resolve=>{if(document.querySelector('script[data-swe-loader="'+key+'"]'))return resolve();const s=document.createElement('script');s.src=src;s.async=false;s.dataset.sweLoader=key;s.onload=()=>{applyBuild();resolve()};s.onerror=()=>resolve();document.body.appendChild(s)})}
async function boot(){
 applyBuild();installAuthorityObserver();purgeLegacyClient();
 await load('/admin-access-gate-v4258.js?v=4268','admin-access-gate');
 await load('/hotfix-v4250-invite-auth.js?v=4268','invite-auth');
 await load('/legacy-hotfix-v4244.js?v=4268','legacy4244');
 await load('/hotfix-v4246.js?v=4268','v4246');
 await load('/hotfix-v4248.js?v=4268','v4248');
 await load('/hotfix-v4250.js?v=4268','v4250');
 await load('/hotfix-v4252-login-offers.js?v=4268','v4252-login-offers');
 await load('/hotfix-v4254-auth-stability.js?v=4268','v4254-auth-stability');
 await load('/hotfix-v4262-quickscore.js?v=4268','v4262-quickscore');
 await load('/hotfix-v4263-public-registration-guard.js?v=4268','v4263-public-registration-guard');
 await load('/hotfix-v4266-public-payment-maps.js?v=4268','v4266-public-payment-maps');
 await load('/hotfix-v4268-flex-format-payment.js?v=4268','v4268-flex-format-payment');
 applyBuild();setTimeout(applyBuild,250);setTimeout(applyBuild,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.addEventListener('pageshow',()=>setTimeout(applyBuild,50));document.addEventListener('swe:rendered',()=>setTimeout(applyBuild,0));
})();
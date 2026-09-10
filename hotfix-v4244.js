(()=>{
'use strict';
const BUILD='43.34';
window.SWE_BUILD_VERSION=BUILD;
window.__SWE_PAYMENT_AUTHORITY_ACTIVE=true;
function applyBuild(){
 const wanted='V'+BUILD;
 document.title=document.title.replace(/V(?:42|43)\.\d+/g,wanted);
 document.querySelectorAll('h1 span').forEach(el=>{const t=(el.textContent||'').trim();if(/^V(?:42|43)\./.test(t))el.textContent=wanted});
 document.querySelectorAll('.build-badge').forEach(el=>el.textContent='MAJ '+BUILD);
 document.documentElement.dataset.sweVersion=BUILD;
}
async function purgeLegacyClient(){
 try{
  const k='swe-legacy-cache-cleaned-v4334';
  if(localStorage.getItem(k)==='1')return;
  if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.unregister().catch(()=>false)))}
  if(window.caches){const keys=await caches.keys();await Promise.all(keys.map(x=>caches.delete(x).catch(()=>false)))}
  localStorage.setItem(k,'1');
 }catch(_){}
}
function loadCss(href,key){
 if(document.querySelector('link[data-swe-style="'+key+'"]'))return;
 const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset.sweStyle=key;document.head.appendChild(l);
}
function load(src,key){
 return new Promise(resolve=>{
  if(document.querySelector('script[data-swe-loader="'+key+'"]'))return resolve();
  const s=document.createElement('script');let done=false;
  const finish=()=>{if(done)return;done=true;resolve()};
  s.src=src;s.async=false;s.dataset.sweLoader=key;s.onload=finish;s.onerror=()=>{console.warn('SWÉ: module non chargé',key);finish()};
  document.body.appendChild(s);setTimeout(finish,6000);
 });
}
function mobileClient(){return matchMedia('(max-width: 760px)').matches||navigator.maxTouchPoints>1}
async function boot(){
 applyBuild();purgeLegacyClient();
 loadCss('/desktop-layout-v4328.css?v=4334','desktop-layout-v4328');
 loadCss('/player-photo-v4333.css?v=4334','player-photo-v4333');
 document.documentElement.dataset.sweMatchClient=mobileClient()?'mobile':'desktop';
 await load('/admin-access-gate-v4258.js?v=4327','admin-access-gate');
 await load('/hotfix-v4250-invite-auth.js?v=4334','invite-auth');
 await load('/legacy-hotfix-v4244.js?v=4327','legacy4244');
 await load('/hotfix-v4246.js?v=4327','v4246');
 await load('/hotfix-v4248.js?v=4327','v4248');
 await load('/hotfix-v4250.js?v=4327','v4250');
 await load('/hotfix-v4254-auth-stability.js?v=4327','v4254-auth-stability');
 await load('/hotfix-v4262-quickscore.js?v=4327','v4262-quickscore');
 await load('/hotfix-v4263-public-registration-guard.js?v=4327','v4263-public-registration-guard');
 await load('/hotfix-v4266-public-payment-maps.js?v=4327','v4266-public-payment-maps');
 await load('/hotfix-v4268-flex-format-payment.js?v=4327','v4268-flex-format-payment');
 await load('/hotfix-v4269-rating-update.js?v=4327','v4269-rating-update');
 await load('/hotfix-v4270-coorg-fun.js?v=4327','v4270-coorg-fun');
 await load('/hotfix-v4271-whatsapp-avatar.js?v=4327','v4271-whatsapp-avatar');
 await load('/hotfix-v4272-profile-registration.js?v=4327','v4272-profile-registration');
 await load('/player-contact-profile-v4321.js?v=4332','player-contact-profile-v4321');
 await load('/player-id-display-v4313.js?v=4327','player-id-display-v4313');
 await load('/hotfix-v4273-payment-ratings-ui.js?v=4327','v4273-payment-ratings-ui');
 await load('/hotfix-v4274-payment-rating-admin.js?v=4327','v4274-payment-rating-admin');
 await load('/coorganizer-selfpay-v4308.js?v=4327','coorganizer-selfpay-v4308');
 await load('/hotfix-v4276-evaluation-reports.js?v=4327','v4276-evaluation-reports');
 await load('/hotfix-v4277-evaluation-progress.js?v=4327','v4277-evaluation-progress');
 await load('/hotfix-v4278-rating-cooler-president.js?v=4327','v4278-rating-cooler-president');
 await load('/hotfix-v4279-payment-authority.js?v=4327','v4279-payment-authority');
 await load('/hotfix-v4280-registration-status.js?v=4327','v4280-registration-status');
 await load('/hotfix-v4281-complex-home.js?v=4327','v4281-complex-home');
 await load('/hotfix-v4282-partner-booking.js?v=4327','v4282-partner-booking');
 await load('/hotfix-v4283-stability-security.js?v=4327','v4283-stability-security');
 await load('/auth-player-clean-v4315.js?v=4331','auth-player-clean-v4318');
 loadCss('/player-entry-layout-v4330.css?v=4334','player-entry-layout-v4330');
 await load('/coorg-tab-rights-v4319.js?v=4327','coorg-tab-rights-v4321');
 await load('/match-rating-rules-v4323.js?v=4327','match-rating-rules-v4323');
 await load('/match-engine-v4300.js?v=4327','match-engine-v4302');
 await load('/match-team-select-v4309.js?v=4331','match-team-select-v4309');
 await load('/ui-stability-v4331.js?v=4331','ui-stability-v4331');
 await load('/match-numbering-v4311.js?v=4327','match-numbering-v4311');
 await load('/match-actions-v4303.js?v=4327','match-actions-v4303');
 await load('/match-rotation-v4306.js?v=4327','match-rotation-v4306');
 await load('/match-tiebreak-persist-v4313.js?v=4327','match-tiebreak-persist-v4313');
 if(mobileClient())await load('/match-fun-mobile-v4303.js?v=4327','match-fun-mobile-v4303');
 else await load('/match-fun-desktop-v4303.js?v=4327','match-fun-desktop-v4303');
 await load('/match-extras-v4306.js?v=4327','match-extras-v4306');
 await load('/tournament-king-config-v4306.js?v=4327','tournament-king-config-v4306');
 await load('/live-enhance-v4306.js?v=4327','live-enhance-v4306');
 await load('/match-realtime-v4304.js?v=4327','match-realtime-v4305');
 await load('/public-registration-lock-v4307.js?v=4327','public-registration-lock-v4307');
 applyBuild();setTimeout(applyBuild,250);setTimeout(applyBuild,1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>setTimeout(applyBuild,50));
document.addEventListener('swe:rendered',()=>setTimeout(applyBuild,0));
})();
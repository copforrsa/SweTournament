(()=>{
'use strict';
if(window.__SWE_4283_STABILITY)return;window.__SWE_4283_STABILITY=true;
window.__SWE_PAYMENT_AUTHORITY_ACTIVE=true;
const E=id=>document.getElementById(id);
function ensureStyle(){if(E('swe4283StabilityStyle'))return;const s=document.createElement('style');s.id='swe4283StabilityStyle';s.textContent=`
#sweNetwork4283{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:1000000;padding:9px 12px;border-radius:999px;background:#7f1d1d;color:#fff;font:800 12px/1.2 system-ui;box-shadow:0 8px 24px rgba(0,0,0,.18);display:none}
#publicPaymentBox{min-height:78px;contain:layout paint;overflow-anchor:none}
#publicPaymentBox button:disabled{cursor:wait;opacity:.72}
`;document.head.appendChild(s)}
function networkBanner(){ensureStyle();let b=E('sweNetwork4283');if(!b){b=document.createElement('div');b.id='sweNetwork4283';b.setAttribute('role','status');b.setAttribute('aria-live','polite');b.textContent='Connexion interrompue • SWÉ se reconnectera automatiquement';document.body.appendChild(b)}const sync=()=>{b.style.display=navigator.onLine?'none':'block'};window.addEventListener('online',()=>{sync();setTimeout(()=>document.dispatchEvent(new Event('swe:rendered')),80)});window.addEventListener('offline',sync);sync()}
function protectExternalLinks(){document.querySelectorAll('a[target="_blank"]').forEach(a=>{const rel=new Set((a.getAttribute('rel')||'').split(/\s+/).filter(Boolean));rel.add('noopener');rel.add('noreferrer');a.setAttribute('rel',[...rel].join(' '))})}
function hardenForms(){document.querySelectorAll('form').forEach(f=>{if(!f.getAttribute('autocomplete'))f.setAttribute('autocomplete','off')});document.querySelectorAll('input[type="password"]').forEach(i=>i.setAttribute('autocomplete','current-password'))}
function stabilizePayment(){const box=E('publicPaymentBox');if(!box)return;box.setAttribute('aria-live','polite');box.setAttribute('aria-busy',/Vérification|Chargement/i.test(box.textContent||'')?'true':'false');if(box.dataset.swe4283Observer)return;box.dataset.swe4283Observer='1';let timer=null;new MutationObserver(()=>{clearTimeout(timer);box.setAttribute('aria-busy','true');timer=setTimeout(()=>box.setAttribute('aria-busy','false'),220)}).observe(box,{childList:true,subtree:true,characterData:true})}
function loadMatchRescueBridge(){if(window.__SWE_4298_MATCH_RESCUE||document.querySelector('script[data-swe-mobile-rescue]'))return;const s=document.createElement('script');s.src='./hotfix-v4298-match-rescue.js?v=4299-mobile';s.defer=true;s.dataset.sweMobileRescue='1';s.onload=()=>document.dispatchEvent(new Event('swe:rendered'));s.onerror=()=>console.warn('SWÉ mobile: secours matchs non chargé');document.body.appendChild(s)}
function safeApply(){try{networkBanner();protectExternalLinks();hardenForms();stabilizePayment();loadMatchRescueBridge()}catch(e){console.warn('SWÉ stabilité 42.83',e)}}
window.addEventListener('error',e=>{console.warn('SWÉ erreur client',e?.message||'Erreur')});window.addEventListener('unhandledrejection',e=>{console.warn('SWÉ promesse rejetée',e?.reason?.message||'Erreur réseau')});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',safeApply,{once:true});else safeApply();
[250,800,1500,3500].forEach(ms=>setTimeout(safeApply,ms));document.addEventListener('swe:rendered',()=>setTimeout(safeApply,40));window.addEventListener('pageshow',()=>setTimeout(safeApply,80));
})();
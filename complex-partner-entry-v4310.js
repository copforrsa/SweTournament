(()=>{
'use strict';
if(window.__SWE_COMPLEX_ENTRY_4310)return;window.__SWE_COMPLEX_ENTRY_4310=true;
const URL='/complexes-partenaires.html';
function installCss(){if(document.getElementById('sweComplexEntry4310Style'))return;const s=document.createElement('style');s.id='sweComplexEntry4310Style';s.textContent=`
.swe-complex-link{display:inline-flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;font-weight:900;white-space:nowrap}
.swe-complex-cta{margin-left:8px}
.swe-complex-fallback{margin-top:10px;width:100%;min-height:44px;border-radius:12px;background:#0b6b45!important;color:#fff!important}
@media(max-width:700px){.swe-complex-cta{margin-left:0;margin-top:8px;width:100%}}
`;document.head.appendChild(s)}
function cleanupOldEntries(){document.getElementById('swePublicTabs4310')?.remove();document.querySelectorAll('.swe-complex-tab').forEach(x=>x.remove())}
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim()}
function findDiscoverCta(){
 const els=[...document.querySelectorAll('a,button,[role="button"],.cta,.primary')];
 return els.find(el=>{const t=norm(el.textContent);return t.includes('trouver')&&t.includes('swe')})||null;
}
function buildLink(extra=''){const a=document.createElement('a');a.id='sweComplexMainCta';a.href=URL;a.className=('swe-complex-link '+extra).trim();a.textContent='🏟️ J’ai un complexe';a.setAttribute('aria-label','J’ai un complexe');return a}
function addNextToDiscover(){if(document.getElementById('sweComplexMainCta'))return true;const target=findDiscoverCta();if(!target)return false;const a=buildLink(((target.className||'')+' swe-complex-cta').trim());target.insertAdjacentElement('afterend',a);return true}
function addGuaranteedFallback(){if(document.getElementById('sweComplexMainCta'))return true;const auth=document.getElementById('auth');if(!auth||auth.classList.contains('hidden'))return false;const login=document.getElementById('loginCard');if(!login)return false;const a=buildLink('swe-complex-fallback');const brand=login.querySelector('.auth-login-brand');if(brand)brand.insertAdjacentElement('afterend',a);else login.prepend(a);return true}
function apply(){installCss();cleanupOldEntries();if(!addNextToDiscover())addGuaranteedFallback()}
function boot(){apply();let n=0;const t=setInterval(()=>{n++;apply();if(n>120)clearInterval(t)},250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();document.addEventListener('swe:rendered',()=>setTimeout(apply,50));window.addEventListener('pageshow',()=>setTimeout(apply,80));
})();
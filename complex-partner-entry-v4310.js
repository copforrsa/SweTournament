(()=>{
'use strict';
if(window.__SWE_COMPLEX_ENTRY_4310)return;window.__SWE_COMPLEX_ENTRY_4310=true;
const URL='/complexes-partenaires.html';
function installCss(){if(document.getElementById('sweComplexEntry4310Style'))return;const s=document.createElement('style');s.id='sweComplexEntry4310Style';s.textContent=`
.swe-complex-link{display:inline-flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;font-weight:900;white-space:nowrap}
.swe-complex-cta{margin-left:8px}
@media(max-width:700px){.swe-complex-cta{margin-left:0;margin-top:8px;width:100%}}
`;document.head.appendChild(s)}
function cleanupOldEntries(){document.getElementById('swePublicTabs4310')?.remove();document.querySelectorAll('.swe-complex-tab').forEach(x=>x.remove())}
function findDiscoverCta(){return [...document.querySelectorAll('a,button')].find(el=>/trouver\s+un\s+sw[ée]/i.test((el.textContent||'').trim()))||null}
function addNextToDiscover(){if(document.getElementById('sweComplexMainCta'))return true;const target=findDiscoverCta();if(!target)return false;const a=document.createElement('a');a.id='sweComplexMainCta';a.href=URL;a.className=((target.className||'')+' swe-complex-link swe-complex-cta').trim();a.textContent='🏟️ J’ai un complexe';a.setAttribute('aria-label','J’ai un complexe');target.insertAdjacentElement('afterend',a);return true}
function apply(){installCss();cleanupOldEntries();addNextToDiscover()}
function boot(){apply();let n=0;const t=setInterval(()=>{n++;apply();if(n>60)clearInterval(t)},250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();document.addEventListener('swe:rendered',()=>setTimeout(apply,50));window.addEventListener('pageshow',()=>setTimeout(apply,80));
})();
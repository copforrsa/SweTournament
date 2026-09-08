(()=>{
'use strict';
if(window.__SWE_COMPLEX_ENTRY_4310)return;window.__SWE_COMPLEX_ENTRY_4310=true;
const URL='/complexes-partenaires.html';
function installCss(){if(document.getElementById('sweComplexEntry4310Style'))return;const s=document.createElement('style');s.id='sweComplexEntry4310Style';s.textContent=`
.swe-complex-link{display:inline-flex;align-items:center;justify-content:center;gap:6px;text-decoration:none;font-weight:850;white-space:nowrap}
#swePublicTabs4310{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 14px;padding:8px;border-radius:14px;background:#fff;border:1px solid #dce8e1;box-shadow:0 6px 18px rgba(16,36,27,.05)}
#swePublicTabs4310 a{padding:9px 12px;border-radius:10px;color:#163326;background:#f4f8f6}
#swePublicTabs4310 a.complex{background:#0b6b45;color:#fff}
.tabs .swe-complex-tab{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;color:inherit}
@media(max-width:700px){#swePublicTabs4310{margin-left:4px;margin-right:4px;overflow-x:auto;flex-wrap:nowrap}.tabs .swe-complex-tab{min-width:max-content}}
`;document.head.appendChild(s)}
function addPublicEntry(){const auth=document.getElementById('auth');if(!auth||document.getElementById('swePublicTabs4310'))return;const top=auth.querySelector(':scope > .top')||auth.querySelector('.top');if(!top)return;const nav=document.createElement('nav');nav.id='swePublicTabs4310';nav.setAttribute('aria-label','Navigation publique SWÉ');nav.innerHTML='<a href="/" class="swe-complex-link">Accueil</a><a href="/complexes-partenaires.html" class="swe-complex-link complex">🏟️ J’ai un complexe</a>';top.insertAdjacentElement('afterend',nav)}
function addAppEntries(){document.querySelectorAll('#main nav.tabs').forEach(nav=>{if(nav.querySelector('.swe-complex-tab'))return;const a=document.createElement('a');a.href=URL;a.className='tab swe-complex-tab';a.textContent='🏟️ J’ai un complexe';a.setAttribute('aria-label','J’ai un complexe');nav.appendChild(a)})}
function apply(){installCss();addPublicEntry();addAppEntries()}
function boot(){apply();let n=0;const t=setInterval(()=>{n++;apply();if(n>30)clearInterval(t)},250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();document.addEventListener('swe:rendered',()=>setTimeout(apply,50));window.addEventListener('pageshow',()=>setTimeout(apply,80));
})();
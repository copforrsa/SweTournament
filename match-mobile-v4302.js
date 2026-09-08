(()=>{
'use strict';
if(window.__SWE_MATCH_MOBILE_4302)return;window.__SWE_MATCH_MOBILE_4302=true;
const E=id=>document.getElementById(id);
function isMobile(){return matchMedia('(max-width: 760px)').matches||navigator.maxTouchPoints>1}
if(!isMobile())return;
document.documentElement.dataset.sweMatchClient='mobile';
function ensureCss(){
  if(E('sweMatchMobile4302Css'))return;
  const s=document.createElement('style');s.id='sweMatchMobile4302Css';s.textContent=`
  html[data-swe-match-client="mobile"] #matchesList .swe4300-match{padding:12px;border-radius:15px;margin:10px 0}
  html[data-swe-match-client="mobile"] .swe4300-top{margin-bottom:8px}
  html[data-swe-match-client="mobile"] .swe4300-score{grid-template-columns:1fr auto 1fr;gap:6px}
  html[data-swe-match-client="mobile"] .swe4300-team{font-size:14px}
  html[data-swe-match-client="mobile"] .swe4300-result{font-size:21px}
  html[data-swe-match-client="mobile"] .swe4301-goals{display:none;margin-top:10px;padding-top:10px}
  html[data-swe-match-client="mobile"] .swe4300-match.mobile-open .swe4301-goals{display:block}
  .swe4302-mobile-actions{display:flex;gap:8px;margin:10px 0;position:sticky;top:6px;z-index:8}
  .swe4302-mobile-actions button{flex:1;min-height:42px;border-radius:12px}
  .swe4302-mobile-toggle{width:100%;margin-top:10px;min-height:40px;border-radius:11px;font-weight:800}
  `;document.head.appendChild(s)
}
function decorate(){
  ensureCss();
  const box=E('matchesList');if(!box)return;
  let actions=E('swe4302MobileActions');
  if(!actions){
    actions=document.createElement('div');actions.id='swe4302MobileActions';actions.className='swe4302-mobile-actions';
    const refresh=document.createElement('button');refresh.type='button';refresh.textContent='↻ Actualiser les matchs';
    refresh.onclick=async()=>{refresh.disabled=true;try{const api=window.SWE_MATCH_COMMON_4302,t=api?.current?.();if(api&&t)await api.hydrate(t.id)}finally{refresh.disabled=false}};
    actions.appendChild(refresh);box.parentNode?.insertBefore(actions,box)
  }
  box.querySelectorAll('.swe4300-match').forEach(card=>{
    if(card.querySelector('.swe4302-mobile-toggle'))return;
    const goals=card.querySelector('.swe4301-goals');if(!goals)return;
    const toggle=document.createElement('button');toggle.type='button';toggle.className='swe4302-mobile-toggle';toggle.textContent='⚽ Buteur / passeur';
    toggle.onclick=()=>{
      const open=card.classList.toggle('mobile-open');
      toggle.textContent=open?'Fermer la saisie':'⚽ Buteur / passeur';
    };
    card.insertBefore(toggle,goals)
  })
}
const schedule=()=>setTimeout(decorate,80);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="matches"]'))schedule()},true);
document.addEventListener('swe:rendered',schedule);
const obs=new MutationObserver(()=>schedule());
setTimeout(()=>{const box=E('matchesList');if(box)obs.observe(box,{childList:true})},300);
})();

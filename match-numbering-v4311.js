(()=>{
'use strict';
if(window.__SWE_MATCH_NUMBERING_4311)return;window.__SWE_MATCH_NUMBERING_4311=true;
function apply(){
 document.querySelectorAll('.swe4300-match[data-match-id]').forEach(card=>{
   const m=(S.matches||[]).find(x=>String(x.id)===String(card.dataset.matchId));
   if(!m)return;
   const label=card.querySelector('.swe4300-top span:first-child');
   if(label)label.textContent='⚽ MATCH '+Number(m.match_order||0);
 });
}
document.addEventListener('swe:rendered',()=>setTimeout(apply,0));
document.addEventListener('swe:rotation-match-created',()=>setTimeout(apply,80));
document.addEventListener('swe:match-finished',()=>setTimeout(apply,80));
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="matches"]'))setTimeout(apply,120)},true);
[300,900,1600].forEach(t=>setTimeout(apply,t));
})();
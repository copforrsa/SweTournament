/* Keep the participant decision before the group organisation, without polling. */
(()=>{
  'use strict';
  function placeActionsFirst(){
    const box=document.getElementById('publicThirdHalfRegistration');
    const answer=box?.querySelector('.third-half-response');
    const plan=box?.querySelector('.third-half-public-plan');
    if(answer&&plan&&answer.previousElementSibling!==plan)plan.before(answer);
  }
  function schedule(){setTimeout(placeActionsFirst,60);setTimeout(placeActionsFirst,300);setTimeout(placeActionsFirst,900);}
  document.addEventListener('DOMContentLoaded',schedule,{once:true});
  document.addEventListener('swe:rendered',schedule);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-registered-action="cooler"],#publicThirdHalfYes,#publicThirdHalfNo'))schedule();
  });
  if(document.readyState!=='loading')schedule();
})();

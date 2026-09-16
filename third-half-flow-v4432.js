(()=>{'use strict';
 const arrange=()=>{const box=document.getElementById('publicThirdHalfRegistration'),response=box?.querySelector('.third-half-response'),plan=box?.querySelector('.third-half-public-plan');if(!box||!response||!plan)return;if(response.nextElementSibling!==plan)response.after(plan);const declined=box.querySelector('#publicThirdHalfNo.selected');plan.hidden=!!declined;};
 new MutationObserver(()=>{arrange();document.getElementById('registrationConfirmOverlay')?.remove()}).observe(document.body,{childList:true,subtree:true});
 document.addEventListener('click',event=>{if(event.target.closest('#publicThirdHalfYes,#publicThirdHalfNo,#publicSaveThirdHalfPreference'))queueMicrotask(arrange)});
 arrange();
})();

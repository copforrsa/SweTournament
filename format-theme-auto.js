/* SWÉ Tournament — single source of truth for tournament format background colors.
 * Changing a tournament format updates the UI without touching tournament rules. */
(function(){
  'use strict';
  const THEMES=Object.freeze({
    king_of_pitch:Object.freeze({name:'Roi du terrain',background:'#1769E0',dark:'#0D397A',soft:'#EAF2FF'}),
    conquest:Object.freeze({name:'Conquête',background:'#800020',dark:'#4D0013',soft:'#FFF0F3'}),
    fast_conquest:Object.freeze({name:'Fast Conquête',background:'#F28C28',dark:'#924300',soft:'#FFF3E5'})
  });
  window.SWE_FORMAT_THEMES=THEMES;
  const normalize=value=>Object.prototype.hasOwnProperty.call(THEMES,value)?value:null;
  let pending=false;
  function update(){
    pending=false;
    const select=document.getElementById('tourFormat');
    const creator=document.getElementById('tournamentAdminCard');
    const creating=!!(select&&creator&&!creator.classList.contains('hidden')&&getComputedStyle(creator).display!=='none');
    let format=creating?normalize(select.value):null;
    if(!format){
      try{
        if(typeof currentTour==='function')format=normalize(currentTour()?.format);
      }catch(_){}
    }
    if(!format && creating)format=normalize(select?.value);
    const root=document.documentElement;
    if(!format){
      root.removeAttribute('data-swe-format');
      root.style.removeProperty('--swe-format-bg');
      root.style.removeProperty('--swe-format-dark');
      root.style.removeProperty('--swe-format-soft');
      return;
    }
    if(root.dataset.sweFormat===format)return;
    const theme=THEMES[format];
    root.dataset.sweFormat=format;
    root.style.setProperty('--swe-format-bg',theme.background);
    root.style.setProperty('--swe-format-dark',theme.dark);
    root.style.setProperty('--swe-format-soft',theme.soft);
  }
  function schedule(){
    if(pending)return;
    pending=true;
    requestAnimationFrame(update);
  }
  document.addEventListener('change',event=>{
    if(event.target?.id==='tourFormat')schedule();
  });
  document.addEventListener('click',schedule);
  document.addEventListener('DOMContentLoaded',()=>{
    schedule();
    // Views are rendered dynamically; re-evaluate after rendering.
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  });
  window.addEventListener('pageshow',schedule);
  window.addEventListener('popstate',schedule);
})();

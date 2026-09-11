(()=>{
'use strict';
if(window.__SWE_MATCH_REFRESH_GUARD_4361)return;window.__SWE_MATCH_REFRESH_GUARD_4361=true;
function inMatches(){return !!document.querySelector('#view-matches.active,.tabs button[data-view="matches"].active')}
function patch(){
 if(typeof window.loadAll!=='function'){setTimeout(patch,250);return}
 if(window.loadAll.__swe4361Guard)return;
 const original=window.loadAll;
 const wrapped=async function(){
   if(inMatches()&&!window.__SWE_FORCE_MATCH_FULL_REFRESH)return;
   return original.apply(this,arguments);
 };
 wrapped.__swe4361Guard=true;wrapped.__sweOriginal=original;window.loadAll=wrapped;
}
patch();
})();
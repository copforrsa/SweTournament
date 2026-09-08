(()=>{
'use strict';
if(window.__SWE_4285_MOBILE_MATCH_VISIBILITY)return;window.__SWE_4285_MOBILE_MATCH_VISIBILITY=true;
const E=id=>document.getElementById(id);
const isMobile=()=>window.matchMedia?.('(max-width: 820px), (pointer: coarse)').matches===true;
let refreshBusy=false,refreshTimer=null;
function installCss(){if(E('swe4285MobileMatchStyle'))return;const s=document.createElement('style');s.id='swe4285MobileMatchStyle';s.textContent='@media(max-width:820px){#view-matches .match,#view-matches details,#matchesList .match{content-visibility:visible!important;contain:none!important;visibility:visible!important;opacity:1!important}#matchesList{display:block!important;min-height:1px!important;overflow:visible!important}#view-matches.active{display:block!important}}';document.head.appendChild(s)}
function teamExists(id){try{return Array.isArray(S?.teams)&&S.teams.some(t=>String(t.id)===String(id))}catch(_){return false}}
function stateNeedsRefresh(){try{if(!Array.isArray(S?.matches)||!S.matches.length)return false;if(!Array.isArray(S?.teams)||!S.teams.length)return true;return S.matches.some(m=>!teamExists(m.home_team_id)||!teamExists(m.away_team_id))}catch(_){return true}}
function paint(){try{if(typeof renderMatches==='function')renderMatches();const box=E('matchesList');if(box&&Array.isArray(S?.matches)&&S.matches.length&&!box.querySelector('.match'))console.warn('SWÉ 42.85: matchs présents mais cartes absentes',S.matches.length,S.teams?.length||0);document.dispatchEvent(new Event('swe:rendered'))}catch(e){console.warn('SWÉ 42.85 render',e)}}
async function refreshMatches(force=false){if(!isMobile()||refreshBusy||typeof S==='undefined'||!S.session)return;const view=E('view-matches');if(!force&&(!view||!view.classList.contains('active')))return;refreshBusy=true;try{if(typeof loadTournament==='function'&&(force||stateNeedsRefresh()||!E('matchesList')?.querySelector('.match'))){await loadTournament()}paint()}catch(e){console.warn('SWÉ 42.85 sync mobile',e)}finally{refreshBusy=false}}
function schedule(force=false,delay=80){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refreshMatches(force),delay)}
function bindNavigation(){document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-view="matches"]');if(!b)return;setTimeout(()=>schedule(true,0),70)},true);document.addEventListener('swe:rendered',()=>{const v=E('view-matches');if(v?.classList.contains('active'))schedule(false,120)});window.addEventListener('pageshow',()=>schedule(true,180));window.addEventListener('orientationchange',()=>schedule(true,260));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule(true,180)})}
function patchCreateButtons(){document.addEventListener('click',e=>{if(!isMobile())return;const b=e.target?.closest?.('#addMatch,#roundRobin');if(!b)return;setTimeout(()=>schedule(true,0),550)},false)}
function boot(){installCss();bindNavigation();patchCreateButtons();setTimeout(()=>{const v=E('view-matches');if(v?.classList.contains('active'))schedule(true,0)},500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
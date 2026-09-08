(()=>{
'use strict';
if(window.__SWE_4286_MOBILE_MATCH_VISIBILITY)return;window.__SWE_4286_MOBILE_MATCH_VISIBILITY=true;
const E=id=>document.getElementById(id);
const isMobile=()=>window.matchMedia?.('(max-width: 820px), (pointer: coarse)').matches===true;
const scoreFlowLocked=()=>window.__SWE_SCORE_TX_ACTIVE===true||window.__SWE_QUICK_ASSIST_ACTIVE===true||Date.now()<Number(window.__SWE_QUICK_ASSIST_SETTLING_UNTIL||0);
let busy=false,timer=null,lastRefresh=0;
function installCss(){if(E('swe4286MobileMatchStyle'))return;const s=document.createElement('style');s.id='swe4286MobileMatchStyle';s.textContent='@media(max-width:820px){#view-matches .match,#view-matches details,#matchesList .match{content-visibility:visible!important;contain:none!important;visibility:visible!important;opacity:1!important}#matchesList{display:block!important;min-height:1px!important;overflow:visible!important}#view-matches.active{display:block!important}}';document.head.appendChild(s)}
function teamExists(id){try{return Array.isArray(S?.teams)&&S.teams.some(t=>String(t.id)===String(id))}catch(_){return false}}
function cardsMissing(){try{const box=E('matchesList');return Array.isArray(S?.matches)&&S.matches.length>0&&(!box||!box.querySelector('.match'))}catch(_){return false}}
function dataIncomplete(){try{if(!Array.isArray(S?.matches)||!S.matches.length)return false;if(!Array.isArray(S?.teams)||!S.teams.length)return true;return S.matches.some(m=>!teamExists(m.home_team_id)||!teamExists(m.away_team_id))}catch(_){return true}}
function paint(){if(scoreFlowLocked())return;try{if(typeof renderMatches==='function')renderMatches()}catch(e){console.warn('SWÉ 42.86 render',e)}}
async function refresh(force=false){if(!isMobile()||busy||typeof S==='undefined'||!S.session||scoreFlowLocked())return;const view=E('view-matches');if(!view?.classList.contains('active'))return;const now=Date.now();if(!force&&now-lastRefresh<1200)return;busy=true;lastRefresh=now;try{if(scoreFlowLocked())return;if(typeof loadTournament==='function'&&(force||dataIncomplete()||cardsMissing()))await loadTournament();if(scoreFlowLocked())return;paint()}catch(e){console.warn('SWÉ 42.86 sync mobile',e)}finally{busy=false}}
function schedule(force=false,delay=80){clearTimeout(timer);timer=setTimeout(()=>{if(!scoreFlowLocked())refresh(force)},delay)}
function bind(){document.addEventListener('click',e=>{if(!isMobile())return;const nav=e.target?.closest?.('[data-view="matches"]');if(nav){schedule(true,100);return}const action=e.target?.closest?.('#addMatch,#roundRobin');if(action){schedule(true,650)}},true);window.addEventListener('pageshow',()=>{const v=E('view-matches');if(v?.classList.contains('active'))schedule(false,250)});window.addEventListener('orientationchange',()=>{const v=E('view-matches');if(v?.classList.contains('active'))schedule(false,300)});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&E('view-matches')?.classList.contains('active'))schedule(false,250)})}
function boot(){installCss();bind();setTimeout(()=>{if(E('view-matches')?.classList.contains('active'))schedule(true,0)},500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
(()=>{
'use strict';
if(window.__SWE_PLAYER_PROFILE_FIXES_4404)return;window.__SWE_PLAYER_PROFILE_FIXES_4404=true;
const E=id=>document.getElementById(id);let timer=0;
function key(row){return String(row.querySelector('b')?.textContent||'').replace(/^\s*🪪\s*/u,'').trim().toLocaleLowerCase('fr')}
function dedupeGroups(){const box=E('myPlayerGroups');if(!box)return;const seen=new Set();box.querySelectorAll(':scope > .player').forEach(row=>{const k=key(row);if(!k)return;if(seen.has(k))row.remove();else seen.add(k)})}
function apply(){E('swe4354CoorgStop')?.remove();dedupeGroups()}
function soon(){clearTimeout(timer);timer=setTimeout(apply,70)}
const obs=new MutationObserver(soon);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{obs.observe(document.body,{subtree:true,childList:true});soon()},{once:true});else{obs.observe(document.body,{subtree:true,childList:true});soon()}document.addEventListener('swe:rendered',soon);document.addEventListener('swe:player-profile-updated',soon);window.addEventListener('pageshow',soon);
})();

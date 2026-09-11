(()=>{
'use strict';
if(window.__SWE_PLAYER_HEALTH_BADGE_FIX_4358)return;window.__SWE_PLAYER_HEALTH_BADGE_FIX_4358=true;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
function st(){try{return typeof S!=='undefined'?S:null}catch(_){return null}}
function css(){if(document.getElementById('swe4358HealthBadgeCss'))return;const s=document.createElement('style');s.id='swe4358HealthBadgeCss';s.textContent=`
.swe4338-health.swe4358-health-fixed{display:inline-flex!important;align-items:center!important;gap:5px!important;margin-left:8px!important;padding:4px 8px!important;border-radius:999px!important;font-size:11px!important;font-weight:950!important;line-height:1.2!important;vertical-align:middle!important;background:#fee2e2!important;color:#b91c1c!important;border:1px solid #fecaca!important;white-space:nowrap!important}
.swe4338-health.swe4358-health-fixed.unavailable{background:#fecaca!important;color:#991b1b!important;border-color:#fca5a5!important}
@media(max-width:640px){.swe4338-health.swe4358-health-fixed{margin-left:6px!important;margin-top:3px!important;white-space:normal!important}}
`;document.head.appendChild(s)}
function playerName(id){const state=st();return state?.players?.find(p=>String(p.id)===String(id))?.name||''}
function exactish(el,name){const t=norm(el?.textContent),n=norm(name);if(!t||!n)return false;return t===n||t.startsWith(n+' ')||t.includes(' '+n+' ')||t.endsWith(' '+n)}
function targetFor(root,name){
 const sel='.rank,.live-player,.team-player,.player-row,li,tr,label,.player';
 const rows=[...root.querySelectorAll(sel)].filter(x=>!x.classList.contains('swe4338-health')&&exactish(x,name));
 if(!rows.length)return null;
 const score=x=>{let s=0;if(x.matches('.rank,.live-player,.team-player,.player-row'))s-=1000;if(x.matches('.player'))s+=250;s+=(x.textContent||'').length;return s};
 rows.sort((a,b)=>score(a)-score(b));return rows[0];
}
function nameHost(row,name){if(!row)return null;const kids=[...row.children].filter(x=>!x.classList.contains('swe4338-health')&&exactish(x,name));if(kids.length){kids.sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length);return kids[0]}return row}
function fix(){css();const root=document.querySelector('#main .view.active')||document.getElementById('main')||document.body;const badges=[...root.querySelectorAll('.swe4338-health[data-health-player]')];if(!badges.length)return;const seen=new Set();for(const b of badges){const id=String(b.dataset.healthPlayer||'');if(!id)continue;if(seen.has(id)){b.remove();continue}seen.add(id);const name=playerName(id)||'Joueur';const unavailable=b.classList.contains('unavailable');b.classList.add('swe4358-health-fixed');b.textContent='❌ '+name+' — '+(unavailable?'Blessé indisponible':'Blessé');b.setAttribute('aria-label',name+' : '+(unavailable?'blessé indisponible':'blessé'));const row=targetFor(root,name);const host=nameHost(row,name);if(host&&b.parentElement!==host)host.appendChild(b)}}
let timer=null;const soon=()=>{clearTimeout(timer);timer=setTimeout(fix,40)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',soon,{once:true});else soon();
document.addEventListener('swe:rendered',soon);document.addEventListener('swe:player-profile-updated',soon);window.addEventListener('pageshow',soon);document.addEventListener('click',soon,true);
const obs=new MutationObserver(soon);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>obs.observe(document.body,{subtree:true,childList:true}),{once:true});else obs.observe(document.body,{subtree:true,childList:true});
})();

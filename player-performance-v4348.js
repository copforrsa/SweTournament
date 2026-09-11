(()=>{
'use strict';
if(window.__SWE_PLAYER_PERFORMANCE_4348_P2)return;window.__SWE_PLAYER_PERFORMANCE_4348_P2=true;
const E=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
function state(){try{return typeof S!=='undefined'?S:null}catch(_){return null}}
function client(){try{return typeof sb!=='undefined'?sb:null}catch(_){return null}}
let busy=false,lastLoad=0,groups=[],summary=null,timer=null,observedBox=null,observer=null,patching=false;
function roleLabel(v){return ({goalkeeper:'Gardien',defender:'Défenseur',midfielder:'Milieu',forward:'Finisseur',couteau_suisse:'Couteau suisse'}[String(v||'').toLowerCase()]||v||'Non défini')}
function css(){if(E('swe4348PerformanceCss'))return;const s=document.createElement('style');s.id='swe4348PerformanceCss';s.textContent=`
#myPlayerStats>div{min-height:108px}
#myPlayerStats .swe4348-performance-card{background:linear-gradient(145deg,#ffffff,#f8fbfd)!important;border:1px solid #d8e6df!important}
#swe4338Summary .swe4348-note{background:linear-gradient(145deg,#fff7cf,#ffe79a)!important;border:1px solid #efc84b!important;box-shadow:0 8px 20px rgba(190,143,15,.12)}
#swe4338Summary .swe4348-note small{color:#745400!important}#swe4338Summary .swe4348-note strong{color:#a15f00!important}
#swe4338Summary .swe4348-role{background:linear-gradient(145deg,#e7f8ff,#d9efff)!important;border:1px solid #79c6ed!important;box-shadow:0 8px 20px rgba(20,126,190,.12)}
#swe4338Summary .swe4348-role small{color:#155d88!important}#swe4338Summary .swe4348-role strong{color:#0676b8!important;text-transform:capitalize}
`;document.head.appendChild(s)}
function statCards(x){const t=Number(x?.tournaments??0),label=t===1?'Tournoi joué':'Tournois joués';return [
 ['🏟️','Groupes',x?.groups??0],['⚽',label,t],['⚽','Matchs',x?.matches??0],['✅','Victoires',x?.wins??0],['🏆','Trophées',x?.trophies??0],['🥅','Buts',x?.goals??0],['🎯','Passes',x?.assists??0]
].map(a=>'<div class="swe4348-performance-card"><span>'+a[0]+'</span><small>'+a[1]+'</small><b>'+esc(a[2])+'</b></div>').join('')}
function patchStatsDom(){const box=E('myPlayerStats');if(!box||patching)return;patching=true;try{[...box.children].forEach(card=>{const small=card.querySelector('small');if(!small)return;const label=(small.textContent||'').trim();if(/^note(?:\s|$)/i.test(label)){card.remove();return}if(/sw[eé]s?\s+jou[eé]s?|tournois?\s+jou[eé]s?/i.test(label)){const raw=Number(card.querySelector('b')?.textContent||0);small.textContent=raw===1?'Tournoi joué':'Tournois joués';const icon=card.querySelector('span');if(icon)icon.textContent='⚽'}card.classList.add('swe4348-performance-card')})}finally{patching=false}}
function bindObserver(){const box=E('myPlayerStats');if(!box||box===observedBox)return;observer?.disconnect();observedBox=box;observer=new MutationObserver(()=>{if(patching)return;queueMicrotask(patchStatsDom)});observer.observe(box,{childList:true,subtree:true,characterData:true});patchStatsDom()}
function render(){const s=state(),box=E('myPlayerStats');if(box&&s?.playerDashboard){const scope=E('swe4338StatsScope')?.value||'all';patching=true;try{if(scope==='all')box.innerHTML=statCards(s.playerDashboard.stats||{});else{const g=groups.find(x=>String(x.workspace_id)===String(scope));if(g)box.innerHTML=statCards(g.stats||{})}}finally{patching=false}patchStatsDom();bindObserver()}const sum=E('swe4338Summary');if(sum&&summary){const rating=summary.rating==null?'—':Number(summary.rating).toFixed(1)+'/5',role=roleLabel(summary.preferred_role);sum.innerHTML='<div class="swe4338-summary-card swe4348-note"><small>Note SWÉ <span class="swe4338-help" tabindex="0" title="Cette note correspond à la moyenne des évaluations données par les observateurs SWÉ qui ont vu ce joueur évoluer.">!</span></small><strong>'+esc(rating)+'</strong></div><div class="swe4338-summary-card swe4348-role"><small>Rôle préféré</small><strong>'+esc(role)+'</strong></div>'}}
async function refresh(force=false){const c=client(),s=state();css();bindObserver();patchStatsDom();if(!c||!s?.session||busy)return;if(!force&&Date.now()-lastLoad<1800){render();return}busy=true;try{const [d,g,r]=await Promise.all([c.rpc('get_my_global_player_dashboard_v2'),c.rpc('get_my_player_group_stats_v1'),c.rpc('get_my_player_profile_summary_v1')]);if(!d.error&&d.data)s.playerDashboard=d.data;if(!g.error)groups=Array.isArray(g.data)?g.data:[];if(!r.error)summary=r.data||{};lastLoad=Date.now();render()}catch(e){console.warn('SWÉ performance refresh',e);patchStatsDom()}finally{busy=false}}
function schedule(force=false){clearTimeout(timer);timer=setTimeout(()=>refresh(force),90)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(true),{once:true});else schedule(true);
document.addEventListener('swe:rendered',()=>schedule(false));document.addEventListener('swe:player-profile-updated',()=>schedule(true));window.addEventListener('pageshow',()=>schedule(true));
})();
(()=>{
'use strict';
if(window.__SWE_PLAYER_PERFORMANCE_4348)return;window.__SWE_PLAYER_PERFORMANCE_4348=true;
const E=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
function state(){try{return typeof S!=='undefined'?S:null}catch(_){return null}}
function client(){try{return typeof sb!=='undefined'?sb:null}catch(_){return null}}
let busy=false,lastLoad=0,groups=[],summary=null,timer=null;
function roleLabel(v){return ({goalkeeper:'Gardien',defender:'Défenseur',midfielder:'Milieu',forward:'Finisseur',couteau_suisse:'Couteau suisse'}[String(v||'').toLowerCase()]||v||'Non défini')}
function css(){if(E('swe4348PerformanceCss'))return;const s=document.createElement('style');s.id='swe4348PerformanceCss';s.textContent=`
#swe4338Summary .swe4348-note{background:linear-gradient(145deg,#fff7cf,#ffe79a)!important;border:1px solid #efc84b!important;box-shadow:0 8px 20px rgba(190,143,15,.12)}
#swe4338Summary .swe4348-note small{color:#745400!important}#swe4338Summary .swe4348-note strong{color:#a15f00!important}
#swe4338Summary .swe4348-role{background:linear-gradient(145deg,#e7f8ff,#d9efff)!important;border:1px solid #79c6ed!important;box-shadow:0 8px 20px rgba(20,126,190,.12)}
#swe4338Summary .swe4348-role small{color:#155d88!important}#swe4338Summary .swe4348-role strong{color:#0676b8!important;text-transform:capitalize}
`;document.head.appendChild(s)}
function statCards(x){const t=Number(x?.tournaments??0),label=t===1?'Tournoi joué':'Tournois joués';return [
 ['🏟️','Groupes',x?.groups??0],['⚽',label,t],['⚽','Matchs',x?.matches??0],['✅','Victoires',x?.wins??0],['🏆','Trophées',x?.trophies??0],['🥅','Buts',x?.goals??0],['🎯','Passes',x?.assists??0]
].map(a=>'<div><span>'+a[0]+'</span><small>'+a[1]+'</small><b>'+esc(a[2])+'</b></div>').join('')}
function render(){const s=state(),box=E('myPlayerStats');if(box&&s?.playerDashboard){const scope=E('swe4338StatsScope')?.value||'all';if(scope==='all')box.innerHTML=statCards(s.playerDashboard.stats||{});else{const g=groups.find(x=>String(x.workspace_id)===String(scope));if(g)box.innerHTML=statCards(g.stats||{})}}const sum=E('swe4338Summary');if(sum&&summary){const rating=summary.rating==null?'—':Number(summary.rating).toFixed(1)+'/5',role=roleLabel(summary.preferred_role);sum.innerHTML='<div class="swe4338-summary-card swe4348-note"><small>Note SWÉ <span class="swe4338-help" tabindex="0" title="Cette note correspond à la moyenne des évaluations données par les observateurs SWÉ qui ont vu ce joueur évoluer.">!</span></small><strong>'+esc(rating)+'</strong></div><div class="swe4338-summary-card swe4348-role"><small>Rôle préféré</small><strong>'+esc(role)+'</strong></div>'}}
async function refresh(force=false){const c=client(),s=state();if(!c||!s?.session||busy)return;if(!force&&Date.now()-lastLoad<1800){render();return}busy=true;try{const [d,g,r]=await Promise.all([c.rpc('get_my_global_player_dashboard_v2'),c.rpc('get_my_player_group_stats_v1'),c.rpc('get_my_player_profile_summary_v1')]);if(!d.error&&d.data)s.playerDashboard=d.data;if(!g.error)groups=Array.isArray(g.data)?g.data:[];if(!r.error)summary=r.data||{};lastLoad=Date.now();render()}catch(e){console.warn('SWÉ performance refresh',e)}finally{busy=false}}
function schedule(force=false){clearTimeout(timer);timer=setTimeout(()=>{css();refresh(force)},160)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(true),{once:true});else schedule(true);
document.addEventListener('swe:rendered',()=>schedule(false));document.addEventListener('swe:player-profile-updated',()=>schedule(true));window.addEventListener('pageshow',()=>schedule(true));
})();
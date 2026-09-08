(()=>{
'use strict';
if(window.__SWE_MATCH_TEAM_SELECT_4309)return;
window.__SWE_MATCH_TEAM_SELECT_4309=true;
const E=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let busy=false;
function currentTourSafe(){try{return typeof currentTour==='function'?currentTour():null}catch(_){return null}}
function fill(){
  if(busy)return;busy=true;
  try{
    const h=E('homeTeam'),a=E('awayTeam');
    if(!h||!a)return;
    const t=currentTourSafe();
    const teams=(S?.teams||[]).filter(x=>!t||String(x.tournament_id)===String(t.id));
    const hv=h.value,av=a.value;
    const html='<option value="">Choisir une équipe</option>'+teams.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name||'Équipe')+'</option>').join('');
    if(h.innerHTML!==html)h.innerHTML=html;
    if(a.innerHTML!==html)a.innerHTML=html;
    if(teams.some(x=>String(x.id)===String(hv)))h.value=hv;
    if(teams.some(x=>String(x.id)===String(av)))a.value=av;
    h.disabled=teams.length<2;
    a.disabled=teams.length<2;
    const add=E('addMatch');if(add)add.disabled=teams.length<2;
  }finally{busy=false}
}
function boot(){fill();setTimeout(fill,150);setTimeout(fill,700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('swe:rendered',()=>setTimeout(fill,20));
window.addEventListener('pageshow',()=>setTimeout(fill,80));
const target=E('matchesList')?.parentElement||document.body;
new MutationObserver(()=>fill()).observe(target,{childList:true,subtree:true});
})();
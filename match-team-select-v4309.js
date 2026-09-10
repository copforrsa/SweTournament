(()=>{
'use strict';
if(window.__SWE_MATCH_TEAM_SELECT_4309)return;
window.__SWE_MATCH_TEAM_SELECT_4309=true;
const E=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let busy=false;
function currentTourSafe(){try{return typeof currentTour==='function'?currentTour():null}catch(_){return null}}
function activeTeamIds(tournamentId){
  const set=new Set();
  (S?.matches||[]).filter(m=>String(m.tournament_id)===String(tournamentId||'')&&String(m.status||'').toLowerCase()!=='finished').forEach(m=>{
    if(m.home_team_id)set.add(String(m.home_team_id));
    if(m.away_team_id)set.add(String(m.away_team_id));
  });
  return set;
}
function fill(){
  if(busy)return;busy=true;
  try{
    const h=E('homeTeam'),a=E('awayTeam');
    if(!h||!a)return;
    const t=currentTourSafe();
    const teams=(S?.teams||[]).filter(x=>!t||String(x.tournament_id)===String(t.id));
    const active=activeTeamIds(t?.id);
    const hv=h.value,av=a.value;
    const options=(selected,other)=>'<option value="">Choisir une équipe</option>'+teams.map(x=>{
      const id=String(x.id),locked=active.has(id)||String(other||'')===id;
      return '<option value="'+esc(id)+'" '+(locked?'disabled':'')+'>'+esc(x.name||'Équipe')+(active.has(id)?' • match en cours':'')+'</option>';
    }).join('');
    h.innerHTML=options(hv,av);
    a.innerHTML=options(av,hv);
    if(hv&&!active.has(String(hv))&&String(hv)!==String(av)&&teams.some(x=>String(x.id)===String(hv)))h.value=hv;else h.value='';
    if(av&&!active.has(String(av))&&String(av)!==String(h.value)&&teams.some(x=>String(x.id)===String(av)))a.value=av;else if(String(av)===String(h.value)||active.has(String(av)))a.value='';
    const enough=teams.length-active.size>=2;
    h.disabled=!enough;
    a.disabled=!enough;
    const add=E('addMatch');
    if(add)add.disabled=!enough||!h.value||!a.value||String(h.value)===String(a.value)||active.has(String(h.value))||active.has(String(a.value));
  }finally{busy=false}
}
function sync(){setTimeout(fill,20)}
function boot(){fill();setTimeout(fill,150);setTimeout(fill,700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('swe:rendered',sync);
document.addEventListener('swe:match-finished',sync);
document.addEventListener('swe:rotation-updated',sync);
window.addEventListener('pageshow',()=>setTimeout(fill,80));
document.addEventListener('change',e=>{if(e.target?.id==='homeTeam'||e.target?.id==='awayTeam')sync()},true);
const target=E('matchesList')?.parentElement||document.body;
new MutationObserver(()=>fill()).observe(target,{childList:true,subtree:true});
})();
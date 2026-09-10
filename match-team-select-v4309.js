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
  try{
    (S?.matches||[]).filter(m=>String(m.tournament_id)===String(tournamentId||'')&&String(m.status||'').toLowerCase()!=='finished').forEach(m=>{
      if(m.home_team_id)set.add(String(m.home_team_id));
      if(m.away_team_id)set.add(String(m.away_team_id));
    });
  }catch(_){ }
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
    const makeOptions=other=>'<option value="">Choisir une équipe</option>'+teams.map(x=>{
      const id=String(x.id),locked=active.has(id)||String(other||'')===id;
      return '<option value="'+esc(id)+'" '+(locked?'disabled':'')+'>'+esc(x.name||'Équipe')+(active.has(id)?' • match en cours':'')+'</option>';
    }).join('');
    const hh=makeOptions(av),aa=makeOptions(hv);
    if(h.innerHTML!==hh)h.innerHTML=hh;
    if(a.innerHTML!==aa)a.innerHTML=aa;
    if(hv&&!active.has(String(hv))&&String(hv)!==String(av)&&teams.some(x=>String(x.id)===String(hv)))h.value=hv;
    else if(active.has(String(h.value)))h.value='';
    if(av&&!active.has(String(av))&&String(av)!==String(h.value)&&teams.some(x=>String(x.id)===String(av)))a.value=av;
    else if(String(a.value)===String(h.value)||active.has(String(a.value)))a.value='';
    const enough=teams.length-active.size>=2;
    h.disabled=!enough;
    a.disabled=!enough;
    const add=E('addMatch');
    if(add)add.disabled=!enough||!h.value||!a.value||String(h.value)===String(a.value)||active.has(String(h.value))||active.has(String(a.value));
  }finally{busy=false}
}
let syncTimer=null;
function sync(){clearTimeout(syncTimer);syncTimer=setTimeout(fill,40)}
function boot(){fill();setTimeout(fill,250);setTimeout(fill,900)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('swe:rendered',sync);
document.addEventListener('swe:match-finished',sync);
document.addEventListener('swe:rotation-updated',sync);
window.addEventListener('pageshow',()=>setTimeout(fill,80));
document.addEventListener('change',e=>{if(e.target?.id==='homeTeam'||e.target?.id==='awayTeam')sync()},true);
})();
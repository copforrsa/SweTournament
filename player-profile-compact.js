(()=>{
'use strict';
if(window.__SWE_PLAYER_COMPACT_R1)return;
window.__SWE_PLAYER_COMPACT_R1=true;
const E=id=>document.getElementById(id);
let timer;
function fold(node,key,title,hint){
  if(!node)return;
  let shell=E('sweCompact-'+key);
  if(!shell){
    shell=document.createElement('details');shell.id='sweCompact-'+key;shell.className='swe-profile-fold';
    const summary=document.createElement('summary'),label=document.createElement('span'),meta=document.createElement('small');
    label.textContent=title;meta.className='swe-profile-fold-hint';summary.append(label,meta);shell.append(summary);
    node.before(shell);shell.append(node);
  }
  const meta=shell.querySelector(':scope > summary > small');
  if(meta.textContent!==hint)meta.textContent=hint;
  return shell;
}
function paint(){
  const view=E('view-myplayer');if(!view)return;
  let st;try{st=S}catch(_){return}
  const admin=st.workspace?.role==='admin';
  document.documentElement.dataset.swePurchaseRole=admin?'admin':'player';
  const p=st.playerDashboard?.profile||{},hero=view.querySelector('.player-hub-hero');
  if(hero){
    let name=E('sweCompactPlayerName');
    if(!name){name=document.createElement('div');name.id='sweCompactPlayerName';hero.querySelector('.player-hub-title h2')?.after(name)}
    const label=p.nickname||p.first_name||p.display_name||'';if(name.textContent!==label)name.textContent=label;
  }
  const personal=fold(E('swePlayerIdentity4321'),'identity','Mes informations personnelles','Voir / modifier');
  // Keep validation and in-progress editing visible; folding never recreates inputs.
  if(personal&&E('swe4321Save'))personal.open=true;
  fold(E('myPlayerPublic')?.closest('.card'),'privacy','Mes préférences','Visibilité et notifications');
  const health=st.playerHealth;
  fold(E('swe4338Health'),'health','Mon état physique',health?(health.mode==='injured_unavailable'?'Blessé · indisponible':'Blessé · disponible'):'Signaler une blessure');
  fold(view.querySelector('.swe-history-link-card'),'history','Retrouver mes anciennes statistiques','Rechercher un SWÉ');
  fold(E('myPlayerRequests')?.closest('.card'),'requests','Mes demandes de participation',String(st.playerDashboard?.requests?.length||0)+' demande(s)');
  fold(E('sweMyReliability'),'reliability','Ma fiabilité SWÉ','Consulter mon historique');
  fold(E('playerOrganizerCta'),'organizer','Créer mon espace organisateur','Découvrir');
}
const schedule=()=>{clearTimeout(timer);timer=setTimeout(paint,160)};
['swe:rendered','swe:page-view','swe:player-profile-updated','swe:player-ui-ready'].forEach(name=>document.addEventListener(name,schedule));
document.addEventListener('click',e=>{if(e.target.closest?.('#swe4321Edit,#swe4321Cancel,#swe4321Save'))schedule()});
window.addEventListener('pageshow',schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
// Bounded startup passes also cover older modules without a completion event.
setTimeout(paint,800);setTimeout(paint,2200);
})();

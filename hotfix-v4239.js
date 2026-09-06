(()=>{
'use strict';
const VERSION='42.39';
const activeMatches=()=>document.getElementById('view-matches')?.classList.contains('active');
const editingMain=()=>{const a=document.activeElement;return !!(a&&a.closest?.('#main')&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable));};
function setVersion(){
  document.title=document.title.replace(/V42\.\d+/g,'V'+VERSION);
  document.querySelectorAll('h1 span').forEach(x=>{if(/^V42\./.test(x.textContent.trim()))x.textContent='V'+VERSION});
  document.querySelectorAll('.build-badge').forEach(x=>x.textContent='MAJ '+VERSION);
}
function protectedReload(){
  if(activeMatches()||editingMain())return;
  clearTimeout(window.__sweRealtimeGuardTimer39);
  window.__sweRealtimeGuardTimer39=setTimeout(async()=>{
    if(activeMatches()||editingMain())return;
    try{await loadAll();}catch(e){console.warn('realtime guarded reload',e);}
  },450);
}
function guardedSubscribe(){
  try{
    if(typeof S==='undefined'||typeof sb==='undefined')return;
    if(S.channel)sb.removeChannel(S.channel);
    let ch=sb.channel('tournoi-manager-v4239');
    ['players','seasons','tournaments','tournament_players','teams','team_players','matches','goals','match_player_assignments'].forEach(table=>{
      ch=ch.on('postgres_changes',{event:'*',schema:'public',table},protectedReload);
    });
    S.channel=ch.subscribe();
  }catch(e){console.warn('guardedSubscribe',e);}
}
try{subscribeRealtime=guardedSubscribe;}catch(_){}
function install(){setVersion();guardedSubscribe();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
document.addEventListener('swe:rendered',()=>{setVersion();});
// Pendant l'écran Matchs, les synchros de sécurité existantes voient l'utilisateur comme actif.
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view="matches"],#view-matches,.tab')){
    try{if(activeMatches()&&typeof lastUserInteractionAt!=='undefined')lastUserInteractionAt=Date.now()+21600000;}catch(_){}
  }
},true);
// Dès qu'on saisit un score, verrouillage de 6 h maximum; quitter Matchs libère naturellement le garde realtime.
document.addEventListener('focusin',e=>{
  if(activeMatches()&&e.target.closest?.('#view-matches')){
    try{if(typeof lastUserInteractionAt!=='undefined')lastUserInteractionAt=Date.now()+21600000;}catch(_){}
  }
},true);
})();

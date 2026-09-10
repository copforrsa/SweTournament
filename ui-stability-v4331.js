(()=>{
'use strict';
if(window.__SWE_UI_STABILITY_4331)return;window.__SWE_UI_STABILITY_4331=true;
const E=id=>document.getElementById(id);
function getState(){try{return typeof S!=='undefined'?S:null}catch(_){return null}}
function getTour(){try{return typeof currentTour==='function'?currentTour():null}catch(_){return null}}
function say(msg){try{if(typeof toast==='function')return toast(msg)}catch(_){};console.warn(msg)}
function css(){if(E('sweUiStability4331Style'))return;const s=document.createElement('style');s.id='sweUiStability4331Style';s.textContent=`
/* Profil joueur : retour aux couleurs SWÉ, sans grand aplat vert */
#view-myplayer .player-hub-hero{background:linear-gradient(180deg,#f7fbff 0%,#ffffff 100%)!important;color:#0b2345!important;border:1px solid #cfe0f2!important;box-shadow:0 12px 30px rgba(16,33,63,.08)!important}
#view-myplayer .player-hub-hero h1,#view-myplayer .player-hub-hero h2,#view-myplayer .player-hub-hero h3,#view-myplayer .player-hub-hero b,#view-myplayer .player-hub-hero strong,#view-myplayer .player-hub-hero .swe4321-subtitle,#view-myplayer .player-hub-hero .swe4321-field span{color:#0b2345!important}
#view-myplayer .player-hub-hero .muted,#view-myplayer .player-hub-hero .swe4321-note{color:#667995!important}
#swePlayerIdentity4321 .swe4321-field input:disabled,#swePlayerIdentity4321 .swe4321-field input[readonly]{background:#eef2f6!important;color:#49586d!important;border-color:#d7e0ea!important;font-weight:800!important;box-shadow:none!important}
#swePlayerIdentity4321 .swe4321-field input:not(:disabled):not([readonly]){background:#fff!important;color:#0b2345!important;font-weight:600!important}
#swePlayerIdentity4321 .swe4321-edit{background:#0b2b54!important;color:#fff!important;font-weight:900!important}

/* Parcours start=player : la mire seule avant connexion */
html[data-swe-auth-player-clean="1"] #auth>.top,
html[data-swe-auth-player-clean="1"] #sweLoginOffers4252,
html[data-swe-auth-player-clean="1"] #sweComplexHome4281,
html[data-swe-auth-player-clean="1"] #swePublicTabs4310{display:none!important}

/* Sécurité match manuel */
.swe4331-auto-lock{margin:10px 0;padding:12px 14px;border:1px solid #bfd6ef;border-radius:12px;background:#eef6ff;color:#0b2b54;font-weight:850}
.swe4331-manual-disabled{opacity:.55!important;cursor:not-allowed!important}
`;document.head.appendChild(s)}
function cleanupPlayerAuth(){
 const p=new URLSearchParams(location.search);
 if((p.get('start')||'').toLowerCase()!=='player')return;
 const auth=E('auth');if(!auth||auth.classList.contains('hidden'))return;
 // Supprime une fois les anciens blocs commerciaux qui ont pu être réinjectés par le legacy.
 [...auth.querySelectorAll('section,article,div')].forEach(el=>{
   if(el.id==='loginCard'||el.closest('#loginCard'))return;
   const t=(el.textContent||'').replace(/\s+/g,' ').trim();
   if(/Commence gratuitement/i.test(t)&&/Besoin ponctuel/i.test(t)&&/Organisateur/i.test(t))el.remove();
 });
}
function activeTeamIds(tid){const st=getState(),set=new Set();(st?.matches||[]).filter(m=>String(m.tournament_id)===String(tid||'')&&String(m.status||'').toLowerCase()!=='finished').forEach(m=>{if(m.home_team_id)set.add(String(m.home_team_id));if(m.away_team_id)set.add(String(m.away_team_id))});return set}
function autoRunning(t){return !!(t&&t.rotation_mode==='king_of_pitch'&&t.rotation_state&&t.rotation_state.initialized===true)}
function refreshManualMatchUi(){
 const t=getTour(),h=E('homeTeam'),a=E('awayTeam'),pitch=E('pitch'),add=E('addMatch');if(!h||!a||!add)return;
 const running=autoRunning(t);
 [h,a,pitch,add].filter(Boolean).forEach(el=>{el.disabled=running;el.classList.toggle('swe4331-manual-disabled',running)});
 let note=E('swe4331AutoLock');
 if(running){
   if(!note){note=document.createElement('div');note.id='swe4331AutoLock';note.className='swe4331-auto-lock';note.textContent='🔒 Mode automatique actif : les matchs sont créés uniquement par la rotation SWÉ. Termine les matchs en cours pour faire avancer le circuit.';add.insertAdjacentElement('beforebegin',note)}
 }else note?.remove();
}
function guardManualMatch(e){
 const btn=e.target?.closest?.('#addMatch');if(!btn)return;
 const t=getTour();if(!t)return;
 if(autoRunning(t)){
   e.preventDefault();e.stopImmediatePropagation();say('Mode automatique actif : création manuelle de match interdite.');return;
 }
 const h=E('homeTeam')?.value||'',a=E('awayTeam')?.value||'',pitch=E('pitch')?.value||'';
 const active=activeTeamIds(t.id);
 if(!h||!a||h===a){e.preventDefault();e.stopImmediatePropagation();say('Choisis deux équipes différentes.');return}
 if(active.has(String(h))||active.has(String(a))){e.preventDefault();e.stopImmediatePropagation();say('Une des équipes joue déjà un match. Termine ce match avant de la sélectionner à nouveau.');return}
 if(!pitch){e.preventDefault();e.stopImmediatePropagation();say('Choisis un terrain avant de créer le match.');return}
}
function apply(){css();cleanupPlayerAuth();refreshManualMatchUi()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
document.addEventListener('click',guardManualMatch,true);
document.addEventListener('swe:rendered',()=>setTimeout(apply,40));
document.addEventListener('swe:match-finished',()=>setTimeout(refreshManualMatchUi,40));
document.addEventListener('swe:rotation-updated',()=>setTimeout(refreshManualMatchUi,40));
window.addEventListener('pageshow',()=>setTimeout(apply,80));
})();
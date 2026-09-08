(()=>{
'use strict';
if(window.__SWE_PUBLIC_REG_LOCK_4307)return;window.__SWE_PUBLIC_REG_LOCK_4307=true;
let state=null,checking=false,observer=null;
const qs=s=>document.querySelector(s);
function context(){
  const u=new URLSearchParams(location.search);
  const r=window.__sweResolvedShortLink||{};
  return {token:r.public_token||u.get('public')||null,tid:r.tournament_id||u.get('tournament')||null};
}
function closedState(row){
  if(!row)return false;
  if(row.status==='finished')return true;
  if(row.registration_open===false)return true;
  if(row.registration_deadline){const ms=Date.parse(row.registration_deadline);if(Number.isFinite(ms)&&Date.now()>=ms)return true;}
  return false;
}
function ensureCss(){
  if(qs('#swePublicRegLockCss'))return;
  const s=document.createElement('style');s.id='swePublicRegLockCss';s.textContent=`
  .swe-reg-closed-banner{margin:14px 0;padding:15px 16px;border-radius:14px;background:#fff1f2;border:1px solid #fecdd3;color:#9f1239;font-weight:900;font-size:1.02rem;box-shadow:0 4px 14px rgba(159,18,57,.06)}
  .swe-reg-closed-banner small{display:block;margin-top:4px;font-weight:600;color:#7f1d1d}
  .swe-reg-locked{opacity:.48!important;filter:grayscale(.35);cursor:not-allowed!important;pointer-events:none!important}
  `;document.head.appendChild(s);
}
function banner(){
  const view=qs('#publicView');if(!view)return;
  let b=qs('#sweRegistrationClosedBanner');
  if(!b){b=document.createElement('div');b.id='sweRegistrationClosedBanner';b.className='swe-reg-closed-banner';b.innerHTML='⛔ Inscriptions clôturées<small>Les inscriptions et la création d’équipe sont désormais fermées. Les informations du tournoi restent consultables.</small>';const reg=qs('#publicRegistration');const head=view.querySelector('header');if(reg)reg.insertAdjacentElement('beforebegin',b);else if(head)head.insertAdjacentElement('afterend',b);else view.prepend(b)}
}
function lock(el){if(!el)return;el.disabled=true;el.setAttribute('aria-disabled','true');el.classList.add('swe-reg-locked')}
function apply(){
  if(!state||!closedState(state))return;
  ensureCss();banner();
  ['#publicJoin','#publicTeamCode','#publicValidateTeamCode','#publicCreateTeam','#publicAddTeamGuest','#publicGuestName','#publicAddGuest','#publicNewPlayerName','#publicNewPlayerJoin','#leagueSessionPublicJoin'].forEach(sel=>lock(qs(sel)));
  document.querySelectorAll('[data-team-guest],#publicTeamCreator,#publicTeamName,#publicTeamColorChoices button,#publicTeamMateBox button').forEach(lock);
  const form=qs('#publicTeamFormAfterCode');if(form)form.classList.add('hidden');
  const status=qs('#publicSelectedStatus');if(status&&!status.dataset.sweClosed){status.dataset.sweClosed='1';status.textContent='⛔ Inscriptions clôturées — consultation uniquement.'}
}
async function check(){
  if(checking)return;const {token,tid}=context();if(!token||!tid)return;checking=true;
  try{const {data,error}=await sb.rpc('public_tournament_registration_state',{p_token:token,p_tournament_id:tid});if(error)throw error;state=Array.isArray(data)?data[0]:data;if(closedState(state))apply()}
  catch(e){console.warn('SWÉ V43.07 état inscriptions publiques',e)}finally{checking=false}
}
function watch(){
  if(observer||!qs('#publicView'))return;
  observer=new MutationObserver(()=>{if(state&&closedState(state))apply()});
  observer.observe(qs('#publicView'),{childList:true,subtree:true});
}
function boot(){if(!qs('#publicView'))return;check();watch();setTimeout(check,400);setTimeout(()=>{apply()},1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('swe:rendered',()=>{check();setTimeout(apply,40)});
window.addEventListener('pageshow',()=>{check();setTimeout(apply,80)});
})();
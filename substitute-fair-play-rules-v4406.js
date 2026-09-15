(()=>{
'use strict';
if(window.__SWE_SUBSTITUTE_FAIR_PLAY_RULES_4406)return;
window.__SWE_SUBSTITUTE_FAIR_PLAY_RULES_4406=true;

const RULE_TITLE='Rotation équitable des remplaçants';
const RULE_TEXT='Un remplaçant ne peut pas jouer deux matchs consécutifs pour la même équipe, sauf en cas de blessure ou de départ prématuré d’un joueur. Avant de rejouer pour une équipe déjà aidée, il doit avoir remplacé un membre de chacune des autres équipes du tournoi.';

function addRule(container){
 if(!container||container.querySelector('[data-swe-substitute-fair-play="4406"]'))return;
 const box=document.createElement('section');
 box.dataset.sweSubstituteFairPlay='4406';
 box.style.cssText='margin-top:14px;padding:14px 15px;border:1px solid #f0c24b;border-radius:14px;background:linear-gradient(135deg,#fff8dc,#fffdf4);color:#533b00';
 box.innerHTML='<h3 style="margin:0 0 6px">🔄 '+RULE_TITLE+'</h3><p style="margin:0;line-height:1.55">'+RULE_TEXT+'</p>';
 container.appendChild(box);
}

function apply(){
 addRule(document.querySelector('#registrationParticipationRules > div'));
 addRule(document.querySelector('#registrationRules > div'));
 document.querySelectorAll('.swe-substitutes-card .swe-substitutes-head span').forEach(el=>{
   el.textContent='Rotation équitable entre toutes les équipes · pas deux matchs de suite avec la même équipe';
 });
 document.querySelectorAll('.sp-royal-subs p').forEach(el=>{
   if(!el.dataset.sweSubstituteFairPlay){el.dataset.sweSubstituteFairPlay='4406';el.textContent='Rotation équitable : une équipe différente à chaque match, sauf blessure ou départ prématuré.'}
 });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
document.addEventListener('swe:rendered',()=>setTimeout(apply,40));
window.addEventListener('pageshow',()=>setTimeout(apply,100));
[250,700,1500,3000].forEach(ms=>setTimeout(apply,ms));
})();

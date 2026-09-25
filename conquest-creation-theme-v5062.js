(()=>{
'use strict';
if(window.__SWE_CONQUEST_CREATION_THEME_5062)return;
window.__SWE_CONQUEST_CREATION_THEME_5062=true;
const E=id=>document.getElementById(id);

function installStyle(){
  if(E('sweConquestCreationThemeCss'))return;
  const style=document.createElement('style');
  style.id='sweConquestCreationThemeCss';
  style.textContent=`
    #tournamentAdminCard.swe-conquest-create-theme{
      background:linear-gradient(145deg,#4a0714 0%,#741126 48%,#9f1d37 100%)!important;
      border:2px solid #e56a7f!important;
      box-shadow:0 20px 48px rgba(96,10,33,.30)!important;
      color:#fff!important;
    }
    #tournamentAdminCard.swe-conquest-create-theme .tour-create-hero,
    #tournamentAdminCard.swe-conquest-create-theme .sweflow-hero{
      background:linear-gradient(120deg,rgba(36,3,12,.62),rgba(127,13,39,.34))!important;
      border-color:rgba(255,205,215,.3)!important;
      box-shadow:none!important;
    }
    #tournamentAdminCard.swe-conquest-create-theme h2,
    #tournamentAdminCard.swe-conquest-create-theme h3,
    #tournamentAdminCard.swe-conquest-create-theme b,
    #tournamentAdminCard.swe-conquest-create-theme .tour-create-copy h2{color:#fff!important}
    #tournamentAdminCard.swe-conquest-create-theme .muted,
    #tournamentAdminCard.swe-conquest-create-theme small,
    #tournamentAdminCard.swe-conquest-create-theme .tour-create-copy p{color:#ffe6eb!important}
    #tournamentAdminCard.swe-conquest-create-theme .player,
    #tournamentAdminCard.swe-conquest-create-theme .sweflow-section .player{
      background:rgba(255,255,255,.94)!important;
      border-color:rgba(255,211,220,.58)!important;
      color:#172131!important;
    }
    #tournamentAdminCard.swe-conquest-create-theme .player b,
    #tournamentAdminCard.swe-conquest-create-theme .player h2,
    #tournamentAdminCard.swe-conquest-create-theme .player h3{color:#172131!important}
    #tournamentAdminCard.swe-conquest-create-theme .player .muted,
    #tournamentAdminCard.swe-conquest-create-theme .player small{color:#5b6677!important}
    #tournamentAdminCard.swe-conquest-create-theme #tourFormat{
      border:2px solid #ffd5dc!important;
      background:#fff5f7!important;
      color:#720f26!important;
      font-weight:900!important;
    }
    #tournamentAdminCard.swe-conquest-create-theme #createTournament,
    #tournamentAdminCard.swe-conquest-create-theme .sweflow-next{
      background:linear-gradient(135deg,#f7b4c0,#df4662)!important;
      color:#4d0717!important;
      border-color:#ffdce2!important;
      box-shadow:0 9px 22px rgba(31,2,10,.24)!important;
    }
    #tournamentAdminCard.swe-conquest-create-theme:before{
      content:'⚔ PHASE CONQUÊTE';display:block;margin:0 0 12px;padding:8px 12px;
      border-radius:999px;width:max-content;background:rgba(255,255,255,.16);
      border:1px solid rgba(255,255,255,.32);font-size:11px;font-weight:950;letter-spacing:.12em;color:#ffe7ec;
    }
    @media(max-width:620px){#tournamentAdminCard.swe-conquest-create-theme{padding:16px!important}}
  `;
  document.head.appendChild(style);
}

function apply(){
  installStyle();
  const select=E('tourFormat');
  const card=E('tournamentAdminCard');
  if(!select||!card)return;
  card.classList.toggle('swe-conquest-create-theme',select.value==='conquest');
}

function bind(){
  const select=E('tourFormat');
  if(select&&!select.dataset.sweConquestThemeBound){
    select.dataset.sweConquestThemeBound='1';
    select.addEventListener('change',apply);
  }
  apply();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
document.addEventListener('swe:rendered',()=>setTimeout(bind,30));
document.addEventListener('click',event=>{if(event.target.closest?.('[data-view="tournaments"],#newTournamentToggle'))setTimeout(bind,90)},true);
})();

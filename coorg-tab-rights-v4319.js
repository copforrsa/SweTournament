(()=>{
'use strict';
if(window.__SWE_COORG_TAB_RIGHTS_4321)return;window.__SWE_COORG_TAB_RIGHTS_4321=true;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
function loadIdentityModule(){if(document.querySelector('script[data-swe-player-contact="4321"]'))return;const s=document.createElement('script');s.src='/player-contact-profile-v4321.js?v=4321';s.async=false;s.dataset.swePlayerContact='4321';document.body.appendChild(s)}
function css(){if(document.getElementById('sweCoorgRights4321Style'))return;const s=document.createElement('style');s.id='sweCoorgRights4321Style';s.textContent=`
.tabs button.swe-right-disabled,#view-home button[data-go].swe-right-disabled{opacity:.30!important;filter:grayscale(1)!important;cursor:not-allowed!important;pointer-events:auto!important;box-shadow:none!important;color:#8d9aaa!important}
.tabs button.swe-right-disabled{background:transparent!important}
#view-home button[data-go].swe-right-disabled{background:#eef1f4!important;border-color:#d9dfe6!important;position:relative!important}
#view-home button[data-go].swe-right-disabled:after{content:'🔒';margin-left:auto;font-size:12px;opacity:.75}
.tabs button.swe-right-disabled:after{content:'🔒';margin-left:auto;font-size:11px;opacity:.75}
.tabs button[data-view="profile"],.tabs button[data-view="player-profile"],.tabs button[data-view="playerprofile"],.tabs button[data-view="myplayer"],.tabs button[data-view="my-profile"],.tabs button[data-view="my_profile"]{opacity:1!important;filter:none!important;cursor:pointer!important;pointer-events:auto!important;color:#eef6ff!important}
.tabs button[data-view="profile"].active,.tabs button[data-view="player-profile"].active,.tabs button[data-view="playerprofile"].active,.tabs button[data-view="myplayer"].active,.tabs button[data-view="my-profile"].active,.tabs button[data-view="my_profile"].active{color:#fff!important}
.tabs button[data-view="profile"]:after,.tabs button[data-view="player-profile"]:after,.tabs button[data-view="playerprofile"]:after,.tabs button[data-view="myplayer"]:after,.tabs button[data-view="my-profile"]:after,.tabs button[data-view="my_profile"]:after{content:none!important}
@media(max-width:650px){.tabs button.swe-right-disabled:after{position:absolute;right:4px;top:3px;margin:0;font-size:9px}.tabs button.swe-right-disabled{position:relative}}
`;document.head.appendChild(s)}
function homeText(){const h=document.getElementById('view-home');return norm(h?.textContent||'')}
function isCoorg(){const t=homeText();return t.includes('co-gestionnaire')&&t.includes('mes autorisations')}
function permissionsText(){const h=document.getElementById('view-home');if(!h)return'';const box=[...h.querySelectorAll('div,section,article')].find(el=>{const t=norm(el.textContent);return t.includes('mes autorisations')&&t.includes('droits accordes')});return norm(box?.textContent||h.textContent||'')}
function isProfileView(view){view=String(view||'').toLowerCase();return ['profile','player-profile','playerprofile','myplayer','my-profile','my_profile'].includes(view)}
function allowed(view,txt){
 view=String(view||'').toLowerCase();
 if(view==='home'||isProfileView(view))return true;
 if(view==='players')return /(voir les joueurs|voir la liste des joueurs|ajouter des membres|modifier les informations personnelles des joueurs|evaluer|noter)/.test(txt);
 if(view==='matches')return /(saisir les scores|modifier les scores|score pendant les matchs|gerer les matchs|match en direct)/.test(txt);
 if(view==='tournaments')return /(creer un nouveau tournoi|gerer les tournois|terminer un tournoi|supprimer un tournoi|droits admin temporaires)/.test(txt);
 if(view==='teams')return /(generer des equipes|codes equipe|gerer les equipes|validation des equipes|droits admin temporaires)/.test(txt);
 if(view==='league')return /(ligue|droits admin temporaires)/.test(txt);
 if(view==='ranking'||view==='rankings')return /(classement|top player|droits admin temporaires)/.test(txt);
 if(view==='cooler'||view==='third-half'||view==='glaciere')return /(3e mi-temps|troisieme mi-temps|glaciere|droits admin temporaires)/.test(txt);
 if(view==='permissions')return false;
 return false;
}
function quickView(btn){const raw=String(btn?.dataset?.go||'').toLowerCase();if(raw)return raw;const t=norm(btn?.textContent||'');if(t.includes('joueurs'))return'players';if(t.includes('saisir')&&t.includes('match'))return'matches';if(t.includes('tournoi'))return'tournaments';if(t.includes('classement'))return'ranking';if(t.includes('equipe'))return'teams';if(t.includes('ligue'))return'league';if(t.includes('glaciere')||t.includes('3e mi-temps'))return'cooler';if(t.includes('profil'))return'myplayer';return''}
function toast(){let t=document.getElementById('sweRightsToast4321');if(!t){t=document.createElement('div');t.id='sweRightsToast4321';t.style.cssText='position:fixed;z-index:9999;left:50%;top:18px;transform:translateX(-50%);padding:10px 14px;border-radius:12px;background:#071a35;color:white;font-weight:850;box-shadow:0 10px 28px rgba(0,0,0,.22);display:none';t.textContent="Cet accès n’est pas autorisé pour ton profil co-gestionnaire.";document.body.appendChild(t)}t.style.display='block';clearTimeout(t._timer);t._timer=setTimeout(()=>t.style.display='none',2200)}
function goHome(){const b=document.querySelector('.tabs button[data-view="home"]');if(b&&!b.classList.contains('active'))b.click()}
function mark(el,ok){el.classList.toggle('swe-right-disabled',!ok);el.setAttribute('aria-disabled',ok?'false':'true');if(!ok)el.title='Non autorisé par l’administrateur';else el.removeAttribute('title')}
function forceProfileEnabled(){document.querySelectorAll('.tabs button[data-view]').forEach(btn=>{if(isProfileView(btn.dataset.view)){mark(btn,true);btn.disabled=false;btn.style.setProperty('color','#eef6ff','important');btn.style.setProperty('opacity','1','important');btn.style.setProperty('filter','none','important');btn.style.setProperty('pointer-events','auto','important')}})}
function apply(){css();forceProfileEnabled();if(!isCoorg())return false;const txt=permissionsText();document.querySelectorAll('.tabs button[data-view]').forEach(btn=>mark(btn,allowed(btn.dataset.view||'',txt)));forceProfileEnabled();document.querySelectorAll('#view-home button[data-go]').forEach(btn=>{const view=quickView(btn);if(view)mark(btn,allowed(view,txt))});const active=document.querySelector('.tabs button.active[data-view]');if(active&&!allowed(active.dataset.view||'',txt))goHome();return true}
document.addEventListener('click',e=>{const b=e.target.closest?.('.tabs button.swe-right-disabled,#view-home button[data-go].swe-right-disabled');if(!b)return;e.preventDefault();e.stopImmediatePropagation();toast()},true);
function boot(){loadIdentityModule();apply();let n=0;const t=setInterval(()=>{n++;apply();if(n>20)clearInterval(t)},250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();document.addEventListener('swe:rendered',()=>setTimeout(apply,40));window.addEventListener('pageshow',()=>setTimeout(()=>{loadIdentityModule();apply()},80));
})();
(()=>{
'use strict';
if(window.__SWE_COORG_TAB_RIGHTS_4319)return;window.__SWE_COORG_TAB_RIGHTS_4319=true;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
function css(){if(document.getElementById('sweCoorgRights4319Style'))return;const s=document.createElement('style');s.id='sweCoorgRights4319Style';s.textContent=`
.tabs button.swe-right-disabled,#view-home button[data-go].swe-right-disabled{opacity:.30!important;filter:grayscale(1)!important;cursor:not-allowed!important;pointer-events:auto!important;box-shadow:none!important;color:#8d9aaa!important}
.tabs button.swe-right-disabled{background:transparent!important}
#view-home button[data-go].swe-right-disabled{background:#eef1f4!important;border-color:#d9dfe6!important;position:relative!important}
#view-home button[data-go].swe-right-disabled:after{content:'🔒';margin-left:auto;font-size:12px;opacity:.75}
.tabs button.swe-right-disabled:after{content:'🔒';margin-left:auto;font-size:11px;opacity:.75}
.tabs button[data-view="profile"],.tabs button[data-view="player-profile"]{opacity:1!important;filter:none!important;cursor:pointer!important;pointer-events:auto!important}
@media(max-width:650px){.tabs button.swe-right-disabled:after{position:absolute;right:4px;top:3px;margin:0;font-size:9px}.tabs button.swe-right-disabled{position:relative}}
`;document.head.appendChild(s)}
function homeText(){const h=document.getElementById('view-home');return norm(h?.textContent||'')}
function isCoorg(){const t=homeText();return t.includes('co-gestionnaire')&&t.includes('mes autorisations')}
function permissionsText(){const h=document.getElementById('view-home');if(!h)return'';const box=[...h.querySelectorAll('div,section,article')].find(el=>{const t=norm(el.textContent);return t.includes('mes autorisations')&&t.includes('droits accordes')});return norm(box?.textContent||h.textContent||'')}
function allowed(view,txt){
 view=String(view||'').toLowerCase();
 if(view==='home'||view==='profile'||view==='player-profile'||view==='playerprofile')return true;
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
function quickView(btn){
 const raw=String(btn?.dataset?.go||'').toLowerCase();if(raw)return raw;
 const t=norm(btn?.textContent||'');
 if(t.includes('joueurs'))return'players';
 if(t.includes('saisir')&&t.includes('match'))return'matches';
 if(t.includes('tournoi'))return'tournaments';
 if(t.includes('classement'))return'ranking';
 if(t.includes('equipe'))return'teams';
 if(t.includes('ligue'))return'league';
 if(t.includes('glaciere')||t.includes('3e mi-temps'))return'cooler';
 if(t.includes('profil'))return'profile';
 return'';
}
function toast(){let t=document.getElementById('sweRightsToast4319');if(!t){t=document.createElement('div');t.id='sweRightsToast4319';t.style.cssText='position:fixed;z-index:9999;left:50%;top:18px;transform:translateX(-50%);padding:10px 14px;border-radius:12px;background:#071a35;color:white;font-weight:850;box-shadow:0 10px 28px rgba(0,0,0,.22);display:none';t.textContent="Cet accès n’est pas autorisé pour ton profil co-gestionnaire.";document.body.appendChild(t)}t.style.display='block';clearTimeout(t._timer);t._timer=setTimeout(()=>t.style.display='none',2200)}
function goHome(){const b=document.querySelector('.tabs button[data-view="home"]');if(b&&!b.classList.contains('active'))b.click()}
function mark(el,ok){el.classList.toggle('swe-right-disabled',!ok);el.setAttribute('aria-disabled',ok?'false':'true');if(!ok)el.title='Non autorisé par l’administrateur';else el.removeAttribute('title')}
function forceProfileEnabled(){document.querySelectorAll('.tabs button[data-view="profile"],.tabs button[data-view="player-profile"]').forEach(btn=>mark(btn,true))}
function apply(){
 css();forceProfileEnabled();
 if(!isCoorg())return false;
 const txt=permissionsText();
 document.querySelectorAll('.tabs button[data-view]').forEach(btn=>mark(btn,allowed(btn.dataset.view||'',txt)));
 document.querySelectorAll('#view-home button[data-go]').forEach(btn=>{const view=quickView(btn);if(view)mark(btn,allowed(view,txt))});
 const active=document.querySelector('.tabs button.active[data-view]');if(active&&!allowed(active.dataset.view||'',txt))goHome();
 return true
}
document.addEventListener('click',e=>{const b=e.target.closest?.('.tabs button.swe-right-disabled,#view-home button[data-go].swe-right-disabled');if(!b)return;e.preventDefault();e.stopImmediatePropagation();toast()},true);
function boot(){apply();let n=0;const t=setInterval(()=>{n++;if(apply()&&n>8)clearInterval(t);if(n>24)clearInterval(t)},250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('swe:rendered',()=>setTimeout(apply,40));window.addEventListener('pageshow',()=>setTimeout(apply,80));
})();
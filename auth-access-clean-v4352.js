(()=>{
'use strict';
if(window.__SWE_AUTH_ACCESS_CLEAN_4352)return;window.__SWE_AUTH_ACCESS_CLEAN_4352=true;
const E=id=>document.getElementById(id);
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
function state(){try{return typeof S!=='undefined'?S:null}catch(_){return null}}
function css(){
 if(E('sweAuthAccessClean4352Style'))return;
 const s=document.createElement('style');s.id='sweAuthAccessClean4352Style';s.textContent=`
/* Mire de connexion : authentification uniquement, aucun bloc commercial. */
#auth>#sweLoginOffers4252,#auth>#sweComplexHome4281,#auth>#swePublicTabs4310,#auth #sweComplexMainCta,#auth .swe-complex-fallback,#auth .swe-complex-cta{display:none!important}
#auth{width:min(470px,100%)!important;max-width:470px!important;margin:4vh auto 0!important;padding:0 10px!important}
#auth>.top{display:none!important}
#auth #loginCard,#auth #resetPasswordCard,#auth #inviteLandingCard{width:100%!important;max-width:470px!important;margin-left:auto!important;margin-right:auto!important}
#auth #loginCard{margin-top:0!important}

/* Onglets visibles mais verrouillés quand le profil ou l'offre ne donne pas accès. */
.tabs .tab.swe-access-disabled{display:flex!important;opacity:.34!important;filter:grayscale(1)!important;cursor:not-allowed!important;pointer-events:auto!important;box-shadow:none!important;color:#8d9aaa!important;background:transparent!important;position:relative!important}
.tabs .tab.swe-access-disabled:after{content:'🔒';margin-left:auto;font-size:11px;opacity:.85}
.tabs .tab.swe-access-disabled.active{background:transparent!important;color:#8d9aaa!important}
@media(max-width:899px){#auth{margin:56px auto 0!important}.tabs .tab.swe-access-disabled:after{position:absolute;right:4px;top:3px;margin:0;font-size:9px}}
`;
 document.head.appendChild(s);
}
function directChildOf(root,node){let cur=node;while(cur&&cur.parentElement&&cur.parentElement!==root)cur=cur.parentElement;return cur&&cur.parentElement===root?cur:null}
function cleanAuth(){
 css();const auth=E('auth');if(!auth)return;
 ['sweLoginOffers4252','sweComplexHome4281','swePublicTabs4310','sweComplexMainCta'].forEach(id=>E(id)?.remove());
 auth.querySelectorAll('.swe-complex-fallback,.swe-complex-cta').forEach(x=>x.remove());
 const markers=['pour les complexes de foot','developpez la frequentation de vos terrains','decouvrir l’offre complexes','decouvrir l\'offre complexes','espace partenaire','offres organisateur','commence gratuitement, evolue quand ton groupe grandit','cartes de pricing'];
 [...auth.querySelectorAll('section,article,div')].forEach(el=>{
   if(el.id==='loginCard'||el.id==='resetPasswordCard'||el.id==='inviteLandingCard'||el.closest('#loginCard,#resetPasswordCard,#inviteLandingCard'))return;
   const t=norm(el.textContent||'');if(!t||!markers.some(m=>t.includes(norm(m))))return;
   const d=directChildOf(auth,el);if(d&&d.id!=='loginCard'&&d.id!=='resetPasswordCard'&&d.id!=='inviteLandingCard')d.remove();
 });
}
function hasTemp(s){const until=s?.myPermissions?.temporary_admin_until;if(!until)return false;return new Date(until).getTime()>Date.now()}
function permissionText(){const h=E('view-home');if(!h)return'';const box=[...h.querySelectorAll('div,section,article')].find(el=>{const t=norm(el.textContent);return t.includes('mes autorisations')&&t.includes('droits accordes')});return norm(box?.textContent||h.textContent||'')}
function isProfileView(v){return ['profile','player-profile','playerprofile','myplayer','my-profile','my_profile','simple-swe'].includes(v)}
function coorgAllowed(v,s,txt){
 if(v==='home'||isProfileView(v))return true;
 const p=s.myPermissions||{};
 if(hasTemp(s))return v!=='permissions';
 if(v==='players')return !!p.can_view_players||/(voir les joueurs|voir la liste des joueurs|ajouter des membres|modifier les informations personnelles des joueurs|evaluer|noter)/.test(txt);
 if(v==='matches')return !!p.can_enter_scores||/(saisir les scores|modifier les scores|score pendant les matchs|gerer les matchs|match en direct)/.test(txt);
 if(v==='tournaments')return !!p.can_create_tournaments||/(creer un nouveau tournoi|gerer les tournois|terminer un tournoi|supprimer un tournoi)/.test(txt);
 if(v==='teams')return !!p.can_generate_teams||/(generer des equipes|codes equipe|gerer les equipes|validation des equipes)/.test(txt);
 if(v==='league')return /(^|\s)ligue(\s|$)/.test(txt);
 if(v==='ranking'||v==='rankings')return /(classement|top player)/.test(txt);
 if(v==='cooler'||v==='third-half'||v==='glaciere')return /(3e mi-temps|troisieme mi-temps|glaciere)/.test(txt);
 if(v==='permissions')return false;
 return true;
}
function featureAllowed(v,s){const f=s.workspaceFeatures||{};if(v==='tournaments')return f.tournaments_enabled!==false;if(v==='league')return f.league_enabled!==false;if(v==='ranking'||v==='rankings')return f.rankings_enabled!==false;if(v==='cooler'||v==='third-half'||v==='glaciere')return !!f.third_half_enabled;if(v==='teams'||v==='matches')return !!(f.tournaments_enabled!==false||f.league_enabled!==false);return true}
function allowed(v,s){
 v=String(v||'').toLowerCase();if(!v)return true;if(v==='home'||isProfileView(v))return true;
 if(!featureAllowed(v,s))return false;
 if(s.isSuperAdmin)return true;
 const role=String(s.workspace?.role||'').toLowerCase();
 if(role==='admin')return true;
 if(role==='coorganizer')return coorgAllowed(v,s,permissionText());
 /* Profil joueur sans rôle de gestion : seules les vues personnelles restent ouvertes. */
 return false;
}
function mark(tab,ok){
 if(!tab)return;tab.classList.toggle('swe-access-disabled',!ok);tab.setAttribute('aria-disabled',ok?'false':'true');
 if(!ok){tab.style.removeProperty('display');tab.classList.remove('hidden');tab.title='Accès non inclus ou non autorisé pour ce profil';}
 else{if(tab.title==='Accès non inclus ou non autorisé pour ce profil')tab.removeAttribute('title');}
}
function applyRights(){
 css();const s=state();if(!s||!s.session)return;
 document.querySelectorAll('#main .tabs .tab[data-view]').forEach(tab=>mark(tab,allowed(tab.dataset.view,s)));
 const active=document.querySelector('#main .tabs .tab.active.swe-access-disabled');
 if(active){document.querySelector('#main .tabs .tab[data-view="home"]')?.click();}
}
function toastLocked(){let t=E('sweAccessLocked4352');if(!t){t=document.createElement('div');t.id='sweAccessLocked4352';t.style.cssText='position:fixed;z-index:10060;left:50%;top:18px;transform:translateX(-50%);padding:10px 14px;border-radius:12px;background:#071a35;color:#fff;font-weight:850;box-shadow:0 10px 28px rgba(0,0,0,.22);display:none';t.textContent='Cet onglet n’est pas inclus ou autorisé pour ton profil.';document.body.appendChild(t)}t.style.display='block';clearTimeout(t._timer);t._timer=setTimeout(()=>t.style.display='none',2200)}
document.addEventListener('click',e=>{const b=e.target.closest?.('#main .tabs .tab.swe-access-disabled');if(!b)return;e.preventDefault();e.stopImmediatePropagation();toastLocked()},true);
let timer;function apply(){cleanAuth();applyRights();clearTimeout(timer);timer=setTimeout(()=>{cleanAuth();applyRights()},180)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
document.addEventListener('swe:rendered',apply);document.addEventListener('swe:player-profile-updated',apply);window.addEventListener('pageshow',apply);setTimeout(apply,600);setTimeout(apply,1600);
})();

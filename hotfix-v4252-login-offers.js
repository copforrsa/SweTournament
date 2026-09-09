(()=>{
'use strict';
if((new URLSearchParams(location.search).get('start')||'').toLowerCase()==='player')return;
const BUILD='42.53';
const AUTH_SELECTOR='#loginCard,#email,#password,#login,#signup,#authGoogle,#authApple';
function injectCss(){if(document.getElementById('sweLoginOffers4252Style'))return;const s=document.createElement('style');s.id='sweLoginOffers4252Style';s.textContent=`
#sweLoginOffers4252{margin:18px auto 8px;max-width:760px;padding:18px;border-radius:20px;background:linear-gradient(180deg,#f7fbff,#fff);border:1px solid #dbe7f1;box-shadow:0 12px 30px rgba(17,44,78,.08)}
#sweLoginOffers4252 .eyebrow{text-align:center;font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#2dc8e6}
#sweLoginOffers4252 h2{text-align:center;margin:6px 0 6px;font-size:24px;line-height:1.15;color:#0c2548}
#sweLoginOffers4252 .intro{text-align:center;margin:0 auto 14px;max-width:620px;color:#5e6f86;font-size:14px;line-height:1.45}
#sweLoginOffers4252 .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
#sweLoginOffers4252 .offer{background:#fff;border:1px solid #d9e6df;border-radius:16px;padding:14px;min-width:0}
#sweLoginOffers4252 .offer.featured{border:2px solid #168d59;box-shadow:0 8px 20px rgba(22,141,89,.08)}
#sweLoginOffers4252 .tag{display:inline-block;padding:4px 8px;border-radius:999px;background:#eef7f1;color:#0e7548;font-size:10px;font-weight:900;text-transform:uppercase}
#sweLoginOffers4252 h3{margin:9px 0 5px;font-size:18px;line-height:1.2;color:#0b2342}
#sweLoginOffers4252 .sub{margin:0 0 9px;color:#63728a;font-size:13px}
#sweLoginOffers4252 ul{margin:0;padding-left:18px;color:#17243b;font-size:13px;line-height:1.45}
#sweLoginOffers4252 li+li{margin-top:4px}
#sweLoginOffers4252 .foot{text-align:center;margin-top:12px;color:#66768c;font-size:12px}
@media(max-width:700px){#sweLoginOffers4252{margin:14px 10px 6px;padding:14px}#sweLoginOffers4252 h2{font-size:21px}#sweLoginOffers4252 .cards{grid-template-columns:1fr}#sweLoginOffers4252 .offer{padding:13px}}
`;document.head.appendChild(s)}
function containsAuth(el){return !!el?.querySelector?.(AUTH_SELECTOR)}
function findOld(){const all=[...document.querySelectorAll('section,div,article')].filter(el=>{if(el.id==='sweLoginOffers4252'||containsAuth(el))return false;const t=(el.textContent||'').replace(/\s+/g,' ').trim();return /Commence gratuitement/i.test(t)&&/Besoin ponctuel/i.test(t)&&/Organisateur/i.test(t)});if(!all.length)return null;all.sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length);return all[0]}
function build(){const wrap=document.createElement('section');wrap.id='sweLoginOffers4252';wrap.innerHTML=`<div class="eyebrow">Offres organisateur</div><h2>Commence gratuitement, évolue selon les besoins de ton groupe ⚽</h2><p class="intro">Trois façons simples d’utiliser SWÉ. Le détail complet des formules reste disponible après connexion.</p><div class="cards"><article class="offer"><span class="tag">Gratuit</span><h3>Pour démarrer</h3><p class="sub">L’essentiel sans abonnement.</p><ul><li>Jusqu’à <b>15 joueurs</b></li><li><b>1 ligue</b> + <b>1 saison</b></li><li>Classements de base</li><li>Complexes référencés SWÉ</li></ul></article><article class="offer featured"><span class="tag">Abonnement</span><h3>Pour les groupes actifs</h3><p class="sub">Plus de capacité et d’outils.</p><ul><li>Plus de joueurs</li><li>Modules inclus selon la formule</li><li>Lieux personnalisés</li><li>Outils avancés d’organisation</li></ul></article><article class="offer"><span class="tag">À l’unité</span><h3>Pour un besoin ponctuel</h3><p class="sub">Sans engagement.</p><ul><li>Achat d’un module ou d’une option</li><li>Usage occasionnel</li><li>Permet de tester une fonction premium</li></ul></article></div><div class="foot">Les tarifs et fonctions détaillés sont affichés dans l’espace organisateur.</div>`;return wrap}
function render(){injectCss();if(document.getElementById('sweLoginOffers4252'))return true;const old=findOld();if(old){old.replaceWith(build());return true}const loginCard=document.getElementById('loginCard');if(loginCard&&loginCard.parentElement){loginCard.insertAdjacentElement('afterend',build());return true}return false}
function restoreAuth(){const loginCard=document.getElementById('loginCard');if(loginCard){loginCard.classList.remove('hidden');loginCard.style.removeProperty('display')}const auth=document.getElementById('auth');if(auth){auth.classList.remove('hidden');auth.style.removeProperty('display')}}
function boot(){restoreAuth();if(render())return;let tries=0;const timer=setInterval(()=>{tries++;restoreAuth();if(render()||tries>30)clearInterval(timer)},200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();document.addEventListener('swe:rendered',()=>setTimeout(()=>{restoreAuth();render()},0));window.addEventListener('pageshow',()=>setTimeout(()=>{restoreAuth();render()},50));
})();
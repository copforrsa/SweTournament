(()=>{
'use strict';
if(window.__SWE_4275_COORG_COMMERCIAL)return;window.__SWE_4275_COORG_COMMERCIAL=true;
const txt=e=>(e?.textContent||'').replace(/\s+/g,' ').trim();
function style(){if(document.getElementById('swe4275CommercialStyle'))return;const s=document.createElement('style');s.id='swe4275CommercialStyle';s.textContent=`
#sweCoorgCommercial4275{position:relative;overflow:hidden;margin:0 0 16px;padding:20px;border-radius:22px;background:linear-gradient(135deg,#0b6b45 0%,#156aa8 55%,#6847c7 100%);color:#fff;box-shadow:0 16px 34px rgba(25,72,100,.16)}
#sweCoorgCommercial4275:after{content:'⚽';position:absolute;right:18px;top:5px;font-size:84px;opacity:.08;transform:rotate(-12deg)}
#sweCoorgCommercial4275 .eyebrow{font-size:11px;font-weight:950;letter-spacing:.12em;text-transform:uppercase;color:#bff6e2}
#sweCoorgCommercial4275 h3{margin:6px 0 7px;font-size:24px;line-height:1.15;color:#fff}
#sweCoorgCommercial4275 .lead{margin:0;max-width:760px;line-height:1.55;color:#f0fbf6;font-size:14px}
#sweCoorgCommercial4275 .benefits{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:15px}
#sweCoorgCommercial4275 .benefit{padding:12px;border-radius:15px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.22);min-height:94px}
#sweCoorgCommercial4275 .benefit span{font-size:22px}#sweCoorgCommercial4275 .benefit b{display:block;margin-top:5px;color:#fff}#sweCoorgCommercial4275 .benefit small{display:block;margin-top:4px;line-height:1.35;color:#eaf7f2}
#sweCoorgCommercial4275 .closing{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:14px;padding-top:13px;border-top:1px solid rgba(255,255,255,.2)}
#sweCoorgCommercial4275 .closing b{font-size:14px}.swe4275-pricepill{background:#fff;color:#07573b;border-radius:999px;padding:8px 12px;font-weight:950;white-space:nowrap}
@media(max-width:850px){#sweCoorgCommercial4275 .benefits{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){#sweCoorgCommercial4275{padding:16px}#sweCoorgCommercial4275 h3{font-size:21px}#sweCoorgCommercial4275 .benefits{grid-template-columns:1fr 1fr}.swe4275-pricepill{width:100%;text-align:center}}
`;document.head.appendChild(s)}
function smallestContaining(re){const els=[...document.querySelectorAll('div,section,article')].filter(e=>re.test(txt(e)));els.sort((a,b)=>txt(a).length-txt(b).length);return els[0]||null}
function directChild(root,node){let n=node;while(n&&n.parentElement&&n.parentElement!==root)n=n.parentElement;return n&&n.parentElement===root?n:null}
function findRoot(){const a=smallestContaining(/Renforce ton équipe à petit prix/i);const b=smallestContaining(/Choisis ton rythme de paiement/i);if(!a||!b)return null;let p=a;while(p&&!p.contains(b))p=p.parentElement;return p&&txt(p).length<7000?p:null}
function inject(){style();if(document.getElementById('sweCoorgCommercial4275'))return true;const root=findRoot();if(!root)return false;
 const oldHero=smallestContaining(/Renforce ton équipe à petit prix/i),oldFeatures=smallestContaining(/Gestion des joueurs[\s\S]*Organisation[\s\S]*Droits personnalisés[\s\S]*Accès immédiat/i),payTitle=smallestContaining(/Choisis ton rythme de paiement/i);
 [oldHero,oldFeatures].forEach(n=>{const d=n?directChild(root,n):null;if(d&&d!==payTitle)d.style.display='none'});
 const hero=document.createElement('section');hero.id='sweCoorgCommercial4275';hero.innerHTML=`<div class="eyebrow">TON STAFF • TON AVANTAGE TERRAIN</div><h3>À plusieurs, tes Swés deviennent plus simples… et plus équilibrés</h3><p class="lead">Un co-gestionnaire ne sert pas seulement à administrer. Il peut t'aider avant, pendant et après chaque événement, apporter un deuxième regard sur le niveau des joueurs et rendre l'organisation plus fluide sans te retirer le contrôle.</p><div class="benefits"><div class="benefit"><span>🕵️</span><b>Notes anonymes</b><small>Les co-gestionnaires évaluent les joueurs du groupe de façon confidentielle pour enrichir la moyenne.</small></div><div class="benefit"><span>⚖️</span><b>Équipes mieux équilibrées</b><small>Plusieurs avis terrain réduisent les écarts de perception et améliorent la composition des équipes.</small></div><div class="benefit"><span>⚡</span><b>Un vrai relais le jour J</b><small>Inscriptions, joueurs, scores, équipes : tu choisis précisément ce que chacun peut gérer.</small></div><div class="benefit"><span>🏁</span><b>Débrief après le Swé</b><small>Les co-organisateurs autorisés peuvent aussi noter les joueurs à la fin du tournoi.</small></div></div><div class="closing"><b>Tu gardes la main. Tu délègues seulement ce qui te fait gagner du temps.</b><span class="swe4275-pricepill">Dès 1,99 € / mois par accès</span></div>`;
 const anchor=payTitle?directChild(root,payTitle):null;if(anchor)root.insertBefore(hero,anchor);else root.prepend(hero);root.dataset.sweCommercial4275='1';return true}
function boot(){if(inject())return;let n=0;const t=setInterval(()=>{n++;if(inject()||n>30)clearInterval(t)},250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();document.addEventListener('swe:rendered',()=>setTimeout(inject,80));window.addEventListener('pageshow',()=>setTimeout(inject,120));
})();
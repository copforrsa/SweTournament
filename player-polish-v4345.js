(()=>{
'use strict';
if(window.__SWE_PLAYER_POLISH_4345)return;window.__SWE_PLAYER_POLISH_4345=true;
const E=id=>document.getElementById(id);
function css(){if(E('swe4345Css'))return;const s=document.createElement('style');s.id='swe4345Css';s.textContent=`
/* Partage carte joueur : logos seuls, compacts */
.swe4344-share{display:flex!important;justify-content:center!important;align-items:center!important;gap:12px!important;margin-top:14px!important}
.swe4344-share button{width:44px!important;height:44px!important;min-height:44px!important;flex:0 0 44px!important;border-radius:50%!important;padding:0!important;box-shadow:none!important}
.swe4344-share button span{display:none!important}.swe4344-share svg{width:22px!important;height:22px!important;margin:0!important}
.swe4344-short{margin-top:13px!important}.swe4344-short input{font-size:12px!important;line-height:1.2!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
/* Préférences */
#swe4345Preferences .swe4345-pref-head{display:flex;align-items:center;gap:10px;margin-bottom:6px}
#swe4345Preferences .swe4345-pref-head .ico{width:38px;height:38px;border-radius:12px;background:#e9f3ff;color:#116fe8;display:grid;place-items:center;font-size:19px}
#swe4345Preferences .swe4345-pref-head h2{margin:0;color:#0d2b52}.swe4345-pref-sub{margin:0 0 14px;color:#61748c}
#swe4345Preferences .swe4345-pref-list{display:grid;gap:10px}.swe4345-pref-list .player{margin:0!important;border:1px solid #dce7f1!important;border-radius:14px!important;background:#fff!important}
/* CTA match simple */
#swe4345SimpleMatch{margin-top:14px;border:1px solid #c8ddef;border-radius:18px;padding:18px;background:linear-gradient(135deg,#f8fbff,#eef7ff);display:flex;align-items:center;justify-content:space-between;gap:16px}
#swe4345SimpleMatch h3{margin:0 0 5px;color:#0d2b52}#swe4345SimpleMatch p{margin:0;color:#60748c;max-width:650px}
#swe4345SimpleMatch button{background:linear-gradient(135deg,#ffd75c,#f2b92f)!important;color:#071a35!important;font-weight:950!important;white-space:nowrap!important}
@media(max-width:680px){#swe4345SimpleMatch{flex-direction:column;align-items:stretch}.swe4345-share{justify-content:flex-start}.swe4344-share{gap:10px!important}.swe4344-share button{width:42px!important;height:42px!important;flex-basis:42px!important}}
`;document.head.appendChild(s)}
function relabelStats(){const root=E('myPlayerStats');if(!root)return;root.querySelectorAll('div').forEach(card=>{const sm=[...card.querySelectorAll('small')].find(x=>/SWÉ joués/i.test(x.textContent||''));if(!sm)return;sm.textContent='Tournois joués';const icon=card.querySelector('span');if(icon)icon.textContent='🏁'})}
function rebuildPreferences(){const view=E('view-myplayer');if(!view)return;const candidates=[...view.querySelectorAll('.card,section')].filter(x=>/Mon identité/i.test(x.textContent||'')&&/Profil public/i.test(x.textContent||''));const box=candidates.sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0];if(!box)return;box.id='swe4345Preferences';const title=[...box.querySelectorAll('h1,h2,h3,.sectiontitle,strong,b')].find(x=>/^\s*.*Mon identité\s*$/i.test(x.textContent||''));if(title)title.textContent='⚙️ Mes préférences';
 // retire Nom/pseudo public et Zone/commune, sans toucher aux toggles
 box.querySelectorAll('label,.field,.player,div').forEach(el=>{const t=(el.textContent||'').trim();if((/Nom\s*\/\s*pseudo public/i.test(t)||/Zone\s*\/\s*commune/i.test(t))&&el.querySelector('input,textarea,select')){el.style.display='none'}});
 // supprime les sous-titres devenus inutiles
 [...box.querySelectorAll('p,.muted')].forEach(p=>{if(/Choisis ce que les autres organisateurs peuvent voir/i.test(p.textContent||''))p.textContent='Gère la visibilité de ton profil et tes notifications.'});
 const prefItems=[...box.querySelectorAll('.player,label')].filter(x=>/Profil public|Disponible dans l’annuaire|M’informer des prochains SWÉ/i.test(x.textContent||''));
 if(prefItems.length){let list=box.querySelector('.swe4345-pref-list');if(!list){list=document.createElement('div');list.className='swe4345-pref-list';const first=prefItems[0];first.parentNode.insertBefore(list,first)}prefItems.forEach(x=>list.appendChild(x))}
}
function addSimpleMatch(){const view=E('view-myplayer')||E('view-home');if(!view)return;let host=[...view.querySelectorAll('.card,section,div')].filter(x=>/SWÉ à découvrir/i.test(x.textContent||''));host=host.sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0];if(!host)return;if(E('swe4345SimpleMatch'))return;const box=document.createElement('div');box.id='swe4345SimpleMatch';box.innerHTML='<div><h3>⚽ Créer un match simple</h3><p>Pour organiser rapidement un match sans passer par tous les réglages avancés. Tu pourras choisir le nombre de joueurs et poursuivre avec le flux tournoi existant.</p></div><button id="swe4345SimpleMatchBtn" type="button">Créer un match simple →</button>';host.appendChild(box);E('swe4345SimpleMatchBtn').onclick=()=>{const tab=document.querySelector('.tabs button[data-view="tournaments"]');if(tab)tab.click();setTimeout(()=>{const b=E('newTournamentToggle');if(b)b.click();const name=E('tourName');if(name&&!name.value)name.value='Match simple';const fmt=E('tourFormat');if(fmt)fmt.value='classic';const card=E('createTournament')?.closest('.card');if(card){card.scrollIntoView({behavior:'smooth',block:'start'});card.dataset.sweSimpleMatch='1'}},180)}
}
function apply(){css();relabelStats();rebuildPreferences();addSimpleMatch()}
let t;const soon=()=>{clearTimeout(t);t=setTimeout(apply,120)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',soon,{once:true});else soon();document.addEventListener('swe:rendered',soon);document.addEventListener('swe:player-profile-updated',soon);window.addEventListener('pageshow',soon);
})();
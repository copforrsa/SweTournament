(()=>{
'use strict';
if(window.__SWE_COORG_FUN_4270)return;
window.__SWE_COORG_FUN_4270=true;
const BUILD='42.70';
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const q=s=>document.querySelector(s);
const appState=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
const client=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};

function style(){
 if(q('#sweCoorgFun4270Style'))return;
 const s=document.createElement('style');s.id='sweCoorgFun4270Style';s.textContent=`
 .coorg-fun-hero{position:relative;overflow:hidden;border:0!important;background:linear-gradient(135deg,#0d7549 0%,#0b5b79 55%,#6f3cc3 100%)!important;color:#fff!important;box-shadow:0 18px 40px rgba(8,73,53,.18)}
 .coorg-fun-hero:after{content:'⚽';position:absolute;right:18px;top:8px;font-size:72px;opacity:.12;transform:rotate(-12deg)}
 .coorg-fun-kicker{font-size:11px;font-weight:950;letter-spacing:.13em;text-transform:uppercase;opacity:.82}.coorg-fun-hero h2{margin:6px 0 8px;font-size:25px}.coorg-fun-hero p{line-height:1.65;max-width:760px;margin:0;color:#eefaf4}
 .coorg-fun-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:15px}.coorg-fun-tile{padding:12px;border-radius:15px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(3px)}.coorg-fun-tile span{font-size:23px}.coorg-fun-tile b{display:block;margin-top:5px}.coorg-fun-tile small{display:block;margin-top:4px;line-height:1.4;color:#e9f7ef}
 .coorg-fun-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.coorg-fun-actions button{border:0;border-radius:12px;padding:10px 13px;font-weight:900;cursor:pointer}.coorg-fun-actions .white{background:#fff;color:#0b5337}.coorg-fun-actions .glass{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.28)}
 .swe-event-rating{border:1px solid #d8e8df!important;background:linear-gradient(145deg,#fff,#f7fbf9)!important}.swe-event-rating-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}.swe-event-score{font-size:28px;font-weight:950;color:#0d7549}.swe-rating-10{display:grid;grid-template-columns:repeat(10,minmax(34px,1fr));gap:6px;margin-top:12px}.swe-rating-10 button{border:1px solid #d6e4dc;background:#fff;border-radius:11px;padding:9px 4px;font-weight:900;cursor:pointer}.swe-rating-10 button:hover,.swe-rating-10 button.active{background:#0d7549;color:#fff;border-color:#0d7549;transform:translateY(-1px)}
 .swe-last-swe-teaser{margin:13px 0;padding:14px 15px;border-radius:17px;background:linear-gradient(135deg,#fff7ed,#f5f3ff 52%,#ecfdf5);border:1px solid #eadfd4;box-shadow:0 8px 22px rgba(62,42,23,.06)}.swe-last-swe-teaser h3{margin:0 0 5px;font-size:16px}.swe-last-swe-teaser .teaser-line{margin-top:5px;line-height:1.45;font-size:13px}.swe-last-swe-teaser .teaser-foot{margin-top:8px;font-size:11px;color:#6f756f}
 @media(max-width:820px){.coorg-fun-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.swe-rating-10{grid-template-columns:repeat(5,minmax(42px,1fr))}}
 @media(max-width:520px){.coorg-fun-grid{grid-template-columns:1fr 1fr}.coorg-fun-hero h2{font-size:21px}}
 `;document.head.appendChild(s);
}

function injectAdminHero(){
 const view=q('#view-permissions');if(!view||q('#coorgFunHero4270'))return;
 const hero=document.createElement('div');hero.id='coorgFunHero4270';hero.className='card coorg-fun-hero';
 hero.innerHTML=`<div class="coorg-fun-kicker">TON STAFF • TON AVANTAGE TERRAIN</div><h2>🤝 Les co-gestionnaires font bien plus que de l’administration</h2><p>Entoure-toi de joueurs de confiance pour préparer tes Swés, t’aider le jour J et faire progresser l’équilibre des équipes. Leur regard terrain complète le tien sans alourdir ton organisation.</p><div class="coorg-fun-grid"><div class="coorg-fun-tile"><span>🕵️</span><b>Notes anonymes</b><small>Ils évaluent les joueurs du groupe de façon confidentielle. L’admin voit les tendances, pas qui a mis quelle note.</small></div><div class="coorg-fun-tile"><span>⚖️</span><b>Matchs plus équilibrés</b><small>Cardio, dribble, collectif, frappe et rôle nourrissent les moyennes utilisées pour composer les équipes.</small></div><div class="coorg-fun-tile"><span>⚡</span><b>Avant • pendant • après</b><small>Inscriptions, équipes, scores, joueurs : tu délègues ce que tu veux avec des droits précis.</small></div><div class="coorg-fun-tile"><span>🏁</span><b>Débrief de fin</b><small>Après le tournoi, les co-gestionnaires peuvent noter les joueurs et laisser un regard frais sur la session.</small></div></div><div class="coorg-fun-actions"><button type="button" class="white" id="coorgFunInvite">＋ Inviter un co-gestionnaire</button><button type="button" class="glass" id="coorgFunRights">🔐 Choisir ses droits</button></div>`;
 view.prepend(hero);
 q('#coorgFunInvite').onclick=()=>{q('#inviteEmail')?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>q('#inviteEmail')?.focus(),350)};
 q('#coorgFunRights').onclick=()=>q('#permissionsList')?.scrollIntoView({behavior:'smooth',block:'start'});
}

async function loadRatingCard(target){
 const state=appState(),c=client();if(!target||!c||!state?.workspace?.id)return;
 let card=target.querySelector(':scope > #sweEventRating4270');if(card)return;
 card=document.createElement('div');card.id='sweEventRating4270';card.className='card swe-event-rating';card.innerHTML='<b>⭐ Note du dernier Swé</b><div class="muted" style="margin-top:5px">Chargement du dernier tournoi terminé…</div>';
 const hero=target.querySelector('#coorgFunHero4270');if(hero)hero.insertAdjacentElement('afterend',card);else target.prepend(card);
 const r=await c.rpc('get_latest_tournament_experience_rating',{p_workspace_id:state.workspace.id});
 if(r.error){card.innerHTML='<b>⭐ Note du dernier Swé</b><div class="muted" style="margin-top:5px">Impossible de charger le débrief pour le moment.</div>';return}
 const d=r.data||{};if(!d.available){card.innerHTML='<b>⭐ Note du dernier Swé</b><div class="muted" style="margin-top:5px">Termine un premier tournoi pour ouvrir le débrief sur 10.</div>';return}
 const my=Number(d.my_rating||0),avg=d.avg_rating!=null?Number(d.avg_rating):null,count=Number(d.rating_count||0);
 card.innerHTML=`<div class="swe-event-rating-head"><div><b>⭐ Comment était ${esc(d.tournament_name)} ?</b><div class="muted" style="margin-top:4px">Une note globale sur 10 pour garder le pouls du groupe et améliorer les prochains Swés.</div></div><div style="text-align:right"><div class="swe-event-score">${avg!=null?avg.toFixed(1)+'/10':'—'}</div><div class="muted">${count} avis</div></div></div><div class="swe-rating-10">${Array.from({length:10},(_,i)=>`<button type="button" data-swe-event-rating="${i+1}" class="${my===i+1?'active':''}">${i+1}</button>`).join('')}</div><div class="muted" id="sweEventRatingHint" style="margin-top:8px">${my?'Ta note actuelle : '+my+'/10 • tu peux la modifier.':'Choisis une note de 1 à 10.'}</div>`;
 card.querySelectorAll('[data-swe-event-rating]').forEach(b=>b.onclick=async()=>{
   const val=Number(b.dataset.sweEventRating);card.querySelectorAll('[data-swe-event-rating]').forEach(x=>x.disabled=true);q('#sweEventRatingHint').textContent='Enregistrement…';
   const save=await c.rpc('submit_tournament_experience_rating',{p_tournament_id:d.tournament_id,p_rating:val});
   if(save.error){q('#sweEventRatingHint').textContent=save.error.message;card.querySelectorAll('[data-swe-event-rating]').forEach(x=>x.disabled=false);return}
   const x=save.data||{};card.querySelectorAll('[data-swe-event-rating]').forEach(btn=>{btn.disabled=false;btn.classList.toggle('active',Number(btn.dataset.sweEventRating)===val)});card.querySelector('.swe-event-score').textContent=(x.avg_rating!=null?Number(x.avg_rating).toFixed(1):val)+'/10';q('#sweEventRatingHint').textContent='Ta note : '+val+'/10 ✅';
 });
}

function injectAdmin(){
 style();injectAdminHero();
 const v=q('#view-permissions');if(v)loadRatingCard(v);
 try{const state=appState();if(state?.workspace&&typeof isCoorg==='function'&&isCoorg()&&typeof isAdmin==='function'&&!isAdmin()){const home=q('#view-home');if(home)loadRatingCard(home)}}catch(_){}
}

function publicContext(){
 const u=new URL(location.href),params=u.searchParams;
 let token=params.get('public')||'';let tid=params.get('tournament')||'';
 const resolved=window.__sweResolvedShortLink;if(!tid&&resolved?.tournament)tid=String(resolved.tournament);if(!token&&resolved?.public_token)token=String(resolved.public_token);
 return {token,tid,short:params.get('s')||''};
}
async function injectPublicTeaser(){
 if(q('#sweLastSweTeaser4270'))return;const c=client();if(!c)return;
 let {token,tid,short}=publicContext();
 if((!token||!tid)&&short){const rr=await c.rpc('resolve_public_tournament_short_link',{p_code:String(short).trim().toUpperCase()});if(!rr.error){token=token||rr.data?.public_token||'';tid=tid||rr.data?.tournament_id||rr.data?.tournament||''}}
 if(!token||!tid)return;
 const r=await c.rpc('get_public_previous_tournament_teaser',{p_token:token,p_tournament_id:tid});if(r.error||!r.data?.available)return;
 const lines=Array.isArray(r.data.lines)?r.data.lines.slice(0,5):[];if(!lines.length)return;
 const root=q('#publicRegistration');if(!root)return;
 const card=document.createElement('div');card.id='sweLastSweTeaser4270';card.className='swe-last-swe-teaser';card.innerHTML=`<h3>🔥 La petite tendance du dernier Swé</h3><div class="muted">${esc(r.data.previous_tournament_name||'Dernier tournoi')} • juste de quoi chauffer le prochain 👀</div>${lines.map(x=>`<div class="teaser-line">${esc(x)}</div>`).join('')}<div class="teaser-foot">Analyse volontairement courte et fun • les notes privées des co-gestionnaires ne sont jamais publiées ici.</div>`;
 const firstSelect=root.querySelector('#publicPlayerSelect');const anchor=firstSelect?.previousElementSibling||root.querySelector('.player');if(anchor)anchor.insertAdjacentElement('afterend',card);else root.prepend(card);
}

function boot(){style();injectAdmin();setTimeout(injectAdmin,700);setTimeout(injectAdmin,1800);if(new URLSearchParams(location.search).has('public')||new URLSearchParams(location.search).has('s')){setTimeout(injectPublicTeaser,500);setTimeout(injectPublicTeaser,1500)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('swe:rendered',()=>setTimeout(injectAdmin,80));
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="permissions"]'))setTimeout(injectAdmin,100)});
})();
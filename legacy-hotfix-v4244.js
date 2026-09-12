(()=>{
'use strict';
const VERSION=(window.SWE_BUILD_VERSION||'42.50');
let membershipFlags=new Map();
let membershipLoadedFor=null;
let membershipLoading=null;
function setVersion44(){window.SWEApplyBuild?.();}
function playersViewActive(){return document.getElementById('view-players')?.classList.contains('active')}
function topPlayerCards(){const box=document.getElementById('playersList');return box?[...box.children].filter(x=>x.classList?.contains('player')):[]}
function playerCardName(card){return card?.querySelector(':scope > .row > span:first-child > b')?.textContent?.trim()||''}
function findPlayerCard(pl){return topPlayerCards().find(c=>playerCardName(c)===String(pl?.name||'').trim())||null}
async function loadMembershipFlags(force=false){
  if(typeof S==='undefined'||!S.workspace?.id)return;
  if(!force&&membershipLoadedFor===String(S.workspace.id))return;
  if(membershipLoading)return membershipLoading;
  membershipLoading=(async()=>{
    const r=await sb.rpc('get_player_membership_history_flags',{p_workspace_id:S.workspace.id});
    if(!r.error){
      membershipFlags=new Map((r.data||[]).map(x=>[String(x.player_id),x]));
      membershipLoadedFor=String(S.workspace.id);
      (S.players||[]).forEach(pl=>{const f=membershipFlags.get(String(pl.id));if(f){pl.was_guest=!!f.was_guest;pl.joined_group_at=f.joined_group_at||null;}});
    }
  })();
  try{await membershipLoading}finally{membershipLoading=null}
}
function cleanReliabilityNoise(){
  if(!playersViewActive())return;
  document.querySelectorAll('#playersList [data-reliability]').forEach(tag=>{
    const txt=(tag.textContent||'').trim();
    if(!txt||/Aucun désistement tardif/i.test(txt))tag.remove();
  });
  topPlayerCards().forEach(card=>{
    [...card.querySelectorAll('div,span')].forEach(el=>{if(/^✓\s*Aucun désistement tardif/i.test((el.textContent||'').trim())&&el.children.length===0)el.remove();});
  });
}
function decoratePlayers44(){
  if(typeof S==='undefined'||!playersViewActive())return;
  const box=document.getElementById('playersList');if(!box)return;
  let legend=document.getElementById('sweGuestLegend44');
  document.getElementById('sweGuestLegend40')?.remove();
  if(!legend){legend=document.createElement('div');legend.id='sweGuestLegend44';legend.className='readonly-note';legend.style.marginBottom='10px';box.insertAdjacentElement('beforebegin',legend)}
  legend.innerHTML='👥 <b>Lecture de la liste :</b> une fiche grisée correspond à un <b>invité</b> qui ne fait pas partie du groupe. Lorsqu’un invité devient membre, sa fiche redevient normale.';
  (S.players||[]).forEach(pl=>{
    const card=findPlayerCard(pl);if(!card)return;
    const guest=pl.is_group_member===false;
    card.style.opacity=guest?'.58':'1';card.style.background=guest?'#f1f3f2':'';
    let badge=card.querySelector('[data-group-state44]');card.querySelector('[data-group-state40]')?.remove();
    if(!badge){badge=document.createElement('div');badge.dataset.groupState44='1';badge.style.cssText='margin-top:4px;font-size:11px;font-weight:800';card.querySelector(':scope > .row > span:first-child')?.appendChild(badge)}
    badge.textContent=guest?'Invité • ne fait pas partie du groupe':'Membre du groupe';badge.style.color=guest?'#6b7280':'#15803d';
    let joined=card.querySelector('[data-joined-member44]');const f=membershipFlags.get(String(pl.id));
    if(!guest&&(f?.was_guest||pl.was_guest)&&(f?.joined_group_at||pl.joined_group_at)){
      if(!joined){joined=document.createElement('div');joined.dataset.joinedMember44='1';joined.style.cssText='margin-top:3px;font-size:11px;font-weight:800;color:#15803d';badge.insertAdjacentElement('afterend',joined)}
      joined.textContent='✓ A rejoint le groupe';
    }else joined?.remove();
  });
  cleanReliabilityNoise();
}
function cardForButton(btn){let n=btn;const root=document.getElementById('playersList');while(n&&n.parentElement!==root)n=n.parentElement;return n&&n.parentElement===root?n:null}
function controlsForCard(card){
  const inputs=[...card.querySelectorAll('input')];
  const name=inputs.find(i=>i.type!=='tel'&&i.type!=='number'&&i.type!=='checkbox'&&i.type!=='radio');
  const phone=inputs.find(i=>i.type==='tel');
  const selects=[...card.querySelectorAll('select')];
  const status=selects.find(s=>[...s.options].some(o=>o.value==='member')&&[...s.options].some(o=>o.value==='guest'));
  const host=selects.find(s=>s!==status&&[...s.options].some(o=>/Guest de/i.test(o.textContent||'')));
  return {name,phone,status,host};
}
async function savePlayerInfo44(btn){
  const card=cardForButton(btn);if(!card)return;
  const currentName=playerCardName(card);const pl=(S.players||[]).find(p=>String(p.name||'').trim()===currentName);if(!pl)return toast('Joueur introuvable.');
  const {name,phone,status,host}=controlsForCard(card);if(!name||!status)return toast('Formulaire joueur incomplet.');
  const newName=name.value.trim(),isMember=status.value==='member',wasGuest=pl.is_group_member===false;
  if(newName.length<2)return toast('Nom invalide.');
  btn.disabled=true;const old=btn.textContent;btn.textContent='Enregistrement…';
  const r=await sb.rpc('manager_update_player_personal_info',{p_player_id:pl.id,p_name:newName,p_is_group_member:isMember,p_guest_of_player_id:isMember?null:(host?.value||null),p_phone_number:phone?.value.trim()||null});
  if(r.error){btn.disabled=false;btn.textContent=old;return toast(r.error.message)}
  pl.name=newName;pl.is_group_member=isMember;pl.guest_of_player_id=isMember?null:(host?.value||null);
  if(wasGuest&&isMember){pl.was_guest=true;pl.joined_group_at=pl.joined_group_at||new Date().toISOString();membershipFlags.set(String(pl.id),{player_id:pl.id,was_guest:true,joined_group_at:pl.joined_group_at});}
  if(typeof S.contacts!=='undefined'&&phone){const found=(S.contacts||[]).find(c=>String(c.player_id)===String(pl.id));if(found)found.phone_number=phone.value.trim()||null;else S.contacts.push({player_id:pl.id,phone_number:phone.value.trim()||null});}
  btn.textContent='✓ Enregistré';if(typeof renderPlayers==='function')renderPlayers();decoratePlayers44();toast('Informations enregistrées ✅');await loadMembershipFlags(true);decoratePlayers44();
}
document.addEventListener('click',e=>{
  const btn=e.target.closest?.('#playersList .player-action-save');if(!btn)return;
  e.preventDefault();e.stopImmediatePropagation();
  savePlayerInfo44(btn).catch(err=>{btn.disabled=false;btn.textContent='Enregistrer les infos';toast(err?.message||'Impossible d’enregistrer.');});
},true);

function injectCommercialStyles(){
  if(document.getElementById('sweCommercial45Style'))return;
  const st=document.createElement('style');st.id='sweCommercial45Style';st.textContent=`
  .swe-offers45{margin:18px 0 8px}.swe-offers45-head{text-align:center;margin-bottom:12px}.swe-offers45-head h2{margin:0 0 5px;font-size:22px}.swe-offer-grid45{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.swe-offer45{border:1px solid #dce7e1;border-radius:18px;padding:16px;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.04)}.swe-offer45.featured{border:2px solid #0f7a4b;box-shadow:0 7px 22px rgba(15,122,75,.12)}.swe-offer45 .pill{display:inline-block;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900;background:#edf7f1;color:#11663f}.swe-offer45 h3{margin:9px 0 4px}.swe-offer45 ul{padding-left:18px;margin:10px 0 0;line-height:1.6}.swe-offer45 .no{opacity:.55}.swe-offer45 .price{font-weight:900;font-size:18px}.swe-addon45{margin-top:12px;padding:12px;border-radius:14px;background:#f8fbf9;border:1px dashed #b9d2c4}.swe-free-banner45{margin:10px 0;padding:12px 14px;border-radius:14px;border:1px solid #f0c36a;background:#fff8e8;color:#6c4b00}.swe-free-banner45 b{color:#3b2b00}.swe-email-state45{margin-top:10px;padding:10px 12px;border-radius:12px;background:#f2faf5;border:1px solid #cce4d4;font-size:13px}.swe-sim45{position:fixed;inset:0;background:rgba(4,20,13,.58);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px}.swe-sim45.hidden{display:none}.swe-sim-panel45{background:#fff;border-radius:20px;max-width:620px;width:100%;max-height:85vh;overflow:auto;padding:18px}.swe-sim-grid45{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.swe-sim-item45{padding:10px;border-radius:12px;background:#f7faf8;border:1px solid #e2ebe6}.swe-sa-sim45{margin:10px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.swe-sa-sim45 select{min-width:240px}@media(max-width:720px){.swe-offer-grid45{grid-template-columns:1fr}.swe-sim-grid45{grid-template-columns:1fr}}`;
  document.head.appendChild(st);
}
function renderOfferSummary(){
  const auth=document.getElementById('auth'),login=document.getElementById('loginCard');if(!auth||!login||document.getElementById('sweOffers45'))return;
  const wrap=document.createElement('div');wrap.id='sweOffers45';wrap.className='swe-offers45';
  wrap.innerHTML=`<div class="swe-offers45-head"><div class="sa-eyebrow">OFFRES ORGANISATEUR</div><h2>Commence gratuitement, évolue quand ton groupe grandit ⚽</h2><div class="muted">Les fonctions essentielles restent accessibles sans abonnement. Les formules payantes retirent les limites et incluent davantage d'outils.</div></div>
  <div class="swe-offer-grid45">
    <div class="swe-offer45"><span class="pill">GRATUIT</span><h3>Pour démarrer</h3><div class="price">0 €</div><ul><li>Jusqu'à <b>15 joueurs</b> enregistrés</li><li><b>1 Ligue active</b> et 1 saison active</li><li>Classements de base</li><li>Swés dans les <b>complexes référencés SWÉ</b></li><li class="no">Pas de modules premium</li><li class="no">Pas de lieu personnalisé / privé</li></ul></div>
    <div class="swe-offer45 featured"><span class="pill">ABONNEMENT</span><h3>Organisateur</h3><div class="price">Le meilleur rapport équipement / prix</div><ul><li>Limites joueurs étendues selon la formule</li><li>Tournois + Ligues + saisons</li><li>Modules inclus selon l'abonnement</li><li>Lieux personnalisés et outils avancés selon formule</li><li>Conservation complète des données tant que l'abonnement est actif</li></ul></div>
    <div class="swe-offer45"><span class="pill">À L'UNITÉ</span><h3>Besoin ponctuel</h3><div class="price">Sans engagement</div><ul><li>Achat d'un module ou d'une option ponctuelle</li><li>Idéal pour un besoin occasionnel</li><li>Tarif volontairement moins avantageux qu'un abonnement</li><li>Permet de tester une fonction premium avant de s'abonner</li></ul></div>
  </div><div class="swe-addon45"><b>Après résiliation :</b> les 15 joueurs les plus récents restent visibles. Les données supplémentaires sont conservées pendant <b>30 jours</b> pour permettre une réactivation. Après ce délai, les données personnelles excédentaires sont archivées/anonymisées pour préserver l'historique sportif.</div>`;
  login.insertAdjacentElement('afterend',wrap);
}
async function commercialAccess45(){
  if(typeof S==='undefined'||!S.workspace?.id)return null;
  try{const r=await sb.rpc('get_workspace_organizer_access',{p_workspace_id:S.workspace.id});if(!r.error){S.organizerAccess=r.data||null;return r.data||null}}catch(_){}
  return S.organizerAccess||null;
}
function fmtDate45(v){if(!v)return '';try{return new Date(v).toLocaleDateString('fr-FR')}catch(_){return ''}}
async function renderFreeBanner45(){
  if(typeof S==='undefined'||!S.workspace?.id||!document.getElementById('main')||document.getElementById('main').classList.contains('hidden'))return;
  const a=await commercialAccess45();let b=document.getElementById('sweFreeBanner45');
  if(!a?.free_mode){b?.remove();return}
  if(!b){b=document.createElement('div');b.id='sweFreeBanner45';b.className='swe-free-banner45';const ref=document.getElementById('organizerAccessBanner');ref?.insertAdjacentElement('afterend',b)}
  const hidden=Number(a.hidden_player_count||0),exp=fmtDate45(a.retention_expires_at);
  b.innerHTML=`🆓 <b>Offre gratuite active</b> — 15 joueurs maximum, 1 Ligue active, 1 saison active et Swés dans les complexes SWÉ. ${hidden>0?`<b>${hidden} joueur${hidden>1?'s':''}</b> supplémentaire${hidden>1?'s':''} temporairement masqué${hidden>1?'s':''}.${exp?' Réactive ton abonnement avant le <b>'+exp+'</b> pour tout récupérer.':''}`:'Passe à un abonnement pour débloquer davantage de joueurs et les modules premium.'}`;
}
function emailState45(text,ok=false){
  const card=document.getElementById('loginCard');if(!card)return;let el=document.getElementById('sweEmailState45');if(!el){el=document.createElement('div');el.id='sweEmailState45';el.className='swe-email-state45';card.appendChild(el)}el.innerHTML=(ok?'✅ ':'📧 ')+text;
}
async function handleSignup45(e){
  const btn=e.target.closest?.('#signup');if(!btn)return;
  e.preventDefault();e.stopImmediatePropagation();
  const email=document.getElementById('email')?.value?.trim(),password=document.getElementById('password')?.value||'',consent=document.getElementById('signupConsent');
  if(!consent?.checked)return toast('Tu dois accepter les conditions pour créer ton compte.');
  if(!email||!email.includes('@'))return toast('Saisis une adresse e-mail valide.');
  if(password.length<6)return toast('Le mot de passe doit contenir au moins 6 caractères.');
  btn.disabled=true;const old=btn.textContent;btn.textContent='Création…';
  try{
    const redirect=location.origin+location.pathname+'?email_confirmed=1';
    const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:redirect}});
    if(error)throw error;
    if(data?.session){emailState45('Compte créé. Ton fournisseur Auth considère déjà cette adresse comme confirmée.',true);toast('Compte créé ✅');}
    else{emailState45('<b>Vérifie ta boîte mail.</b> Un lien de confirmation vient de t’être envoyé. Le compte sera utilisable après validation.');toast('E-mail de vérification envoyé ✅');}
  }catch(err){toast(err?.message||'Création du compte impossible.');}
  finally{btn.disabled=false;btn.textContent=old;}
}
function handleEmailReturn45(){const u=new URL(location.href);if(u.searchParams.get('email_confirmed')==='1'){emailState45('<b>Adresse e-mail vérifiée.</b> Tu peux maintenant utiliser ton compte.',true);u.searchParams.delete('email_confirmed');history.replaceState({},'',u.pathname+(u.search?u.search:'')+u.hash)}}

function ensureSuperSimulation45(){
  if(typeof S==='undefined'||!S.isSuperAdmin)return;const root=document.getElementById('superAdminPanel');if(!root||document.getElementById('sweSaSim45'))return;
  const bar=document.createElement('div');bar.id='sweSaSim45';bar.className='card swe-sa-sim45';bar.innerHTML='<b>👁 Vue utilisateur</b><select id="sweSimWorkspace45"><option value="">Choisir un espace à simuler</option></select><button id="sweStartSim45">Simuler la vue</button><span class="muted">Lecture seule : aucune action n’est exécutée au nom du client.</span>';root.querySelector('.sa-hero')?.insertAdjacentElement('afterend',bar);
  refreshSuperSimulation45();
}
function refreshSuperSimulation45(){const sel=document.getElementById('sweSimWorkspace45');if(!sel||typeof S==='undefined')return;const cur=sel.value;sel.innerHTML='<option value="">Choisir un espace à simuler</option>'+(S.superWorkspaces||[]).map(w=>`<option value="${w.id}">${String(w.name||'Espace').replace(/[<>]/g,'')} • ${(w.subscription_plan||'free').toUpperCase()}</option>`).join('');if([...sel.options].some(o=>o.value===cur))sel.value=cur;}
function showSimulation45(w){
  let modal=document.getElementById('sweSimModal45');if(!modal){modal=document.createElement('div');modal.id='sweSimModal45';modal.className='swe-sim45 hidden';modal.innerHTML='<div class="swe-sim-panel45"><div class="row" style="justify-content:space-between"><div><div class="sa-eyebrow">MODE SIMULATION</div><h2 id="sweSimTitle45" style="margin:4px 0">Vue utilisateur</h2></div><button id="sweCloseSim45">Fermer</button></div><div id="sweSimBody45"></div></div>';document.body.appendChild(modal);document.getElementById('sweCloseSim45').onclick=()=>modal.classList.add('hidden')}
  const paid=['standard','pro','premium','business'].includes(String(w.subscription_plan||'free').toLowerCase())||!!w.special_access_enabled;const trial=!!w.trial_ends_at&&new Date(w.trial_ends_at)>new Date();const free=!paid&&!trial;document.getElementById('sweSimTitle45').textContent=(w.name||'Espace')+' — '+(free?'OFFRE GRATUITE':trial?'ESSAI':'ABONNEMENT '+String(w.subscription_plan||'').toUpperCase());document.getElementById('sweSimBody45').innerHTML=`<div class="swe-free-banner45"><b>Simulation uniquement.</b> Voici ce que l'organisateur peut utiliser avec son niveau d'accès actuel.</div><div class="swe-sim-grid45"><div class="swe-sim-item45"><b>👥 Joueurs</b><div>${free?'15 maximum':'Selon la limite du compte'}</div></div><div class="swe-sim-item45"><b>🏁 Ligue</b><div>Disponible${free?' • 1 active':''}</div></div><div class="swe-sim-item45"><b>📅 Saison</b><div>${free?'1 active':'Selon formule'}</div></div><div class="swe-sim-item45"><b>🏆 Tournois</b><div>${free?'Non inclus':'Selon formule'}</div></div><div class="swe-sim-item45"><b>🧩 Modules premium</b><div>${free?'Non inclus • achat ponctuel possible':'Selon formule'}</div></div><div class="swe-sim-item45"><b>📍 Lieux personnalisés</b><div>${free?'Non inclus':'Réservé aux offres compatibles'}</div></div></div>`;modal.classList.remove('hidden');
}
document.addEventListener('click',e=>{if(e.target.closest?.('#sweStartSim45')){const id=document.getElementById('sweSimWorkspace45')?.value,w=(S.superWorkspaces||[]).find(x=>String(x.id)===String(id));if(!w)return toast('Choisis un espace.');showSimulation45(w)}},true);

async function apply44(){setVersion44();injectCommercialStyles();renderOfferSummary();handleEmailReturn45();ensureSuperSimulation45();refreshSuperSimulation45();renderFreeBanner45();if(!playersViewActive())return;await loadMembershipFlags();decoratePlayers44();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>apply44(),{once:true});else apply44();
document.addEventListener('swe:rendered',()=>apply44());
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="players"],.tab'))setTimeout(()=>apply44(),100)},true);
document.addEventListener('click',handleSignup45,true);
setInterval(()=>{try{renderFreeBanner45();ensureSuperSimulation45();refreshSuperSimulation45()}catch(_){}},4000);
})();

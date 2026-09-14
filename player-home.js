/* Player presentation only. Native .tab/.view routing and action handlers stay authoritative. */
(()=>{
'use strict';
if(window.__SWE_PLAYER_HOME_R2)return;
window.__SWE_PLAYER_HOME_R2=true;
const E=id=>document.getElementById(id);
const state=()=>{try{return S}catch(_){return null}};
const api=()=>{try{return sb}catch(_){return null}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const panels=['home','registrations','mine','stats','profile','discover'];
const labels=['Accueil','Mes inscriptions','Mes SWÉs','Mes stats','Mon profil'];
let selected='home',timer,userId='',generation=0,loadedAt=0,busy=false,community=null,loadError=false,inviteAnchor;
function node(tag,id,html){const n=document.createElement(tag);n.id=id;if(html)n.innerHTML=html;return n}
function group(n,sections,order,half=false){
 if(!n)return;
 n.dataset.playerSections=sections;n.style.setProperty('--player-order',order);
 n.classList.toggle('swe-player-half',half);
}
function shell(n){return n?.closest('.swe-profile-fold')||n}
function card(id){return shell(E(id)?.closest('.card'))}
function choose(panel,focus=false){
 if(!panels.includes(panel))return;selected=panel;paint();
 if(focus){const target=E('view-myplayer').querySelector('[data-player-sections]:not(.swe-player-filtered) h2');if(target){target.tabIndex=-1;target.focus({preventScroll:true})}}
}
function nativeView(view){
 const b=document.querySelector('.tabs .tab[data-view="'+view+'"]');
 if(b&&!b.disabled&&!b.classList.contains('disabled-tab'))b.click();
}
function creator(){if(typeof window.openSimpleSweCreator==='function')window.openSimpleSweCreator('private');else E('simpleSweTab')?.click();syncMode()}
function openPlayerCard(){if(typeof window.SWEPlayerCard?.open==='function'){window.SWEPlayerCard.open();return}const native=E('swe4338CardBtn');if(native){native.click();return}if(typeof toast==='function')toast('Ta carte de joueur est encore en cours de chargement.')}
function ensure(view){
 if(E('swePlayerHeader'))return;
 const header=node('header','swePlayerHeader','<a class="swe-player-brand" href="?start=player" aria-label="Accueil joueur SWÉ"><img src="/assets/logo-swe-tournament.png" alt="SWÉ Tournament 5/5"><span>Mon espace joueur</span></a><nav id="swePlayerNav" aria-label="Rubriques de mon espace joueur">'+panels.slice(0,5).map((p,i)=>'<button type="button" data-player-panel="'+p+'">'+labels[i]+'</button>').join('')+'</nav><div id="swePlayerAccount"><button type="button" id="swePlayerAccountToggle" aria-expanded="false" aria-controls="swePlayerAccountMenu"><span id="swePlayerAvatar" aria-hidden="true">●</span><span id="swePlayerName">Mon compte</span><span aria-hidden="true">⌄</span></button><div id="swePlayerAccountMenu" class="swe-player-account-menu hidden"><button type="button" data-player-panel="profile">Mon profil</button><button type="button" id="swePlayerSwitchToggle" aria-expanded="false" aria-controls="swePlayerProfiles">⇄ Changer de profil</button><div id="swePlayerProfiles" class="hidden"></div><button type="button" id="swePlayerLogout">Se déconnecter</button></div></div>');
 view.prepend(header);
 header.querySelector('a').onclick=e=>{e.preventDefault();choose('home')};
 E('swePlayerLogout').onclick=()=>E('logout')?.click();
 E('swePlayerAccountToggle').onclick=e=>{e.stopPropagation();const open=!E('swePlayerAccountMenu').classList.contains('hidden');closeAccount();if(!open){E('swePlayerAccountMenu').classList.remove('hidden');e.currentTarget.setAttribute('aria-expanded','true')}};
 E('swePlayerSwitchToggle').onclick=e=>{e.stopPropagation();const open=E('swePlayerProfiles').classList.toggle('hidden')===false;e.currentTarget.setAttribute('aria-expanded',String(open))};
 const hero=node('section','swePlayerQuick','<div><span class="swe-player-kicker">LE FOOT PLUS SIMPLE, ENTRE NOUS</span><h2>Un SWÉ, et c’est parti.</h2><p>Crée un match rapide ou rejoins tes amis.</p><div class="swe-player-actions"><button type="button" id="swePlayerCreateQuick">＋ Créer un SWÉ rapide</button><button type="button" data-player-panel="discover">Découvrir les SWÉs publics</button></div><small>Match rapide · Sans abonnement organisateur</small></div>');
 view.append(hero);E('swePlayerCreateQuick').onclick=creator;
 const mine=node('section','swePlayerMine','<div class="swe-player-section-head"><h2>Mes SWÉs</h2><button type="button" data-player-panel="mine">Tout voir →</button></div><div id="swePlayerMineRows" aria-live="polite"></div><div class="swe-player-actions"><button type="button" id="swePlayerManage">＋ Créer un SWÉ rapide</button><button type="button" id="swePlayerMineRefresh">Actualiser</button></div>');
 mine.className='card';view.append(mine);
 E('swePlayerManage').onclick=()=>{creator();E('swe4351Mine')?.scrollIntoView({behavior:'smooth',block:'center'})};
 E('swePlayerMineRefresh').onclick=()=>loadCommunity(true);
 const commercial=node('section','swePlayerCommercial','<div><span class="swe-player-kicker">ESPACE ORGANISATEUR</span><h2>Envie d’organiser plus grand ?</h2><p>Tournois, groupes et modules avancés.</p></div><button type="button" id="swePlayerOffers">Découvrir les offres →</button>');
 view.append(commercial);E('swePlayerOffers').onclick=openOffers;
 view.addEventListener('click',e=>{const b=e.target.closest('[data-player-panel]');if(!b||!view.contains(b))return;e.preventDefault();choose(b.dataset.playerPanel,true);closeAccount()});
 header.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAccount();E('swePlayerAccountToggle').focus()}});
 document.addEventListener('click',e=>{const account=E('swePlayerAccount');if(account&&!account.contains(e.target))closeAccount()});
 document.addEventListener('click',e=>{const summary=e.target.closest?.('.swe-profile-fold>summary');if(!summary)return;e.preventDefault();const details=summary.parentElement;details.open=!details.open;summary.setAttribute('aria-expanded',String(details.open))},true);
}
function closeAccount(){E('swePlayerAccountMenu')?.classList.add('hidden');E('swePlayerProfiles')?.classList.add('hidden');E('swePlayerAccountToggle')?.setAttribute('aria-expanded','false');E('swePlayerSwitchToggle')?.setAttribute('aria-expanded','false')}
function offerMode(on){
 document.documentElement.classList.toggle('swe-organizer-setup-active',on);
 if(!on)return;
 const setup=E('workspaceSetup');if(!setup)return;
 let back=E('swePlayerOfferBack');if(!back){back=document.createElement('button');back.id='swePlayerOfferBack';back.type='button';back.textContent='← Retour à mon espace joueur';setup.prepend(back);back.onclick=closeOffers}
 window.scrollTo({top:0,behavior:'smooth'});
}
function openOffers(){E('becomeOrganizer')?.click();offerMode(true)}
function closeOffers(){E('workspaceSetup')?.classList.add('hidden');offerMode(false);if(typeof setView==='function')setView('myplayer');choose('home')}
function updateAccount(){
 const s=state(),p=s?.playerDashboard?.profile||{},name=p.nickname||p.first_name||p.display_name||'Mon compte';
 E('swePlayerName').textContent=name;E('swePlayerAvatar').textContent=name.slice(0,1).toUpperCase();
 const list=E('swePlayerProfiles'),rows=s?.memberships||[],key=JSON.stringify([s?.workspace?.id,rows.map(r=>[r.workspace_id,r.role,r.workspaces?.name])]);
 if(list.dataset.key===key)return;list.dataset.key=key;list.replaceChildren();
 const player=node('button','swePlayerSwitchSelf');player.type='button';player.textContent='⚽ Profil joueur';player.onclick=()=>{choose('home');closeAccount()};list.append(player);
 // The existing switcher's change handler keeps workspace persistence and reload semantics.
 rows.forEach(r=>{const b=document.createElement('button');b.type='button';b.textContent=(r.workspaces?.name||'Mon groupe')+' · '+(r.role==='admin'?'Organisateur':'Co-gestionnaire');b.onclick=()=>{
   closeAccount();
   if(String(r.workspace_id)===String(state()?.workspace?.id)){nativeView('home');syncMode();return}
   const sw=E('workspaceSwitcher');if(sw&&[...sw.options].some(o=>o.value===String(r.workspace_id))){sw.value=r.workspace_id;sw.dispatchEvent(new Event('change',{bubbles:true}))}
 };list.append(b)});
 if(!rows.length){const hint=document.createElement('small');hint.textContent='Tes autres profils apparaîtront ici après activation.';list.append(hint)}
}
function more(n,panel){
 if(!n||n.querySelector('[data-player-more]'))return;
 const title=n.querySelector('.sectiontitle');if(!title)return;
 const b=document.createElement('button');b.type='button';b.dataset.playerPanel=panel;b.dataset.playerMore='1';b.className='swe-player-more';b.textContent='Tout voir →';title.after(b);
}
function decorate(view){
 group(E('swePlayerQuick'),'home',0);
 group(view.querySelector('.player-hub-hero'),'profile',1);
 group(E('myPlayerCreateCard'),'home profile',1);
 const stats=card('myPlayerStats');group(stats,'home stats',10);more(stats,'stats');
 const title=stats?.querySelector('.sectiontitle');if(title)title.textContent='Mes stats';
 if(stats&&!E('swePlayerCardShortcut')){const b=document.createElement('button');b.id='swePlayerCardShortcut';b.type='button';b.textContent='⭐ Ma carte de joueur';b.onclick=openPlayerCard;(stats.querySelector('.swe4338-stats-head')||title?.parentElement||stats).appendChild(b)}
 const regs=card('myPlayerMySwes');group(regs,'home registrations',20,true);more(regs,'registrations');
 const regTitle=regs?.querySelector('.sectiontitle');if(regTitle)regTitle.textContent='Mes inscriptions';
 group(E('swePlayerMine'),'home mine',21,true);
 const publicCard=card('myPlayerOpportunities');group(publicCard,'home discover',30);more(publicCard,'discover');
 const publicTitle=publicCard?.querySelector('.sectiontitle');if(publicTitle)publicTitle.textContent='SWÉs publics à rejoindre';
 group(card('myPlayerPublic'),'profile',30);
 group(shell(E('swe4338Health')),'profile',40);
 group(shell(view.querySelector('.swe-history-link-card')),'stats',40);
 group(card('myPlayerRequests'),'registrations',35);
 group(shell(E('sweMyReliability')),'stats',45);
 group(card('myPlayerGroups'),'profile',50);
 group(card('myPlayerInvites'),'registrations',31);
 group(E('swePlayerCommercial'),'home mine',70);
 // Keep native invitation nodes and handlers; restore their original location outside player view.
 const inv=E('inviteBox');if(inv){if(!inviteAnchor){inviteAnchor=document.createComment('player-invite-home');inv.before(inviteAnchor)}if(inv.parentNode!==view)view.append(inv);group(inv,'home registrations',-10);let refresh=E('swePlayerInviteRefresh');if(!refresh){refresh=document.createElement('button');refresh.id='swePlayerInviteRefresh';refresh.type='button';refresh.textContent='Actualiser';refresh.onclick=async()=>{refresh.disabled=true;try{if(typeof loadInvites==='function')await loadInvites()}finally{refresh.disabled=false}};inv.querySelector('.sectiontitle')?.after(refresh)}}
 const originalCta=shell(E('playerOrganizerCta'));if(originalCta)group(originalCta,'profile',55);
 const summary=E('swePlayerCommunityRegistrations');
 if(regs&&!summary){const n=node('div','swePlayerCommunityRegistrations');regs.append(n)}
 // Pick the four overview metrics by their labels; keep all eight in Mes stats.
 E('myPlayerStats')?.querySelectorAll(':scope > div').forEach(n=>{const text=n.querySelector('small')?.textContent||'';n.dataset.playerMetric=/joués|victoires|buts|passes/i.test(text)?'overview':'detail'});
}
function renderCommunity(){
 const out=E('swePlayerMineRows');if(!out)return;
 if(!community){E('swePlayerCommunityRegistrations')?.replaceChildren();out.innerHTML=loadError?'<p class="muted" role="status">Tes SWÉs ne sont pas disponibles pour le moment. Tu peux réessayer.</p>':'<p class="muted" role="status">Chargement de tes SWÉs…</p>';return}
 const all=Array.isArray(community.created)?community.created:[];
 const ordered=[...all].sort((a,b)=>(a.status==='finished')-(b.status==='finished')||String(a.start_at).localeCompare(String(b.start_at)));
 const rows=selected==='home'?ordered.slice(0,2):ordered;
 out.innerHTML=rows.length?rows.map(x=>'<article class="swe-player-match"><div><b>'+esc(x.title||'SWÉ rapide')+'</b><div class="muted">'+esc(formatDate(x.start_at))+' · '+esc(x.venue_name||'Lieu à confirmer')+'</div></div><span class="swe-player-pill">'+(x.status==='finished'?'Terminé':esc(Number(x.confirmed||0))+' / '+esc(Number(x.max_players||10))+' joueurs')+'</span></article>').join(''):'<p class="muted">Tu n’as pas encore créé de SWÉ rapide. Lance ton premier match !</p>';
 const regs=E('swePlayerCommunityRegistrations');if(regs){const joins=(Array.isArray(community.participations)?community.participations:[]).filter(x=>!all.some(c=>c.id===x.id));const visible=selected==='home'?joins.slice(0,2):joins;regs.innerHTML=visible.length?'<h3 class="swe-player-small-title">Mes matchs rapides</h3>'+visible.map(x=>'<article class="swe-player-match"><div><b>'+esc(x.title||'SWÉ rapide')+'</b><div class="muted">'+esc(formatDate(x.start_at))+' · '+esc(x.venue_name||'Lieu à confirmer')+'</div></div><span class="swe-player-pill">'+esc(({confirmed:'Inscrit',invited:'Invité',requested:'En attente',declined:'Refusé',cancelled:'Annulé'})[x.status]||x.status||'À confirmer')+'</span></article>').join(''):''}
}
function formatDate(date){if(!date)return 'Date à préciser';const d=new Date(date);return Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{timeZone:'America/Martinique',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Date à préciser'}
async function loadCommunity(force=false){
 const s=state(),c=api();if(!s?.session?.user?.id||!c||busy||(!force&&Date.now()-loadedAt<45000))return;
 busy=true;loadError=false;const ticket=++generation,uid=s.session.user.id;let deadline;
 try{
  const result=await Promise.race([c.rpc('get_my_community_swes_v2'),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('timeout')),10000)})]);
  if(ticket!==generation||state()?.session?.user?.id!==uid)return;
  if(result.error)throw result.error;community=result.data||{created:[],participations:[]};
 }catch(_){if(ticket===generation)loadError=true}
 finally{clearTimeout(deadline);if(ticket===generation){busy=false;loadedAt=Date.now();renderCommunity()}}
}
function syncMode(){
 const s=state(),active=!!s?.session&&!s.publicMode&&!!E('view-myplayer')?.classList.contains('active')&&!E('main')?.classList.contains('hidden');
 document.documentElement.classList.toggle('swe-player-home-active',active);
 if(!active&&inviteAnchor?.parentNode&&E('inviteBox')?.parentNode===E('view-myplayer'))inviteAnchor.after(E('inviteBox'));
 return active;
}
function paint(){
 const active=syncMode(),s=state(),view=E('view-myplayer');if(!active||!view)return;
 const uid=s.session.user.id;if(uid!==userId){userId=uid;selected='home';community=null;busy=false;loadedAt=0;generation++}
 ensure(view);updateAccount();decorate(view);if(!E('workspaceSetup')?.classList.contains('hidden'))offerMode(true);view.dataset.playerPanel=selected;
 view.querySelectorAll('[data-player-sections]').forEach(n=>n.classList.toggle('swe-player-filtered',!n.dataset.playerSections.split(' ').includes(selected)));
 view.querySelectorAll('#swePlayerNav button').forEach(b=>{const yes=b.dataset.playerPanel===selected;b.setAttribute('aria-current',yes?'page':'false')});
 renderCommunity();loadCommunity();
}
function schedule(){syncMode();clearTimeout(timer);timer=setTimeout(paint,260)}
['swe:rendered','swe:page-view','swe:player-ui-ready','swe:player-profile-updated'].forEach(e=>document.addEventListener(e,schedule));
document.addEventListener('swe:page-view',()=>{if(state()?.lastView==='simple-swe')loadedAt=0});
document.addEventListener('click',e=>{if(e.target.closest?.('.tabs button,[data-swe-go]'))schedule()});
window.addEventListener('pageshow',schedule);
document.addEventListener('click',e=>{if(e.target.closest?.('#cancelWorkspaceSetup')){offerMode(false);setTimeout(()=>{if(state()?.session&&typeof setView==='function')setView('myplayer')},0)}},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
setTimeout(paint,900);setTimeout(paint,2600);
window.SWEPlayerHome={openOffers,closeOffers,openPlayerCard,refreshInvites:()=>{if(typeof loadInvites==='function')loadInvites()}};
})();

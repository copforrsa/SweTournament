Warning: truncated output (original token count: 143282)
Total output lines: 6860

const { createClient } = window.supabase;
const noStoreFetch=(input,init={})=>fetch(input,{...init,cache:'no-store'});
const sb=createClient('https://fbppesfxkvledwjemwsn.supabase.co','sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp',{
  global:{fetch:noStoreFetch},
  auth:{
    ...(new URLSearchParams(location.search).has('test_tournament')?{storageKey:'swe-forssadmin-auth-v1'}:{}),
    flowType:'pkce',
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true
  }
});

// V41 security foundation: never leak bearer links through Referrer and clear sensitive
// checkout/payment-desk parameters from browser history as soon as they are captured.
const SECURITY_VERSION='41.00';
function sanitizeSensitiveUrlParams(){
  try{
    const u=new URL(location.href);
    const sensitive=['coorg_session_id'];
    let changed=false;
    sensitive.forEach(k=>{if(u.searchParams.has(k)){u.searchParams.delete(k);changed=true;}});
    if(changed) history.replaceState({},'',u.toString());
  }catch(_){}
}
window.addEventListener('pageshow',()=>sanitizeSensitiveUrlParams());

window.addEventListener('error', (e) => {
  const t=document.querySelector('#toast');
  if(t){t.textContent='Erreur de chargement de l’application. Recharge la page.';t.style.display='block';}
});

const S={session:null,adminProfile:null,isSuperAdmin:false,superWorkspaces:[],workspace:null,members:[],coorgs:[],coorgCount:0,workspaceFeatures:{max_coorganizers:3,max_coorganizers_cap:100,rankings_enabled:true,league_enabled:true,tournaments_enabled:true,third_half_enabled:false,player_ratings_enabled:false,max_players_cap:35,payments_enabled:true,top_player_enabled:false,match_ratings_enabled:false,team_review_enabled:false},commercialAccess:{subscription_plan:'free',special_access_enabled:false,upgrade_requested_at:null},billingStatus:null,coorgPurchaseConfirming:false,myPermissions:{can_invite_coorganizers:false,can_enter_scores:false,can_add_members:false,can_delete_members:false,can_create_tournaments:false,can_view_players:true,can_generate_teams:false,temporary_admin_until:null},myRatings:[],lastCreatedInvite:null,invites:[],players:[],contacts:[],skillReviews:[],skillAggregates:[],teamCodes:[],seasons:[],leagues:[],leaguePlayers:[],activeLeague:null,tournaments:[],activeTour:null,tPlayers:[],teams:[],teamPlayers:[],matchAssignments:[],matches:[],goals:[],teamBalanceScores:[],rankMode:'season',channel:null,goalTeamSelections:{},sportsComplexes:[],sportsPitches:[],publicMode:false,publicToken:null,tournamentCreateOpen:false,seasonAdminOpen:false,editingTournamentId:null,teamCompetitionId:null,lastView:null,coorgQuotaRequest:null,superCoorgQuotaRequests:[],myLinkedPlayerId:null,playerDashboard:null,playerDirectory:[],organizerSettings:null,playerRequests:[],identityLinkRequests:[],platformSettings:{consent_gate_enabled:false},thirdHalfFunds:[],thirdHalfPackages:[],thirdHalfAssignments:[],teamReviewState:null,onboardingStatus:null,memberships:[],organizerAccess:null,playerAccountAccess:false,superPlayerAccountAccess:[]};

let safeSyncTimer=null;
let safeSyncBusy=false;
let lastUserInteractionAt=0;
function markUserInteraction(){lastUserInteractionAt=Date.now();}
['input','change','keydown','pointerdown','touchstart'].forEach(evt=>document.addEventListener(evt,e=>{
  if(e.target?.closest?.('#main')) markUserInteraction();
},{capture:true,passive:true}));
function userIsEditing(){
  const a=document.activeElement;
  if(a&&a.closest?.('#main')&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable))return true;
  return Date.now()-lastUserInteractionAt<30000;
}
async function safeAppSync(){
  // Ne jamais reconstruire l'interface pendant une saisie terrain.
  if(safeSyncBusy || userIsEditing() || S.editingTournamentId || S.publicMode || !S.session || !S.workspace || document.visibilityState==='hidden' || document.querySelector('#view-permissions.active')) return;
  safeSyncBusy=true;
  try{ await loadAll(); }
  catch(e){ console.warn('safeAppSync',e); }
  finally{ safeSyncBusy=false; }
}
function startSafeAppSync(){
  if(safeSyncTimer) clearInterval(safeSyncTimer);
  // Rafraîchissement de sécurité moins agressif : le temps réel reste prioritaire.
  safeSyncTimer=setInterval(safeAppSync,60000);
}
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&!userIsEditing()) setTimeout(safeAppSync,800);
});
window.addEventListener('pageshow',()=>{if(!userIsEditing())setTimeout(safeAppSync,800)});

const $=s=>document.querySelector(s);
const toast=t=>{const x=$('#toast');x.textContent=t;x.style.display='block';setTimeout(()=>x.style.display='none',2600)};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function setStableHtml(el,html){if(el&&el.innerHTML!==html)el.innerHTML=html;}
const SWE_SIGNATURE_BALLONS=['ballon-feu.webp','ballon-glace.webp','ballon-electricite.webp'];
function defaultPlayerBalloonAvatar(pl){
  const seed=String(pl?.id||pl?.public_player_id||pl?.user_id||pl?.name||'swe');
  let sum=0;for(let i=0;i<seed.length;i++)sum=(sum+seed.charCodeAt(i))%SWE_SIGNATURE_BALLONS.length;
  return './assets/avatars-v4405/'+SWE_SIGNATURE_BALLONS[sum];
}
function playerAvatarHtml(pl,size='sm'){
  const src=String(pl?.avatar_url||defaultPlayerBalloonAvatar(pl)).trim();
  return '<img class="swe-player-avatar swe-player-avatar-'+size+'" src="'+esc(src)+'" alt="Avatar de '+esc(pl?.name||'joueur')+'" loading="lazy" decoding="async">';
}
function renderPlatformFooter(){
  const footer=$('#platformFooter');
  if(!footer)return;
  const cfg=S.platformSettings||{};
  const enabled=cfg.footer_enabled!==false;
  footer.classList.toggle('hidden',!enabled);
  if(!enabled)return;

  const company=$('#platformFooterCompany');
  const text=$('#platformFooterText');
  const links=$('#platformFooterLinks');
  if(company)company.textContent=cfg.footer_company_name||'SWÉ Tournament';
  if(text)text.textContent=cfg.footer_legal_text||'';
  if(links){
    links.classList.add('platform-footer-links');
    const items=[];
    if(cfg.footer_contact_email)items.push('<a href=\"mailto:'+esc(cfg.footer_contact_email)+'\">Contact</a>');
    if(cfg.footer_legal_url)items.push('<a href=\"'+esc(cfg.footer_legal_url)+'\" target=\"_blank\" rel=\"noopener noreferrer\">Mentions légales</a>');
    if(cfg.footer_privacy_url)items.push('<a href=\"'+esc(cfg.footer_privacy_url)+'\" target=\"_blank\" rel=\"noopener noreferrer\">Confidentialité</a>');
    if(cfg.footer_terms_url)items.push('<a href=\"'+esc(cfg.footer_terms_url)+'\" target=\"_blank\" rel=\"noopener noreferrer\">CGU / CGV</a>');
    links.innerHTML=items.join('');
  }
}
const today=()=>new Date().toISOString().slice(0,10); $('#tourDate').value=today();
function defaultRegistrationDeadlineLocal(dateStr){
  if(!dateStr)return '';
  const d=new Date(dateStr+'T12:00:00-04:00');
  d.setDate(d.getDate()-1);
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+day+'T17:00';
}
function registrationDeadlineIso(localValue){
  if(!localValue)return null;
  const d=new Date(localValue+':00-04:00');
  return Number.isFinite(d.getTime())?d.toISOString():null;
}
function syncRegistrationDeadline(dateSelector,deadlineSelector){
  const dateEl=$(dateSelector),deadlineEl=$(deadlineSelector);
  if(!dateEl||!deadlineEl)return;
  const apply=()=>{deadlineEl.value=defaultRegistrationDeadlineLocal(dateEl.value)};
  dateEl.addEventListener('change',apply);
  if(dateEl.value&&!deadlineEl.value)apply();
}
syncRegistrationDeadline('#tourDate','#tourRegistrationDeadline');
syncRegistrationDeadline('#leagueSessionDate','#leagueSessionRegistrationDeadline');

const DEFAULT_VENUE_META={
  'mada football club':{city:'Ducos',type:'Outdoor',hours:'Lun 16h-23h ; Mar 15h-23h ; Mer 14h-23h ; Jeu-Ven 15h-23h ; Sam 14h-23h ; Dim 15h-20h'},
  'arena martinique / arena play on':{city:'Schœlcher',type:'Indoor',hours:'Environ 9h-22h30, 7j/7'}
};
function venueMeta(c){return DEFAULT_VENUE_META[String(c?.name||'').trim().toLowerCase()]||null}
async function ensureDefaultSportsVenues(){
  if(!S.isSuperAdmin)return;
  // Les complexes sont désormais administrés par le Super Admin.
  // On ne crée les lieux de démonstration que sur une installation totalement vide,
  // afin qu'un complexe supprimé volontairement ne soit jamais recréé au prochain chargement.
  if((S.sportsComplexes||[]).length)return;
  const wanted=[{name:'Mada football club',city:'Ducos',pitches:['Terrain 1','Terrain 2','Terrain 3']},{name:'Arena Martinique / Arena Play On',city:'Schœlcher',pitches:['Terrain 1','Terrain 2','Terrain 3','Terrain 4']}];
  let changed=false;
  for(const v of wanted){let c=(S.sportsComplexes||[]).find(x=>String(x.name||'').trim().toLowerCase()===v.name.toLowerCase());if(!c){const created=await sb.rpc('super_admin_manage_sports_complex',{p_action:'create',p_name:v.name,p_city:v.city,p_active:true});if(created.error){console.warn('seed complex',v.name,created.error);continue}changed=true;const rr=await sb.rpc('get_sports_venues');if(!rr.error){S.sportsComplexes=Array.isArray(rr.data?.complexes)?rr.data.complexes:[];S.sportsPitches=Array.isArray(rr.data?.pitches)?rr.data.pitches:[];}c=(S.sportsComplexes||[]).find(x=>String(x.name||'').trim().toLowerCase()===v.name.toLowerCase());}if(!c)continue;const current=(S.sportsPitches||[]).filter(p=>String(p.complex_id)===String(c.id));for(const pitch of v.pitches){if(!current.some(p=>String(p.name||'').trim().toLowerCase()===pitch.toLowerCase())){const rr=await sb.rpc('super_admin_manage_sports_pitch',{p_action:'create',p_complex_id:c.id,p_name:pitch,p_active:true});if(!rr.error)changed=true;}}}
  if(changed){const rr=await sb.rpc('get_sports_venues');if(!rr.error){S.sportsComplexes=Array.isArray(rr.data?.complexes)?rr.data.complexes:[];S.sportsPitches=Array.isArray(rr.data?.pitches)?rr.data.pitches:[];renderVenueSelectors();renderSuperAdminVenues();}}
}

async function loadSportsVenues(autoSeed=true){
  const {data,error}=await sb.rpc('get_sports_venues');
  if(error){console.warn('sports venues',error);return}
  S.sportsComplexes=Array.isArray(data?.complexes)?data.complexes:[];
  S.sportsPitches=Array.isArray(data?.pitches)?data.pitches:[];
  renderVenueSelectors();
  if(S.isSuperAdmin)renderSuperAdminVenues();
  if(autoSeed&&S.isSuperAdmin)await ensureDefaultSportsVenues();
}
function complexLabel(id){
  const c=S.sportsComplexes.find(x=>x.id===id);return c?([c.name,c.city].filter(Boolean).join(' • ')):'Complexe';
}
function pitchName(id){return S.sportsPitches.find(x=>x.id===id)?.name||'Terrain'}
function renderVenueSelectors(){
  const activeComplexes=S.sportsComplexes.filter(x=>x.active!==false);
  const options='<option value="">Choisir le complexe</option>'+activeComplexes.map(c=>'<option value="'+c.id+'">'+esc(complexLabel(c.id))+'</option>').join('');
  if($('#tourComplex')){$('#tourComplex').innerHTML=options;renderTournamentPitchChoices();}
  if($('#leagueSessionComplex')){$('#leagueSessionComplex').innerHTML=options;renderLeaguePitchSelect();}
  renderMatchPitchSelect();
}
function renderTournamentPitchChoices(){
  const box=$('#tourPitchChoices');if(!box)return;
  const cid=$('#tourComplex')?.value||'';
  const pitches=S.sportsPitches.filter(x=>x.active!==false&&x.complex_id===cid);
  box.innerHTML=pitches.length
    ? '<div class="muted" style="margin-bottom:6px">Terrains réservés (maximum 3)</div>'+pitches.map(p=>'<label class="player row" style="justify-content:flex-start;margin:5px 0"><input class="tourPitchCheck" type="checkbox" value="'+p.id+'" style="width:auto"><span><b>'+esc(p.name)+'</b></span></label>').join('')
    : '<div class="muted">Choisis d’abord un complexe disposant de terrains actifs.</div>';
  box.querySelectorAll('.tourPitchCheck').forEach(ch=>ch.onchange=()=>{
    const checked=[...box.querySelectorAll('.tourPitchCheck:checked')];
    if(checked.length>3){ch.checked=false;toast('Maximum 3 terrains pour un tournoi.');}
  });
}
function renderLeaguePitchSelect(){
  const sel=$('#leagueSessionPitch');if(!sel)return;
  const cid=$('#leagueSessionComplex')?.value||'';
  const pitches=S.sportsPitches.filter(x=>x.active!==false&&x.complex_id===cid);
  sel.innerHTML='<option value="">Choisir le terrain</option>'+pitches.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('');
}
function renderMatchPitchSelect(){
  const sel=$('#pitch');if(!sel)return;
  const t=currentTour();
  let pitches=[];
  if(t?.reserved_pitch_ids?.length)pitches=S.sportsPitches.filter(p=>t.reserved_pitch_ids.includes(p.id));
  if(!pitches.length)pitches=S.sportsPitches.filter(p=>p.active!==false);
  sel.innerHTML='<option value="">Terrain</option>'+pitches.map(p=>'<option value="'+esc(p.name)+'">'+esc(p.name)+' • '+esc(complexLabel(p.complex_id))+'</option>').join('');
}

function hostFirstName(){
  const u=S.session?.user;
  if(isAdmin()&&S.adminProfile?.first_name){
    return String(S.adminProfile.first_name).trim().split(/\s+/)[0];
  }
  const md=u?.user_metadata||{};
  const raw=(md.first_name||md.given_name||md.name||md.full_name||'').trim();
  if(raw)return raw.split(/\s+/)[0];
  // Ne jamais fabriquer le prénom depuis l'adresse e-mail (ex. la.louison -> La).
  // Si aucun prénom de profil n'est disponible, utiliser un accueil neutre.
  return 'à toi';
}
function renderHostWelcome(){
  const title=$('#hostWelcomeTitle'),email=$('#hostWelcomeEmail'),rights=$('#coorgMyRights');
  if(title)title.textContent='👋 Bonjour '+hostFirstName()+' !';
  if(email)email.textContent='Connecté avec : '+(S.session?.user?.email||'email indisponible');
  if(!rights)return;
  if(!isCoorg()){
    rights.classList.add('hidden');
    rights.innerHTML='';
    return;
  }
  rights.classList.remove('hidden');
  const defs=[
    ['can_enter_scores','⚽ Saisir les scores pendant les matchs'],
    ['can_generate_teams','👥 Générer les équipes'],
    ['can_create_tournaments','📅 Créer des tournois'],
    ['can_view_players','👤 Voir les joueurs'],
    ['can_add_members','➕ Ajouter des membres'],
    ['can_delete_members','🗑️ Supprimer des membres'],
    ['can_invite_coorganizers','🔗 Inviter des co-organisateurs']
  ];
  const granted=defs.filter(([key])=>!!S.myPermissions?.[key]);
  const temp=hasTemporaryAdmin();
  rights.innerHTML=
    '<div class="player" style="background:#f8fbf9">'+
      '<div class="row" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">'+
        '<div><b>🔐 Mes autorisations</b><div class="muted" style="margin-top:3px">Droits accordés par l’administrateur</div></div>'+
        '<span class="guest-badge">'+(temp?'Admin temporaire':'Co-gestionnaire')+'</span>'+
      '</div>'+
      '<div style="margin-top:10px">'+
        (granted.length?granted.map(([,label])=>'<span class="guest-badge" style="margin:3px 5px 3px 0;background:#e7f6ec;color:#126b34">'+label+'</span>').join(''):'<span class="muted">Aucune autorisation particulière.</span>')+
      '</div>'+
      (S.myPermissions?.can_enter_scores?'<div class="muted" style="margin-top:9px">✅ Tu peux saisir et modifier les scores pendant les matchs en cours.</div>':'')+
    '</div>';
}

function setView(v){
  const previousView=S.lastView;
  if(v==='myplayer'&&!S.playerAccountAccess&&S.workspace)v='home';
  if(v==='permissions'&&!isAdmin())v='home';
  if(v==='coorganizers'&&!isAdmin())v='home';
  if(v==='players'&&isCoorg()&&!hasTemporaryAdmin()&&!S.myPermissions.can_view_players)v='home';
  if(v==='tournaments'&&!S.workspaceFeatures.tournaments_enabled)v='home';
  if(v==='league'&&!S.workspaceFeatures.league_enabled)v='home';
  if(v==='ranking'&&!S.workspaceFeatures.rankings_enabled)v='home';
  if(v==='matches'&&isCoorg()&&!hasTemporaryAdmin()&&!S.myPermissions.can_enter_scores)v='home';
  document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+v));
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.view===v));
  const activeTab=document.querySelector('.tab.active');
  if(activeTab&&window.matchMedia('(max-width:650px)').matches){
    requestAnimationFrame(()=>activeTab.scrollIntoView({behavior:(matchMedia('(pointer:coarse)').matches?'auto':'smooth'),block:'nearest',inline:'center'}));
  }
  if(v==='teams'){
    if(S.activeTour&&S.tournaments.some(t=>String(t.id)===String(S.activeTour)))S.teamCompetitionId=S.activeTour;
    renderTeams();
    // Relecture immédiate : évite qu'une PWA iPhone affiche un ancien compteur ou d'anciens terrains.
    const teamTourAtOpen=S.activeTour;
    if(teamTourAtOpen)loadTournament().then(()=>{if(S.lastView==='teams'&&String(S.activeTour)===String(teamTourAtOpen))renderTeams();}).catch(()=>{});
    if(previousView!=='teams'&&S.teamCompetitionId&&(hasAdminOps()||(isCoorg()&&S.myPermissions.can_generate_teams))){
      const tournamentId=S.teamCompetitionId;
      syncTournamentSubstitutes(tournamentId).then(async()=>{
        if(String(S.activeTour)!==String(tournamentId))return;
        await loadTournament();renderTeams();
      }).catch(error=>console.warn('substitute synchronization',error));
    }
  }
  if(v==='ranking')renderRanking();
  S.lastView=v;
  if(['home','myplayer','players','coorganizers','permissions','tournaments','teams','matches','league','cooler','ranking','simple-swe'].includes(v)&&!S.publicMode){window.swePageViewContext={page:'app:'+v};document.dispatchEvent(new Event('swe:page-view'));}
}

// `start` is an entry intent, not a persistent profile preference. Keeping
// `?start=player` after the user returns to an organizer workspace made the
// next reload reopen the player profile and looked like a random switch.
function consumeStartMode(){
  try{
    const u=new URL(location.href);
    if(!u.searchParams.has('start'))return;
    u.searchParams.delete('start');
    history.replaceState({},'',u.pathname+u.search+u.hash);
  }catch(_error){}
}

// Navigation attachée immédiatement : elle reste fonctionnelle même si une
// autre partie de l'initialisation rencontre une erreur.
document.addEventListener('click',e=>{
  const tab=e.target.closest('.tab');
  if(tab && tab.dataset.view){
    e.preventDefault();
    if(tab.disabled || tab.classList.contains('disabled-tab'))return;
    setView(tab.dataset.view); return;
  }
  const go=e.target.closest('[data-go]');
  if(go && go.dataset.go){ e.preventDefault(); setView(go.dataset.go); }
});
let recoveryMode=/type=recovery/i.test(location.hash+location.search);
const APP_URL=location.origin+location.pathname.substring(0,location.pathname.lastIndexOf('/')+1);
const urlParams=new URLSearchParams(location.search);
let publicTokenFromUrl=urlParams.get('public');
const paymentDeskTokenFromUrl=(()=>{
  const fromUrl=(urlParams.get('paydesk')||'').trim();
  if(fromUrl){
    try{sessionStorage.setItem('swe_paydesk_token',fromUrl);}catch(_){}
    try{const u=new URL(location.href);u.searchParams.delete('paydesk');u.searchParams.set('paydesk_session','1');history.replaceState({},'',u.toString());}catch(_){}
    return fromUrl;
  }
  if(urlParams.get('paydesk_session')==='1'){
    try{return (sessionStorage.getItem('swe_paydesk_token')||'').trim();}catch(_){return '';}
  }
  return '';
})();
const shortCodeFromUrl=(urlParams.get('s')||'').trim().toUpperCase();
const paymentShortCodeFromUrl=(urlParams.get('pay')||'').trim().toUpperCase();
const inviteIdFromUrl=urlParams.get('invite');
const inviteEmailFromUrl=(urlParams.get('email')||'').trim().toLowerCase();
const coolerTournamentFromUrl=(urlParams.get('joinSwe')||'').trim();
const coolerOwnerFromUrl=(urlParams.get('coolerOwner')||'').trim();
const coolerActionFromUrl=(urlParams.get('coolerAction')||'').trim();
const coolerReturnFromUrl=(()=>{
  const raw=(urlParams.get('coolerReturn')||'').trim();if(!raw)return '';
  try{const u=new URL(raw,location.origin);return u.origin===location.origin&&u.searchParams.has('public')&&u.searchParams.has('tournament')?u.toString():'';}catch(_e){return '';}
})();
function coolerContinuationUrl(action){
  const q=new URLSearchParams({start:'player',joinSwe:coolerTournamentFromUrl||'',coolerOwner:coolerOwnerFromUrl||'',coolerReturn:coolerReturnFromUrl||'',coolerAction:action||coolerActionFromUrl||'login'});
  return APP_URL+'?'+q.toString();
}
function isAdmin(){return S.workspace?.role==='admin'}
function isCoorg(){return S.workspace?.role==='coorganizer'}
function hasTemporaryAdmin(){
  if(!isCoorg()||!S.myPermissions?.temporary_admin_until)return false;
  return new Date(S.myPermissions.temporary_admin_until).getTime()>Date.now();
}
function hasAdminOps(){return isAdmin()||hasTemporaryAdmin()}
function formatLabel(t){return t?.format==='king_of_pitch'?'Roi du terrain':(t?.format==='league'?'Ligue':'Classique')}
function registrationLink(t){
  if(!t||!S.workspace?.public_token)return '';
  if(t.short_code)return APP_URL+'?s='+encodeURIComponent(String(t.short_code).toUpperCase());
  if(t.format==='league'){
    return APP_URL+'?public='+encodeURIComponent(S.workspace.public_token)+'&view=league-session&league='+encodeURIComponent(t.league_id||'')+'&tournament='+encodeURIComponent(t.id);
  }
  return APP_URL+'?public='+encodeURIComponent(S.workspace.public_token)+'&view=tournament&tournament='+encodeURIComponent(t.id);
}
function leagueRegistrationLink(l){
  if(!l||!S.workspace?.public_token)return '';
  return APP_URL+'?public='+encodeURIComponent(S.workspace.public_token)+'&view=league&league='+encodeURIComponent(l.id);
}
function seasonPublicRankingLink(){
  if(!S.workspace?.public_token)return '';
  const season=S.seasons.find(x=>x.is_active)||S.seasons[0];
  const linked=S.tournaments.find(x=>x.season_id===season?.id&&x.format!=='league'&&x.short_code);
  if(linked?.short_code)return APP_URL+'saison/?s='+encodeURIComponent(String(linked.short_code).toUpperCase());
  const q=new URLSearchParams({public:S.workspace.public_token});
  if(season?.id)q.set('season',season.id);
  return APP_URL+'season.html?'+q.toString();
}
function canEditCurrentMatches(){const t=currentTour();return !!t && t.status!=='finished' && (hasAdminOps()||(isCoorg()&&S.myPermissions.can_enter_scores))}
function canManageMatchStructure(){const t=currentTour();return !!t && t.status!=='finished' && hasAdminOps()}
function makeDisabledActionButton(label,title){
  const b=document.createElement('button');b.textContent=label;b.disabled=true;b.setAttribute('aria-disabled','true');
  b.className='danger disabled-action';b.style.opacity='.38';b.style.filter='grayscale(1)';b.style.cursor='not-allowed';
  b.title=title||'Action non autorisée';return b;
}
function applyPermissions(){
  const admin=isAdmin();
  const coorg=isCoorg();
  const adminOps=hasAdminOps();
  const organizerLocked=!!S.organizerAccess?.requires_subscription;
  if(organizerLocked){
    document.querySelectorAll('.tabs .tab').forEach(el=>{const v=el.dataset.view;el.style.display=(v==='home'||v==='myplayer')?'':'none';});
    document.querySelectorAll('[data-go]').forEach(el=>{const v=el.dataset.go;if(v&&v!=='home'&&v!=='myplayer')el.style.display='none';});
    return;
  }
  const canCreateTournament=adminOps||(coorg&&S.myPermissions.can_create_tournaments);
  const seasonCard=$('#seasonAdminCard');if(seasonCard)seasonCard.classList.toggle('hidden',!adminOps||!S.seasonAdminOpen);
  const tournamentCard=$('#tournamentAdminCard');if(tournamentCard)tournamentCard.classList.toggle('hidden',!canCreateTournament||!S.tournamentCreateOpen);
  const newTournamentToggle=$('#newTournamentToggle');if(newTournamentToggle)newTournamentToggle.classList.toggle('hidden',!canCreateTournament);
  const seasonSettingsToggle=$('#seasonSettingsToggle');if(seasonSettingsToggle)seasonSettingsToggle.classList.toggle('hidden',!adminOps);
  const attendanceCard=$('#attendanceAdminCard');if(attendanceCard)attendanceCard.classList.toggle('hidden',!(adminOps||coorg));
  const teamsCard=$('#teamsAdminCard');if(teamsCard)teamsCard.classList.remove('hidden');
  const teamControls=$('#teamManagementControls');
  const canManageTeams=adminOps||(coorg&&S.myPermissions.can_generate_teams);
  if(teamControls)teamControls.classList.toggle('hidden',!canManageTeams);
  const matchCreateCard=$('#matchCreateAdminCard');if(matchCreateCard)matchCreateCard.classList.toggle('hidden',!adminOps);
  const competitionEnabled=!!(S.workspaceFeatures.tournaments_enabled||S.workspaceFeatures.league_enabled);
  const thirdHalf=competitionEnabled&&!!S.workspaceFeatures.third_half_enabled;
  const topPlayerEnabled=competitionEnabled&&!!S.workspaceFeatures.player_ratings_enabled&&!!S.workspaceFeatures.top_player_enabled;
  const topPlayerCard=$('#adminTopPlayerCard');if(topPlayerCard)topPlayerCard.classList.toggle('hidden',!topPlayerEnabled);
  $('#thirdHalfTournamentCreate')?.classList.toggle('hidden',!thirdHalf||!adminOps);
  refreshTournamentThirdHalfSetup();
  $('#thirdHalfLeagueCreate')?.classList.toggle('hidden',!thirdHalf||!adminOps);
  $('#thirdHalfAdminCard')?.classList.toggle('hidden',!thirdHalf||!adminOps);
  const matchTabAllowed=adminOps||(coorg&&S.myPermissions.can_enter_scores);
  document.querySelectorAll('.tab[data-view="matches"]').forEach(el=>{
    el.style.display=matchTabAllowed?'':'none';
    el.disabled=!matchTabAllowed;
    el.title=matchTabAllowed?'Saisir les matchs':'Aucune autorisation de saisie des scores';
  });
  document.querySelectorAll('[data-go="matches"]').forEach(el=>el.style.display=matchTabAllowed?'':'none');
  document.querySelectorAll('.admin-permissions-tab').forEach(el=>{
    el.classList.remove('hidden');
    el.classList.toggle('disabled-tab',!admin);
    el.disabled=!admin;
    el.setAttribute('aria-disabled',!admin?'true':'false');
    el.title=admin?'Gérer les autorisations':'Réservé à l’administrateur';
  });
  document.querySelectorAll('.admin-coorg-tab').forEach(el=>{
    el.classList.toggle('hidden',!admin);
    el.style.display=admin?'':'none';
    el.disabled=!admin;
    el.setAttribute('aria-disabled',!admin?'true':'false');
  });
  const coorgView=$('#view-coorganizers');if(coorgView&&!admin)coorgView.classList.remove('active');
  const permView=$('#view-permissions');if(permView&&!admin)permView.classList.remove('active');
  const access=$('#adminAccessCard');if(access)access.classList.toggle('hidden',!(admin||coorg));
  const inviteControls=$('#adminInviteControls');if(inviteControls)inviteControls.classList.toggle('hidden',!(admin||(coorg&&S.myPermissions.can_invite_coorganizers)));
  const accessLegend=$('#adminAccessLegend');if(accessLegend)accessLegend.classList.toggle('hidden',!admin);
  const playerAddCard=$('#playersInput')?.closest('.card');
  if(playerAddCard)playerAddCard.classList.toggle('hidden',coorg&&!S.myPermissions.can_add_members);
  document.querySelectorAll('.tab[data-view="tournaments"]').forEach(el=>el.style.display=S.workspaceFeatures.tournaments_enabled?'':'none');
  document.querySelectorAll('.tab[data-view="league"]').forEach(el=>el.style.display=S.workspaceFeatures.league_enabled?'':'none');
  document.querySelectorAll('.tab[data-view="cooler"]').forEach(el=>{const visible=admin&&thirdHalf;el.classList.toggle('hidden',!visible);el.style.display=visible?'':'none';});
  if(!admin||!thirdHalf)$('#view-cooler')?.classList.remove('active');
  document.querySelectorAll('.tab[data-view="ranking"]').forEach(el=>el.style.display=S.workspaceFeatures.rankings_enabled?'':'none');
  document.querySelectorAll('.tab[data-view="myplayer"],[data-go="myplayer"]').forEach(el=>{el.style.display=S.playerAccountAccess?'':'none';});
  const ratingsEnabled=!!S.workspaceFeatures.player_ratings_enabled;
  document.querySelectorAll('.tab[data-view="players"]').forEach(el=>{
    const visible=admin||hasTemporaryAdmin()||(coorg&&S.myPermissions.can_view_players);
    el.style.display=visible?'':'none';
    el.textContent=ratingsEnabled?'Joueurs / Notes':'Joueurs';
  });
  const playersTitle=$('#playersViewTitle');if(playersTitle)playersTitle.textContent=ratingsEnabled?'Joueurs / Notes':'Joueurs';
  const playersIntro=$('#playersViewIntro');if(playersIntro)playersIntro.innerHTML=ratingsEnabled
    ?'Consulte les membres du groupe et leurs évaluations. <b>Administrateur et co-gestionnaires</b> peuvent noter les joueurs ; la moyenne suit le joueur grâce à son ID SWÉ.'
    :'Liste des membres du groupe. Les actions de modification ou suppression dépendent des droits accordés par l’administrateur.';
  $('#playersRatingIntro')?.classList.toggle('hidden',!ratingsEnabled);
  document.querySelectorAll('[data-go="tournaments"]').forEach(b=>{b.textContent=(adminOps||(coorg&&S.myPermissions.can_create_tournaments))?'📅 Nouveau tournoi':'📅 Tournois / historique'});
  document.querySelectorAll('[data-go="players"]').forEach(b=>{
    const visible=admin||hasTemporaryAdmin()||(coorg&&S.myPermissions.can_view_players);
    b.style.display=visible?'':'none';
    b.textContent=ratingsEnabled?'👥 Joueurs / Notes':'👥 Joueurs';
  });
}

function refreshTournamentThirdHalfSetup(){
  const enabled=$('#tourThirdHalfActive')?.checked===true;
  const setup=$('#tourThirdHalfSetup');
  if(setup)setup.classList.toggle('hidden',!enabled);
  const players=(S.players||[]).filter(p=>p.active!==false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'fr'));
  [['tourCoolerPlayer','À définir plus tard'],['tourIcePlayer','À définir plus tard']].forEach(([id,label])=>{
    const select=$('#'+id);if(!select)return;
    const value=select.value;
    select.innerHTML='<option value="">'+label+'</option>'+players.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+(p.is_group_member===false?' • Invité':'')+'</option>').join('');
    select.value=players.some(p=>String(p.id)===String(value))?value:'';
  });
}

function showRecoveryForm(){
  recoveryMode=true;
  $('#auth').classList.remove('hidden');
  $('#main').classList.add('hidden');
  $('#publicView').classList.add('hidden');
  $('#loginCard').classList.add('hidden');
  $('#resetPasswordCard').classList.remove('hidden');
}
function friendlyAuthError(error){
  const m=(error?.message||String(error||'')).toLowerCase();
  if(m.includes('rate limit')) return 'Trop de demandes d’e-mail. Attends environ 1 heure avant de réessayer.';
  if(m.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if(m.includes('expired')) return 'Ce lien a expiré. Demande un nouveau lien de récupération.';
  return error?.message||'Une erreur est survenue.';
}
async function authState(){
  try{const cfg=await sb.rpc('get_platform_public_settings');if(!cfg.error&&cfg.data)S.platformSettings={...S.platformSettings,...cfg.data};renderPlatformFooter();}catch(_e){}
  const consentEnabled=!!S.platformSettings.consent_gate_enabled;
  $('#signupConsentRow')?.classList.toggle('hidden',!consentEnabled);
  const coolerCard=$('#coolerAccountCard');
  if(coolerCard){
    const active=!!(coolerTournamentFromUrl&&coolerReturnFromUrl);
    coolerCard.classList.toggle('hidden',!active);
    if(active){
      $('#coolerAccountTitle').textContent=(coolerOwnerFromUrl||'Tu')+', configure ta glacière';
      $('#coolerAccountText').textContent='Crée gratuitement ton compte joueur ou connecte-toi. Ton profil sera rattaché de façon sécurisée à cette mission. Aucun abonnement organisateur n’est nécessaire.';
      $('#signup')?.classList.toggle('primary',coolerActionFromUrl==='signup');
      $('#login')?.classList.toggle('primary',coolerActionFromUrl!=='signup');
    }
  }
  if(paymentShortCodeFromUrl){
    try{
      const {data,error}=await sb.rpc('resolve_payment_desk_short_link',{p_code:paymentShortCodeFromUrl});
      if(error)throw error;
      if(!data?.token)throw new Error('Lien d’encaissement invalide ou expiré.');
      await bootPaymentDesk(data.token);
    }catch(e){
      $('#auth').classList.add('hidden');$('#main').classList.add('hidden');$('#publicView').classList.remove('hidden');
      $('#publicView').innerHTML='<header class="top"><h1><img src="./favicon.png?v=4100" class="brand-mark" alt="SWÉ">SWÉ TOURNAMENT 5/5</h1></header><div class="card"><h2>Lien d’encaissement indisponible</h2><p class="muted">'+esc(e.message||e)+'</p></div>';
    }
    return;
  }
  if(paymentDeskTokenFromUrl){
    await bootPaymentDesk(paymentDeskTokenFromUrl);
    return;
  }
  if(shortCodeFromUrl&&!publicTokenFromUrl){
    try{
      const {data,error}=await sb.rpc('resolve_public_tournament_short_link',{p_code:shortCodeFromUrl});
      if(error)throw error;
      if(!data?.public_token||!data?.tournament_id)throw new Error('Lien court invalide ou expiré.');
      publicTokenFromUrl=data.public_token;
      urlParams.set('public',data.public_token);
      urlParams.set('tournament',data.tournament_id);
      urlParams.set('view',data.view||'tournament');
      if(data.league_id)urlParams.set('league',data.league_id);
      // Keep the visible ?s= URL unchanged; bootPublic reads the resolved context below.
      window.__sweResolvedShortLink={
        tournament:String(data.tournament_id),
        view:String(data.view||'tournament'),
        league:data.league_id?String(data.league_id):''
      };
    }catch(e){
      $('#auth').classList.add('hidden');
      $('#main').classList.add('hidden');
      $('#publicView').classList.remove('hidden');
      $('#publicView').innerHTML='<header class="top"><h1><img src="./favicon.png?v=4100" class="brand-mark" alt="SWÉ">SWÉ TOURNAMENT 5/5</h1></header><div class="card"><h2>Lien indisponible</h2><p class="muted">'+esc(e.message||e)+'</p></div>';
      return;
    }
  }
  if(publicTokenFromUrl){
    await bootPublic(publicTokenFromUrl);
    return;
  }
  const {data}=await sb.auth.getSession();
  S.session=data.session;
  if(S.session&&coolerTournamentFromUrl&&coolerReturnFromUrl){
    try{
      await sb.rpc('ensure_my_global_player_profile',{p_display_name:null});
      const claim=await sb.rpc('request_my_third_half_owner_link_v1',{p_tournament_id:coolerTournamentFromUrl});
      const target=new URL(coolerReturnFromUrl);
      if(claim.error)target.searchParams.set('coolerLink','error');
      else if(claim.data?.status==='pending')target.searchParams.set('coolerLink','pending');
      else target.searchParams.delete('coolerLink');
      location.replace(target.toString());return;
    }catch(_e){const target=new URL(coolerReturnFromUrl);target.searchParams.set('coolerLink','error');location.replace(target.toString());return;}
  }
  if(S.session?.user?.id)window.SWEJournalSession?.(sb,S.session.user.id);
  const oauthProvider=new URLSearchParams(location.search).get('provider');
  if(!S.session&&(oauthProvider==='google'||oauthProvider==='apple')){
    const u=new URL(location.href);u.searchParams.delete('provider');history.replaceState({},'',u.toString());
    await startSocialAuth(oauthProvider);return;
  }
  if(S.session&&new URLSearchParams(location.search).has('oauth')){const u=new URL(location.href);u.searchParams.delete('oauth');history.replaceState({},'',u.toString());}
  if(recoveryMode){showRecoveryForm();return}
  $('#loginCard').classList.remove('hidden');
  $('#resetPasswordCard').classList.add('hidden');
  const loginEmailFromUrl=new URLSearchParams(location.search).get('email');
  if(loginEmailFromUrl&&!$('#email').value)$('#email').value=loginEmailFromUrl;
  const landing=$('#inviteLandingCard');
  if(landing){
    landing.classList.toggle('hidden',!inviteIdFromUrl);
    if(inviteIdFromUrl){
      $('#inviteLandingText').innerHTML='Tu as été invité comme <b>co-organisateur</b>.'+(inviteEmailFromUrl?' Utilise l’adresse <b>'+esc(inviteEmailFromUrl)+'</b>.':'');
      if(inviteEmailFromUrl&&!$('#email').value)$('#email').value=inviteEmailFromUrl;
    }
  }
  $('#auth').classList.toggle('hidden',!!S.session);
  $('#main').classList.toggle('hidden',!S.session);
  if(S.session){
    try{
      const consent=consentEnabled?await sb.rpc('get_my_swe_consent_status'):{error:null,data:{accepted:true}};
      if(consentEnabled&&!consent.error&&consent.data?.accepted!==true){
        $('#main').classList.add('hidden');
        $('#auth').classList.add('hidden');
        $('#consentGate')?.classList.remove('hidden');
        return;
      }
      await sb.rpc('ensure_my_global_player_profile',{p_display_name:null});
      await boot();
    }catch(error){toast('Connexion OK, mais chargement impossible : '+(error?.message||error))}
  }
}
$('#login').onclick=async()=>{
  const email=$('#email').value.trim().toLowerCase();
  if(inviteEmailFromUrl&&email!==inviteEmailFromUrl)return toast('Cette invitation est prévue pour '+inviteEmailFromUrl);
  const {error}=await sb.auth.signInWithPassword({email,password:$('#password').value});
  error?toast(friendlyAuthError(error)):authState();
};
$('#signup').onclick=async()=>{
  const email=$('#email').value.trim().toLowerCase();
  if(S.platformSettings.consent_gate_enabled&&!$('#signupConsent')?.checked)return toast('Tu dois accepter les conditions SWÉ Tournament pour créer ton compte.');
  if(inviteEmailFromUrl&&email!==inviteEmailFromUrl)return toast('Utilise l’adresse e-mail indiquée dans l’invitation : '+inviteEmailFromUrl);
  const redirect=inviteIdFromUrl?APP_URL+'?invite='+encodeURIComponent(inviteIdFromUrl)+'&email='+encodeURIComponent(email):(coolerReturnFromUrl?coolerContinuationUrl('login'):APP_URL);
  const {data,error}=await sb.auth.signUp({email,password:$('#password').value,options:{emailRedirectTo:redirect,data:S.platformSettings.consent_gate_enabled?{swe_consent_accepted:true,swe_terms_version:'2026-09-05-beta',swe_privacy_version:'2026-09-05-beta'}:{}}});
  if(error)return toast(friendlyAuthError(error));
  toast(data.session?'Compte créé. Ton ID SWÉ est rattaché à ton email.':'Compte créé : vérifie ton email puis reconnecte-toi avec la même adresse. Ton ID SWÉ sera retrouvé automatiquement.');
};
$('#authGoogle').onclick=()=>startSocialAuth('google');
$('#authApple').onclick=()=>startSocialAuth('apple');
async function startSocialAuth(provider){
  const redirectTo=coolerReturnFromUrl?coolerContinuationUrl('login'):APP_URL+'?oauth=done';
  const {error}=await sb.auth.signInWithOAuth({provider,options:{redirectTo}});
  if(error)toast('Connexion '+(provider==='google'?'Google':'Apple')+' indisponible pour le moment : '+friendlyAuthError(error));
}
$('#forgotPassword').onclick=async()=>{
  const email=$('#email').value.trim();
  if(!email)return toast('Entre d’abord ton adresse email.');
  $('#forgotPassword').disabled=true;
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:APP_URL});
  $('#forgotPassword').disabled=false;
  if(error)return toast(friendlyAuthError(error));
  toast('Email envoyé. Ouvre le lien reçu pour choisir un nouveau mot de passe.');
};
$('#updatePassword').onclick=async()=>{
  const p1=$('#newPassword').value,p2=$('#confirmNewPassword').value;
  if(p1.length<8)return toast('Le mot de passe doit contenir au moins 8 caractères.');
  if(p1!==p2)return toast('Les deux mots de passe ne correspondent pas.');
  $('#updatePassword').disabled=true;
  const {error}=await sb.auth.updateUser({password:p1});
  $('#updatePassword').disabled=false;
  if(error)return toast(friendlyAuthError(error));
  recoveryMode=false;
  $('#newPassword').value='';$('#confirmNewPassword').value='';
  history.replaceState({},'',location.pathname);
  toast('Mot de passe modifié avec succès.');
  await authState();
};
$('#logout').onclick=async()=>{await sb.auth.signOut();location.reload()};
$('#consentLogout').onclick=async()=>{await sb.auth.signOut();location.reload()};
$('#acceptLegacyConsent').onclick=async()=>{
  if(!$('#legacyConsentCheck')?.checked)return toast('Coche la case pour confirmer ton accord.');
  const b=$('#acceptLegacyConsent');b.disabled=true;
  const {error}=await sb.rpc('accept_current_swe_terms');
  b.disabled=false;if(error)return toast(error.message);
  $('#consentGate')?.classList.add('hidden');$('#main').classList.remove('hidden');
  await boot();toast('Conditions acceptées ✅');
};



function renderSuperAdminVenues(){
  const box=$('#saVenueList');if(!box)return;
  box.innerHTML='';
  const complexes=(S.sportsComplexes||[]).slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||String(a.name).localeCompare(String(b.name)));
  if(!complexes.length){box.innerHTML='<p class="muted">Aucun complexe enregistré.</p>';return}
  complexes.forEach(c=>{
    const d=document.createElement('div');d.className='player';d.style.marginBottom='12px';
    const pitches=(S.sportsPitches||[]).filter(p=>p.complex_id===c.id);
    d.innerHTML=
      '<div class="grid g3">'+
        '<input data-complex-name value="'+esc(c.name)+'" placeholder="Nom du complexe">'+
        '<input data-complex-city value="'+esc(c.city||'')+'" placeholder="Ville / commune">'+'<div class="grid g2"><input data-complex-sunday type="number" min="0" step="0.5" value="'+(Number(c.onsite_sunday_price_cents||0)/100)+'" placeholder="Dimanche €"><input data-complex-weekday type="number" min="0" step="0.5" value="'+(Number(c.onsite_weekday_price_cents||0)/100)+'" placeholder="Semaine €"></div>'+
        '<label class="player row" style="justify-content:flex-start"><input data-complex-active type="checkbox" style="width:auto" '+(c.active!==false?'checked':'')+'><span>Actif</span></label>'+
      '</div>'+
      (venueMeta(c)?'<div class="muted" style="margin-top:7px;padding:8px 10px;background:#f7fbf8;border-radius:10px"><b>'+esc(venueMeta(c).type)+'</b> • '+esc(venueMeta(c).hours)+'</div>':'')+
      '<div class="row" style="margin-top:8px;flex-wrap:wrap"><button data-complex-save class="primary">💾 Enregistrer le complexe</button><button data-complex-delete class="danger">Supprimer</button></div>'+
      '<div style="height:1px;background:#e8ecef;margin:12px 0"></div>'+
      '<b>Terrains</b><div data-pitch-list style="margin-top:8px"></div>'+
      '<div class="row" style="margin-top:8px"><input data-new-pitch placeholder="Nom du nouveau terrain" style="flex:1"><button data-add-pitch>+ Terrain</button></div>';
    const plist=d.querySelector('[data-pitch-list]');
    plist.innerHTML=pitches.map(p=>'<div class="row player" data-pitch-id="'+p.id+'" style="margin:5px 0"><input data-pitch-name value="'+esc(p.name)+'" style="flex:1"><label class="row" style="gap:5px"><input data-pitch-active type="checkbox" style="width:auto" '+(p.active!==false?'checked':'')+'> Actif</label><button data-pitch-save>Enregistrer</button><button data-pitch-delete class="danger">Supprimer</button></div>').join('')||'<div class="muted">Aucun terrain.</div>';
    d.querySelector('[data-complex-save]').onclick=async()=>{
      const {error}=await sb.rpc('super_admin_manage_sports_complex',{p_action:'update',p_id:c.id,p_name:d.querySelector('[data-complex-name]').value.trim(),p_city:d.querySelector('[data-complex-city]').value.trim()||null,p_active:d.querySelector('[data-complex-active]').checked});
      if(error)return toast(error.message);await loadSportsVenues();toast('Complexe mis à jour ✅');
    };
    d.querySelector('[data-complex-delete]').onclick=async()=>{
      if(!confirm('Supprimer définitivement le complexe « '+c.name+' » ?'))return;
      const {error}=await sb.rpc('super_admin_manage_sports_complex',{p_action:'delete',p_id:c.id});
      if(error)return toast(error.message);await loadSportsVenues();toast('Complexe supprimé.');
    };
    d.querySelector('[data-add-pitch]').onclick=async()=>{
      const name=d.querySelector('[data-new-pitch]').value.trim();if(!name)return toast('Indique le nom du terrain.');
      const {error}=await sb.rpc('super_admin_manage_sports_pitch',{p_action:'create',p_complex_id:c.id,p_name:name,p_active:true});
      if(error)return toast(error.message);await loadSportsVenues();toast('Terrain ajouté ✅');
    };
    plist.querySelectorAll('[data-pitch-id]').forEach(row=>{
      const pid=row.dataset.pitchId;
      row.querySelector('[data-pitch-save]').onclick=async()=>{
        const {error}=await sb.rpc('super_admin_manage_sports_pitch',{p_action:'update',p_id:pid,p_complex_id:c.id,p_name:row.querySelector('[data-pitch-name]').value.trim(),p_active:row.querySelector('[data-pitch-active]').checked});
        if(error)return toast(error.message);await loadSportsVenues();toast('Terrain mis à jour ✅');
      };
      row.querySelector('[data-pitch-delete]').onclick=async()=>{
        if(!confirm('Supprimer définitivement ce terrain ?'))return;
        const {error}=await sb.rpc('super_admin_manage_sports_pitch',{p_action:'delete',p_id:pid});
        if(error)return toast(error.message);await loadSportsVenues();toast('Terrain supprimé.');
      };
    });
    box.appendChild(d);
  });
}
async function loadSuperAdminWorkspaces(){
  const {data,error}=await sb.rpc('super_admin_get_workspaces_v5');
  if(error){toast(error.message);return}
  S.superWorkspaces=Array.isArray(data)?data:[];
  const accountAccesses=await sb.rpc('super_admin_get_account_workspace_accesses');
  S.superAccountAccesses=accountAccesses.error?[]:(Array.isArray(accountAccesses.data)?accountAccesses.data:[]);
  const requests=await sb.rpc('super_admin_get_coorganizer_quota_requests');
  S.superCoorgQuotaRequests=requests.error?[]:(Array.isArray(requests.data)?requests.data:[]);
  const players=await sb.rpc('super_admin_get_players_directory_v3');
  S.superPlayers=players.error?[]:(Array.isArray(players.data)?players.data:[]);
  const playerAccess=await sb.rpc('super_admin_get_player_account_access_v1');
  S.superPlayerAccountAccess=playerAccess.error?[]:(Array.isArray(playerAccess.data)?playerAccess.data:[]);
  const signupRequests=await sb.rpc('super_admin_get_player_signup_requests');
  S.superSignupRequests=signupRequests.error?[]:(Array.isArray(signupRequests.data)?signupRequests.data:[]);
  const disputes=await sb.rpc('super_admin_get_identity_disputes');
  S.superIdentityDisputes=disputes.error?[]:(Array.isArray(disputes.data)?disputes.data:[]);
  const platform=await sb.rpc('super_admin_get_platform_settings');
  if(!platform.error&&platform.data)S.platformSettings={...S.platformSettings,...platform.data};[['saFooterCompany','footer_company_name'],['saFooterEmail','footer_contact_email'],['saFooterLegalText','footer_legal_text'],['saFooterLegalUrl','footer_legal_url'],['saFooterPrivacyUrl','footer_privacy_url'],['saFooterTermsUrl','footer_terms_url']].forEach(([i,k])=>{if($('#'+i))$('#'+i).value=S.platformSettings[k]||''});if($('#saFooterEnabled'))$('#saFooterEnabled').checked=S.platformSettings.footer_enabled!==false;renderPlatformFooter();
  const consentToggle=$('#saConsentGateEnabled');if(consentToggle)consentToggle.checked=!!S.platformSettings.consent_gate_enabled;
  const consentLabel=$('#saConsentGateLabel');if(consentLabel)consentLabel.textContent=S.platformSettings.consent_gate_enabled?'Visible / obligatoire':'Masqué';
  renderSuperAdminWorkspaces();
  renderSuperAdminPlayers();
  renderSuperAdminSignupRequests();
  renderSuperAdminIdentityDisputes();
}
function playerActivationLink(token){return 'https://swetournament.fr/?activate='+encodeURIComponent(token||'');}
function signupInviteMessage(r){return 'Salut '+(r.display_name||'')+' 👋\n\nTon inscription SWÉ Tournament est prête. Active ton compte avec ce lien :\n'+playerActivationLink(r.activation_token)+'\n\nCe lien est personnel. Une fois le compte activé, tu pourras retrouver ton ID SWÉ et tes performances.';}
function renderSuperAdminSignupRequests(){
  const box=$('#saSignupRequestsList');if(!box)return;
  const rows=(S.superSignupRequests||[]).filter(r=>r.status==='pending');
  const pill=$('#saSignupRequestsCount');if(pill)pill.textContent=rows.length+' en attente';
  if(!rows.length){box.innerHTML='<div class="muted">Aucune demande d’inscription en attente.</div>';return;}
  box.innerHTML=rows.map(r=>{
    const link=playerActivationLink(r.activation_token),msg=signupInviteMessage(r);
    const mailSubject=encodeURIComponent('Activation de ton compte SWÉ Tournament');
    const mailBody=encodeURIComponent(msg);
    const waPhone=String(r.phone_number||'').replace(/[^0-9]/g,'');
    const waHref=waPhone?'https://wa.me/'+waPhone+'?text='+encodeURIComponent(msg):'';
    return '<div class="sa-signup-request">'+
      '<div class="sa-signup-request-main"><b>'+esc(r.display_name)+'</b><div class="muted">📧 '+esc(r.email)+(r.phone_number?' • 📱 '+esc(r.phone_number):'')+'</div><div class="small muted">Demandé le '+new Date(r.created_at).toLocaleString('fr-FR')+'</div></div>'+
      '<div class="sa-activation-link"><span>Lien d’activation</span><code>'+esc(link)+'</code></div>'+
      '<div class="sa-signup-actions">'+
        '<button type="button" data-copy-signup-link="'+esc(r.id)+'">📋 Copier le lien</button>'+
        '<a class="buttonlike" href="mailto:'+encodeURIComponent(r.email)+'?subject='+mailSubject+'&body='+mailBody+'">✉️ Préparer l’e-mail</a>'+
        (waHref?'<a class="buttonlike wa" target="_blank" rel="noopener" href="'+esc(waHref)+'">💬 WhatsApp</a>':'<button type="button" disabled title="Aucun téléphone renseigné">💬 WhatsApp</button>')+
        '<button type="button" data-copy-signup-message="'+esc(r.id)+'">📝 Copier le message</button>'+
        '<button type="button" data-regenerate-signup="'+esc(r.id)+'">↻ Nouveau lien</button>'+
      '</div></div>';
  }).join('');
}

function renderSuperAdminIdentityDisputes(){
  const box=$('#saIdentityDisputesList');if(!box)return;const rows=S.superIdentityDisputes||[];const pill=$('#saIdentityDisputeCount');if(pill)pill.textContent=rows.length+' litige'+(rows.length>1?'s':'');
  if(!rows.length){box.innerHTML='<div class="muted">Aucun conflit d’identité en attente.</div>';return;}
  box.innerHTML=rows.map(r=>'<div class="identity-dispute-row"><div><b>'+esc(r.player_name)+'</b><div class="muted">'+esc(r.workspace_name)+' • signalé le '+new Date(r.created_at).toLocaleString('fr-FR')+'</div><div class="small" style="margin-top:5px"><b>Compte déjà lié :</b> '+esc(r.conflict_player_id||'—')+' • '+esc(r.conflict_email||'—')+'<br><b>Nouveau demandeur :</b> '+esc(r.claimant_player_id||'—')+' • '+esc(r.claimant_email||'—')+'</div></div><div class="identity-dispute-actions"><button data-resolve-identity="existing_valid" data-claim-id="'+esc(r.claim_id)+'">Garder le compte existant</button><button data-resolve-identity="claimant_valid" data-claim-id="'+esc(r.claim_id)+'">Valider le demandeur</button><button data-resolve-identity="no_fraud" data-claim-id="'+esc(r.claim_id)+'">Lever le blocage sans liaison</button></div></div>').join('');
}

function renderSuperAdminPlayers(){
  const box=$('#saPlayersList');if(!box)return;
  const all=S.superPlayers||[];
  const q=($('#saSearchPlayer')?.value||'').trim().toLowerCase();
  const rows=all.filter(r=>!q||[r.display_name,r.public_player_id,r.email,r.phone_number,r.home_area].some(v=>String(v||'').toLowerCase().includes(q)));
  const pill=$('#saPlayersCountPill');if(pill)pill.textContent=all.length+' profil'+(all.length>1?'s':'');
  const stats=$('#saPlayerStats');if(stats)stats.innerHTML=
    '<div><span>👤</span><b>'+all.length+'</b><small>Identités SWÉ</small></div>'+
    '<div><span>✅</span><b>'+all.filter(r=>r.consent_accepted).length+'</b><small>Consentements à jour</small></div>'+
    '<div><span>⏳</span><b>'+all.filter(r=>!r.consent_accepted).length+'</b><small>À régulariser</small></div>'+
    '<div><span>🌍</span><b>'+all.filter(r=>r.discoverable).length+'</b><small>Disponibles annuaire</small></div>';
  box.innerHTML='';
  if(!rows.length){box.innerHTML='<div class="muted">Aucun joueur ne correspond à la recherche.</div>';return;}
  const accessByPlayer=new Map((S.superPlayerAccountAccess||[]).map(a=>[String(a.global_player_id),a]));
  box.innerHTML=rows.map(r=>{const links=Array.isArray(r.staff_links)?r.staff_links:[],access=accessByPlayer.get(String(r.global_player_id)),enabled=!!access?.enabled;return '<div class="sa-player-row">'+
    '<div class="sa-player-main"><div class="row" style="justify-content:flex-start;gap:7px;flex-wrap:wrap"><b>'+esc(r.display_name||'Joueur SWÉ')+'</b><span class="player-id-mini">'+esc(r.public_player_id||'—')+'</span><span class="guest-badge '+(r.consent_accepted?'consent-ok':'consent-pending')+'">'+(r.consent_accepted?'CONSENTEMENT OK':'À VALIDER')+'</span><span class="guest-badge identity-'+esc(r.identity_status||'active')+'">'+((r.identity_status||'active')==='active'?'IDENTITÉ OK':(r.identity_status==='review'?'VÉRIFICATION':'SUSPENDU'))+'</span></div>'+
    '<div class="muted">📧 '+esc(r.email||'—')+(r.phone_number?' • 📱 '+esc(r.phone_number):'')+(r.home_area?' • 📍 '+esc(r.home_area):'')+'</div></div>'+
    '<div class="sa-player-meta"><span><b>'+Number(r.groups_count||0)+'</b> groupe(s)</span><span><b>'+Number(r.local_profiles_count||0)+'</b> profil(s) lié(s)</span><span>'+(r.is_public?'🌐 Public':'🔒 Privé')+'</span><span>'+(r.discoverable?'🔎 Annuaire':'Annuaire désactivé')+'</span></div>'+     '<div class="row" style="justify-content:flex-start;gap:9px;margin:8px 0"><button type="button" data-sa-player-account-access="'+esc(access?.user_id||'')+'" data-next="'+(!enabled)+'" '+(!access?.user_id?'disabled':'')+' class="'+(enabled?'primary':'')+'">'+(enabled?'✓ Compte joueur autorisé':'Autoriser le compte joueur')+'</button><span class="guest-badge">'+(enabled?'ACCÈS TEST ACTIF':'ACCÈS FERMÉ')+'</span></div>'+
    (links.length?'<div class="sa-staff-links"><b>🔗 Liaison organisateur / membre</b>'+links.map(l=>'<div class="sa-staff-link"><span><b>'+esc(l.player_name)+'</b> • '+esc(l.workspace_name)+' <small>('+esc(l.role)+')</small></span><button class="danger" data-sa-unlink-staff data-workspace-id="'+esc(l.workspace_id)+'" data-user-id="'+esc(l.user_id)+'" data-player-id="'+esc(l.player_id)+'" data-player-name="'+esc(l.player_name)+'">Délier</button></div>').join('')+'</div>':'')+
    (r.consent_accepted_at?'<div class="small muted">Consentement : '+new Date(r.consent_accepted_at).toLocaleString('fr-FR')+'</div>':'')+
  '</div>'}).join('');
}

function renderSuperAdminWorkspaces(){
  const box=$('#saWorkspaceList');if(!box)return;
  const q=($('#saSearchWorkspace')?.value||'').trim().toLowerCase();
  const mode=$('#saWorkspaceFilter')?.value||'all';
  const all=S.superWorkspaces||[];
  const matchesMode=w=>{
    const paid=['standard','pro'].includes(String(w.subscription_plan||'free'))||!!w.special_access_enabled;
    const trial=!!w.trial_ends_at&&new Date(w.trial_ends_at)>new Date();
    if(mode==='paid')return paid;
    if(mode==='trial')return trial&&!paid;
    if(mode==='free')return !paid;
    if(mode==='multi'){
      const a=(S.superAccountAccesses||[]).filter(x=>String(x.user_id)===String(w.owner_user_id));
      return a.filter(x=>x.role==='admin').length>1||a.filter(x=>x.role==='coorganizer').length>0;
    }
    if(mode==='suspended')return !w.public_enabled;
    return true;
  };
  const rows=all.filter(w=>matchesMode(w)&&(!q||
    String(w.workspace_name||'').toLowerCase().includes(q)||
    String(w.owner_email||'').toLowerCase().includes(q)||
    String(w.admin_first_name||'').toLowerCase().includes(q)||
    String(w.admin_last_name||'').toLowerCase().includes(q)||
    String(w.admin_phone||'').toLowerCase().includes(q)));

  const owners=new Map();all.forEach(w=>owners.set(String(w.owner_user_id),w));
  const accessRows=S.superAccountAccesses||[];
  const accessByUser=new Map();
  accessRows.forEach(a=>{const k=String(a.user_id||'');if(!accessByUser.has(k))accessByUser.set(k,[]);accessByUser.get(k).push(a);});
  if($('#saTotalSpaces'))$('#saTotalSpaces').textContent=all.length;
  if($('#saActiveSpaces'))$('#saActiveSpaces').textContent=all.filter(w=>w.public_enabled).length;
  if($('#saSuspendedSpaces'))$('#saSuspendedSpaces').textContent=all.filter(w=>!w.public_enabled).length;
  if($('#saTotalPlayers'))$('#saTotalPlayers').textContent=all.reduce((n,w)=>n+Number(w.active_players||0),0);
  if($('#saTotalCompetitions'))$('#saTotalCompetitions').textContent=all.reduce((n,w)=>n+Number(w.tournament_count||0)+Number(w.league_count||0),0);
  if($('#saPaidSpaces'))$('#saPaidSpaces').textContent=all.filter(w=>['standard','pro'].includes(String(w.subscription_plan||'free'))||w.special_access_enabled).length;
  if($('#saTotalOrganizers'))$('#saTotalOrganizers').textContent=owners.size;
  if($('#saMultiOrganizers'))$('#saMultiOrganizers').textContent=[...owners.keys()].filter(uid=>{
    const a=accessByUser.get(uid)||[];
    return a.filter(x=>x.role==='admin').length>1||a.filter(x=>x.role==='coorganizer').length>0;
  }).length;

  box.innerHTML='';
  if(!rows.length){box.innerHTML='<p class="muted">'+(q?'Aucun espace ne correspond à la recherche.':'Aucun espace dans ce filtre.')+'</p>';return}

  const ownerBodies=new Map();
  const ensureOwnerGroup=w=>{
    const key=String(w.owner_user_id||w.owner_email||'unknown');
    if(ownerBodies.has(key))return ownerBodies.get(key);
    const accesses=accessByUser.get(String(w.owner_user_id))||[];
    const administered=accesses.filter(a=>a.role==='admin');
    const coManaged=accesses.filter(a=>a.role==='coorganizer');
    const owned=Number(w.owner_owned_spaces||0),limit=Number(w.owner_free_workspace_limit||1);
    const g=document.createElement('details');g.className='sa-owner-group';g.open=!!q||mode==='multi';
    const display=([w.admin_first_name,w.admin_last_name].filter(Boolean).join(' ')||w.owner_email||'Organisateur');
    const accessHtml='<div class="sa-account-access-map"><div class="sa-access-column"><b>👑 Groupes administrés</b>'+(administered.length?administered.map(a=>'<span><strong>'+esc(a.workspace_name)+'</strong><small>'+(a.is_owner?'Propriétaire':'Administrateur')+'</small></span>').join(''):'<span class="muted">Aucun</span>')+'</div><div class="sa-access-column"><b>🛠️ Groupes co-gérés</b>'+(coManaged.length?coManaged.map(a=>'<span><strong>'+esc(a.workspace_name)+'</strong><small>Co-gestionnaire uniquement</small></span>').join(''):'<span class="muted">Aucun</span>')+'</div></div>';
    g.innerHTML='<summary><span><b>👤 '+esc(display)+'</b><small>'+esc(w.owner_email||'')+'</small></span><span class="sa-owner-badges"><em>👑 '+administered.length+' administré'+(administered.length>1?'s':'')+'</em><em>🛠️ '+coManaged.length+' co-géré'+(coManaged.length>1?'s':'')+'</em><em class="'+(limit>1?'special':'')+'">Créations gratuites : '+owned+' / '+limit+'</em></span></summary>'+accessHtml+'<div class="sa-owner-tools"><div><b>Limite de groupes créés gratuitement</b><div class="muted small">Les groupes où ce compte est seulement co-gestionnaire ne comptent jamais dans cette limite.</div></div><input data-owner-limit type="number" min="1" max="100" value="'+limit+'"><input data-owner-note value="'+esc(w.owner_limit_note||'')+'" placeholder="Motif / note interne"><button data-owner-save>💾 Autoriser</button></div><div class="sa-owner-workspaces"></div>';
    const body=g.querySelector('.sa-owner-workspaces');
    g.querySelector('[data-owner-save]').onclick=async()=>{
      const btn=g.querySelector('[data-owner-save]'),val=Math.max(1,Number(g.querySelector('[data-owner-limit]').value)||1),note=g.querySelector('[data-owner-note]').value.trim();
      btn.disabled=true;const {error}=await sb.rpc('super_admin_set_organizer_free_workspace_limit',{p_user_id:w.owner_user_id,p_limit:val,p_note:note||null});btn.disabled=false;
      if(error)return toast(error.message);toast('Limite organisateur mise à jour ✅');await loadSuperAdminWorkspaces();
    };
    box.appendChild(g);ownerBodies.set(key,body);return body;
  };

  rows.forEach(w=>{
    const d=document.createElement('div');d.className='sa-workspace-card';
    const created=w.created_at?new Date(w.created_at).toLocaleDateString('fr-FR'):'—';
    d.innerHTML=
      '<div class="row" style="align-items:flex-start;gap:12px;flex-wrap:wrap">'+
        '<span style="flex:1;min-width:220px">'+
          '<div class="row" style="justify-content:flex-start;gap:8px;flex-wrap:wrap"><b style="font-size:1.08rem">'+esc(w.workspace_name)+'</b><span class="guest-badge">'+(w.public_enabled?'ACTIF':'SUSPENDU')+'</span></div>'+
          '<div class="muted" style="margin-top:4px">👤 Administrateur : <b>'+esc(([w.admin_first_name,w.admin_last_name].filter(Boolean).join(' ')||w.owner_email||'Non renseigné'))+'</b></div>'+
          '<div class="muted">📧 '+esc(w.owner_email||'Email indisponible')+(w.admin_phone?' • 📱 '+esc(w.admin_phone):'')+'</div>'+
          '<div class="muted">Créé le '+esc(created)+'</div>'+
        '</span>'+
      '</div>'+
      '<div class="grid g3" style="margin-top:12px">'+
        '<div class="player"><div class="muted">Membres actifs</div><b>'+Number(w.active_players||0)+'</b></div>'+
        '<div class="player"><div class="muted">Co-gestionnaires</div><b>'+Number(w.active_coorganizers||0)+' / '+Number(w.max_coorganizers||0)+'</b><div class="muted small">'+Number(w.base_max_coorganizers||0)+' offert(s) + '+Number(w.paid_coorganizers||0)+' acheté(s)</div></div>'+
        '<div class="player"><div class="muted">Compétitions</div><b>'+Number(w.tournament_count||0)+' tournoi(x) • '+Number(w.league_count||0)+' ligue(s)</b></div>'+
      '</div>'+
      '<div style="height:1px;background:#e8ecef;margin:14px 0"></div>'+
      '<div class="grid g2">'+
        '<label><span class="muted">Nom de l’espace</span><input data-sa-name value="'+esc(w.workspace_name)+'"></label>'+
        '<label><span class="muted">Email administrateur</span><input readonly value="'+esc(w.owner_email||'')+'" style="opacity:.75"></label>'+
      '</div>'+
      '<div class="grid g3" style="margin-top:10px">'+
        '<label><span class="muted">Prénom administrateur</span><input data-sa-first-name value="'+esc(w.admin_first_name||'')+'" placeholder="Prénom"></label>'+
        '<label><span class="muted">Nom administrateur</span><input data-sa-last-name value="'+esc(w.admin_last_name||'')+'" placeholder="Nom"></label>'+
        '<label><span class="muted">Téléphone administrateur</span><input data-sa-phone type="tel" inputmode="tel" value="'+esc(w.admin_phone||'')+'" placeholder="Téléphone"></label>'+
      '</div>'+
      '<div class="row" style="margin-top:8px"><button data-sa-save-profile>💾 Enregistrer nom / prénom</button><span class="muted">Modifie uniquement l’identité affichée de l’administrateur, sans changer son compte de connexion.</span></div>'+
      '<div class="grid g3" style="margin-top:10px">'+
        '<label><span class="muted">Co-gestionnaires offerts par le Super Admin</span><input data-sa-max type="number" min="0" max="1000" value="'+Number((w.base_max_coorganizers ?? 0) || 0)+'"><small class="muted">S’ajoutent aux accès achetés par le client.</small></label>'+
        '<div class="player" style="background:#f0fdf4;border-color:#bbf7d0"><b>🎁 '+Number(w.base_max_coorganizers||0)+' offert(s) • 💳 '+Number(w.paid_coorganizers||0)+' acheté(s)</b><div class="muted" style="margin-top:4px">Capacité totale calculée automatiquement : '+Number(w.max_coorganizers||0)+' co-gestionnaire(s).</div></div>'+
        '<label class="player row" style="justify-content:flex-start"><input data-sa-public type="checkbox" style="width:auto" '+(w.public_enabled?'checked':'')+'><span><b>Espace actif</b></span></label>'+
      '</div>'+
      '<div class="sa-settings-block">'+
        '<div class="sa-block-title"><div><b>🧩 Modules & dépendances</b><span>Les options sont automatiquement coupées lorsqu’aucun module compétition n’est actif.</span></div></div>'+
        '<div class="sa-module-grid">'+
          '<label class="sa-module-toggle"><input data-sa-tournament type="checkbox" '+(w.tournaments_enabled?'checked':'')+'><span><b>🏆 Tournoi</b><small>Module compétition principal</small></span></label>'+
          '<label class="sa-module-toggle"><input data-sa-league type="checkbox" '+(w.league_enabled?'checked':'')+'><span><b>🏁 Ligue</b><small>Module compétition récurrent</small></span></label>'+
          '<label class="sa-module-toggle dependent"><input data-sa-rankings type="checkbox" '+(w.rankings_enabled?'checked':'')+'><span><b>⚽ Buteurs / passeurs</b><small>Requiert Tournoi ou Ligue</small></span></label>'+
        '</div>'+
        '<div class="sa-linked-options">'+
          '<div class="sa-linked-option top"><span>⭐</span><div><b>Top Player & notes de match</b><small>Inclus avec STANDARD et PRO. Requiert un module compétition actif.</small></div><strong data-sa-top-status>'+(w.top_player_enabled?'ACTIF':'INACTIF')+'</strong></div>'+
          '<div class="sa-linked-option third"><span>🍻</span><div><b>3e mi-temps</b><small>Incluse avec PRO. Requiert un module compétition actif.</small></div><strong data-sa-third-status>'+(w.third_half_enabled?'ACTIF':'INACTIF')+'</strong></div>'+
          '<div class="sa-linked-option review"><span>🗳️</span><div><b>Validation collaborative des équipes</b><small>Incluse avec STANDARD/PRO. Les co-gestionnaires présents peuvent valider ou demander un nouveau tirage pendant 2 h.</small></div><strong>'+(w.team_review_enabled?'ACTIF':'INACTIF')+'</strong></div>'+
        '</div>'+
      '</div>'+
      '<div class="sa-commercial-block">'+
        '<div class="sa-block-title"><div><b>💎 Offre commerciale</b><span>Le choix de l’offre pilote automatiquement les modules premium.</span></div><span class="sa-plan-chip '+esc(String(w.subscription_plan||'free'))+'">'+esc(String(w.subscription_plan||'free').toUpperCase())+'</span></div>'+
        '<div class="grid g2" style="margin-top:12px"><label><span class="muted">Offre</span><select data-sa-plan><option value="free" '+((w.subscription_plan||'free')==='free'?'selected':'')+'>FREE — Gestion essentielle</option><option value="standard" '+(w.subscription_plan==='standard'?'selected':'')+'>STANDARD — Top Player inclus</option><option value="pro" '+(w.subscription_plan==='pro'?'selected':'')+'>PRO — Top Player + 3e mi-temps</option></select></label><label class="sa-special-toggle"><input data-sa-special-access type="checkbox" '+(w.special_access_enabled?'checked':'')+'><span><b>🎁 Accès spécial</b><small>Débloque les options premium pour démo / ambassadeur.</small></span></label></div><label class="sa-special-toggle team-review-gift"><input data-sa-team-review-gift type="checkbox" '+(w.team_review_gifted?'checked':'')+'><span><b>🗳️ Offrir validation du tirage</b><small>Active uniquement cette option même sans abonnement payant.</small></span></label>'+
        '<div class="sa-offer-map"><span>FREE <b>Base</b></span><span>STANDARD <b>+ Top Player</b></span><span>PRO <b>+ Top Player + 3e mi-temps</b></span></div>'+
        (w.upgrade_requested_at?'<div class="sa-upgrade-alert"><b>🔔 Demande d’upgrade reçue</b><span>'+new Date(w.upgrade_requested_at).toLocaleString('fr-FR')+'</span></div>':'')+
      '</div>'+

      '<div class="player" style="margin-top:14px;background:#fffaf0;border:1px solid #f2d79a">'+
        '<b>🔄 Transférer la gestion à un autre administrateur</b>'+
        '<div class="muted" style="margin:5px 0 10px">Le nouveau compte doit déjà exister. Après validation, il devient immédiatement administrateur principal de cet espace.</div>'+
        '<div class="grid g2"><input data-sa-transfer-email type="email" placeholder="Email du nouvel administrateur"><input data-sa-transfer-phone type="tel" inputmode="tel" placeholder="Téléphone du nouvel administrateur"></div>'+
        '<div class="grid g2" style="margin-top:8px"><input data-sa-transfer-first placeholder="Prénom du nouvel administrateur"><input data-sa-transfer-last placeholder="Nom du nouvel administrateur"></div>'+
        '<label class="row" style="justify-content:flex-start;margin-top:10px"><input data-sa-keep-old type="checkbox" style="width:auto"><span>Conserver l’ancien administrateur comme co-organisateur</span></label>'+
        '<div class="muted" style="margin-top:5px">Sinon, son accès à cet espace sera désactivé. Son compte utilisateur n’est jamais supprimé.</div>'+
        '<button data-sa-transfer class="danger" style="margin-top:10px">Transférer l’administration</button>'+
      '</div>';

    refreshWorkspaceDependencyUI(d);
    const profileSave=d.querySelector('[data-sa-save-profile]');
    profileSave.onclick=async()=>{
      profileSave.disabled=true;
      const {error}=await sb.rpc('super_admin_update_admin_profile',{
        p_workspace_id:w.workspace_id,
        p_first_name:d.querySelector('[data-sa-first-name]').value.trim()||null,
        p_last_name:d.querySelector('[data-sa-last-name]').value.trim()||null,
        p_phone:d.querySelector('[data-sa-phone]').value.trim()||null
      });
      profileSave.disabled=false;
      if(error)return toast(error.message);
      toast('Nom et prénom de l’administrateur mis à jour ✅');
      await loadSuperAdminWorkspaces();
    };

    const actions=document.createElement('div');actions.className='row';actions.style.marginTop='12px';actions.style.flexWrap='wrap';

    const save=document.createElement('button');save.className='primary';save.textContent='💾 Enregistrer';
    save.onclick=async()=>{
      const max=Number(d.querySelector('[data-sa-max]').value)||0;
      const name=d.querySelector('[data-sa-name]').value.trim();
      if(!name)return toast('Le nom de l’espace est obligatoire.');
      save.disabled=true;
      let r=await sb.rpc('super_admin_rename_workspace',{p_workspace_id:w.workspace_id,p_name:name});
      if(!r.error)r=await sb.rpc('super_admin_update_admin_profile',{
        p_workspace_id:w.workspace_id,
        p_first_name:d.querySelector('[data-sa-first-name]').value.trim()||null,
        p_last_name:d.querySelector('[data-sa-last-name]').value.trim()||null,
        p_phone:d.querySelector('[data-sa-phone]').value.trim()||null
      });
      if(!r.error)r=await sb.rpc('super_admin_set_commercial_access_v2',{p_workspace_id:w.workspace_id,p_subscription_plan:d.querySelector('[data-sa-plan]').value,p_special_access_enabled:d.querySelector('[data-sa-special-access]').checked});
      if(!r.error)r=await sb.rpc('super_admin_set_workspace_options_v2',{
        p_workspace_id:w.workspace_id,
        p_max_coorganizers:Number(w.max_coorganizers||0),
        p_max_coorganizers_cap:Number(w.max_coorganizers_cap||1000),
        p_tournaments_enabled:d.querySelector('[data-sa-tournament]').checked,
        p_league_enabled:d.querySelector('[data-sa-league]').checked,
        p_rankings_enabled:d.querySelector('[data-sa-rankings]').checked,
        p_public_enabled:d.querySelector('[data-sa-public]').checked
      });
      if(!r.error)r=await sb.rpc('super_admin_set_team_review_gift',{p_workspace_id:w.workspace_id,p_enabled:!!d.querySelector('[data-sa-team-review-gift]')?.checked});
      if(!r.error)r=await sb.rpc('super_admin_grant_coorganizer_slots',{p_workspace_id:w.workspace_id,p_base_max_coorganizers:max});
      save.disabled=false;if(r.error)return toast(r.error.message);
      toast('Espace mis à jour ✅');await loadSuperAdminWorkspaces();
    };

    const copy=document.createElement('button');copy.textContent='📧 Copier email admin';
    copy.onclick=async()=>{try{await navigator.clipboard.writeText(w.owner_email||'');toast('Email administrateur copié ✅')}catch(e){toast('Copie impossible')}};

    const toggle=document.createElement('button');toggle.textContent=w.public_enabled?'⏸ Suspendre':'▶ Réactiver';
    if(w.public_enabled)toggle.className='danger';
    toggle.onclick=async()=>{
      const verb=w.public_enabled?'suspendre':'réactiver';
      if(!confirm('Confirmer : '+verb+' l’espace « '+w.workspace_name+' » ?'))return;
      toggle.disabled=true;
      const {error}=await sb.rpc('super_admin_set_workspace_options_v2',{
        p_workspace_id:w.workspace_id,
        p_max_coorganizers:Number(w.max_coorganizers||0),
        p_max_coorganizers_cap:Number(w.max_coorganizers_cap||100),
        p_tournaments_enabled:!!w.tournaments_enabled,
        p_league_enabled:!!w.league_enabled,
        p_rankings_enabled:!!w.rankings_enabled,
        p_public_enabled:!w.public_enabled
      });
      toggle.disabled=false;if(error)return toast(error.message);
      toast(w.public_enabled?'Espace suspendu.':'Espace réactivé ✅');await loadSuperAdminWorkspaces();
    };

    const transferBtn=d.querySelector('[data-sa-transfer]');
    transferBtn.onclick=async()=>{
      const email=d.querySelector('[data-sa-transfer-email]').value.trim().toLowerCase();
      const first=d.querySelector('[data-sa-transfer-first]').value.trim();
      const last=d.querySelector('[data-sa-transfer-last]').value.trim();
      const phone=d.querySelector('[data-sa-transfer-phone]').value.trim();
      const keep=d.querySelector('[data-sa-keep-old]').checked;
      if(!email)return toast('Indique l’email du nouvel administrateur.');
      const display=[first,last].filter(Boolean).join(' ')||email;
      const msg='TRANSFERT D’ADMINISTRATION\n\nEspace : '+w.workspace_name+'\nAdministrateur actuel : '+(w.owner_email||'—')+'\nNouvel administrateur : '+display+' ('+email+')\n\n'+(keep?'L’ancien administrateur restera co-organisateur.':'L’accès de l’ancien administrateur à cet espace sera désactivé.')+'\n\nConfirmer le transfert ?';
      if(!confirm(msg))return;
      const typed=prompt('Pour sécuriser le transfert, saisis exactement TRANSFERER');
      if(typed!=='TRANSFERER')return toast('Transfert annulé.');
      transferBtn.disabled=true;
      const {error}=await sb.rpc('super_admin_transfer_workspace_admin',{
        p_workspace_id:w.workspace_id,
        p_new_owner_email:email,
        p_first_name:first||null,
        p_last_name:last||null,
        p_phone:phone||null,
        p_keep_previous_as_coorganizer:keep
      });
      transferBtn.disabled=false;
      if(error)return toast(error.message);
      toast('Administration transférée avec succès ✅');
      await loadSuperAdminWorkspaces();
    };

    const del=document.createElement('button');del.className='danger';del.textContent='🗑 Supprimer l’espace';
    del.onclick=async()=>{
      const ok=confirm('SUPPRESSION DÉFINITIVE\\n\\nSupprimer l’espace « '+w.workspace_name+' » et toutes ses données sportives ?\\n\\nLe compte de connexion de l’administrateur ne sera pas supprimé.');
      if(!ok)return;
      const typed=prompt('Pour confirmer, saisis exactement le nom de l’espace :\\n'+w.workspace_name);
      if(typed!==w.workspace_name)return toast('Suppression annulée : nom incorrect.');
      del.disabled=true;
      const {error}=await sb.rpc('super_admin_delete_workspace',{p_workspace_id:w.workspace_id});
      del.disabled=false;if(error)return toast(error.message);
      toast('Espace supprimé définitivement.');await loadSuperAdminWorkspaces();
    };

    actions.append(save,copy,toggle,del);d.appendChild(actions);ensureOwnerGroup(w).appendChild(d);
  });
}
async function initSuperAdmin(){
  const testId=new URLSearchParams(location.search).get('test_tournament');
  if(testId){
    const {data,error}=await sb.rpc('super_admin_manage_test_tournament',{p_tournament_id:testId,p_action:'open'});
    if(error||!data?.workspace_id){toast(error?.message||'Tournoi test indisponible.');return true;}
    S.testAdminContext=data;S.isSuperAdmin=false;return false;
  }
  const claim=await sb.rpc('claim_platform_super_admin');
  if(claim.error)console.warn('claim super admin',claim.error);
  const check=await sb.rpc('is_platform_super_admin');
  S.isSuperAdmin=!check.error&&check.data===true;
  if(!S.isSuperAdmin)return false;
  $('#superAdminPanel').classList.remove('hidden');
  $('#workspaceSetup').classList.add('hidden');
  document.querySelectorAll('.view,.tabs').forEach(el=>el.classList.add('hidden'));
  $('#workspaceName').textContent='Super administrateur de la plateforme';
  await loadSuperAdminWorkspaces();
  await loadSportsVenues();
  refreshSuperAdminCreateDependencies();
  return true;
}
document.addEventListener('input',e=>{
  if(e.target?.id==='saSearchWorkspace')renderSuperAdminWorkspaces();
  if(e.target?.id==='saSearchPlayer')renderSuperAdminPlayers();
});
document.addEventListener('change',e=>{if(e.target?.id==='saWorkspaceFilter')renderSuperAdminWorkspaces();});
document.addEventListener('click',async e=>{
  const rb=e.target?.closest?.('[data-resolve-identity]');if(rb){const label=rb.dataset.resolveIdentity==='existing_valid'?'garder le compte déjà lié':rb.dataset.resolveIdentity==='claimant_valid'?'attribuer le joueur au nouveau demandeur':'lever le blocage sans modifier la liaison';if(!confirm('Confirmer : '+label+' ?'))return;rb.disabled=true;const {error}=await sb.rpc('super_admin_resolve_identity_dispute',{p_claim_id:rb.dataset.claimId,p_resolution:rb.dataset.resolveIdentity});rb.disabled=false;if(error)return toast(error.message);toast('Conflit d’identité traité ✅');await loadSuperAdminWorkspaces();return;}
  if(!e.target?.matches?.('[data-sa-unlink-staff]'))return;
  const b=e.target;const playerName=b.dataset.playerName||'ce joueur';
  if(!confirm('Délier définitivement « '+playerName+' » de ce compte organisateur ? Ses statistiques resteront dans le groupe mais ne seront plus rattachées à cet ID SWÉ.'))return;
  b.disabled=true;
  const {error}=await sb.rpc('super_admin_unlink_staff_player',{p_workspace_id:b.dataset.workspaceId,p_user_id:b.dataset.userId,p_player_id:b.dataset.playerId});
  b.disabled=false;if(error)return toast(error.message);
  toast('Liaison supprimée par le Super Admin.');await loadSuperAdminWorkspaces();
});
function refreshSuperAdminCreateDependencies(){
  const competition=!!($('#saTournamentEnabled')?.checked||$('#saLeagueEnabled')?.checked);
  const rankings=$('#saRankingsEnabled');if(rankings){rankings.disabled=!competition;if(!competition)rankings.checked=false;}
  const plan=$('#saNewPlan')?.value||'free',preview=$('#saNewPlanPreview');
  if(preview){const map={free:['FREE','Top Player et 3e mi-temps non inclus.'],standard:['STANDARD','Top Player & notes de match inclus.'],pro:['PRO','Top Player, notes de match et 3e mi-temps inclus.']};const m=map[plan];preview.innerHTML='<b>'+m[0]+'</b><span>'+m[1]+(competition?'':' Active Tournoi ou Ligue pour utiliser les options liées.')+'</span>';}
}
function refreshWorkspaceDependencyUI(card){
  if(!card)return;
  const competition=!!(card.querySelector('[data-sa-tournament]')?.checked||card.querySelector('[data-sa-league]')?.checked);
  const rank=card.querySelector('[data-sa-rankings]');if(rank){rank.disabled=!competition;if(!competition)rank.checked=false;}
  const plan=card.querySelector('[data-sa-plan]')?.value||'free',special=!!card.querySelector('[data-sa-special-access]')?.checked;
  const topAllowed=competition&&(special||plan==='standard'||plan==='pro');
  const thirdAllowed=competition&&(special||plan==='pro');
  const top=card.querySelector('[data-sa-top-status]');if(top){top.textContent=topAllowed?'ACTIF':'INACTIF';top.classList.toggle('on',topAllowed);}
  const third=card.querySelector('[data-sa-third-status]');if(third){third.textContent=thirdAllowed?'ACTIF':'INACTIF';third.classList.toggle('on',thirdAllowed);}
}
document.addEventListener('change',async e=>{
  if(e.target?.id==='tourComplex')renderTournamentPitchChoices();
  if(e.target?.id==='leagueSessionComplex')renderLeaguePitchSelect();
  if(e.target?.id==='saSaveFooter'){const b=e.target;b.disabled=true;const q={p_enabled:$('#saFooterEnabled')?.checked!==false,p_company_name:$('#saFooterCompany')?.value.trim()||null,p_legal_text:$('#saFooterLegalText')?.value.trim()||null,p_contact_email:$('#saFooterEmail')?.value.trim()||null,p_legal_url:$('#saFooterLegalUrl')?.value.trim()||null,p_privacy_url:$('#saFooterPrivacyUrl')?.value.trim()||null,p_terms_url:$('#saFooterTermsUrl')?.value.trim()||null};const {error}=await sb.rpc('super_admin_save_footer',q);b.disabled=false;if(error)return toast(error.message);S.platformSettings={...S.platformSettings,footer_enabled:q.p_enabled,footer_company_name:q.p_company_name,footer_legal_text:q.p_legal_text,footer_contact_email:q.p_contact_email,footer_legal_url:q.p_legal_url,footer_privacy_url:q.p_privacy_url,footer_terms_url:q.p_terms_url};renderPlatformFooter();toast('Pied de page mis à jour ✅');return;}if(e.target?.id==='saPreviewFooter'){const b=$('#saFooterPreview');b.classList.toggle('hidden');b.innerHTML='<div class="readonly-note"><b>Structure conseillée :</b> raison sociale + contact + liens Mentions légales / Confidentialité / CGU-CGV. Garde le texte court et renvoie vers des pages dédiées.</div>';return;}if(e.target?.id==='saConsentGateEnabled'){const enabled=e.target.checked;const {error}=await sb.rpc('super_admin_set_consent_gate',{p_enabled:enabled});if(error){e.target.checked=!enabled;return toast(error.message)}S.platformSettings.consent_gate_enabled=enabled;const l=$('#saConsentGateLabel');if(l)l.textContent=enabled?'Visible / obligatoire':'Masqué';toast(enabled?'Consentement affiché aux joueurs ✅':'Consentement masqué pour les joueurs.');}
  if(['saTournamentEnabled','saLeagueEnabled','saNewPlan'].includes(e.target?.id))refreshSuperAdminCreateDependencies();
  if(e.target?.matches?.('[data-sa-tournament],[data-sa-league],[data-sa-plan],[data-sa-special-access]'))refreshWorkspaceDependencyUI(e.target.closest('.sa-workspace-card'));
});
document.addEventListener('change',e=>{if(e.target?.id==='saWorkspaceFilter')renderSuperAdminWorkspaces();});
document.addEventListener('click',async e=>{
  const saTab=e.target?.closest?.('[data-sa-tab]');
  if(saTab){
    const section=saTab.dataset.saTab;document.querySelectorAll('[data-sa-tab]').forEach(b=>b.classList.toggle('active',b===saTab));
    $('#saSpacesSection')?.classList.toggle('hidden',section!=='spaces');$('#saPlayersSection')?.classList.toggle('hidden',section!=='players');
    if(section==='players')renderSuperAdminPlayers();return;
  }
  const playerAccessBtn=e.target?.closest?.('[data-sa-player-account-access]');
  if(playerAccessBtn){const uid=playerAccessBtn.dataset.saPlayerAccountAccess,next=playerAccessBtn.dataset.next==='true';if(!uid)return;playerAccessBtn.disabled=true;const {error}=await sb.rpc('super_admin_set_player_account_access_v1',{p_user_id:uid,p_enabled:next});playerAccessBtn.disabled=false;if(error)return toast(error.message);toast(next?'Compte joueur autorisé ✅':'Accès au compte joueur fermé.');await loadSuperAdminWorkspaces();return;}
  const copyLinkBtn=e.target?.closest?.('[data-copy-signup-link]');
  if(copyLinkBtn){const r=(S.superSignupRequests||[]).find(x=>String(x.id)===String(copyLinkBtn.dataset.copySignupLink));if(r){await navigator.clipboard.writeText(playerActivationLink(r.activation_token));toast('Lien d’activation copié ✅');}return;}
  const copyMsgBtn=e.target?.closest?.('[data-copy-signup-message]');
  if(copyMsgBtn){const r=(S.superSignupRequests||[]).find(x=>String(x.id)===String(copyMsgBtn.dataset.copySignupMessage));if(r){await navigator.clipboard.writeText(signupInviteMessage(r));toast('Message copié ✅');}return;}
  const regenBtn=e.target?.closest?.('[data-regenerate-signup]');
  if(regenBtn){if(!confirm('Créer un nouveau lien ? L’ancien ne fonctionnera plus.'))return;regenBtn.disabled=true;const {error}=await sb.rpc('super_admin_regenerate_player_signup_link',{p_request_id:regenBtn.dataset.regenerateSignup});regenBtn.disabled=false;if(error)return toast(error.message);await loadSuperAdminWorkspaces();toast('Nouveau lien généré ✅');return;}
  if(e.target?.dataset?.saApproveCoorgRequest){
    const b=e.target;b.disabled=true;
    const {error}=await sb.rpc('super_admin_resolve_coorganizer_quota_request',{p_request_id:b.dataset.saApproveCoorgRequest,p_approve:true});
    b.disabled=false;if(error)return toast(error.message);
    toast('Demande acceptée ✅');await loadSuperAdminWorkspaces();return;
  }
  if(e.target?.dataset?.saRejectCoorgRequest){
    const b=e.target;b.disabled=true;
    const {error}=await sb.rpc('super_admin_resolve_coorganizer_quota_request',{p_request_id:b.dataset.saRejectCoorgRequest,p_approve:false});
    b.disabled=false;if(error)return toast(error.message);
    toast('Demande refusée.');await loadSuperAdminWorkspaces();return;
  }
  if(e.target?.id==='saRefresh')await loadSuperAdminWorkspaces();
  if(e.target?.id==='saRefreshVenues')await loadSportsVenues();
  if(e.target?.id==='saAddComplex'){
    const name=$('#saNewComplexName').value.trim(),city=$('#saNewComplexCity').value.trim();
    if(!name)return toast('Indique le nom du complexe.');
    const {error}=await sb.rpc('super_admin_manage_sports_complex',{p_action:'create',p_name:name,p_city:city||null,p_active:true});
    if(error)return toast(error.message);
    $('#saNewComplexName').value='';$('#saNewComplexCity').value='';
    await loadSportsVenues();toast('Complexe ajouté ✅');
  }
  if(e.target?.id==='saCreateWorkspace'){
    const name=$('#saWorkspaceName').value.trim(),email=$('#saOwnerEmail').value.trim().toLowerCase();
    if(!name||!email)return toast('Indique le nom de l’espace et l’e-mail de son administrateur.');
    const first=$('#saOwnerFirstName').value.trim(),last=$('#saOwnerLastName').value.trim(),phone=$('#saOwnerPhone').value.trim();
    const b=e.target;b.disabled=true;
    const created=await sb.rpc('super_admin_create_workspace_for_admin',{
      p_name:name,p_owner_email:email,
      p_max_coorganizers:Math.max(0,Math.min(100,Number($('#saMaxCoorg').value)||0)),
      p_tournaments_enabled:$('#saTournamentEnabled').checked,
      p_league_enabled:$('#saLeagueEnabled').checked,
      p_rankings_enabled:$('#saRankingsEnabled').checked
    });
    if(created.error){b.disabled=false;return toast(created.error.message)}
    const profile=await sb.rpc('super_admin_update_admin_profile',{
      p_workspace_id:created.data,p_first_name:first||null,p_last_name:last||null,p_phone:phone||null
    });
    if(profile.error){b.disabled=false;return toast('Espace créé, mais fiche administrateur à compléter : '+profile.error.message)}
    const plan=$('#saNewPlan')?.value||'free';
    let commercial=await sb.rpc('super_admin_set_commercial_access_v2',{p_workspace_id:created.data,p_subscription_plan:plan,p_special_access_enabled:false});
    const gifted=Math.max(0,Math.min(1000,Number($('#saMaxCoorg').value)||0));
    if(!commercial.error)commercial=await sb.rpc('super_admin_set_workspace_options_v2',{p_workspace_id:created.data,p_max_coorganizers:gifted,p_max_coorganizers_cap:1000,p_tournaments_enabled:$('#saTournamentEnabled').checked,p_league_enabled:$('#saLeagueEnabled').checked,p_rankings_enabled:$('#saRankingsEnabled').checked,p_public_enabled:true});
    if(!commercial.error)commercial=await sb.rpc('super_admin_grant_coorganizer_slots',{p_workspace_id:created.data,p_base_max_coorganizers:gifted});
    b.disabled=false;if(commercial.error)return toast('Espace créé, mais configuration commerciale à vérifier : '+commercial.error.message);
    $('#saWorkspaceName').value='';$('#saOwnerEmail').value='';$('#saOwnerFirstName').value='';$('#saOwnerLastName').value='';$('#saOwnerPhone').value='';
    toast('Espace administrateur créé ✅');await loadSuperAdminWorkspaces();
  }
});


async function loadThirdHalfFunds(){
  if(!S.workspace||!isAdmin()||!S.workspaceFeatures.third_half_enabled){S.thirdHalfFunds=[];S.thirdHalfPackages=[];renderThirdHalfFunds();return;}
  const {data,error}=await sb.rpc('get_admin_third_half_setup_v2',{p_workspace_id:S.workspace.id});
  if(error){toast(error.message);S.thirdHalfFunds=[];S.thirdHalfPackages=[];}
  else{S.thirdHalfFunds=Array.isArray(data?.tournaments)?data.tournaments:[];S.thirdHalfPackages=Array.isArray(data?.packages)?data.packages:[];}
  renderThirdHalfFunds();
}
function renderThirdHalfFunds(){
  const box=$('#coolerFundsList');if(!box)return;
  const rows=S.thirdHalfFunds||[];
  if(!rows.length){box.innerHTML='<div class="muted">Aucun Swé actif à administrer pour la glacière.</div>';return;}
  box.innerHTML=rows.map(r=>{
    const target=Number(r.target_amount_cents||0),collected=Number(r.collected_amount_cents||0),pct=target?Math.min(100,Math.round(collected/target*100)):0;
    const people=Array.isArray(r.eligible_responsibles)?r.eligible_responsibles:[];
    const responsibleOptions='<option value="">À désigner après une inscription…</option>'+people.map(p=>'<option value="'+esc(p.player_id)+'" '+(String(p.player_id)===String(r.responsible_player_id||'')?'selected':'')+'>'+esc(p.name)+(p.account_linked?' • compte SWÉ lié':' • compte à relier')+'</option>').join('');
    const packages=(S.thirdHalfPackages||[]).filter(p=>String(p.complex_id)===String(r.complex_id||''));
    const selected=new Set((r.selected_package_ids||[]).map(String));
    const packageHtml=packages.length?'<div class="cooler-package-grid">'+packages.map(p=>'<label class="cooler-package"><input type="checkbox" data-cooler-package="'+esc(p.id)+'" '+(selected.has(String(p.id))?'checked':'')+'><span><b>'+esc(p.name)+'</b><small>'+esc(p.description||'Pack partenaire')+' • '+euroCents(p.public_price_cents)+'</small></span></label>').join('')+'</div>':'<div class="muted">Aucun pack SWÉ actif pour ce complexe.</div>';
    return '<div class="cooler-fund" data-cooler-row="'+esc(r.tournament_id)+'"><div class="cooler-fund-head"><div><b>'+esc(r.tournament_name||'Swé')+'</b><div class="muted">📅 '+esc(r.tournament_date||'')+(r.complex_name?' • '+esc(r.complex_name):'')+'</div></div><span class="cooler-status '+esc(r.status||'draft')+'">'+esc(String(r.status||'draft').toUpperCase())+'</span></div><div class="cooler-progress"><span style="width:'+pct+'%"></span></div><div class="muted small" style="margin-top:5px">Collecté : <b>'+euroCents(collected)+'</b>'+(target?' / objectif '+euroCents(target):' • aucun objectif défini')+'</div><div class="cooler-owner-panel"><label><span class="muted">🧊 Responsable de la glacière</span><select data-cooler-responsible>'+responsibleOptions+'</select></label><div class="muted">Seul le compte SWÉ lié à ce joueur pourra enregistrer son lien personnel depuis la page d’inscription.</div></div><div class="grid g2"><label><span class="muted">Statut</span><select data-cooler-status><option value="draft" '+(r.status==='draft'?'selected':'')+'>Brouillon</option><option value="open" '+(r.status==='open'?'selected':'')+'>Ouverte</option><option value="paused" '+(r.status==='paused'?'selected':'')+'>En pause</option><option value="closed" '+(r.status==='closed'?'selected':'')+'>Clôturée</option></select></label><label><span class="muted">Solution de paiement</span><select data-cooler-provider><option value="">Le responsable la renseignera</option>'+['Revolut','PayPal','Sumeria','Lydia','Autre'].map(x=>'<option '+(r.provider===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label><span class="muted">Lien du responsable</span><input data-cooler-link type="url" maxlength="500" placeholder="https://..." value="'+esc(r.payment_link||'')+'"></label><label><span class="muted">Montant fixe par personne (€)</span><input data-cooler-suggested type="number" min="0" max="5" step="0.50" value="'+(Number(r.suggested_amount_cents||0)/100)+'"><small>Maximum autorisé : 5 €.</small></label><label><span class="muted">Objectif (€)</span><input data-cooler-target type="number" min="0" step="0.50" value="'+(target/100)+'"></label><label><span class="muted">Montant collecté (€)</span><input data-cooler-collected type="number" min="0" step="0.50" value="'+(collected/100)+'"></label></div><div class="cooler-pack-panel"><b>🥤 Packs partenaires proposés pendant l’inscription</b>'+packageHtml+'</div><label style="margin-top:10px"><span class="muted">Note admin</span><textarea data-cooler-notes rows="2" placeholder="Ex. boissons, glace, repas...">'+esc(r.notes||'')+'</textarea></label><label class="player row" style="justify-content:flex-start;margin-top:10px"><input data-cooler-share type="checkbox" style="width:auto" '+(r.share_enabled?'checked':'')+'><span><b>Partager le lien aux inscrits</b><div class="muted">Le lien apparaît uniquement lorsque le responsable l’a configuré.</div></span></label>'+(r.payment_link?'<div class="cooler-link-preview" style="margin-top:7px">🔗 '+esc(r.payment_link)+'</div>':'')+'<div class="row" style="margin-top:10px"><button class="primary" data-save-cooler>💾 Enregistrer</button>'+(r.payment_link?'<button data-copy-cooler-link>Copier le lien</button>':'')+'</div></div>';
  }).join('');
}
document.addEventListener('change',e=>{if(e.target?.id==='saWorkspaceFilter')renderSuperAdminWorkspaces();});
document.addEventListener('click',async e=>{
  if(e.target?.id==='refreshCoolerFunds'){await loadThirdHalfFunds();return;}
  const row=e.target?.closest?.('[data-cooler-row]');if(!row)return;
  if(e.target?.matches?.('[data-copy-cooler-link]')){const link=row.querySelector('[data-cooler-link]')?.value.trim();if(!link)return;try{await navigator.clipboard.writeText(link);toast('Lien de cagnotte copié ✅')}catch(_e){toast('Copie impossible')}return;}
  if(e.target?.matches?.('[data-save-cooler]')){
    const b=e.target;b.disabled=true;const cents=x=>Math.round(Math.max(0,Number(x?.value||0))*100);
    const amount=cents(row.querySelector('[data-cooler-suggested]'));if(amount>500){b.disabled=false;return toast('La participation glacière est limitée à 5 €.');}
    const packages=[...row.querySelectorAll('[data-cooler-package]:checked')].map(x=>x.dataset.coolerPackage);
    const {error}=await sb.rpc('admin_save_third_half_setup_v2',{p_tournament_id:row.dataset.coolerRow,p_status:row.querySelector('[data-cooler-status]').value,p_provider:row.querySelector('[data-cooler-provider]').value||null,p_payment_link:row.querySelector('[data-cooler-link]').value.trim()||null,p_target_amount_cents:cents(row.querySelector('[data-cooler-target]')),p_collected_amount_cents:cents(row.querySelector('[data-cooler-collected]')),p_suggested_amount_cents:amount,p_notes:row.querySelector('[data-cooler-notes]').value.trim()||null,p_share_enabled:row.querySelector('[data-cooler-share]').checked,p_selected_package_ids:packages,p_responsible_player_id:row.querySelector('[data-cooler-responsible]').value||null});
    b.disabled=false;if(error)return toast(error.message);toast('Glacière intégrée à l’inscription ✅');await loadThirdHalfFunds();return;
  }
});
async function loadMyPlayerDashboard(){
  if(!S.session){S.playerDashboard=null;return null;}
  if(!S.playerAccountAccess){
    S.playerDashboard=null;
    const create=$('#myPlayerCreateCard'),dash=$('#myPlayerDashboard'),view=$('#view-myplayer');
    create?.classList.add('hidden');dash?.classList.add('hidden');
    let gate=$('#playerAccountAccessGate4469');
    if(view&&!gate){gate=document.createElement('div');gate.id='playerAccountAccessGate4469';gate.className='card';gate.innerHTML='<h2 class="sectiontitle">Compte joueur SWÉ en préparation</h2><p class="muted">Cet espace est actuellement réservé aux comptes de test autorisés.</p>';view.prepend(gate);}
    return null;
  }
  $('#playerAccountAccessGate4469')?.remove();
  const {data,error}=await sb.rpc('get_my_global_player_dashboard_v2');
  if(error){console.warn('global player dashboard',error);S.playerDashboard=null;return null;}
  S.playerDashboard=data||null;
  renderMyPlayerHub();
  return S.playerDashboard;
}
function renderSweIdentitySource(){
  const box=$('#mySweHistoryResult');if(!box)return;const s=S.sweIdentitySource;if(!s){box.innerHTML='';return;}const rows=Array.isArray(s.players)?s.players:[];
  box.innerHTML='<div class="swe-history-result"><div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b>'+esc(s.name||'Swé')+'</b><div class="muted">'+esc(s.workspace_name||'')+(s.date?' • '+esc(s.date):'')+' • ID '+esc(s.code||'')+'</div></div><span class="guest-badge">'+(s.source_type==='league'?'LIGUE':'TOURNOI')+'</span></div><div class="muted small" style="margin-top:8px">Sélectionne uniquement ton propre nom. Les informations privées des autres joueurs ne sont pas affichées.</div><div class="swe-history-players">'+rows.map(p=>'<div class="player"><div><b>'+esc(p.name)+'</b><div class="muted small">'+(p.linked_to_me?'Déjà lié à ton compte':(p.already_linked?'Identité déjà revendiquée':'Disponible pour liaison'))+'</div></div>'+(p.linked_to_me?'<span class="linked-ok">✓ LIÉ</span>':'<button '+(p.already_linked?'title="Une demande déclenchera une vérification d’identité"':'')+' data-claim-history-player="'+esc(p.player_id)+'">C’est moi</button>')+'</div>').join('')+'</div></div>';
}

function playerPaymentButton(o){
  if(!o?.player_id||!o?.public_token)return '';
  return '<button class="primary" data-player-pay="1" data-player-id="'+esc(o.player_id)+'" data-public-token="'+esc(o.public_token)+'" data-tournament-id="'+esc(o.tournament_id)+'">💳 Payer et confirmer</button>';
}
function renderMyPlayerHub(){
  const create=$('#myPlayerCreateCard'),dash=$('#myPlayerDashboard'),identity=$('#myPlayerIdentity');
  if(!create||!dash)return;const d=S.playerDashboard;
  create.classList.toggle('hidden',!!d?.profile);dash.classList.toggle('hidden',!d?.profile);
  if(!d?.profile){if(identity){identity.classList.add('hidden');identity.innerHTML='';}return;}
  const p=d.profile,st=d.stats||{};
  if(identity){identity.classList.remove('hidden');identity.innerHTML='<span class="player-id-badge">'+esc(p.public_player_id)+'</span><span class="muted">ID joueur permanent</span>';}
  if($('#myPlayerPublicId'))$('#myPlayerPublicId').textContent=p.public_player_id;
  if($('#myPlayerName')&&document.activeElement!==$('#myPlayerName'))$('#myPlayerName').value=p.display_name||'';
  if($('#myPlayerArea')&&document.activeElement!==$('#myPlayerArea'))$('#myPlayerArea').value=p.home_area||'';
  if($('#myPlayerPublic'))$('#myPlayerPublic').checked=!!p.is_public;
  if($('#myPlayerDiscoverable')){$('#myPlayerDiscoverable').checked=!!p.discoverable;$('#myPlayerDiscoverable').disabled=!p.is_public;}
  if($('#myPlayerNotify')){$('#myPlayerNotify').checked=!!p.notify_upcoming_swes;$('#myPlayerNotify').disabled=false;}
  const rating=st.rating==null?'—':Number(st.rating).toFixed(1)+'/5';
  if($('#myPlayerStats'))$('#myPlayerStats').innerHTML=[['🏟️','Groupes',st.groups||0],['🎮','Swés joués',st.tournaments||0],['⚽','Matchs',st.matches||0],['✅','Victoires',st.wins||0],['🏆','Trophées',st.trophies||0],['🥅','Buts',st.goals||0],['🎯','Passes',st.assists||0],['⭐','Note',rating]].map(x=>'<div><span>'+x[0]+'</span><small>'+x[1]+'</small><b>'+x[2]+'</b></div>').join('');
  const groups=Array.isArray(d.groups)?d.groups:[];
  if($('#myPlayerGroups')){
    let groupHtml=groups.length?groups.map(g=>'<div class="player"><b>'+esc(g.workspace_name)+'</b><div class="muted">Profil local : '+esc(g.player_name)+(g.is_group_member?' • membre':' • invité')+'</div></div>').join(''):'<div class="muted">Aucun profil de groupe relié pour le moment.</div>';
    if(S.workspace&&(isAdmin()||isCoorg())){
      const linkedPlayer=(S.players||[]).find(x=>String(x.id)===String(S.myLinkedPlayerId||''));
      if(linkedPlayer){
        groupHtml='<div class="player swe-self-link-ok"><div><b>🪪 '+esc(S.workspace.name||'Groupe actuel')+'</b><div class="muted">Ton compte organisateur est lié au membre <b>'+esc(linkedPlayer.name)+'</b>. Ses tournois, stats et notes utilisent maintenant le même ID SWÉ <b>'+esc(p.public_player_id)+'</b>. <b>Cette liaison est verrouillée</b> ; seul le Super Admin peut la supprimer.</div></div><span class="guest-badge">LIÉ</span></div>'+groupHtml;
      }else{
        const candidates=(S.players||[]).filter(x=>x.active!==false&&x.is_group_member!==false);
        groupHtml='<div class="player swe-self-link-card"><div style="flex:1"><b>🔗 Relier mon compte organisateur à mon membre joueur</b><div class="muted">Choisis ton nom dans ce groupe. Ton ID SWÉ '+esc(p.public_player_id)+' suivra alors automatiquement tes inscriptions aux tournois en cours et futurs.</div><div class="row" style="margin-top:8px;gap:8px"><select id="myPlayerSelfMember" style="flex:1"><option value="">Choisir mon profil membre…</option>'+candidates.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('')+'</select><button id="myPlayerSelfLink" class="primary">C’est moi</button></div></div></div>'+groupHtml;
      }
    }
    $('#myPlayerGroups').innerHTML=groupHtml;
  }
  const invites=Array.isArray(d.invites)?d.invites:[];
  if($('#myPlayerInvites'))$('#myPlayerInvites').innerHTML=invites.length?invites.map(i=>'<div class="player"><div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b>'+esc(i.workspace_name)+' • '+esc(i.tournament_name||'Swé')+'</b><div class="muted">'+esc(i.tournament_date||'')+(i.start_time?' • '+esc(String(i.start_time).slice(0,5)):'')+(i.venue?' • '+esc(i.venue):'')+'</div>'+(i.message?'<div class="small" style="margin-top:5px">'+esc(i.message)+'</div>':'')+'</div><span class="guest-badge">'+esc(String(i.status||'pending').toUpperCase())+'</span></div>'+(i.status==='pending'?'<div class="row" style="margin-top:8px"><button class="primary" data-player-invite-accept="'+i.id+'">✅ Accepter</button><button data-player-invite-decline="'+i.id+'">Refuser</button></div>':'')+'</div>').join(''):'<div class="muted">Aucune invitation.</div>';
  const mySwes=Array.isArray(d.my_swes)?d.my_swes:[];
  if($('#myPlayerMySwes'))$('#myPlayerMySwes').innerHTML=mySwes.length?mySwes.map(o=>'<div class="player"><div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b>'+esc(o.workspace_name)+' • '+esc(o.tournament_name||'Swé')+'</b><div class="muted">📅 '+esc(o.tournament_date||'')+(o.start_time?' • '+esc(String(o.start_time).slice(0,5)):'')+' • 📍 '+esc(o.venue||'Lieu à confirmer')+'</div></div><span class="guest-badge">'+esc(String(o.registration_status||'confirmé').replace('_',' ').toUpperCase())+'</span></div>'+(o.registration_status==='payment_pending'?'<div class="row" style="margin-top:9px">'+playerPaymentButton(o)+'</div>':'')+(Number(o.third_half_pledge_cents||0)>0?'<div class="muted" style="margin-top:6px">🧊 Contribution 3e mi-temps annoncée : '+euroCents(o.third_half_pledge_cents)+'</div>':'')+'</div>').join(''):'<div class="muted">Aucun Swé à venir.</div>';
  const reqs=Array.isArray(d.requests)?d.requests:[];
  if($('#myPlayerRequests'))$('#myPlayerRequests').innerHTML=reqs.length?reqs.map(r=>'<div class="player"><div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b>'+esc(r.workspace_name)+' • '+esc(r.tournament_name||'Swé')+'</b><div class="muted">'+esc(r.tournament_date||'')+(r.start_time?' • '+esc(String(r.start_time).slice(0,5)):'')+'</div></div><span class="guest-badge">'+(r.status==='pending'?'EN ATTENTE':r.status==='accepted'?'ACCEPTÉE':'REFUSÉE')+'</span></div>'+(r.message?'<div class="small" style="margin-top:6px">'+esc(r.message)+'</div>':'')+(r.registration_status==='payment_pending'?'<div class="row" style="margin-top:9px">'+playerPaymentButton(r)+'</div>':'')+'</div>').join(''):'<div class="muted">Aucune demande envoyée.</div>';
  const focusSwe=new URLSearchParams(location.search).get('joinSwe');const opp=(Array.isArray(d.upcoming_swes)?[...d.upcoming_swes]:[]).sort((a,b)=>String(a.tournament_id)===String(focusSwe)?-1:String(b.tournament_id)===String(focusSwe)?1:0);
  if($('#myPlayerOpportunities'))$('#myPlayerOpportunities').innerHTML=opp.length?opp.map(o=>{const mode=o.discovery_mode==='public'?'PUBLIC • INSCRIPTION DIRECTE':'SUR DEMANDE';const fee=Number(o.entry_fee_cents||0);const payment=o.external_payment_required?'<div class="player-opportunity-price">💳 Paiement en ligne requis • confirmation automatique</div>':'<div class="player-opportunity-price free">✓ Aucun paiement en ligne imposé au joueur externe</div>';const third=o.third_half_enabled?'<label class="player-pledge"><span>🧊 3e mi-temps • 5 € max</span><input type="number" min="0" max="5" step="0.50" data-pledge-for="'+o.tournament_id+'" placeholder="Contribution €" value="'+(Math.min(500,Number(o.cooler_suggested_cents||0))/100||'')+'"></label>':'';return '<div class="player player-opportunity"><span class="guest-badge">'+esc(mode)+'</span><h3>'+esc(o.workspace_name)+' • '+esc(o.tournament_name||'Swé')+'</h3><div class="muted">📅 '+esc(o.tournament_date||'')+(o.start_time?' • '+esc(String(o.start_time).slice(0,5)):'')+'</div><div class="muted">📍 '+esc(o.venue||'Lieu à confirmer')+' • '+Number(o.remaining_places||0)+' place(s) restante(s)</div>'+payment+third+(o.discovery_mode==='public'?'<button class="primary" data-player-direct-join="'+o.tournament_id+'" style="margin-top:10px">⚡ Je participe</button>':'<textarea data-request-message-for="'+o.tournament_id+'" rows="2" placeholder="Message à l’organisateur (facultatif)" style="margin-top:10px"></textarea><button class="primary" data-player-request-join="'+o.tournament_id+'" style="margin-top:8px">🙋 Demander à participer</button>')+'</div>'}).join(''):'<div class="muted">Aucun nouveau Swé à afficher pour le moment.</div>';
}
function renderPlayerDirectoryCard(){
  const card=$('#playerDirectoryCard');if(!card)return;
  card.classList.toggle('hidden',!isAdmin());
  if(!isAdmin())return;
  const sel=$('#playerDirectoryTournament');if(sel){const keep=sel.value;const tours=(S.tournaments||[]).filter(t=>t.status!=='finished');sel.innerHTML='<option value="">Choisir le Swé à compléter…</option>'+tours.map(t=>'<option value="'+t.id+'">'+esc(t.name||t.tournament_date)+' • '+esc(t.tournament_date)+'</option>').join('');if([...sel.options].some(o=>o.value===keep))sel.value=keep;}
  const box=$('#playerDirectoryResults');if(!box)return;
  const rows=S.playerDirectory||[];
  if(!rows.length){box.innerHTML='<div class="muted">Lance une recherche pour consulter les joueurs publics disponibles.</div>';return;}
  box.innerHTML=rows.map(r=>'<div class="player directory-player"><div style="flex:1"><div class="row" style="justify-content:flex-start;gap:8px;flex-wrap:wrap"><b>'+esc(r.display_name)+'</b><span class="player-id-mini">'+esc(r.public_player_id)+'</span></div><div class="muted">'+esc(r.home_area||'Zone non renseignée')+' • '+Number(r.groups_count||0)+' groupe(s) • '+Number(r.tournaments_count||0)+' Swé(s)</div><div class="small" style="margin-top:4px">⚽ '+Number(r.matches_count||0)+' matchs • 🥅 '+Number(r.goals_count||0)+' buts • 🎯 '+Number(r.assists_count||0)+' passes'+(r.rating!=null?' • ⭐ '+Number(r.rating).toFixed(1)+'/5':'')+'</div></div><button class="primary" data-directory-invite="'+r.global_player_id+'">Inviter au Swé</button></div>').join('');
}

function renderAdminPlayerRequests(){
  const card=$('#playerParticipationRequestsCard'),box=$('#playerParticipationRequests');if(!card||!box)return;card.classList.toggle('hidden',!isAdmin());if(!isAdmin())return;
  const rows=S.playerRequests||[];if(!rows.length){box.innerHTML='<div class="muted">Aucune demande de participation pour le moment.</div>';return;}
  box.innerHTML=rows.map(r=>'<div class="player request-row"><div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap"><div><div class="row" style="justify-content:flex-start;gap:7px;flex-wrap:wrap"><b>'+esc(r.display_name)+'</b><span class="player-id-mini">'+esc(r.public_player_id)+'</span></div><div class="muted">'+esc(r.home_area||'Zone non renseignée')+' • '+esc(r.tournament_name||'Swé')+' • '+esc(r.tournament_date||'')+'</div></div><span class="guest-badge">'+(r.status==='pending'?'EN ATTENTE':r.status==='accepted'?'ACCEPTÉE':'REFUSÉE')+'</span></div>'+(r.message?'<div class="small" style="margin-top:7px">💬 '+esc(r.message)+'</div>':'')+(Number(r.third_half_pledge_cents||0)>0?'<div class="small" style="margin-top:5px">🧊 Contribution annoncée : '+euroCents(r.third_half_pledge_cents)+'</div>':'')+(r.external_payment_required?'<div class="small" style="margin-top:5px">💳 Paiement exigé : '+euroCents(r.entry_fee_cents)+(r.payment_ready?' • prêt':' • configuration requise')+'</div>':'')+(r.status==='pending'?'<div class="row" style="margin-top:9px"><button class="primary" data-request-accept="'+r.request_id+'">✅ Accepter</button><button data-request-decline="'+r.request_id+'">Refuser</button></div>':'')+'</div>').join('');
}
function renderWorkspaceSwitcher(){
  const sel=$('#workspaceSwitcher');if(!sel)return;
  const rows=S.memberships||[];
  sel.classList.toggle('hidden',rows.length<2);
  if(rows.length<2){sel.innerHTML='';return;}
  const admins=rows.filter(r=>r.role==='admin');
  const coorgs=rows.filter(r=>r.role!=='admin');
  let html='';
  if(admins.length)html+='<optgroup label="👑 Mes groupes — administrateur">'+admins.map(r=>'<option value="'+esc(r.workspace_id)+'"'+(String(r.workspace_id)===String(S.workspace?.id)?' selected':'')+'>👑 '+esc(r.workspaces?.name||'Espace SWÉ')+' — Administrateur</option>').join('')+'</optgroup>';
  if(coorgs.length)html+='<optgroup label="🛠️ Groupes que je co-gère">'+coorgs.map(r=>'<option value="'+esc(r.workspace_id)+'"'+(String(r.workspace_id)===String(S.workspace?.id)?' selected':'')+'>🛠️ '+esc(r.workspaces?.name||'Espace SWÉ')+' — Co-gestionnaire</option>').join('')+'</optgroup>';
  sel.innerHTML=html;
  sel.title='Chaque groupe conserve ses propres joueurs, compétitions, droits et réglages.';
}
function renderOrganizerAccessBanner(){
  const box=$('#organizerAccessBanner');if(!box)return;
  const a=S.organizerAccess;
  if(!S.workspace||!a){box.classList.add('hidden');box.innerHTML='';return;}
  if(a.trial_active){
    box.classList.remove('hidden','expired');
    box.innerHTML='<div><b>🎁 Essai organisateur • '+Number(a.days_remaining||0)+' jour'+(Number(a.days_remaining||0)>1?'s':'')+' restant'+(Number(a.days_remaining||0)>1?'s':'')+'</b><span>Toutes les options sont débloquées pendant 60 jours. Ensuite, choisis un abonnement pour continuer à organiser.</span></div><button type="button" data-go="home">Débloquer toute la puissance SWÉ →</button>';
    return;
  }
  if(a.requires_subscription){
    box.classList.remove('hidden');box.classList.add('expired');
    box.innerHTML='<div><b>⏳ Ton essai organisateur est terminé</b><span>Tes données sont conservées en lecture seule. Choisis une formule SWÉ pour reprendre l’organisation.</span></div><button type="button" id="trialChoosePlan" class="primary">Voir les formules SWÉ</button>';
    return;
  }
  box.classList.add('hidden');box.innerHTML='';
}
async function loadOnboardingStatus(){
  const r=await sb.rpc('get_my_onboarding_status');
  S.onboardingStatus=r.error?null:(r.data||null);
  return S.onboardingStatus;
}
function openOrganizerSetup(type='group'){
  $('#accountOnboarding')?.classList.add('hidden');
  $('#workspaceSetup')?.classList.remove('hidden');
  const radio=document.querySelector('input[name="organizerType"][value="'+(type==='pro'?'pro':'group')+'"]');if(radio)radio.checked=true;
  const inp=$('#newWorkspace');if(inp&&!inp.value)inp.value=type==='pro'?'Mon organisation SWÉ':'Mon groupe SWÉ';
  setTimeout(()=>inp?.focus(),50);
}
function showAccountOnboarding(){
  $('#accountOnboarding')?.classList.remove('hidden');
  $('#workspaceSetup')?.classList.add('hidden');
}
function renderCoorgOrganizerCta(){
  const card=$('#coorgOrganizerCta');if(!card)return;
  card.classList.toggle('hidden',!isCoorg());
}

async function boot(){
  await loadInvites();
  if(await initSuperAdmin())return;
  const currentUserId=S.session?.user?.id;
  if(!currentUserId)return toast('Session utilisateur introuvable.');
  const playerAccess=await sb.rpc('get_my_player_account_access_v1');
  S.playerAccountAccess=!playerAccess.error&&playerAccess.data===true;
  await loadOnboardingStatus();
  let membershipQuery=sb.from('workspace_members')
    .select('workspace_id,role,workspaces(name,public_token,public_enabled,rating_group_name)')
    .eq('user_id',currentUserId)
    .eq('active',true)
    .limit(50);
  if(S.testAdminContext)membershipQuery=membershipQuery.eq('workspace_id',S.testAdminContext.workspace_id);
  const {data,error}=await membershipQuery;
  if(error)return toast(error.message);
  S.memberships=Array.isArray(data)?data:[];
  if(!S.memberships.length){
    S.workspace=null;S.organizerAccess=null;
    renderWorkspaceSwitcher();renderOrganizerAccessBanner();
    await loadMyPlayerDashboard();
    document.querySelectorAll('.tabs .tab').forEach(t=>t.style.display=t.dataset.view==='myplayer'?'':'none');
    setView('myplayer');
    $('#workspaceName').textContent='Mon profil joueur SWÉ';
    if(!S.playerAccountAccess||S.onboardingStatus?.completed){
      $('#accountOnboarding')?.classList.add('hidden');
      $('#workspaceSetup')?.classList.add('hidden');
    }else showAccountOnboarding();
    return;
  }
  const requestedWorkspace=new URLSearchParams(location.search).get('workspace');
  const stored=S.testAdminContext?.workspace_id||requestedWorkspace||localStorage.getItem('swe_workspace_id');
  const chosen=S.memberships.find(x=>String(x.workspace_id)===String(stored))||S.memberships[0];
  S.workspace={id:chosen.workspace_id,name:chosen.workspaces?.name||'SWÉ Tournament 5/5',rating_group_name:chosen.workspaces?.rating_group_name||'',role:chosen.role,public_token:chosen.workspaces?.public_token||null,public_enabled:chosen.workspaces?.public_enabled!==false};
  if(!S.testAdminContext)localStorage.setItem('swe_workspace_id',S.workspace.id);
  $('#workspaceSetup').classList.add('hidden');$('#accountOnboarding')?.classList.add('hidden');
  const access=await sb.rpc('get_workspace_organizer_access',{p_workspace_id:S.workspace.id});
  S.organizerAccess=access.error?null:(access.data||null);
  renderWorkspaceSwitcher();renderOrganizerAccessBanner();
  await loadSportsVenues();
  await loadAll();
  await loadMyPlayerDashboard();
  $('#workspaceName').textContent=S.workspace.name+' • '+(S.workspace.role==='admin'?'Administrateur':(hasTemporaryAdmin()?'Co-organisateur • Admin temporaire':'Co-organisateur'));
  applyPermissions();renderCoorgOrganizerCta();subscribeRealtime();startSafeAppSync();
  if(S.testAdminContext){
    const target=S.tournaments.find(t=>t.id===S.testAdminContext.tournament_id);
    if(!target)return toast('Tournoi test introuvable dans cet espace.');
    S.activeTour=target.id;await loadTournament();renderAll();setView('tournaments');
    if(!document.getElementById('testAdminReturn')){const a=document.createElement('a');a.id='testAdminReturn';a.href='/forssadmin/';a.textContent='← Retour au Super Admin';a.className='btn';document.getElementById('workspaceName').after(a);}
  }else{
    const startMode=new URLSearchParams(location.search).get('start');
    if(startMode==='player')setView('myplayer');else if(startMode==='home')setView('home');
    if(startMode==='player'||startMode==='home')consumeStartMode();
  }
}
$('#createWorkspace').onclick=async()=>{
  const btn=$('#createWorkspace');const name=$('#newWorkspace')?.value.trim();
  if(!name)return toast('Indique le nom de ton groupe ou de ton organisation.');
  const type=document.querySelector('input[name="organizerType"]:checked')?.value||'group';
  btn.disabled=true;btn.textContent='Création…';
  try{
    const {data:workspaceId,error}=await sb.rpc('create_organizer_workspace_trial',{p_name:name,p_organizer_type:type});
    if(error)throw error;if(!workspaceId)throw new Error('Impossible de créer l’espace.');
    localStorage.setItem('swe_workspace_id',workspaceId);
    toast('Espace créé • tes 2 mois d’essai commencent maintenant 🎁');
    await boot();setView('home');
  }catch(error){toast(friendlyAuthError(error))}
  finally{btn.disabled=false;btn.textContent="Créer mon espace et démarrer l’essai"}
};
$('#cancelWorkspaceSetup')?.addEventListener('click',()=>{
  $('#workspaceSetup')?.classList.add('hidden');
  if(!S.workspace&&!S.onboardingStatus?.completed)showAccountOnboarding();
});
$('#workspaceSwitcher')?.addEventListener('change',e=>{localStorage.setItem('swe_workspace_id',e.target.value);location.reload();});


document.addEventListener('change',e=>{if(e.target?.id==='saWorkspaceFilter')renderSuperAdminWorkspaces();});
document.addEventListener('click',async e=>{
  const intent=e.target?.closest?.('[data-onboarding-intent]')?.dataset.onboardingIntent;
  if(intent==='player'){
    const b=e.target.closest('[data-onboarding-intent]');b.disabled=true;
    const {error}=await sb.rpc('complete_my_onboarding',{p_intent:'player'});b.disabled=false;
    if(error)return toast(error.message);S.onboardingStatus={...(S.onboardingStatus||{}),completed:true,primary_intent:'player'};
    $('#accountOnboarding')?.classList.add('hidden');$('#workspaceSetup')?.classList.add('hidden');setView('myplayer');toast('Profil joueur activé ⚽');return;
  }
  if(intent==='organizer'){openOrganizerSetup('group');return;}
  if(e.target?.id==='becomeOrganizer'||e.target?.id==='coorgCreateOwnWorkspace'){openOrganizerSetup('group');$('#workspaceSetup')?.scrollIntoView({behavior:(matchMedia('(pointer:coarse)').matches?'auto':'smooth'),block:'start'});return;}
  if(e.target?.id==='trialChoosePlan'){setView('home');setTimeout(()=>$('#homeEcosystemCard')?.scrollIntoView({behavior:(matchMedia('(pointer:coarse)').matches?'auto':'smooth'),block:'start'}),100);return;}
});

async function loadInvites(){
  const box=$('#inviteList');box.innerHTML='';
  const userEmail=(S.session?.user?.email||'').trim().toLowerCase();
  if(!userEmail){$('#inviteBox').classList.add('hidden');return}
  const {data,error}=await sb.from('workspace_invites')
    .select('id,email,role,workspace_id,payment_responsibility,payment_status,workspaces(name)')
    .is('accepted_at',null)
    .ilike('email',userEmail);
  if(error){$('#inviteBox').classList.add('hidden');return}
  let mine=(data||[]).filter(i=>(i.email||'').trim().toLowerCase()===userEmail);
  if(inviteIdFromUrl)mine=mine.sort((a,b)=>(a.id===inviteIdFromUrl?-1:0)-(b.id===inviteIdFromUrl?-1:0));
  $('#inviteBox').classList.toggle('hidden',!mine.length);
  mine.forEach(i=>{
    // A paid invitation has its own checkout; never show the free acceptance action.
    if(i.role==='coorganizer'&&i.payment_responsibility==='invitee'){
      const d=document.createElement('div');d.className='swe-selfpay-invite';d.dataset.selfpayInvite=i.id;
      d.textContent='Chargement de ton invitation co-gestionnaire…';box.appendChild(d);return;
    }
    const d=document.createElement('div');d.className='player';
    d.innerHTML='<b>Invitation à rejoindre '+esc(i.workspaces?.name||'SWÉ TOURNAMENT 5/5')+'</b><div class="muted" style="margin-top:4px">Connecté avec '+esc(userEmail)+'. Clique ci-dessous pour devenir co-organisateur.</div>';
    const b=document.createElement('button');b.textContent='✅ Accepter l’invitation';b.className='primary';b.style.marginTop='8px';
    b.onclick=async()=>{
      const {error}=await sb.rpc('accept_workspace_invite',{p_invite_id:i.id});
      if(error)return toast(error.message);
      if(i.workspace_id)localStorage.setItem('swe_workspace_id',i.workspace_id);
      history.replaceState({},'',APP_URL);
      toast('Invitation acceptée ✅');
      await boot();setView('home');
    };
    d.appendChild(b);box.appendChild(d)
  });
  window.SWECoorganizerInvites?.refresh();
}
async function loadAll(){
  if(!S.workspace)return;const w=S.workspace.id;let r;
…83282 tokens truncated…ard.id='publicThirdHalfDonorCard';
      donorCard.className='card';
      donorCard.innerHTML='<h2 class="sectiontitle">🧊 Top donateurs de la 3e mi-temps</h2><p class="muted">Le classement apparaîtra ici dès que les participations à la glacière seront enregistrées par l’organisateur.</p><div id="publicCoolerDonors"></div>';
      regBox.parentElement?.insertBefore(donorCard,regBox.nextSibling);
    }

    setTimeout(updateTournamentCountdowns,0);
    const PUBLIC_GUEST_LIMIT=5;
    let publicThirdHalfState=null;
    let publicThirdHalfLoadedAt=0;
    let publicThirdHalfPaymentDraft=null;
    let publicThirdHalfPreference={playerId:null,data:null,loading:false};
    let publicThirdHalfPreferenceSeq=0;

    function setPublicCoolerPaymentStatus(message,tone='error'){
      if(publicThirdHalfPaymentDraft){
        publicThirdHalfPaymentDraft.message=message||'';
        publicThirdHalfPaymentDraft.tone=tone;
      }
      const status=$('#publicCoolerLinkStatus');
      if(!status)return;
      status.textContent=message||'';
      status.className=message?'third-half-payment-status '+tone:'third-half-payment-status hidden';
    }

    function publicThirdHalfPackagesHtml(state){
      const packs=Array.isArray(state?.packages)?state.packages:[];
      if(!packs.length)return '';
      return '<div class="third-half-pack-list"><b>🥤 Packs proposés avec ce Swé</b>'+packs.map(p=>'<div class="third-half-pack"><div><b>'+esc(p.name)+'</b><small>'+esc(p.description||'Pack partenaire du complexe')+(p.contains_alcohol?' • Réservé aux adultes':'')+'</small></div><strong>'+euroCents(p.public_price_cents)+'</strong></div>').join('')+'<div class="muted">Offres publiées par SWÉ pour le complexe associé au tournoi.</div></div>';
    }

    function renderPublicThirdHalfRegistration(){
      const box=$('#publicThirdHalfRegistration');if(!box)return;
      const state=publicThirdHalfState;
      if(!publicThirdHalf||!regTour.third_half_active||!state?.enabled){box.className='hidden';box.innerHTML='';return;}
      const pid=$('#publicPlayerSelect')?.value||'';
      const reg=registrations.find(r=>r.tournament_id===regTour.id&&String(r.player_id)===String(pid)&&r.present&&r.registration_status!=='cancelled');
      const amount=Math.max(0,Math.min(500,Number(state.suggested_amount_cents||0)));
      const owner=String(pid)===String(state.responsible_player_id||'');
      const ownerName=state.responsible_player_name||'À désigner';
      const ownerInitial=ownerName.trim().charAt(0).toUpperCase()||'?';
      const tasks=Array.isArray(state.logistics_tasks)?state.logistics_tasks:[];
      const taskMap=new Map(tasks.map(x=>[x.key,x]));
      const paymentPlanStatus=!state.responsible_player_id?'À attribuer':state.payment_link_ready?'Lien '+esc(state.provider||'de paiement')+' prêt':state.responsible_registered===false?'Gestion hors plateforme':'Lien en préparation';
const contributionLabels={cooler:'Une glacière',ice:'Des glaçons',beers_3:'3 bières',beers_6:'6 bières',beers_5:'5 bières',beers_6:'6 bières',ti_punch:'Du ti-punch',fruits:'Des fruits',cups:'Des gobelets',soft_drinks:'Des boissons sans alcool',snacks:'Des amuse-gueules',other:'Un autre apport'},contributions=Array.isArray(state.contributions)?state.contributions:[],pool=Math.max(0,Number(state.money_pool_cents||0)),donors=contributions.filter(x=>x.contribution_mode==='money'||x.contribution_item),donorRow=x=>'<div class="third-half-donor-row">'+playerAvatarHtml({name:x.player_name,avatar_url:x.avatar_url})+'<span><strong>'+esc(x.player_name||'Joueur')+'</strong><small>'+(x.contribution_mode==='money'?'💶 '+euroCents(x.contribution_amount_cents||0):'🎒 '+esc(contributionLabels[x.contribution_item]||x.contribution_item||'Apport matériel'))+'</small></span></div>',donorPreview=donors.slice(0,4).map(donorRow).join(''),donorRemainder=donors.length>4?'<details class="third-half-more-donors"><summary>Voir les '+(donors.length-4)+' autres contributions</summary>'+donors.slice(4).map(donorRow).join('')+'</details>':'',contributionBoard='<section class="third-half-contribution-board" aria-label="Participations du groupe"><div class="third-half-contribution-summary"><div><span>CAGNOTTE ANNONCÉE</span><b>'+euroCents(pool)+'</b><small>'+Number(state.money_donor_count||0)+' participation financière'+(Number(state.money_donor_count||0)>1?'s':'')+'</small></div><div><span>APPORTS MATÉRIELS</span><b>'+donors.filter(x=>x.contribution_mode==='supplies').length+'</b><small>déjà prévus par le groupe</small></div></div><div class="third-half-donor-list"><b>Ce que le groupe apporte</b>'+(donors.length?donorPreview+donorRemainder:'<p class="muted">Personne n’a encore annoncé sa participation.</p>')+'</div></section>';
      const publicPlan='<section class="third-half-public-plan" aria-label="Organisation prévue"><div class="third-half-public-plan-head"><div><span>PRÉPARATION DU MATCH</span><h4>Organisation prévue</h4></div><small>Visible par tous les joueurs</small></div><div class="third-half-public-plan-grid"><div class="third-half-public-plan-card"><span aria-hidden="true">🧊</span><div><small>GLACIÈRE</small><b>'+esc(taskMap.get('cooler')?.player_name||'À attribuer')+'</b></div></div><div class="third-half-public-plan-card"><span aria-hidden="true">❄️</span><div><small>GLAÇONS</small><b>'+esc(taskMap.get('ice')?.player_name||'À attribuer')+'</b></div></div><div class="third-half-public-plan-card payment"><span aria-hidden="true">💳</span><div><small>LIEN DE PARTICIPATION</small><b>'+esc(ownerName)+'</b><em>'+paymentPlanStatus+'</em></div></div></div>'+contributionBoard+'</section>';
      let action='';
      if(!state.responsible_player_id){
        action='<div class="third-half-pending">Le responsable du lien de participation reste à désigner par l’administrateur.</div>';
      }else if(owner&&state.can_manage){
        if(!publicThirdHalfPaymentDraft||String(publicThirdHalfPaymentDraft.playerId)!==String(pid)){
          publicThirdHalfPaymentDraft={playerId:pid,provider:state.provider||'',link:state.payment_link||'',amount:amount||300,dirty:false,saving:false,message:'',tone:'success'};
        }else if(!publicThirdHalfPaymentDraft.dirty&&!publicThirdHalfPaymentDraft.saving){
          publicThirdHalfPaymentDraft.provider=state.provider||'';
          publicThirdHalfPaymentDraft.link=state.payment_link||'';
          publicThirdHalfPaymentDraft.amount=amount||300;
        }
        const paymentDraft=publicThirdHalfPaymentDraft;
        const contributionMode=state.responsible_contribution_mode||'money';
        const contributionAmount=Math.max(50,Math.min(500,Number(state.responsible_contribution_amount_cents||amount||300)));
        const contributionItem=state.responsible_contribution_item||'beers_3';
        action='<div class="third-half-owner-form"><div class="third-half-owner-banner"><div><span>TA MISSION</span><b>Tu gères le lien de participation</b></div><em>Responsable paiement</em></div>'+
          '<div class="third-half-owner-section"><b>1. Ta participation personnelle</b><div class="muted">Choisis soit une participation financière, soit ce que tu apportes directement.</div><div class="grid g2"><label><span class="muted">Type de participation</span><select id="publicCoolerContributionMode"><option value="money" '+(contributionMode==='money'?'selected':'')+'>Participation financière</option><option value="supplies" '+(contributionMode==='supplies'?'selected':'')+'>Apport matériel</option></select></label><label id="publicCoolerContributionMoney"><span class="muted">Montant personnel</span><select id="publicCoolerContributionAmount">'+[50,100,150,200,250,300,350,400,450,500].map(c=>'<option value="'+c+'" '+(contributionAmount===c?'selected':'')+'>'+euroCents(c)+'</option>').join('')+'</select></label><label id="publicCoolerContributionSupplies"><span class="muted">Ce que tu apportes</span><select id="publicCoolerContributionItem">'+[['cooler','Une glacière'],['ice','Des glaçons'],['beers_3','3 bières'],['beers_5','5 bières'],['beers_6','6 bières'],['soft_drinks','Boissons sans alcool'],['snacks','Snacks / apéritif'],['other','Autre apport']].map(([v,l])=>'<option value="'+v+'" '+(contributionItem===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label></div></div>'+
          '<button id="publicSaveCoolerPlan" class="third-half-plan-button" type="button">Enregistrer ma participation</button>'+
          '<div class="third-half-owner-section third-half-payment-config"><b>2. Ton lien pour les participations du groupe</b><div class="muted">Le lien est personnel et l’argent arrive directement sur ton compte. Le montant demandé à chaque membre reste plafonné à 5 €.</div><div class="grid g2"><label><span class="muted">Solution obligatoire</span><select id="publicCoolerProvider" required aria-describedby="publicCoolerLinkStatus"><option value="">Choisir…</option>'+['Revolut','PayPal','Sumeria','Lydia','Autre'].map(x=>'<option '+(paymentDraft.provider===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label><span class="muted">Montant demandé</span><select id="publicCoolerAmount">'+[50,100,150,200,250,300,350,400,450,500].map(c=>'<option value="'+c+'" '+(Number(paymentDraft.amount)===c?'selected':'')+'>'+euroCents(c)+'</option>').join('')+'</select></label></div><label><span class="muted">Ton lien HTTPS</span><input id="publicCoolerLink" type="url" maxlength="500" placeholder="https://..." value="'+esc(paymentDraft.link)+'" required aria-describedby="publicCoolerLinkStatus"></label><div id="publicCoolerLinkStatus" class="third-half-payment-status '+(paymentDraft.message?esc(paymentDraft.tone):'hidden')+'" role="status" aria-live="polite">'+esc(paymentDraft.message||'')+'</div><button id="publicSaveCoolerLink" class="primary" type="button" '+(paymentDraft.saving?'disabled':'')+'>'+(paymentDraft.saving?'Enregistrement…':state.payment_link_ready?'Mettre à jour mon lien':'Activer mon lien pour les inscrits')+'</button></div></div>';
      }else if(owner&&!state.can_manage){
        if(state.responsible_registered===false){
          action='<div class="third-half-owner-locked"><b>'+esc(ownerName)+', l’administrateur t’a confié le lien de participation.</b><p>Tu n’es pas inscrit à ce Swé : les missions restent visibles, mais le paiement sera géré hors plateforme.</p><small>Pour intégrer ton lien personnel, inscris-toi d’abord au tournoi puis reviens sur cette page.</small></div>';
        }else{
        const back=new URL(location.href);back.searchParams.delete('coolerLink');
        const authBase={start:'player',joinSwe:String(regTour.id),coolerOwner:ownerName,coolerReturn:back.toString()};
        const signup=new URLSearchParams({...authBase,coolerAction:'signup'}),login=new URLSearchParams({...authBase,coolerAction:'login'});
        const linkState=new URLSearchParams(location.search).get('coolerLink');
        const lockedMessage=linkState==='pending'?'<div class="third-half-link-pending"><b>⏳ Rattachement en attente</b><span>L’organisateur doit confirmer que ce profil t’appartient. Dès validation, recharge cette page pour configurer la glacière.</span></div>':linkState==='error'?'<div class="third-half-link-pending error"><b>Rattachement à vérifier</b><span>Connecte-toi puis demande à l’organisateur de confirmer ton profil joueur.</span></div>':'';
        action='<div class="third-half-owner-locked"><b>'+esc(ownerName)+', l’administrateur t’a confié le lien de participation.</b><p>Crée gratuitement ton compte joueur ou connecte-toi pour indiquer ta participation et ajouter ton lien personnel. Le compte SWÉ est demandé uniquement pour cette fonction ; les autres participants n’en ont pas besoin.</p>'+lockedMessage+'<div class="third-half-account-actions"><a href="'+esc(APP_URL+'?'+signup.toString())+'">Créer mon compte gratuitement →</a><a class="secondary" href="'+esc(APP_URL+'?'+login.toString())+'">J’ai déjà un compte</a></div><small>Tu ne peux pas assurer cette mission ? Préviens l’organisateur afin qu’il désigne une autre personne.</small></div>';
        }
      }else{
        const preference=publicThirdHalfPreference.playerId===pid?publicThirdHalfPreference:null;
        if(!pid){
          action='<div class="third-half-pending">Sélectionne d’abord ton nom dans l’inscription.</div>';
        }else if(!reg){
          action='<div class="third-half-pending">Confirme d’abord ta présence au Swé pour répondre à la 3e mi-temps.</div>';
        }else if(!preference||preference.loading){
          action='<div class="third-half-pending">Chargement de ta réponse…</div>';
        }else{
          const pref=preference.data||{},participating=pref.participating===true,declined=pref.participating===false;
          const contributionMode=pref.contribution_mode||'money';
          const contributionAmount=Math.max(50,Math.min(500,Number(pref.contribution_amount_cents||amount||300)));
          const contributionItem=pref.contribution_item||'soft_drinks';
          const contributionFields='<div id="publicThirdHalfContributionFields" class="third-half-contribution-fields '+(participating?'':'hidden')+'"><div class="third-half-choice-grid"><label class="third-half-choice-card"><input type="radio" name="publicThirdHalfContributionMode" value="money" '+(contributionMode==='money'?'checked':'')+'><span><b>Participation financière</b><small>Versée directement à '+esc(ownerName)+'</small></span></label><label class="third-half-choice-card"><input type="radio" name="publicThirdHalfContributionMode" value="supplies" '+(contributionMode==='supplies'?'checked':'')+'><span><b>J’apporte quelque chose</b><small>Choisis un besoin concret du groupe</small></span></label></div><label id="publicThirdHalfMoneyField" class="third-half-field '+(contributionMode==='supplies'?'hidden':'')+'"><span>Montant</span><select id="publicThirdHalfContributionAmount">'+[50,100,150,200,250,300,350,400,450,500].map(c=>'<option value="'+c+'" '+(contributionAmount===c?'selected':'')+'>'+euroCents(c)+'</option>').join('')+'</select></label><label id="publicThirdHalfSuppliesField" class="third-half-field '+(contributionMode==='supplies'?'':'hidden')+'"><span>Ce que tu apportes</span><select id="publicThirdHalfContributionItem">'+[['cooler','Une glacière'],['ice','Des glaçons'],['beers_3','3 bières'],['beers_6','6 bières'],['beers_3','3 bières'],['beers_5','5 bières'],['beers_6','6 bières'],['ti_punch','Du ti-punch'],['fruits','Des fruits'],['cups','Des gobelets'],['soft_drinks','Des boissons sans alcool'],['snacks','Des amuse-gueules'],['other','Un autre apport']].map(([v,l])=>'<option value="'+v+'" '+(contributionItem===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label>'+(state.payment_link_ready&&state.payment_link&&contributionMode==='money'?'<a id="publicCoolerPayLink" class="third-half-pay-button" href="'+esc(state.payment_link)+'" target="_blank" rel="noopener noreferrer">Ouvrir le lien '+esc(state.provider||'de paiement')+' • '+euroCents(contributionAmount)+'</a>':'')+'</div>';
          action='<div class="third-half-response"><div class="third-half-response-title"><span class="third-half-response-number">4</span><div><b>Participeras-tu à la 3e mi-temps ?</b><small>Aucun compte SWÉ n’est nécessaire pour répondre.</small></div></div><div class="third-half-answer-buttons"><button id="publicThirdHalfYes" type="button" class="'+(participating?'selected':'')+'">✓ Oui, je participe</button><button id="publicThirdHalfNo" type="button" class="'+(declined?'selected':'')+'">Non, pas cette fois</button></div>'+contributionFields+'<div id="publicThirdHalfPreferenceStatus" class="third-half-payment-status hidden" role="status" aria-live="polite"></div><button id="publicSaveThirdHalfPreference" type="button" class="primary third-half-save-answer" '+(!participating&&!declined?'disabled':'')+'>'+(pref.updated_at?'Mettre à jour ma réponse':'Enregistrer ma réponse')+'</button></div>';
        }
      }
      box.className='third-half-registration';
      const thirdHalfHtml='<div class="third-half-registration-head"><div class="third-half-head-main"><div class="third-half-head-icon" aria-hidden="true">🧊</div><div class="third-half-head-copy"><span>ORGANISATION • 3E MI-TEMPS</span><h3>La glacière du match</h3><p>Boissons, glaçons et missions : tout est organisé ici.</p></div></div><div class="third-half-owner"><small>Lien de participation</small><div><span class="third-half-owner-avatar" aria-hidden="true">'+esc(ownerInitial)+'</span><b>'+esc(ownerName)+'</b></div></div></div>'+publicThirdHalfPackagesHtml(state)+publicPlan+action;
      const keepPaymentEditor=owner&&state.can_manage&&publicThirdHalfPaymentDraft?.dirty&&!!box.querySelector('#publicCoolerLink');
      if(!keepPaymentEditor)setStableHtml(box,thirdHalfHtml);
      const mode=$('#publicCoolerContributionMode');
      const toggleContribution=()=>{const supplies=mode?.value==='supplies';$('#publicCoolerContributionMoney')?.classList.toggle('hidden',supplies);$('#publicCoolerContributionSupplies')?.classList.toggle('hidden',!supplies);};
      if(mode){mode.onchange=toggleContribution;toggleContribution();}
      const setPreferenceAnswer=participating=>{
        if(publicThirdHalfPreference.playerId!==pid)return;
        publicThirdHalfPreference.data={...(publicThirdHalfPreference.data||{}),participating};
        renderPublicThirdHalfRegistration();
      };
      const rememberPreferenceDraft=patch=>{
        if(publicThirdHalfPreference.playerId!==pid)return;
        publicThirdHalfPreference.data={...(publicThirdHalfPreference.data||{}),...patch};
      };
      if($('#publicThirdHalfYes'))$('#publicThirdHalfYes').onclick=()=>setPreferenceAnswer(true);
      if($('#publicThirdHalfNo'))$('#publicThirdHalfNo').onclick=()=>setPreferenceAnswer(false);
      document.querySelectorAll('input[name="publicThirdHalfContributionMode"]').forEach(input=>input.onchange=()=>{
        const supplies=input.value==='supplies';
        rememberPreferenceDraft({contribution_mode:input.value});
        $('#publicThirdHalfMoneyField')?.classList.toggle('hidden',supplies);
        $('#publicThirdHalfSuppliesField')?.classList.toggle('hidden',!supplies);
        $('#publicCoolerPayLink')?.classList.toggle('hidden',supplies);
      });
      const preferenceAmount=$('#publicThirdHalfContributionAmount');if(preferenceAmount)preferenceAmount.onchange=()=>rememberPreferenceDraft({contribution_amount_cents:Number(preferenceAmount.value||0)});
      const preferenceItem=$('#publicThirdHalfContributionItem');if(preferenceItem)preferenceItem.onchange=()=>rememberPreferenceDraft({contribution_item:preferenceItem.value||''});
      const savePreference=$('#publicSaveThirdHalfPreference');if(savePreference)savePreference.onclick=async()=>{
        const participating=publicThirdHalfPreference.data?.participating;
        const contributionMode=participating?(document.querySelector('input[name="publicThirdHalfContributionMode"]:checked')?.value||'money'):null;
        const contributionAmount=participating&&contributionMode==='money'?Number($('#publicThirdHalfContributionAmount')?.value||0):0;
        const contributionItem=participating&&contributionMode==='supplies'?($('#publicThirdHalfContributionItem')?.value||''):null;
        const status=$('#publicThirdHalfPreferenceStatus');
        savePreference.disabled=true;savePreference.textContent='Enregistrement…';
        if(status){status.className='third-half-payment-status pending';status.textContent='Enregistrement de ta réponse…';}
        const {data,error}=await sb.rpc('save_public_third_half_participation_v1',{p_token:token,p_tournament_id:regTour.id,p_player_id:pid,p_participating:participating,p_contribution_mode:contributionMode,p_contribution_amount_cents:contributionAmount,p_contribution_item:contributionItem});
        if(error||data?.saved!==true){savePreference.disabled=false;savePreference.textContent='Réessayer';if(status){status.className='third-half-payment-status error';status.textContent=error?.message||'Ta réponse n’a pas pu être enregistrée.';}return;}
        publicThirdHalfPreference={playerId:pid,data:{...data,updated_at:new Date().toISOString()},loading:false};
        renderPublicThirdHalfRegistration();toast('Participation à la 3e mi-temps enregistrée ✅');
      };
      const savePlan=$('#publicSaveCoolerPlan');if(savePlan)savePlan.onclick=async()=>{
        const contributionMode=$('#publicCoolerContributionMode')?.value||'';
        const contributionAmount=Number($('#publicCoolerContributionAmount')?.value||0);
        const contributionItem=$('#publicCoolerContributionItem')?.value||'';
        savePlan.disabled=true;savePlan.textContent='Enregistrement…';
        const {error}=await sb.rpc('save_my_third_half_plan_v1',{p_tournament_id:regTour.id,p_player_id:pid,p_contribution_mode:contributionMode,p_contribution_amount_cents:contributionAmount,p_contribution_item:contributionItem,p_cooler_player_id:null,p_ice_player_id:null,p_beers_player_id:null});
        savePlan.disabled=false;if(error){savePlan.textContent='Enregistrer ma participation';return toast(error.message);}
        toast('Participation enregistrée ✅');await loadPublicThirdHalfRegistration(true);
      };
      const paymentProvider=$('#publicCoolerProvider'),paymentLink=$('#publicCoolerLink'),paymentAmount=$('#publicCoolerAmount');
      const rememberPaymentDraft=()=>{
        if(!publicThirdHalfPaymentDraft)return;
        publicThirdHalfPaymentDraft.provider=paymentProvider?.value||'';
        publicThirdHalfPaymentDraft.link=paymentLink?.value||'';
        publicThirdHalfPaymentDraft.amount=Number(paymentAmount?.value||0);
        publicThirdHalfPaymentDraft.dirty=true;
        setPublicCoolerPaymentStatus('');
      };
      if(paymentProvider)paymentProvider.onchange=rememberPaymentDraft;
      if(paymentLink)paymentLink.oninput=rememberPaymentDraft;
      if(paymentAmount)paymentAmount.onchange=rememberPaymentDraft;
      const save=$('#publicSaveCoolerLink');if(save)save.onclick=async()=>{
        const provider=$('#publicCoolerProvider')?.value||'',link=$('#publicCoolerLink')?.value.trim()||'',fixed=Number($('#publicCoolerAmount')?.value||0);
        rememberPaymentDraft();
        if(!provider){setPublicCoolerPaymentStatus('Choisis d’abord ta solution de paiement. Le lien saisi est conservé.');$('#publicCoolerProvider')?.focus();return;}
        if(!/^https:\/\/\S+$/i.test(link)){setPublicCoolerPaymentStatus('Ajoute un lien complet commençant par https://.');$('#publicCoolerLink')?.focus();return;}
        if(fixed<50||fixed>500){setPublicCoolerPaymentStatus('Le montant doit rester entre 0,50 € et 5 €.');$('#publicCoolerAmount')?.focus();return;}
        publicThirdHalfPaymentDraft.saving=true;
        save.disabled=true;save.textContent='Enregistrement…';
        setPublicCoolerPaymentStatus('Enregistrement du lien…','pending');
        const {data,error}=await sb.rpc('save_my_third_half_payment_link_v1',{p_tournament_id:regTour.id,p_player_id:pid,p_provider:provider,p_payment_link:link,p_suggested_amount_cents:fixed});
        publicThirdHalfPaymentDraft.saving=false;
        save.disabled=false;
        if(error||data?.saved!==true){
          console.error('save_my_third_half_payment_link_v1',error||data);
          save.textContent=state.payment_link_ready?'Mettre à jour mon lien':'Activer mon lien pour les inscrits';
          setPublicCoolerPaymentStatus(error?.message||'Le lien n’a pas pu être enregistré. Réessaie sans recharger la page.');
          return;
        }
        publicThirdHalfPaymentDraft.dirty=false;
        publicThirdHalfState={...state,provider,payment_link:link,suggested_amount_cents:fixed,status:'open',share_enabled:true,payment_link_ready:true};
        setPublicCoolerPaymentStatus('Lien enregistré. Il est maintenant visible par les autres inscrits.','success');
        renderPublicThirdHalfRegistration();
        await loadPublicThirdHalfRegistration(true);
      };
      registrationPresentation?.updateFlow?.();
    }

    async function loadPublicThirdHalfRegistration(force=false){
      if(!publicThirdHalf||!regTour.third_half_active)return renderPublicThirdHalfRegistration();
      if(!force&&Date.now()-publicThirdHalfLoadedAt<20000)return renderPublicThirdHalfRegistration();
      const {data,error}=await sb.rpc('get_public_third_half_registration_v2',{p_token:token,p_tournament_id:regTour.id});
      if(!error&&data){
        const summary=await sb.rpc('get_public_third_half_contributions_v1',{p_token:token,p_tournament_id:regTour.id});
        publicThirdHalfState={...data,...(!summary.error&&summary.data?summary.data:{})};
        publicThirdHalfLoadedAt=Date.now();
      }
      renderPublicThirdHalfRegistration();
    }

    async function loadPublicThirdHalfPreference(force=false){
      const pid=$('#publicPlayerSelect')?.value||'',seq=++publicThirdHalfPreferenceSeq;
      const reg=registrations.find(r=>r.tournament_id===regTour.id&&String(r.player_id)===String(pid)&&r.present&&r.registration_status!=='cancelled');
      if(!pid||!reg||!publicThirdHalf||!regTour.third_half_active){publicThirdHalfPreference={playerId:pid||null,data:null,loading:false};renderPublicThirdHalfRegistration();return;}
      if(!force&&publicThirdHalfPreference.playerId===pid&&publicThirdHalfPreference.data){renderPublicThirdHalfRegistration();return;}
      publicThirdHalfPreference={playerId:pid,data:null,loading:true};renderPublicThirdHalfRegistration();
      const {data,error}=await sb.rpc('get_public_third_half_participation_v1',{p_token:token,p_tournament_id:regTour.id,p_player_id:pid});
      if(seq!==publicThirdHalfPreferenceSeq||$('#publicPlayerSelect')?.value!==pid)return;
      publicThirdHalfPreference={playerId:pid,data:error?{}:(data||{}),loading:false};renderPublicThirdHalfRegistration();
    }

    function publicGuestUsage(hostId){
      const used=registrations.filter(r=>
        r.tournament_id===regTour.id &&
        String(r.registered_by_player_id||'')===String(hostId||'')
      ).length;
      return {used,remaining:Math.max(0,PUBLIC_GUEST_LIMIT-used)};
    }

    function refreshPublicPlayerSelect(){
      const sel=$('#publicPlayerSelect');
      if(!sel)return;
      const previous=sel.value;
      const registeredIds=new Set(registrations.filter(r=>r.tournament_id===regTour.id&&r.present&&r.registration_status!=='cancelled').map(r=>String(r.player_id)));
      const members=players.filter(x=>x.active&&(x.is_group_member!==false||registeredIds.has(String(x.id)))).sort((a,b)=>a.name.localeCompare(b.name));
      const signature=JSON.stringify(members.map(x=>[x.id,x.name]));
      if(sel.dataset.memberSignature===signature||document.activeElement===sel)return;
      sel.dataset.memberSignature=signature;
      sel.innerHTML='<option value="">Choisis ton nom</option>'+members.map(x=>{
        // La liste reste volontairement simple : le statut et les invités sont affichés juste en dessous après sélection.
        return '<option value="'+x.id+'">'+esc(x.name)+'</option>';
      }).join('');
      if([...sel.options].some(o=>o.value===previous))sel.value=previous;
    }

    function renderPreviousGuests(){
      const select=$('#publicPreviousGuest'),wrap=$('#publicPreviousGuestsWrap'),host=$('#publicPlayerSelect')?.value;
      if(!select||!wrap)return;
      const previousIds=new Set(registrations.filter(r=>r.tournament_id!==regTour.id&&(String(r.registered_by_player_id||'')===String(host)||players.some(p=>p.id===r.player_id&&String(p.guest_of_player_id||'')===String(host)))).map(r=>r.player_id));
      const previous=host?players.filter(p=>p.is_group_member===false&&previousIds.has(p.id)).sort((a,b)=>a.name.localeCompare(b.name)):[];
      wrap.classList.toggle('hidden',!previous.length);
      if(document.activeElement===select)return;
      const old=select.value,html='<option value="">Ajouter un nouvel invité</option>'+previous.map(p=>{const present=registrations.some(r=>r.tournament_id===regTour.id&&r.player_id===p.id&&r.present);return '<option value="'+p.id+'" '+(present?'disabled':'')+'>'+esc(p.name)+(present?' — déjà inscrit':'')+'</option>';}).join('');
      if(select.innerHTML!==html){select.innerHTML=html;if([...select.options].some(o=>o.value===old&&!o.disabled))select.value=old;}
    }
    $('#publicPreviousGuest').onchange=()=>{const p=players.find(p=>p.id===$('#publicPreviousGuest').value);$('#publicGuestName').value=p?.name||'';if(p){$('#publicGuestMember').checked=false;$('#publicGuestPhone').value='';$('#publicGuestPhoneWrap').classList.add('hidden');}};
    $('#publicGuestName').addEventListener('input',()=>{$('#publicPreviousGuest').value='';});
    function updateSelectedRegistrationStatus(){
      renderPreviousGuests();
      const pid=$('#publicPlayerSelect')?.value;
      const status=$('#publicSelectedStatus');
      if(!status)return;
      if(!pid){status.textContent='Choisis ton nom pour voir ton statut et le nombre d’invités qu’il te reste.';return}
      const reg=registrations.find(r=>r.tournament_id===regTour.id&&String(r.player_id)===String(pid)&&r.present);
      const cancelledReg=registrations.find(r=>r.tournament_id===regTour.id&&String(r.player_id)===String(pid)&&!r.present&&r.registration_status==='cancelled');
      const usage=publicGuestUsage(pid);
      const inviteText=usage.remaining>0
        ?' • '+usage.used+'/'+PUBLIC_GUEST_LIMIT+' invité'+(usage.used>1?'s':'')+' utilisé'+(usage.used>1?'s':'')+' — '+usage.remaining+' restant'+(usage.remaining>1?'s':'')+'.'
        :' • '+usage.used+'/'+PUBLIC_GUEST_LIMIT+' invités utilisés — aucune invitation restante.';
      if(!reg){
        status.textContent=(cancelledReg
          ?'🔴 Tu t’es désinscrit de ce Swé. Tu peux te réinscrire tant que les inscriptions sont ouvertes.'
          :(regTour.format==='league'
            ?'⚪ Tu n’es pas encore inscrit à ce Swé.'
            :'⚪ Tu ne participes pas actuellement. Tu peux quand même inviter quelqu’un ci-dessous sans t’inscrire.'))+inviteText;
      }else{
        const assignedTeamIds=new Set(teams.filter(t=>t.tournament_id===regTour.id).map(t=>t.id));
        const inTeam=teamPlayers.some(tp=>String(tp.player_id)===String(pid)&&assignedTeamIds.has(tp.team_id));
        const when=publicRegistrationDateTime(reg.registered_at);
        status.textContent=((reg.registration_status==='waitlist'||reg.is_substitute)
          ?'🟠 Tu es déjà inscrit comme remplaçant pour compléter la prochaine équipe.'
          :(inTeam?'🟢 Tu es déjà inscrit dans une équipe.':'🟢 Tu es déjà inscrit et confirmé.'))+(when?' • Inscription : '+when:'')+inviteText;
      }
      const addGuestBtn=$('#publicAddGuest');
      if(addGuestBtn){
        addGuestBtn.disabled=usage.remaining<=0;
        addGuestBtn.textContent=usage.remaining<=0
          ?'Limite de 5 invités atteinte'
          :'+ Ajouter mon invité ('+usage.remaining+' restant'+(usage.remaining>1?'s':'')+')';
      }
    }
    let publicPaymentSeq=0;
    let publicPaymentCache={playerId:null,status:null,html:null,bg:null,border:null,hidden:false};
    let publicPaymentLoadingFor=null;
    let publicStripeConfirmLastAt=0;
    let publicStripeConfirmRunning=false;
    async function confirmPublicStripePayment(pid,sessionId=null,force=false){
      if(!pid||publicStripeConfirmRunning)return false;
      const now=Date.now();
      if(!force&&now-publicStripeConfirmLastAt<20000)return false;
      publicStripeConfirmLastAt=now;publicStripeConfirmRunning=true;
      try{
        const {data,error}=await sb.functions.invoke('stripe-confirm-entry-payment',{body:{public_token:token,tournament_id:regTour.id,player_id:pid,session_id:sessionId||null}});
        if(error||data?.error)return false;
        if(data?.paid){
          publicPaymentCache={playerId:null,status:null,html:null,bg:null,border:null};
          return true;
        }
        return false;
      }catch(_e){return false;}finally{publicStripeConfirmRunning=false;}
    }
    const publicMoney=cents=>(Number(cents||0)/100).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
    function publicOnsitePriceLabel(){
      const cents=regTour.onsite_entry_fee_cents;
      return cents!=null&&Number.isFinite(Number(cents))&&Number(cents)>=0?publicMoney(cents):'Tarif à confirmer auprès du complexe';
    }
    function applyPublicPaymentView(box,html,bg,border){
      box.className='player';
      box.style.background=bg||'#f8fbff';
      box.style.border=border||'1px solid #cbdcf5';
      if(box.innerHTML!==html)box.innerHTML=html;
    }
    function hidePublicPaymentView(box,pid,status){
      publicPaymentCache={playerId:pid,status,html:'',bg:null,border:null,hidden:true};
      box.className='hidden';
      if(box.innerHTML)box.innerHTML='';
    }
    async function renderPublicPaymentBox(options={}){
      const box=$('#publicPaymentBox');
      if(!box)return;
      const pid=$('#publicPlayerSelect')?.value;
      if(!pid||regTour.status==='finished'){++publicPaymentSeq;publicPaymentLoadingFor=null;publicPaymentCache={playerId:null,status:null,html:null,bg:null,border:null};box.className='hidden';box.innerHTML='';return;}
      const reg=registrations.find(r=>r.tournament_id===regTour.id&&String(r.player_id)===String(pid)&&r.present);
      if(!reg){
        ++publicPaymentSeq;publicPaymentLoadingFor=null;
        publicPaymentCache={playerId:null,status:null,html:null,bg:null,border:null};box.className='hidden';box.innerHTML='';return;
      }
      if(publicPaymentLoadingFor===pid)return;
      const seq=++publicPaymentSeq;
      const samePlayer=publicPaymentCache.playerId===pid&&(publicPaymentCache.hidden||publicPaymentCache.html);
      if(samePlayer){
        if(publicPaymentCache.hidden){box.className='hidden';if(box.innerHTML)box.innerHTML='';}
        else applyPublicPaymentView(box,publicPaymentCache.html,publicPaymentCache.bg,publicPaymentCache.border);
      }else if(!options.backgroundRefresh){
        applyPublicPaymentView(box,'<b>💳 Paiement de la participation</b><div class="muted" style="margin-top:5px">Vérification du statut…</div>','#f8fbff','1px solid #cbdcf5');
      }
      publicPaymentLoadingFor=pid;
      try{
        const [{data,error},{data:choiceData,error:choiceError}]=await Promise.all([
          sb.rpc('public_tournament_payment_status',{p_token:token,p_tournament_id:regTour.id,p_player_id:pid}),
          sb.rpc('public_tournament_payment_choice_status',{p_token:token,p_tournament_id:regTour.id,p_player_id:pid})
        ]);
        if(seq!==publicPaymentSeq||$('#publicPlayerSelect')?.value!==pid||!box.isConnected)return;
        if(error||choiceError){
          if(samePlayer&&publicPaymentCache.hidden)return;
          publicPaymentCache={playerId:null,status:null,html:null,bg:null,border:null,hidden:false};
          applyPublicPaymentView(box,'<b>💳 Paiement de la participation</b><div class="muted" style="margin-top:5px">Statut indisponible pour le moment.</div>','#f8fbff','1px solid #cbdcf5');return;
        }
        const st=data||{};
        if(st.reason==='waitlist'){
          const html='<b>🟠 Paiement en attente de confirmation</b><div class="muted" style="margin-top:5px;line-height:1.6">Tu es actuellement remplaçant. Le paiement sera proposé automatiquement lorsqu’une place confirmée se libérera.</div>';
          publicPaymentCache={playerId:pid,status:st,html,bg:'#fff8e8',border:'1px solid #f2d18a'};applyPublicPaymentView(box,html,publicPaymentCache.bg,publicPaymentCache.border);
          return;
        }
        if(st.reason==='online_disabled'){hidePublicPaymentView(box,pid,st);return;}if(st.reason==='free'||Number(st.entry_fee_cents||0)<=0){hidePublicPaymentView(box,pid,st);return;}
        if(st.payment_status==='paid'){
          const html='<b>✅ Participation payée en ligne</b><div class="muted" style="margin-top:5px">Paiement confirmé par Stripe'+(st.paid_at?' • '+new Date(st.paid_at).toLocaleString('fr-FR',{timeZone:'America/Martinique',dateStyle:'short',timeStyle:'short'}):'')+'.</div>';
          publicPaymentCache={playerId:pid,status:st,html,bg:'#eef8f2',border:'1px solid #b7dfc4'};applyPublicPaymentView(box,html,publicPaymentCache.bg,publicPaymentCache.border);
          return;
        }
        const choice=choiceData||{};
        if(choice.manual_paid_at){
          const html='<b>✅ Participation payée sur place</b><div class="muted" style="margin-top:5px">Le complexe a confirmé la réception de ton paiement'+(choice.manual_paid_at?' • '+new Date(choice.manual_paid_at).toLocaleString('fr-FR',{timeZone:'America/Martinique',dateStyle:'short',timeStyle:'short'}):'')+'.</div>';
          publicPaymentCache={playerId:pid,status:st,html,bg:'#eef8f2',border:'1px solid #b7dfc4'};applyPublicPaymentView(box,html,publicPaymentCache.bg,publicPaymentCache.border);
          return;
        }
        if(choice.payment_preference==='onsite'){
          const html='<b>🏟️ Paiement sur place choisi</b><div style="margin-top:7px">Tarif public sur place : <b style="font-size:1.05rem">'+publicOnsitePriceLabel()+'</b></div><div class="muted" style="margin-top:5px">Ton inscription est enregistrée. Le complexe confirmera ton paiement lorsqu’il le recevra.</div><button id="publicSwitchOnline" style="width:100%;margin-top:10px">💳 Finalement payer en ligne</button>';
          publicPaymentCache={playerId:pid,status:st,html,bg:'#fff8e8',border:'1px solid #f2d18a'};applyPublicPaymentView(box,html,publicPaymentCache.bg,publicPaymentCache.border);
          $('#publicSwitchOnline').onclick=async()=>{await sb.rpc('public_set_tournament_payment_preference',{p_token:token,p_tournament_id:regTour.id,p_player_id:pid,p_preference:'online'});publicPaymentCache={playerId:null,status:null,html:null,bg:null,border:null};await renderPublicPaymentBox({skipStripeReconcile:true});};
          return;
        }
        if(!st.available){
          const html='<b>💳 Paiement en ligne momentanément indisponible</b><div class="muted" style="margin-top:5px">L’organisateur finalise actuellement la configuration des paiements.</div>';
          publicPaymentCache={playerId:pid,status:st,html,bg:'#fff8e8',border:'1px solid #f2d18a'};applyPublicPaymentView(box,html,publicPaymentCache.bg,publicPaymentCache.border);
          return;
        }
        const pending=['created','pending'].includes(String(st.payment_status||''));
        if(pending&&!options.skipStripeReconcile){
          // Réconciliation silencieuse : une actualisation ou un joueur déjà sélectionné
          // ne doit jamais déclencher un popup de confirmation.
          confirmPublicStripePayment(pid,null,false).then(async paid=>{if(paid){await renderPublicPaymentBox({skipStripeReconcile:true});}});
        }
        const html='<div><b style="font-size:1.02rem">💶 Comment veux-tu payer ?</b><div class="muted" style="margin-top:5px">Choisis ton mode de paiement pour cette inscription.</div></div>'+
          '<div class="grid g2" style="gap:9px;margin-top:12px">'+
            '<button id="publicPayEntry" class="primary" style="min-height:64px"><span style="font-size:1.05rem">💳 Payer en ligne</span><br><span style="font-size:.76rem;font-weight:700">Gagner du temps • sécurisé par Stripe</span></button>'+
            '<button id="publicPayOnsite" style="min-height:64px;background:#fff;border:2px solid #178a43;color:#126b34"><span style="font-size:1.05rem">🏟️ Payer sur place</span><br><span style="font-size:.76rem;font-weight:700">'+publicOnsitePriceLabel()+' tarif public</span></button>'+
          '</div>'+
          '<div style="margin-top:12px;padding:10px;border-radius:12px;background:#fff;border:1px solid #e4e8ee"><div style="font-weight:850;font-size:.88rem">Paiement en ligne accepté</div><div class="muted" style="font-size:.70rem;line-height:1.35;margin:3px 0 8px">Selon ton appareil, ton navigateur et les moyens de paiement disponibles sur Stripe.</div><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px">'+
            '<div style="border:1px solid #dfe4ea;border-radius:10px;padding:8px 5px;text-align:center;background:#fff"><div style="display:flex;align-items:center;justify-content:center;gap:6px;height:28px"><span style="font-weight:950;font-size:.72rem;background:#1434CB;color:#fff;border-radius:4px;padding:3px 5px;font-style:italic">VISA</span><span aria-label="Mastercard" style="display:inline-flex;align-items:center"><i style="display:inline-block;width:15px;height:15px;border-radius:50%;background:#EB001B;margin-right:-5px"></i><i style="display:inline-block;width:15px;height:15px;border-radius:50%;background:#F79E1B;opacity:.92"></i></span></div><div class="muted" style="font-size:.67rem">Carte bancaire</div></div>'+
            '<div style="border:1px solid #dfe4ea;border-radius:10px;padding:8px 5px;text-align:center;background:#fff"><div style="height:28px;display:flex;align-items:center;justify-content:center"><img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" style="display:block;max-width:58px;max-height:24px;width:auto;height:auto"></div><div class="muted" style="font-size:.67rem">Apple Pay</div></div>'+
            '<div style="border:1px solid #dfe4ea;border-radius:10px;padding:8px 5px;text-align:center;background:#fff"><div style="height:28px;display:flex;align-items:center;justify-content:center"><img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="Google Pay" style="display:block;max-width:64px;max-height:24px;width:auto;height:auto"></div><div class="muted" style="font-size:.67rem">Google Pay</div></div>'+
            '<div style="border:1px solid #dfe4ea;border-radius:10px;padding:8px 5px;text-align:center;background:#fff"><div style="height:28px;display:flex;align-items:center;justify-content:center"><img src="https://upload.wikimedia.org/wikipedia/commons/7/73/Revolut_logo.svg" alt="Revolut Pay" style="display:block;max-width:72px;max-height:22px;width:auto;height:auto"></div><div class="muted" style="font-size:.67rem">Revolut Pay</div></div>'+
          '</div></div>'+
          (pending?'<div class="muted" style="margin-top:8px">Un paiement en ligne a déjà été commencé mais n’est pas encore confirmé.</div>':'')+
          '<div class="muted" style="margin-top:8px;font-size:.76rem;text-align:center">✨ Paiement en ligne pour gagner du temps, ou paiement sur place au tarif public du complexe.</div>';
        publicPaymentCache={playerId:pid,status:st,html,bg:'#f8fbff',border:'1px solid #cbdcf5'};
        applyPublicPaymentView(box,html,publicPaymentCache.bg,publicPaymentCache.border);
        $('#publicPayEntry').onclick=async()=>{
          const b=$('#publicPayEntry');if(!b)return;b.disabled=true;b.textContent='Ouverture du paiement…';
          await sb.rpc('public_set_tournament_payment_preference',{p_token:token,p_tournament_id:regTour.id,p_player_id:pid,p_preference:'online'});
          const u=new URL(location.href);u.searchParams.delete('stripe');u.searchParams.delete('session_id');u.searchParams.delete('pay_player');
          const sep=u.search?'&':'?';
          const success=u.toString()+sep+'stripe=success&pay_player='+encodeURIComponent(pid)+'&session_id={CHECKOUT_SESSION_ID}';
          const cancel=u.toString()+sep+'stripe=cancel&pay_player='+encodeURIComponent(pid);
          const {data:checkout,error:checkoutError}=await sb.functions.invoke('stripe-create-entry-checkout',{body:{public_token:token,tournament_id:regTour.id,player_id:pid,success_url:success,cancel_url:cancel}});
          if(checkoutError||checkout?.error){b.disabled=false;b.textContent='💳 Payer '+publicMoney(st.total_cents);return toast(checkout?.error||checkoutError?.message||'Impossible d’ouvrir le paiement.');}
          if(checkout?.url)location.href=checkout.url;
          else{b.disabled=false;b.textContent='💳 Payer en ligne';toast('Lien de paiement indisponible.');}
        };
        const onsiteBtn=$('#publicPayOnsite');
        if(onsiteBtn)onsiteBtn.onclick=async()=>{
          onsiteBtn.disabled=true;onsiteBtn.textContent='Enregistrement…';
          const {error}=await sb.rpc('public_set_tournament_payment_preference',{p_token:token,p_tournament_id:regTour.id,p_player_id:pid,p_preference:'onsite'});
          if(error){onsiteBtn.disabled=false;onsiteBtn.textContent='🏟️ Payer sur place';return toast(error.message);}
          publicPaymentCache={playerId:null,status:null,html:null,bg:null,border:null};
          toast('Paiement sur place enregistré ✅');
          await renderPublicPaymentBox({skipStripeReconcile:true});
        };
      }catch(e){
        if(seq===publicPaymentSeq&&!publicPaymentCache.html&&!publicPaymentCache.hidden)applyPublicPaymentView(box,'<b>💳 Paiement de la participation</b><div class="muted" style="margin-top:5px">Statut indisponible pour le moment.</div>','#f8fbff','1px solid #cbdcf5');
      }finally{
        if(seq===publicPaymentSeq&&publicPaymentLoadingFor===pid)publicPaymentLoadingFor=null;
      }
    }

    function renderTeamInvitationDecision(){
      const box=$('#publicTeamInvitationDecision');
      const pid=$('#publicPlayerSelect')?.value;
      if(!box)return;
      const inv=teamInvitations.find(i=>i.tournament_id===regTour.id&&String(i.player_id)===String(pid||'')&&i.status==='pending');
      if(!inv){box.className='hidden';box.style.display='none';box.innerHTML='';return}
      const team=teams.find(t=>String(t.id)===String(inv.team_id));
      const inviter=players.find(pl=>String(pl.id)===String(inv.invited_by_player_id||''));
      box.className='player';
      box.style.display='block';
      box.style.background='#fff8e8';box.style.border='1px solid #f2d18a';
      box.innerHTML='<b>👥 Proposition d’équipe</b><div class="muted" style="margin-top:5px;line-height:1.6">'+
        (inviter?'<b>'+esc(inviter.name)+'</b> t’a proposé de rejoindre ':'Tu as été ajouté à ')+
        '<b>'+esc(team?.name||'cette équipe')+'</b>. Tu restes libre de choisir : si tu refuses, ton inscription est conservée en <b>Équipe aléatoire</b>.</div>'+
        '<div class="row" style="margin-top:10px"><button id="acceptTeamInvitation" class="primary">✅ Accepter l’équipe</button><button id="declineTeamInvitation">🎲 Refuser / équipe aléatoire</button></div>';
      $('#acceptTeamInvitation').onclick=async()=>{
        const b=$('#acceptTeamInvitation');b.disabled=true;
        const {error}=await sb.rpc('public_respond_team_invitation',{p_token:token,p_tournament_id:regTour.id,p_player_id:pid,p_accept:true});
        b.disabled=false;if(error)return toast(error.message);
        toast('Équipe acceptée ✅');await refreshPublicRegistration();
      };
      $('#declineTeamInvitation').onclick=async()=>{
        const b=$('#declineTeamInvitation');b.disabled=true;
        const {error}=await sb.rpc('public_respond_team_invitation',{p_token:token,p_tournament_id:regTour.id,p_player_id:pid,p_accept:false});
        b.disabled=false;if(error)return toast(error.message);
        toast('Tu restes en Équipe aléatoire 🎲');await refreshPublicRegistration();
      };
    }
    refreshPublicPlayerSelect();
    $('#publicPlayerSelect').onchange=()=>{updateSelectedRegistrationStatus();renderTeamInvitationDecision();renderPublicPaymentBox();loadPublicThirdHalfPreference();};
    const payPlayerFromUrl=publicParams.get('pay_player');
    if(payPlayerFromUrl&&[...$('#publicPlayerSelect').options].some(o=>o.value===payPlayerFromUrl))$('#publicPlayerSelect').value=payPlayerFromUrl;
    updateSelectedRegistrationStatus();
    renderTeamInvitationDecision();
    loadPublicThirdHalfRegistration(true);
    loadPublicThirdHalfPreference();
    const stripeReturn=publicParams.get('stripe');
    const stripeSessionId=publicParams.get('session_id');
    if(stripeReturn==='success'&&payPlayerFromUrl){
      // Le popup Stripe n'est autorisé qu'une seule fois pour une vraie session de retour Checkout.
      // Le joueur sélectionné, les rafraîchissements automatiques et les réouvertures de page restent silencieux.
      const returnKey='swe_stripe_return_seen_'+String(stripeSessionId||'no-session');
      const alreadyShown=sessionStorage.getItem(returnKey)==='1';
      if(!alreadyShown){
        sessionStorage.setItem(returnKey,'1');
        toast('Paiement envoyé ✅ Vérification auprès de Stripe…');
      }
      confirmPublicStripePayment(payPlayerFromUrl,stripeSessionId,true).then(async paid=>{
        await renderPublicPaymentBox({skipStripeReconcile:true});
        if(!alreadyShown){
          if(paid)toast('✅ Paiement confirmé par Stripe');
          else toast('Paiement reçu par Stripe, confirmation en cours…');
        }
        // Nettoie immédiatement les paramètres Stripe pour empêcher tout nouveau popup
        // lors d'un refresh, d'un changement de joueur ou d'un retour arrière.
        try{
          const clean=new URL(location.href);
          clean.searchParams.delete('stripe');
          clean.searchParams.delete('session_id');
          clean.searchParams.delete('pay_player');
          history.replaceState({},'',clean.toString());
        }catch(_e){}
      });
    }else{
      renderPublicPaymentBox();
    }
    if(stripeReturn==='cancel')toast('Paiement annulé. Tu peux le reprendre quand tu veux.');
    $('#publicGuestMember').onchange=()=>{
      const wrap=$('#publicGuestPhoneWrap');
      const phone=$('#publicGuestPhone');
      if($('#publicGuestMember').checked){
        wrap.classList.remove('hidden');
        setTimeout(()=>phone.focus(),50);
      }else{
        wrap.classList.add('hidden');
        phone.value='';
      }
    };

    let publicRefreshSeq=0;
    let publicSnapshotSignature='';
    const publicSnapshotFingerprint=snapshot=>{
      const currentTeams=(snapshot.teams||[]).filter(t=>String(t.tournament_id)===String(regTour?.id));
      const currentTeamIds=new Set(currentTeams.map(t=>String(t.id)));
      return JSON.stringify({
      tournament:(snapshot.tournaments||[]).find(t=>String(t.id)===String(regTour?.id))||null,
      players:(snapshot.players||[]).map(p=>[p.id,p.name,p.active,p.is_group_member,p.guest_of_player_id,p.photo_url]),
      registrations:(snapshot.tournament_players||[]).filter(r=>String(r.tournament_id)===String(regTour?.id)),
      teams:currentTeams,
      teamPlayers:(snapshot.team_players||[]).filter(tp=>currentTeamIds.has(String(tp.team_id))),
      invitations:(snapshot.team_player_invitations||[]).filter(i=>String(i.tournament_id)===String(regTour?.id)),
      assignments:snapshot.match_player_assignments||[],
      levels:(snapshot.tournament_group_levels||[]).filter(l=>String(l.tournament_id)===String(regTour?.id))
      });
    };
    publicSnapshotSignature=publicSnapshotFingerprint({tournaments,players,tournament_players:registrations,teams,team_players:teamPlayers,team_player_invitations:teamInvitations,match_player_assignments:matchAssignments,tournament_group_levels:tournamentGroupLevels});
    async function refreshPublicRegistration(){
      const seq=++publicRefreshSeq;
      try{
        const {data,error}=await sb.rpc('get_public_workspace_snapshot_v2',{p_token:token});
        if(error||!data||seq!==publicRefreshSeq)return;
        const nextSignature=publicSnapshotFingerprint(data);
        // Le contrôle périodique ne doit pas refaire bouger toute la page si
        // personne n'a modifié les inscriptions ou l'organisation.
        if(nextSignature===publicSnapshotSignature){
          updateTournamentCountdowns();
          return;
        }
        publicSnapshotSignature=nextSignature;
        players=data.players||players;
        seasons=data.seasons||seasons;
        const freshTour=(data.tournaments||[]).find(t=>t.id===regTour.id);
        if(freshTour)regTour=freshTour;
        tournaments=data.tournaments||tournaments;matches=data.matches||matches;goals=data.goals||goals;
        loadPresentationMetadata().catch(()=>{});
        registrations=data.tournament_players||registrations;
        tournamentGroupLevels=data.tournament_group_levels||tournamentGroupLevels;
        renderPublicQuickStats();
        teams=data.teams||teams;
        teamPlayers=data.team_players||teamPlayers;
        teamInvitations=data.team_player_invitations||teamInvitations;
        matchAssignments=data.match_player_assignments||matchAssignments;
        publishPublicCompositionContext();
        renderPublicRegistrationList();
        refreshPublicPlayerSelect();
        updateSelectedRegistrationStatus();
        renderTeamInvitationDecision();
        renderPublicPaymentBox({backgroundRefresh:true});
        loadPublicThirdHalfRegistration();
        loadPublicThirdHalfPreference();
        // Ne pas reconstruire le formulaire équipe pendant que l’utilisateur le remplit.
        // Le rafraîchissement automatique ne reset plus l'inscription équipe.
        if(typeof renderPublicTeamBuilder==='function'&&!window.__swePublicTeamEditing)renderPublicTeamBuilder();
        refreshSeasonRankings();
        registrationPresentation?.update();
        updateTournamentCountdowns();
      }catch(e){}
    }

    bootState.refresh=refreshPublicRegistration;

    function showRegistrationConfirmation(playerName,data){
      const pos=Number(data?.position||0);
      const isSub=!!data?.is_substitute;
      const subPos=Number(data?.substitute_position||0);
      const nextTeam=Math.ceil(Math.max(11,pos)/5)*5;
      const title=isSub?'🟠 Inscription confirmée — remplaçant':'✅ Inscription confirmée';
      const when=publicRegistrationDateTime(data?.registered_at||new Date().toISOString());
      const detail=isSub
        ? `<b>${esc(playerName)}</b>, tu es le <b>${pos}e inscrit</b> et actuellement <b>remplaçant${subPos?' n°'+subPos:''}</b>.<br>${when?'<span style="font-size:13px;color:#64748b">🕒 Inscrit le '+esc(when)+'</span><br>':''}<br>Pourquoi ? Une nouvelle équipe n’est confirmée que lorsqu’un groupe complet de <b>5 joueurs</b> est atteint. Par exemple, <b>14 inscrits = 2 équipes de 5 + 4 remplaçants</b>. À <b>15 inscrits</b>, ces 5 joueurs deviennent la <b>3e équipe complète</b>.<br><br>Dès que nous atteignons <b>${nextTeam} inscrits</b>, ton statut sera automatiquement mis à jour.`
        : `<b>${esc(playerName)}</b>, ton inscription est bien enregistrée.<br>${when?'<span style="font-size:13px;color:#64748b">🕒 Inscrit le '+esc(when)+'</span><br>':''}<br>Tu es actuellement le <b>${pos}e inscrit</b>.`;
      const old=document.getElementById('registrationConfirmOverlay');if(old)old.remove();
      const ov=document.createElement('div');ov.id='registrationConfirmOverlay';ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
      ov.innerHTML=`<div style="width:min(92vw,440px);background:#fff;border-radius:18px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.28);text-align:center"><div style="font-size:21px;font-weight:900;margin-bottom:12px">${title}</div><div style="font-size:16px;line-height:1.55;color:#334155">${detail}</div><button id="registrationConfirmOk" class="primary" style="margin-top:20px;min-width:150px">OK</button></div>`;
      document.body.appendChild(ov);
      const close=()=>ov.remove();
      ov.querySelector('#registrationConfirmOk').onclick=close;
      ov.onclick=e=>{if(e.target===ov)close()};
    }

    $('#publicJoin').onclick=async()=>{
      if(regTour.format!=='league'&&tournamentDeadlineMs(regTour)!==null&&Date.now()>=tournamentDeadlineMs(regTour))return $('#publicRegStatus').textContent='⛔ Les inscriptions sont terminées.';
      const pid=$('#publicPlayerSelect').value;if(!pid)return $('#publicRegStatus').textContent='Choisis ton nom.';
      const b=$('#publicJoin');b.disabled=true;
      const {data,error}=await sb.rpc('public_tournament_registration',{p_token:token,p_tournament_id:regTour.id,p_player_id:pid,p_action:'join'});
      b.disabled=false;if(error)return $('#publicRegStatus').textContent=error.message;
      const selectedName=($('#publicPlayerSelect').selectedOptions?.[0]?.textContent||'Joueur').replace(/\s+—.*$/,'').trim();
      $('#publicRegStatus').textContent=data?.is_substitute?'🟠 Inscription confirmée : tu es actuellement remplaçant.':'🟢 Inscription confirmée !';
      showRegistrationConfirmation(selectedName,data);
      await refreshPublicRegistration();
    };
    if($('#publicNewPlayerJoin'))$('#publicNewPlayerJoin').onclick=async()=>{
      const name=$('#publicNewPlayerName').value.trim();
      if(!name)return $('#publicRegStatus').textContent='Entre ton nom pour t’inscrire.';
      const b=$('#publicNewPlayerJoin');b.disabled=true;
      const {data,error}=await sb.rpc('public_register_new_tournament_player',{p_token:token,p_tournament_id:regTour.id,p_name:name});
      b.disabled=false;
      if(error)return $('#publicRegStatus').textContent=error.message;
      $('#publicNewPlayerName').value='';
      $('#publicRegStatus').textContent=data?.status==='waitlist'
        ? '🟠 Quota atteint : tu es inscrit comme remplaçant. 🆕 1ère fois'
        : '🟢 Inscription confirmée ! 🆕 1ère fois';
      await refreshPublicRegistration();
    };
    $('#publicLeave').onclick=async()=>{
      const pid=$('#publicPlayerSelect').value;if(!pid)return $('#publicRegStatus').textContent='Choisis ton nom.';
      const b=$('#publicLeave');b.disabled=true;
      const {error}=await sb.rpc('public_tournament_registration',{p_token:token,p_tournament_id:regTour.id,p_player_id:pid,p_action:'absent'});
      b.disabled=false;if(error)return $('#publicRegStatus').textContent=error.message;
      $('#publicRegStatus').textContent='Inscription retirée.';
      await refreshPublicRegistration();
    };
    $('#publicAddGuest').onclick=async()=>{
      if(regTour.format!=='league'&&tournamentDeadlineMs(regTour)!==null&&Date.now()>=tournamentDeadlineMs(regTour))return $('#publicRegStatus').textContent='⛔ Les inscriptions sont terminées.';
      const host=$('#publicPlayerSelect').value;
      const guestName=$('#publicGuestName').value.trim();
      if(!host)return $('#publicRegStatus').textContent='Choisis d’abord ton nom dans la liste ci-dessus. Tu peux ajouter un invité même si tu es déjà inscrit.';
      if(!guestName)return $('#publicRegStatus').textContent='Entre le nom de ton invité.';
      const existingGuest=players.find(p=>p.id===$('#publicPreviousGuest')?.value);
      if(existingGuest&&registrations.some(r=>r.tournament_id===regTour.id&&r.player_id===existingGuest.id&&r.present))return $('#publicRegStatus').textContent='Cet invité est déjà inscrit à cette édition.';
      const usageBefore=publicGuestUsage(host);
      if(usageBefore.remaining<=0)return $('#publicRegStatus').textContent='Tu as déjà utilisé tes 5 invitations pour ce tournoi.';
      const phone=$('#publicGuestPhone').value.trim();
      const addMember=$('#publicGuestMember').checked;
      if(addMember&&!phone)return $('#publicRegStatus').textContent='Pour ajouter ton invité comme membre du groupe, indique son numéro de mobile.';
      const b=$('#publicAddGuest');b.disabled=true;
      const {data,error}=await sb.rpc('public_register_tournament_guest',{p_token:token,p_tournament_id:regTour.id,p_host_player_id:host,p_guest_name:guestName,p_phone_number:phone||null,p_add_as_member:addMember});
      b.disabled=false;if(error)return $('#publicRegStatus').textContent=error.message;
      $('#publicGuestName').value='';$('#publicPreviousGuest').value='';$('#publicGuestPhone').value='';$('#publicGuestMember').checked=false;
      const used=publicGuestUsage(host).used+1;
      const remaining=Math.max(0,PUBLIC_GUEST_LIMIT-used);
      const hostIsRegistered=registrations.some(r=>r.tournament_id===regTour.id&&r.player_id===host&&r.present);
      $('#publicRegStatus').textContent=(data?.status==='waitlist'?'🟠 Quota atteint : l’invité est inscrit comme remplaçant.':'🟢 Invité ajouté et confirmé !')+(data?.member?' Il est aussi enregistré comme membre du groupe.':'')+(!hostIsRegistered&&regTour.format!=='league'?' Tu restes non inscrit au tournoi.':'')+' • '+remaining+' invitation'+(remaining>1?'s':'')+' restante'+(remaining>1?'s':'')+'.';
      await refreshPublicRegistration();
    };
    if(window.__swePublicRegistrationInterval)clearInterval(window.__swePublicRegistrationInterval);
    window.__swePublicRegistrationInterval=window.setInterval(()=>{
      // Inutile d'actualiser un onglet masqué. La comparaison ci-dessus évite
      // toute reconstruction visuelle lorsque les données sont inchangées.
      if(document.visibilityState==='visible')refreshPublicRegistration();
    },30000);
  }else{
    regBox.innerHTML=consultationOnly
      ? '<div class="readonly-note"><b>👁️ Consultation uniquement</b><div class="muted" style="margin-top:5px">Ce lien affiche les résultats, classements et informations publiques du groupe. Pour s’inscrire à un Swé, utilise le lien d’inscription propre au tournoi.</div></div>'
      : '<p class="muted">Aucune inscription ouverte actuellement.</p>';
  }

  const entryChoiceCard=$('#publicEntryChoiceCard');
  const soloCard=$('#publicRegistrationCard');
  const teamCard=$('#publicTeamBuilderCard');
  if(consultationOnly){
    entryChoiceCard?.classList.add('hidden');
    soloCard?.classList.add('hidden');
    teamCard?.classList.add('hidden');
  }
  function setPublicEntryMode(mode){
    if(!entryChoiceCard||!soloCard||!teamCard)return;
    const premium=$('#publicView').classList.contains('swe-premium');
    if(premium&&!mode)mode='solo';
    entryChoiceCard.classList.toggle('hidden',!!mode&&!premium);
    $('#chooseSoloMode')?.setAttribute('aria-pressed',String(mode==='solo'));
    $('#chooseTeamMode')?.setAttribute('aria-pressed',String(mode==='team'));
    soloCard.classList.toggle('hidden',mode!=='solo');
    teamCard.classList.toggle('hidden',mode!=='team');
    if(mode)window.scrollTo({top:0,behavior:(matchMedia('(pointer:coarse)').matches?'auto':'smooth')});
  }
  if(regTour){
    $('#chooseTeamMode').classList.remove('hidden');
    if(regTour.format==='league'){
      const title=entryChoiceCard?.querySelector('.sectiontitle');if(title)title.textContent='🏁 Inscription au Swé de Ligue';
      const help=entryChoiceCard?.querySelector('.muted');if(help)help.innerHTML='Cette page concerne uniquement ce <b>Swé de Ligue</b>. Elle permet de confirmer ta participation à cette journée ou de venir avec ton équipe. L’inscription à la Ligue elle-même utilise un autre lien.';
    }
    const teamBtn=$('#chooseTeamMode');
    if(teamBtn){
      const teamTitle=teamBtn.querySelector('div[style*="font-size:1.2rem"]');
      if(teamTitle)teamTitle.textContent='Je viens avec mon équipe';
      const teamHelp=teamBtn.querySelectorAll('div');
      if(teamHelp.length) teamBtn.title='Équipe de 5 joueurs maximum, avec jusqu’à 4 coéquipiers ou invités';
    }
    $('#chooseSoloMode').onclick=()=>setPublicEntryMode('solo');
    $('#chooseTeamMode').onclick=()=>{
      // Nouvelle ouverture volontaire : repartir d'un formulaire propre.
      window.__swePublicTeamEditing=false;
      renderPublicTeamBuilder();
      setPublicEntryMode('team');
    };
    $('#backFromSoloMode').onclick=()=>setPublicEntryMode(null);
    $('#backFromTeamMode').onclick=()=>{
      window.__swePublicTeamEditing=false;
      setPublicEntryMode(null);
    };
    setPublicEntryMode(null);
  }else if(entryChoiceCard){
    entryChoiceCard.classList.add('hidden');
  }

  if(regTour?.format==='league'){
    // Un lien de Swé de Ligue ne doit jamais afficher les anciens classements de tournoi/saison.
    ['publicTeamRanking','publicSeasonScorers','publicSeasonAssists','publicSeasonWins','publicLastTournamentDetails','publicHistory'].forEach(id=>{
      const el=$('#'+id);const card=el?.closest('.card');if(card)card.classList.add('hidden');
    });
  }

  const teamBuilder=$('#publicTeamBuilder');
  const teamBuilderCard=$('#publicTeamBuilderCard');
  function renderPublicTeamBuilder(){
    if(!teamBuilder||!teamBuilderCard)return;
    if(!regTour){
      teamBuilderCard.classList.add('hidden');return;
    }
    const regs=registrations.filter(r=>r.tournament_id===regTour.id&&r.present&&r.registration_status!=='waitlist');
    const confirmedIds=new Set(regs.map(r=>r.player_id));
    const currentTeamIds=new Set(teams.filter(t=>t.tournament_id===regTour.id).map(t=>t.id));
    const alreadyAssigned=new Set(teamPlayers.filter(tp=>currentTeamIds.has(tp.team_id)).map(tp=>tp.player_id));
    const pendingTeamInviteIds=new Set(teamInvitations.filter(i=>i.tournament_id===regTour.id&&i.status==='pending').map(i=>i.player_id));
    const creators=players.filter(pl=>pl.active&&pl.is_group_member!==false).sort((a,b)=>a.name.localeCompare(b.name));
    teamBuilder.innerHTML=
      '<div class="player" style="background:linear-gradient(145deg,#eef5ff,#f8fbff);border:1px solid #d7e7fb"><div style="font-size:1.05rem;font-weight:800">🔐 Étape 1 — Code équipe</div><div class="muted" style="margin-top:5px;line-height:1.6"><b>Tu viens avec ton équipe ?</b> Demande à <b>Forssa</b> de te communiquer ton <b>code équipe</b> pour pouvoir inscrire ton équipe au tournoi !</div><div class="space"></div><input id="publicTeamCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="Code équipe personnel (6 chiffres)"><div class="space"></div><button id="publicValidateTeamCode" type="button" class="primary" style="width:100%">Valider le code</button><div id="publicTeamCodeStatus" class="muted" style="margin-top:8px"></div></div>'+
      '<div id="publicTeamFormAfterCode" class="hidden">'+
      '<div class="player" style="margin-top:12px;background:#fbfcfd"><div style="font-size:1.05rem;font-weight:800">🙋🏽‍♂️ Étape 2 — Identifie-toi</div><div class="muted" style="margin-top:5px">Choisis ton nom parmi les membres actifs du groupe.</div><div class="space"></div><select id="publicTeamCreator"><option value="">Choisis ton nom</option>'+creators.map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join('')+'</select></div>'+
      '<div class="player" style="margin-top:12px;background:#fbfcfd"><div style="font-size:1.05rem;font-weight:800">🛡️ Étape 3 — Identité de l’équipe</div><div class="muted" style="margin-top:5px">Choisis un nom court et indique obligatoirement la couleur des maillots.</div><div class="space"></div><input id="publicTeamName" maxlength="30" placeholder="Ex. Les Lions, Team Nord, FC Poto..."><div class="space"></div><div id="publicTeamColorChoices" class="row" style="gap:8px;flex-wrap:wrap"><button type="button" data-team-color="#111827" style="background:#111827;color:white">Noir</button><button type="button" data-team-color="#2563eb" style="background:#2563eb;color:white">Bleu</button><button type="button" data-team-color="#f8fafc" style="background:#f8fafc;color:#111827;border:1px solid #cbd5e1">Blanc</button><button type="button" data-team-color="#dc2626" style="background:#dc2626;color:white">Rouge</button><button type="button" data-team-color="#16a34a" style="background:#16a34a;color:white">Vert</button><button type="button" data-team-color="#eab308" style="background:#eab308;color:#111827">Jaune</button><button type="button" data-team-color="#f97316" style="background:#f97316;color:white">Orange</button><button type="button" data-team-color="#7c3aed" style="background:#7c3aed;color:white">Violet</button><button type="button" data-team-color="#ec4899" style="background:#ec4899;color:white">Rose</button><button type="button" data-team-color="#78350f" style="background:#78350f;color:white">Marron</button><button type="button" data-team-color="#64748b" style="background:#64748b;color:white">Gris</button></div><div id="publicTeamColorStatus" class="muted" style="margin-top:6px">Aucune couleur sélectionnée.</div></div>'+
      '<div class="player" style="margin-top:12px"><div style="font-size:1.05rem;font-weight:800">👥 Étape 4 — Compose ton groupe</div><div class="muted" style="margin-top:5px">Ton équipe peut être créée avec <b>1 à 5 joueurs</b>. Lors de la génération, le noyau formé par le créateur, les membres ayant accepté et ses Guests est conservé. Tu n’es donc pas obligé de la compléter tout de suite : lors de la génération finale, les places encore libres seront remplies avec les joueurs inscrits en <b>Équipe aléatoire</b>. Tu peux sélectionner uniquement des membres déjà inscrits au tournoi ; ils devront ensuite confirmer qu’ils acceptent de rejoindre ton équipe. Les invités hors groupe sont ajoutés directement.</div><div id="publicTeamMateBox" style="margin-top:12px"><p class="muted">Sélectionne d’abord ton nom.</p></div><div id="publicTeamSlotsStatus" class="muted" style="margin-top:8px"><b>0/4 coéquipiers ajoutés</b> • 4 places restantes</div><div style="height:1px;background:#e8ecef;margin:14px 0"></div><b>👥 Composition de ton équipe</b><div class="muted" style="margin:4px 0 8px;line-height:1.6">Tu peux compléter les 4 places autour de toi comme tu veux : <b>1 membre + 3 invités</b>, <b>2 membres + 2 invités</b>, <b>3 membres + 1 invité</b> ou <b>4 membres</b>. Le total reste limité à 4 coéquipiers en plus de toi.</div><div class="player" style="background:#fff8e8;border:1px solid #f2d18a;margin:8px 0"><b>ℹ️ Accord des membres</b><div class="muted" style="margin-top:4px;line-height:1.55">Un membre du groupe ajouté ici reçoit une <b>proposition d’équipe</b>. Lorsqu’il sélectionnera son nom sur le lien d’inscription, il pourra <b>accepter</b> ou <b>refuser</b>. S’il refuse, il reste inscrit mais repasse en <b>Équipe aléatoire</b>.</div></div><b>➕ Invités hors groupe</b><div id="publicTeamGuests"><input data-team-guest placeholder="Nom de l’invité 1"></div><div class="row" style="margin-top:8px"><button id="publicAddTeamGuest" type="button" class="primary">+ Ajouter un autre invité</button></div></div>'+
      '<div class="space"></div><button id="publicCreateTeam" class="primary" style="width:100%;padding:14px;font-size:1.05rem">🔥 Valider mon équipe</button>'+
      '<div id="publicTeamStatus" class="muted" style="margin-top:8px"></div></div>';

    const creatorSel=$('#publicTeamCreator');
    const mateBox=$('#publicTeamMateBox');
    const codeInput=$('#publicTeamCode');
    const codeStatus=$('#publicTeamCodeStatus');
    const formAfterCode=$('#publicTeamFormAfterCode');
    let validatedTeamCode='';
    $('#publicValidateTeamCode').onclick=async()=>{
      const code=codeInput.value.trim();
      if(!/^\d{6}$/.test(code)){codeStatus.textContent='Entre un code secret valide à 6 chiffres.';return}
      const {data,error}=await sb.rpc('public_validate_team_code',{p_token:token,p_tournament_id:regTour.id,p_code:code});
      if(error||!data){codeStatus.textContent=error?.message||'Code équipe invalide ou non autorisé. Demande ton code à l’administrateur.';formAfterCode.classList.add('hidden');validatedTeamCode='';return}
      validatedTeamCode=code;
      window.__swePublicTeamEditing=true;
      const ownerId=String(data);
      if([...creatorSel.options].some(o=>o.value===ownerId)){
        creatorSel.value=ownerId;
        creatorSel.disabled=true;
        renderMates();
        const ownerName=players.find(x=>x.id===ownerId)?.name||'membre';
        const existingTeam=teams.find(t=>t.tournament_id===regTour.id&&String(t.created_by_player_id||'')===ownerId&&t.is_preformed===true);
        const createBtn=$('#publicCreateTeam');
        if(existingTeam){
          const directIds=teamPlayers.filter(tp=>tp.team_id===existingTeam.id).map(tp=>tp.player_id);
          const pendingIds=teamInvitations.filter(i=>i.team_id===existingTeam.id&&i.status==='pending').map(i=>i.player_id);
          const occupied=directIds.length+pendingIds.length;
          codeStatus.innerHTML='🟢 Code validé pour <b>'+esc(ownerName)+'</b>. Tu retrouves ton équipe <b>'+esc(existingTeam.name)+'</b> ci-dessous. '+Math.max(0,5-occupied)+' place'+(Math.max(0,5-occupied)>1?'s':'')+' encore disponible'+(Math.max(0,5-occupied)>1?'s':'')+'.';
          const nameInput=$('#publicTeamName');if(nameInput){nameInput.value=existingTeam.name||'';nameInput.disabled=true}
          selectedTeamColor=String(existingTeam.color||'').toLowerCase();
          document.querySelectorAll('#publicTeamColorChoices [data-team-color]').forEach(b=>{
            const active=b.dataset.teamColor===selectedTeamColor;
            b.disabled=true;
            b.style.outline=active?'3px solid #0f5132':'none';
            b.style.outlineOffset=active?'2px':'0';
          });
          const colorStatus=$('#publicTeamColorStatus');if(colorStatus)colorStatus.textContent='👕 Couleur actuelle : '+(document.querySelector('#publicTeamColorChoices [data-team-color="'+selectedTeamColor+'"]')?.textContent||'définie');
          if(createBtn){createBtn.disabled=occupied>=5;createBtn.textContent=occupied>=5?'✅ Équipe complète':'➕ Compléter mon équipe'}
        }else{
          codeStatus.textContent='🟢 Code validé pour '+ownerName+'. Tu peux maintenant composer ton équipe.';
          if(createBtn){createBtn.disabled=false;createBtn.textContent='🔥 Valider mon équipe'}
        }
      }else{
        creatorSel.disabled=false;
        codeStatus.textContent='🟢 Code validé. Choisis ton nom puis compose ton équipe.';
      }
      formAfterCode.classList.remove('hidden');
      requestAnimationFrame(()=>formAfterCode.scrollIntoView({behavior:(matchMedia('(pointer:coarse)').matches?'auto':'smooth'),block:'start'}));
    };
    codeInput.addEventListener('input',()=>{
      if(validatedTeamCode&&codeInput.value.trim()!==validatedTeamCode){
        validatedTeamCode='';
        window.__swePublicTeamEditing=false;
        creatorSel.disabled=false;creatorSel.value='';
        formAfterCode.classList.add('hidden');
        codeStatus.textContent='Le code a été modifié : valide-le à nouveau.';
      }
    });
    function renderMates(){
      const creator=creatorSel.value;
      if(!creator){mateBox.innerHTML='<p class="muted">Sélectionne d’abord ton nom.</p>';return}
      const existingTeam=teams.find(t=>t.tournament_id===regTour.id&&String(t.created_by_player_id||'')===String(creator)&&t.is_preformed===true);
      const directRows=existingTeam?teamPlayers.filter(tp=>tp.team_id===existingTeam.id):[];
      const pendingRows=existingTeam?teamInvitations.filter(i=>i.team_id===existingTeam.id&&i.status==='pending'):[];
      const acceptedRows=existingTeam?teamInvitations.filter(i=>i.team_id===existingTeam.id&&i.status==='accepted'):[];
      const occupiedCount=directRows.length+pendingRows.length;
      const directIds=new Set(directRows.map(tp=>tp.player_id));
      const pendingIds=new Set(pendingRows.map(i=>i.player_id));
      const currentTeamHtml=existingTeam
        ? '<div class="player" style="background:#eef8f2;border:1px solid #b7dfc4;margin-bottom:12px"><b>👥 Ton équipe actuelle — '+esc(existingTeam.name)+'</b><div class="muted" style="margin-top:5px">Les joueurs confirmés et les Guests sont conservés. Les joueurs en attente doivent encore accepter.</div>'+
          directRows.map(tp=>{const pl=players.find(p=>p.id===tp.player_id);return pl?'<div style="margin-top:6px">✅ '+esc(pl.name)+(pl.is_group_member===false?' <span class="guest-badge">Guest</span>':'')+'</div>':''}).join('')+
          pendingRows.map(i=>{const pl=players.find(p=>p.id===i.player_id);return pl?'<div style="margin-top:6px">⏳ '+esc(pl.name)+' <span class="muted">• en attente de confirmation</span></div>':''}).join('')+
          '<div class="muted" style="margin-top:9px"><b>'+occupiedCount+'/5 places réservées</b> • '+Math.max(0,5-occupiedCount)+' place'+(Math.max(0,5-occupiedCount)>1?'s':'')+' à compléter</div></div>'
        : '';
      const available=players.filter(pl=>pl.active&&pl.is_group_member!==false&&pl.id!==creator&&confirmedIds.has(pl.id)).sort((a,b)=>a.name.localeCompare(b.name));
      mateBox.innerHTML=currentTeamHtml+(confirmedIds.has(creator)?'<div class="readonly-note" style="margin-bottom:10px">ℹ️ Tu es déjà inscrit à ce Swé. Ton inscription existante est conservée.</div>':'')+
        '<b>Membres du groupe disponibles</b><div class="muted" style="margin:3px 0 8px;line-height:1.55">Tu peux sélectionner uniquement les <b>membres déjà inscrits et confirmés à ce tournoi</b>. Les membres déjà dans ton équipe ou déjà en attente de confirmation sont affichés ci-dessus et ne sont pas proposés une deuxième fois.</div>'+
        (available.map(pl=>{
          const assigned=alreadyAssigned.has(pl.id);
          const pending=pendingTeamInviteIds.has(pl.id);
          const unavailable=assigned||pending||directIds.has(pl.id)||pendingIds.has(pl.id);
          const registered=confirmedIds.has(pl.id);
          return '<label class="row" style="justify-content:flex-start;margin:5px 0;opacity:'+(unavailable?'.55':'1')+'"><input type="checkbox" data-team-mate="'+pl.id+'" style="width:auto" '+(unavailable?'disabled':'')+'><span>'+esc(pl.name)+(assigned?' <span class="muted">• déjà dans une équipe</span>':(pending?' <span class="muted">• proposition d’équipe en attente</span>':(registered?' <span class="muted">• déjà inscrit</span>':'')))+'</span></label>';
        }).join('')||'<p class="muted">Aucun autre membre déjà inscrit et confirmé n’est disponible pour cette équipe.</p>');
      mateBox.querySelectorAll('[data-team-mate]').forEach(cb=>cb.onchange=()=>{
        const info=teamMateUsage();
        if(info.total>5){
          cb.checked=false;
          toast('Ton équipe est limitée à 5 places, confirmations en attente comprises.');
        }
        updateTeamSlotsStatus();
      });
      updateTeamSlotsStatus();
    }
    creatorSel.onchange=renderMates;
    const guestsBox=$('#publicTeamGuests');

    function teamMateUsage(){
      const creator=creatorSel.value;
      const existingTeam=teams.find(t=>t.tournament_id===regTour.id&&String(t.created_by_player_id||'')===String(creator||'')&&t.is_preformed===true);
      const existingDirect=existingTeam?teamPlayers.filter(tp=>tp.team_id===existingTeam.id).length:1;
      const existingPending=existingTeam?teamInvitations.filter(i=>i.team_id===existingTeam.id&&i.status==='pending').length:0;
      const baseOccupied=existingTeam?(existingDirect+existingPending):1;
      const mateCount=[...mateBox.querySelectorAll('[data-team-mate]:checked')].length;
      const filledGuests=[...guestsBox.querySelectorAll('[data-team-guest]')].map(x=>x.value.trim()).filter(Boolean).length;
      const added=mateCount+filledGuests;
      const total=baseOccupied+added;
      return {mateCount,filledGuests,used:added,total,baseOccupied,remaining:Math.max(0,5-total)};
    }

    function updateTeamSlotsStatus(){
      const info=teamMateUsage();
      const status=$('#publicTeamSlotsStatus');
      if(status)status.innerHTML='<b>'+info.total+'/5 places occupées ou réservées</b> • '+info.remaining+' place'+(info.remaining>1?'s':'')+' restante'+(info.remaining>1?'s':'');
      const addBtn=$('#publicAddTeamGuest');
      if(addBtn){
        addBtn.disabled=info.remaining<=0;
        addBtn.textContent=info.remaining<=0?'Équipe complète (5 joueurs)':'+ Ajouter un autre invité';
      }
    }

    $('#publicAddTeamGuest').onclick=()=>{
      const fields=[...guestsBox.querySelectorAll('[data-team-guest]')];
      const info=teamMateUsage();
      if(info.remaining<=0)return toast('Ton équipe est déjà complète ou toutes ses places sont réservées.');
      // Un champ vide déjà affiché ne consomme pas une place.
      const emptyField=fields.find(x=>!x.value.trim());
      if(emptyField){emptyField.focus();return}
      const input=document.createElement('input');
      input.setAttribute('data-team-guest','');
      input.placeholder='Nom de l’invité '+(fields.length+1);
      input.style.marginTop='8px';
      input.addEventListener('input',updateTeamSlotsStatus);
      guestsBox.appendChild(input);
      input.focus();
      updateTeamSlotsStatus();
    };
    guestsBox.querySelectorAll('[data-team-guest]').forEach(input=>input.addEventListener('input',updateTeamSlotsStatus));
    updateTeamSlotsStatus();

    let selectedTeamColor='';
    document.querySelectorAll('#publicTeamColorChoices [data-team-color]').forEach(btn=>{
      btn.onclick=()=>{
        selectedTeamColor=btn.dataset.teamColor;
        document.querySelectorAll('#publicTeamColorChoices [data-team-color]').forEach(b=>{
          b.style.outline=b===btn?'3px solid #0f5132':'none';
          b.style.outlineOffset=b===btn?'2px':'0';
        });
        const s=$('#publicTeamColorStatus');
        if(s)s.textContent='👕 Couleur choisie : '+btn.textContent;
      };
    });

    $('#publicCreateTeam').onclick=async()=>{
      if(regTour.format!=='league'&&tournamentDeadlineMs(regTour)!==null&&Date.now()>=tournamentDeadlineMs(regTour))return status.textContent='⛔ Les inscriptions sont terminées.';
      const creator=creatorSel.value;
      const code=validatedTeamCode;
      const name=$('#publicTeamName').value.trim();
      const color=selectedTeamColor;
      const status=$('#publicTeamStatus');
      if(!code)return status.textContent='Valide d’abord ton code secret équipe.';
      if(!creator)return status.textContent='Choisis ton nom.';
      if(!name)return status.textContent='Donne un nom à ton équipe.';
      if(!color)return status.textContent='Choisis la couleur des maillots de ton équipe.';
      const mates=[...mateBox.querySelectorAll('[data-team-mate]:checked')].map(x=>x.dataset.teamMate);
      const guests=[...guestsBox.querySelectorAll('[data-team-guest]')].map(x=>x.value.trim()).filter(Boolean);
      const usage=teamMateUsage();
      if(usage.total>5)return status.textContent='Ton équipe ne peut pas dépasser 5 places, joueurs en attente compris.';
      const btn=$('#publicCreateTeam');btn.disabled=true;
      const {data,error}=await sb.rpc('public_create_team_with_member_code_v2',{
        p_token:token,p_tournament_id:regTour.id,p_player_id:creator,p_code:code,p_team_name:name,p_team_color:color,p_player_ids:mates,p_guest_names:guests
      });
      btn.disabled=false;
      if(error){
        const msg=String(error.message||'');
        if(/déjà.*équipe|already.*team/i.test(msg))return status.textContent='Un des nouveaux joueurs sélectionnés appartient déjà à une autre équipe. Retire-le puis réessaie.';
        if(/déjà inscrit|already registered/i.test(msg))return status.textContent='Un joueur sélectionné est déjà inscrit. Il peut être ajouté uniquement s’il n’appartient pas déjà à une autre équipe.';
        return status.textContent=msg;
      }
      status.textContent='🟢 Équipe enregistrée ! Les nouveaux membres sélectionnés ont une proposition à accepter ou refuser. Les joueurs déjà confirmés et les Guests restent dans ton noyau. Les places encore libres seront complétées en Équipe aléatoire lors de la génération finale.';
      window.__swePublicTeamEditing=false;
      $('#publicTeamCode').value='';$('#publicTeamName').value='';validatedTeamCode='';selectedTeamColor='';creatorSel.disabled=false;creatorSel.value='';$('#publicTeamFormAfterCode')?.classList.add('hidden');
      try{
        const snap=await sb.rpc('get_public_workspace_snapshot_v2',{p_token:token});
        if(!snap.error&&snap.data){
          players=snap.data.players||players;registrations=snap.data.tournament_players||registrations;
          teams=snap.data.teams||teams;teamPlayers=snap.data.team_players||teamPlayers;teamInvitations=snap.data.team_player_invitations||teamInvitations;
          renderPublicTeamBuilder();
        }
      }catch(e){}
    };
  }
  if(!window.__swePublicTeamEditing)renderPublicTeamBuilder();


  const TEAM_COLOR_META={
    '#111827':['Noir','Noirs','Noire','Noires'],
    '#2563eb':['Bleu','Bleus','Bleue','Bleues'],
    '#f8fafc':['Blanc','Blancs','Blanche','Blanches'],
    '#dc2626':['Rouge','Rouges'],
    '#16a34a':['Vert','Verts','Verte','Vertes'],
    '#eab308':['Jaune','Jaunes'],
    '#f97316':['Orange','Oranges'],
    '#7c3aed':['Violet','Violets','Violette','Violettes'],
    '#ec4899':['Rose','Roses'],
    '#78350f':['Marron','Marrons'],
    '#64748b':['Gris','Grise','Grises']
  };
  function inferredTeamColor(team){
    if(team?.color)return String(team.color).toLowerCase();
    const name=String(team?.name||'').trim().toLowerCase();
    for(const [hex,names] of Object.entries(TEAM_COLOR_META)){
      if(names.some(n=>n.toLowerCase()===name))return hex;
    }
    return '#eef2f3';
  }
  function teamColorLabel(team){
    const hex=inferredTeamColor(team);
    const meta=TEAM_COLOR_META[hex];
    return meta?meta[0]:'Non précisée';
  }
  function teamTextColor(hex){
    return ['#f8fafc','#eab308'].includes(hex)?'#111827':'#ffffff';
  }

  const pmap=new Map(players.map(x=>[x.id,x]));
  const tmap=new Map(teams.map(x=>[x.id,x]));

  // V40.02 — Vue publique dédiée aux Swés de Ligue : aucune donnée de tournoi classique.
  if(wantsLeagueSession&&regTour){
    const linkedLeague=leagues.find(l=>l.id===regTour.league_id)||null;
    const linkLeagueId=publicParams.get('league');
    if(!linkedLeague || (linkLeagueId&&linkLeagueId!==regTour.league_id)){
      $('#publicView').innerHTML='<header class="top"><h1><img src="./favicon.png?v=4100" class="brand-mark" alt="SWÉ">SWÉ TOURNAMENT 5/5</h1></header><div class="card"><h2 class="sectiontitle">Lien de Ligue indisponible</h2><p class="muted">Ce lien ne correspond pas à la Ligue de ce Swé. Aucun tournoi ne sera affiché à sa place.</p></div>';
      return;
    }

    const leagueTournamentIds=new Set(tournaments.filter(t=>t.format==='league'&&t.league_id===linkedLeague.id).map(t=>t.id));
    const leagueMatches=matches.filter(m=>leagueTournamentIds.has(m.tournament_id));
    const leagueMatchIds=new Set(leagueMatches.map(m=>m.id));
    const leagueTeamIds=new Set();
    leagueMatches.forEach(m=>{leagueTeamIds.add(m.home_team_id);leagueTeamIds.add(m.away_team_id);});
    const leaguePlayerIds=new Set(players.filter(pl=>pl.active&&pl.is_group_member!==false).map(pl=>pl.id));
    teamPlayers.filter(tp=>leagueTeamIds.has(tp.team_id)).forEach(tp=>leaguePlayerIds.add(tp.player_id));
    goals.filter(g=>leagueMatchIds.has(g.match_id)).forEach(g=>{if(g.scorer_player_id)leaguePlayerIds.add(g.scorer_player_id);if(g.assister_player_id)leaguePlayerIds.add(g.assister_player_id);});
    const stats=new Map(players.filter(pl=>leaguePlayerIds.has(pl.id)).map(pl=>[pl.id,{id:pl.id,name:pl.name,g:0,a:0,w:0}]));
    goals.filter(g=>leagueMatchIds.has(g.match_id)).forEach(g=>{if(stats.has(g.scorer_player_id))stats.get(g.scorer_player_id).g++;if(g.assister_player_id&&stats.has(g.assister_player_id))stats.get(g.assister_player_id).a++;});
    leagueMatches.forEach(m=>{const hs=Number(m.home_score||0),as=Number(m.away_score||0);if(hs===as)return;const winner=hs>as?m.home_team_id:m.away_team_id;teamPlayers.filter(tp=>tp.team_id===winner).forEach(tp=>{if(stats.has(tp.player_id))stats.get(tp.player_id).w++;});});
    function leagueRanks(arr,key){let prev=null,rank=0;return arr.sort((a,b)=>b[key]-a[key]||a.name.localeCompare(b.name)).map((x,i)=>{if(x[key]!==prev){rank=i+1;prev=x[key]}return {...x,rank};});}
    const scorers=leagueRanks([...stats.values()].filter(x=>x.g>0),'g');
    const assists=leagueRanks([...stats.values()].filter(x=>x.a>0),'a');
    const winners=leagueRanks([...stats.values()].filter(x=>x.w>0),'w');

    const sessionRegs=registrations.filter(r=>r.tournament_id===regTour.id);
    const confirmed=sessionRegs.filter(r=>r.present&&r.registration_status!=='waitlist').length;
    const waiting=sessionRegs.filter(r=>r.registration_status==='waitlist').length;
    const leagueMembers=players.filter(pl=>pl.active&&confirmedLeagueIds.has(pl.id)).sort((a,b)=>a.name.localeCompare(b.name));

    const sessions=tournaments.filter(t=>t.format==='league'&&t.league_id===linkedLeague.id).sort((a,b)=>String(a.tournament_date).localeCompare(String(b.tournament_date)));
    const played=sessions.filter(s=>leagueMatches.some(m=>m.tournament_id===s.id));
    const latestSession=played.length?played[played.length-1]:null;
    const latestMatch=latestSession?(leagueMatches.filter(m=>m.tournament_id===latestSession.id).pop()||null):null;

    let lastSweHtml='<div class="card" style="background:#f8fbf9"><h2 class="sectiontitle">🔥 Dernier Swé de la Ligue</h2><p class="muted">Aucun match n’a encore été joué dans cette Ligue. Aucune équipe de tournoi n’est affichée.</p></div>';
    if(latestSession&&latestMatch){
      const home=tmap.get(latestMatch.home_team_id),away=tmap.get(latestMatch.away_team_id);
      const teamCard=team=>{if(!team)return '';const members=teamPlayers.filter(tp=>tp.team_id===team.id).map(tp=>pmap.get(tp.player_id)).filter(Boolean);return '<div class="public-team-card"><div class="public-team-head"><b>'+esc(team.name)+'</b></div><div class="public-team-players">'+(members.map(pl=>'<div class="public-team-player swe-player-with-avatar">'+playerAvatarHtml(pl)+esc(pl.name)+'</div>').join('')||'<div class="muted">Composition non enregistrée</div>')+'</div></div>';};
      lastSweHtml='<div class="card"><h2 class="sectiontitle">🔥 Dernier Swé de la Ligue</h2><div class="muted">'+esc(latestSession.name||latestSession.tournament_date)+' • '+esc(latestSession.tournament_date)+'</div><div class="player" style="margin-top:10px"><div class="row" style="justify-content:space-between;gap:8px"><b>'+esc(home?.name||'Équipe A')+'</b><span class="score">'+Number(latestMatch.home_score||0)+' - '+Number(latestMatch.away_score||0)+'</span><b>'+esc(away?.name||'Équipe B')+'</b></div></div><div style="display:flex;gap:12px;overflow-x:auto;margin-top:12px">'+teamCard(home)+teamCard(away)+'</div></div>';
    }

    $('#publicView').innerHTML=
      '<header class="top"><h1>🏁 '+esc(linkedLeague.name)+'</h1><div class="public-sub">SWÉ TOURNAMENT 5/5 • Inscription au Swé de Ligue</div></header>'+
      '<div class="card"><h2 class="sectiontitle">✅ Inscription à ce Swé</h2>'+
        '<div class="player" style="background:#f8fbf9"><b>'+esc(regTour.name||('Swé du '+regTour.tournament_date))+'</b><div class="muted">'+esc(regTour.tournament_date)+' • 1 match d’environ 60 min</div></div>'+
        '<div class="grid g3" style="margin-top:10px"><div class="player"><span class="muted">📍 Terrain réservé</span><br><b>'+esc(regTour.venue||'À préciser')+'</b></div><div class="player"><span class="muted">🕘 Heure</span><br><b>'+esc(regTour.start_time?String(regTour.start_time).slice(0,5):'À préciser')+'</b></div><div class="player"><span class="muted">💶 Prix</span><br><b>'+(Number(regTour.entry_fee_cents||0)/100).toLocaleString('fr-FR',{minimumFractionDigits:Number(regTour.entry_fee_cents||0)%100?2:0,maximumFractionDigits:2})+' € / participant</b></div></div>'+
        (regTour.reservation_reference?'<div class="muted" style="margin-top:8px">Réservation : <b>'+esc(regTour.reservation_reference)+'</b></div>':'')+
        '<div class="muted" style="margin:10px 0">Ce lien concerne uniquement ce Swé. Les informations affichées en dessous concernent uniquement la Ligue <b>'+esc(linkedLeague.name)+'</b>.</div>'+
        '<div class="player"><b>'+confirmed+'/'+(regTour.max_players||100)+' confirmés</b>'+(waiting?' • '+waiting+' remplaçant'+(waiting>1?'s':''):'')+'</div>'+
        '<div class="readonly-note" style="margin:10px 0"><b>Tu es membre de la Ligue ?</b> Cela te permet de t’inscrire ici, mais tu n’es participant à ce Swé que si tu cliques sur « Je participe à ce Swé ».</div>'+
        '<div class="space"></div><select id="leagueSessionPublicPlayer"><option value="">Choisis ton nom parmi les membres de la Ligue</option>'+leagueMembers.map(pl=>'<option value="'+pl.id+'">'+esc(pl.name)+'</option>').join('')+'</select>'+
        '<div class="space"></div><div class="row"><button id="leagueSessionPublicJoin" class="primary">✅ Je participe à CE Swé</button><button id="leagueSessionPublicLeave">❌ Je ne participe pas à CE Swé</button></div>'+
        '<div id="leagueSessionPublicStatus" class="muted" style="margin-top:8px"></div>'+
        '<h3 style="margin-top:18px">👥 Participants inscrits à CE Swé</h3><div class="muted" style="margin-bottom:8px">Cette liste est indépendante de la liste des membres de la Ligue.</div><div id="leagueSessionPublicRegistered"></div>'+
      '</div>'+
      '<div class="card"><h2 class="sectiontitle">🏁 '+esc(linkedLeague.name)+'</h2><div class="player"><b>Saison :</b> '+esc(linkedLeague.starts_on)+(linkedLeague.ends_on?' → '+esc(linkedLeague.ends_on):'')+'</div><div class="muted" style="margin-top:8px">Informations de la Ligue sélectionnée uniquement.</div></div>'+
      '<div class="grid g3">'+
        '<div class="card"><h2 class="sectiontitle">⚽ Meilleurs buteurs</h2>'+(scorers.map(x=>'<div class="rank"><b>'+x.rank+'</b><span>'+esc(x.name)+'</span><b class="right">'+x.g+' but'+(x.g>1?'s':'')+'</b></div>').join('')||'<p class="muted">Aucun but pour le moment.</p>')+'</div>'+
        '<div class="card"><h2 class="sectiontitle">🎯 Meilleurs passeurs</h2>'+(assists.map(x=>'<div class="rank"><b>'+x.rank+'</b><span>'+esc(x.name)+'</span><b class="right">'+x.a+' passe'+(x.a>1?'s':'')+'</b></div>').join('')||'<p class="muted">Aucune passe pour le moment.</p>')+'</div>'+
        '<div class="card"><h2 class="sectiontitle">👑 Top Player</h2><div class="muted" style="margin-bottom:8px">Nombre de Swés de Ligue gagnés.</div>'+(winners.map(x=>'<div class="rank"><b>'+(x.rank===1?'👑':x.rank)+'</b><span>'+esc(x.name)+'</span><b class="right">'+x.w+' victoire'+(x.w>1?'s':'')+'</b></div>').join('')||'<p class="muted">Aucune victoire pour le moment.</p>')+'</div>'+
      '</div>'+lastSweHtml;

    const renderRegistered=()=>{$('#leagueSessionPublicRegistered').innerHTML=sessionRegs.filter(r=>r.present).map(r=>{const pl=pmap.get(r.player_id);return '<div class="player row"><span style="flex:1">'+esc(pl?.name||'Joueur')+'</span><span class="guest-badge">'+(r.registration_status==='waitlist'||r.is_substitute?'Remplaçant':'Confirmé')+'</span></div>';}).join('')||'<p class="muted">Aucun inscrit pour le moment.</p>';};
    renderRegistered();
    $('#leagueSessionPublicJoin').onclick=async()=>{const pid=$('#leagueSessionPublicPlayer').value;if(!pid)return $('#leagueSessionPublicStatus').textContent='Choisis ton nom.';const b=$('#leagueSessionPublicJoin');b.disabled=true;const {data,error}=await sb.rpc('public_tournament_registration',{p_token:token,p_tournament_id:regTour.id,p_player_id:pid,p_action:'join'});b.disabled=false;if(error)return $('#leagueSessionPublicStatus').textContent=error.message;$('#leagueSessionPublicStatus').textContent=data?.status==='waitlist'?'🟠 Tu es inscrit comme remplaçant.':'🟢 Inscription au Swé confirmée !';setTimeout(()=>location.reload(),450);};
    $('#leagueSessionPublicLeave').onclick=async()=>{const pid=$('#leagueSessionPublicPlayer').value;if(!pid)return $('#leagueSessionPublicStatus').textContent='Choisis ton nom.';const b=$('#leagueSessionPublicLeave');b.disabled=true;const {error}=await sb.rpc('public_tournament_registration',{p_token:token,p_tournament_id:regTour.id,p_player_id:pid,p_action:'absent'});b.disabled=false;if(error)return $('#leagueSessionPublicStatus').textContent=error.message;$('#leagueSessionPublicStatus').textContent='Inscription retirée.';setTimeout(()=>location.reload(),450);};
    return;
  }

  function tournamentStandings(tournamentId){
    const tt=teams.filter(x=>x.tournament_id===tournamentId);
    const rows=tt.map(x=>({id:x.id,name:x.name,mj:0,v:0,n:0,d:0,bp:0,bc:0,pts:0}));
    const map=new Map(rows.map(x=>[x.id,x]));
    matches.filter(m=>m.tournament_id===tournamentId).forEach(m=>{
      const home=map.get(m.home_team_id),away=map.get(m.away_team_id); if(!home||!away)return;
      home.mj++;away.mj++;home.bp+=Number(m.home_score||0);home.bc+=Number(m.away_score||0);away.bp+=Number(m.away_score||0);away.bc+=Number(m.home_score||0);
      if(Number(m.home_score)>Number(m.away_score)){home.v++;away.d++;home.pts+=3}
      else if(Number(m.away_score)>Number(m.home_score)){away.v++;home.d++;away.pts+=3}
      else{home.n++;away.n++;home.pts++;away.pts++}
    });
    rows.sort((a,b)=>b.pts-a.pts||(b.bp-b.bc)-(a.bp-a.bc)||b.bp-a.bp||a.name.localeCompare(b.name));
    return rows;
  }

  const activeSeason=seasons.find(x=>x.is_active)||seasons[0];
  let scor=[],seasonAss=[];
  function collectSeasonRankings(){
    const season=seasons.find(x=>x.is_active)||seasons[0];
    const tids=new Set(tournaments.filter(x=>x.format!=='league'&&(!season||x.season_id===season.id)).map(x=>x.id));
    const mids=new Set(matches.filter(x=>tids.has(x.tournament_id)).map(x=>x.id));
    const gs=new Map(players.map(x=>[x.id,{id:x.id,name:x.name,g:0,a:0,guest:x.is_group_member===false}]));
    goals.filter(g=>mids.has(g.match_id)&&!g.is_own_goal).forEach(g=>{if(gs.has(g.scorer_player_id))gs.get(g.scorer_player_id).g++;if(gs.has(g.assister_player_id))gs.get(g.assister_player_id).a++;});
    const rankBy=key=>{let previous=null,rank=0;return [...gs.values()].filter(x=>x[key]).sort((a,b)=>b[key]-a[key]||a.name.localeCompare(b.name)).map((x,i)=>{if(x[key]!==previous){previous=x[key];rank=i+1}return {...x,rank}})};
    scor=rankBy('g');seasonAss=rankBy('a');
  }
  collectSeasonRankings();
  let publicScorersExpanded=false;
  const renderPublicSeasonScorers=()=>{
    const visible=publicScorersExpanded?scor:scor.slice(0,10);
    $('#publicSeasonScorers').innerHTML=visible.map(x=>'<div class="rank '+(x.guest?'guest-row':'')+'"><b>'+x.rank+'</b><span>'+esc(x.name)+(x.guest?' <span class="guest-badge">Guest</span>':'')+'</span><b class="right">'+x.g+' but'+(x.g>1?'s':'')+'</b></div>').join('')||'<p class="muted">Aucun but enregistré.</p>';
    const b=$('#togglePublicSeasonScorers');if(b){b.classList.toggle('hidden',scor.length<=10);b.textContent=publicScorersExpanded?'Réduire':'Développer';}
  };
  renderPublicSeasonScorers();
  if($('#togglePublicSeasonScorers'))$('#togglePublicSeasonScorers').onclick=()=>{publicScorersExpanded=!publicScorersExpanded;renderPublicSeasonScorers();};

  let publicAssistsExpanded=false;
  const renderPublicSeasonAssists=()=>{
    const visible=publicAssistsExpanded?seasonAss:seasonAss.slice(0,10);
    $('#publicSeasonAssists').innerHTML=visible.map(x=>'<div class="rank '+(x.guest?'guest-row':'')+'"><b>'+x.rank+'</b><span>'+esc(x.name)+(x.guest?' <span class="guest-badge">Guest</span>':'')+'</span><b class="right">'+x.a+' passe'+(x.a>1?'s':'')+'</b></div>').join('')||'<p class="muted">Aucune passe enregistrée.</p>';
    const b=$('#togglePublicSeasonAssists');if(b){b.classList.toggle('hidden',seasonAss.length<=10);b.textContent=publicAssistsExpanded?'Réduire':'Développer';}
  };
  renderPublicSeasonAssists();
  if($('#togglePublicSeasonAssists'))$('#togglePublicSeasonAssists').onclick=()=>{publicAssistsExpanded=!publicAssistsExpanded;renderPublicSeasonAssists();};

  function renderTournamentTopFive(){
    const box=$('#publicTournamentTopFive');if(!box)return false;
    const seasonId=regTour?.season_id||activeSeason?.id;
    const season=seasons.find(s=>s.id===seasonId)||activeSeason;
    const seasonTournamentIds=new Set(tournaments.filter(t=>t.format!=='league'&&(!seasonId||t.season_id===seasonId)).map(t=>t.id));
    const finishedTournamentIds=new Set(tournaments.filter(t=>t.status==='finished'&&seasonTournamentIds.has(t.id)).map(t=>t.id));
    const completed=matches.filter(m=>m.status==='finished'||finishedTournamentIds.has(m.tournament_id));
    const rows=publicPlayerRatingsEnabled&&seasonTournamentIds.size?topPlayersFromData(completed,goals,matchAssignments,players,seasonTournamentIds).slice(0,5):[];
    box.classList.toggle('hidden',!rows.length);if(!rows.length){box.replaceChildren();return false;}
    const html='<div class="top-five-heading"><small>LES JOUEURS À L’HONNEUR</small><h2>👑 Top 5 de la saison</h2><p>'+esc(season?.name||'Saison en cours')+' · Tous les résultats validés de la saison</p></div><ol>'+rows.map((x,i)=>'<li><span class="top-five-rank" aria-label="Place '+(i+1)+'">'+(i+1)+'</span><span class="top-five-name">'+esc(x.name)+'<span class="top-five-detail">'+x.matches+' match'+(x.matches>1?'s':'')+' · ⚽ '+x.g+' · 🎯 '+x.a+'</span></span><span class="top-five-score">'+x.avg.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})+'<small>/10</small></span></li>').join('')+'</ol><p class="top-five-caption">Moyenne de la saison · tous les matchs des tournois terminés sont cumulés.</p>';
    if(box.innerHTML!==html)box.innerHTML=html;return true;
  }
  refreshSeasonRankings=()=>{collectSeasonRankings();renderPublicSeasonScorers();renderPublicSeasonAssists();const hasTop=renderTournamentTopFive();if(regTour){$('#publicSeasonScorers')?.closest('.card')?.classList.toggle('hidden',!scor.length);$('#publicSeasonAssists')?.closest('.card')?.classList.toggle('hidden',!seasonAss.length);$('#registrationSeasonRankings')?.classList.toggle('hidden',!scor.length&&!seasonAss.length&&!hasTop);}};
  renderTournamentTopFive();

  const seasonWinStats=new Map(players.map(x=>[x.id,{id:x.id,name:x.name,matchWins:0,tournamentWins:0,g:0,a:0,avg:0,ratingTotal:0,ratingMatches:0,guest:x.is_group_member===false}]));
  const seasonTours=tournaments.filter(t=>t.format!=='league'&&t.status==='finished'&&(!activeSeason||t.season_id===activeSeason.id));
  const seasonTourIdsForWins=new Set(seasonTours.map(t=>t.id));
  const seasonMatchesForWins=matches.filter(m=>seasonTourIdsForWins.has(m.tournament_id));
  const seasonMatchIdsForWins=new Set(seasonMatchesForWins.map(m=>m.id));

  goals.filter(g=>seasonMatchIdsForWins.has(g.match_id)).forEach(g=>{
    if(seasonWinStats.has(g.scorer_player_id))seasonWinStats.get(g.scorer_player_id).g++;
    if(g.assister_player_id&&seasonWinStats.has(g.assister_player_id))seasonWinStats.get(g.assister_player_id).a++;
  });

  seasonMatchesForWins.forEach(m=>{
    let winner=null;
    if(Number(m.home_score)>Number(m.away_score))winner=m.home_team_id;
    else if(Number(m.away_score)>Number(m.home_score))winner=m.away_team_id;
    matchAssignments.filter(a=>a.match_id===m.id&&a.team_id).forEach(a=>{
      const s=seasonWinStats.get(a.player_id);if(!s)return;
      if(winner&&String(a.team_id)===String(winner))s.matchWins++;
      if(publicPlayerRatingsEnabled){
        const rr=ratingForMatchPlayer(m,a.player_id,a.team_id,goals);
        if(rr){s.ratingTotal+=rr.rating;s.ratingMatches++;}
      }
    });
  });

  seasonTours.forEach(t=>{
    const standings=tournamentStandings(t.id);
    const champion=standings[0];
    if(!champion)return;
    const tMatchIds=new Set(matches.filter(m=>m.tournament_id===t.id).map(m=>m.id));
    const championPlayers=new Set(matchAssignments.filter(a=>tMatchIds.has(a.match_id)&&String(a.team_id)===String(champion.id)).map(a=>a.player_id));
    championPlayers.forEach(pid=>{if(seasonWinStats.has(pid))seasonWinStats.get(pid).tournamentWins++});
  });
  seasonWinStats.forEach(s=>{s.avg=s.ratingMatches?s.ratingTotal/s.ratingMatches:0;});
  const winRows=[...seasonWinStats.values()].filter(x=>x.matchWins||x.tournamentWins||x.g||x.a)
    .sort((a,b)=>b.tournamentWins-a.tournamentWins||b.matchWins-a.matchWins||b.g-a.g||b.a-a.a||b.avg-a.avg||a.name.localeCompare(b.name));
  let publicWinsExpanded=false;
  const renderPublicSeasonWins=()=>{
    const visible=publicWinsExpanded?winRows:winRows.slice(0,5);
    $('#publicSeasonWins').innerHTML=visible.map((x,i)=>
      '<div class="rank '+(x.guest?'guest-row':'')+'"><b>'+(winRows.indexOf(x)+1)+'</b><span><b>'+esc(x.name)+'</b>'+(x.guest?' <span class="guest-badge">Guest</span>':'')+
      '<div class="muted">'+x.matchWins+' victoire'+(x.matchWins>1?'s':'')+' • ⚽ '+x.g+' • 🎯 '+x.a+(publicPlayerRatingsEnabled&&x.ratingMatches?' • ⭐ '+x.avg.toFixed(1)+'/10':'')+'</div></span>'+
      '<b class="right">🏆 '+x.tournamentWins+'</b></div>'
    ).join('')||'<p class="muted">Aucune victoire enregistrée pour cette saison.</p>';
    const b=$('#togglePublicSeasonWins');if(b){b.classList.toggle('hidden',winRows.length<=5);b.textContent=publicWinsExpanded?'Réduire':'Développer la liste';}
  };
  renderPublicSeasonWins();
  if($('#togglePublicSeasonWins'))$('#togglePublicSeasonWins').onclick=()=>{publicWinsExpanded=!publicWinsExpanded;renderPublicSeasonWins();};

  if(publicPlayerRatingsEnabled){
    const topWrap=$('#publicTopPlayerSeasonWrap'),topBox=$('#publicSeasonTopPlayers');
    if(topWrap)topWrap.classList.remove('hidden');
    const top=topPlayersFromData(seasonMatchesForWins,goals,matchAssignments,players,seasonTourIdsForWins).slice(0,10);
    if(topBox)topBox.innerHTML=top.map((x,i)=>'<div class="rank '+(x.guest?'guest-row':'')+'"><b>'+(i===0?'👑':(i+1))+'</b><span><b>'+esc(x.name)+'</b><div class="muted">'+x.matches+' match'+(x.matches>1?'s':'')+' • ⚽ '+x.g+' • 🎯 '+x.a+'</div></span><b class="right">⭐ '+x.avg.toFixed(1)+'</b></div>').join('')||'<p class="muted">Aucune note disponible.</p>';
  }

  const historySeason=regTour?.season_id||seasons.find(s=>s.is_active)?.id||null;
  const finishedHistory=tournaments.filter(t=>t.status==='finished'&&t.format!=='league'&&(!historySeason||t.season_id===historySeason));
  const latest=finishedHistory[0]||null;
  if(latest){
    const lteams=teams.filter(x=>x.tournament_id===latest.id);
    const lm=matches.filter(m=>m.tournament_id===latest.id).sort((a,b)=>(a.match_order||0)-(b.match_order||0));
    const latestMatchIds=new Set(lm.map(m=>m.id));

    const tournamentGoalStats=new Map(players.map(x=>[x.id,{id:x.id,name:x.name,g:0,a:0,guest:x.is_group_member===false}]));
    goals.filter(g=>latestMatchIds.has(g.match_id)).forEach(g=>{
      if(tournamentGoalStats.has(g.scorer_player_id))tournamentGoalStats.get(g.scorer_player_id).g++;
      if(g.assister_player_id&&tournamentGoalStats.has(g.assister_player_id))tournamentGoalStats.get(g.assister_player_id).a++;
    });
    let tournamentScorers=[...tournamentGoalStats.values()].filter(x=>x.g)
      .sort((a,b)=>b.g-a.g||b.a-a.a||a.name.localeCompare(b.name));
    let tPrev=null,tRank=0;
    tournamentScorers=tournamentScorers.map((x,i)=>{
      if(x.g!==tPrev){tRank=i+1;tPrev=x.g}
      return {...x,rank:tRank};
    });
    let publicTournamentScorersExpanded=false;
    const renderTournamentScorers=()=>{
      const visible=publicTournamentScorersExpanded?tournamentScorers:tournamentScorers.slice(0,10);
      $('#publicTournamentScorers').innerHTML=visible.map(x=>
        '<div class="rank '+(x.guest?'guest-row':'')+'"><b>'+x.rank+'</b><span>'+esc(x.name)+(x.guest?' <span class="guest-badge">Guest</span>':'')+'</span><b class="right">'+x.g+' but'+(x.g>1?'s':'')+'</b></div>'
      ).join('')||'<p class="muted">Aucun but enregistré.</p>';
    };
    renderTournamentScorers();

    let tournamentAss=[...tournamentGoalStats.values()].filter(x=>x.a)
      .sort((a,b)=>b.a-a.a||b.g-a.g||a.name.localeCompare(b.name));
    let taPrev=null,taRank=0;
    tournamentAss=tournamentAss.map((x,i)=>{
      if(x.a!==taPrev){taRank=i+1;taPrev=x.a}
      return {...x,rank:taRank};
    });
    let publicTournamentAssistsExpanded=false;
    const renderTournamentAssists=()=>{
      const visible=publicTournamentAssistsExpanded?tournamentAss:tournamentAss.slice(0,10);
      $('#publicTournamentAssists').innerHTML=visible.map(x=>
        '<div class="rank '+(x.guest?'guest-row':'')+'"><b>'+x.rank+'</b><span>'+esc(x.name)+(x.guest?' <span class="guest-badge">Guest</span>':'')+'</span><b class="right">'+x.a+' passe'+(x.a>1?'s':'')+'</b></div>'
      ).join('')||'<p class="muted">Aucune passe enregistrée.</p>';
    };
    renderTournamentAssists();
    const btnTournamentScorers=$('#togglePublicTournamentScorers');
    if(btnTournamentScorers){
      btnTournamentScorers.classList.toggle('hidden',tournamentScorers.length<=10);
      btnTournamentScorers.onclick=()=>{publicTournamentScorersExpanded=!publicTournamentScorersExpanded;renderTournamentScorers();btnTournamentScorers.textContent=publicTournamentScorersExpanded?'Réduire':'Développer';};
    }
    const btnTournamentAssists=$('#togglePublicTournamentAssists');
    if(btnTournamentAssists){
      btnTournamentAssists.classList.toggle('hidden',tournamentAss.length<=10);
      btnTournamentAssists.onclick=()=>{publicTournamentAssistsExpanded=!publicTournamentAssistsExpanded;renderTournamentAssists();btnTournamentAssists.textContent=publicTournamentAssistsExpanded?'Réduire':'Développer';};
    }
    if(publicPlayerRatingsEnabled){
      const wrap=$('#publicTournamentTopPlayerWrap'),boxTop=$('#publicTournamentTopPlayers'),btnTop=$('#togglePublicTournamentTopPlayers');
      if(wrap)wrap.classList.remove('hidden');
      const topTournament=topPlayersFromData(lm,goals,matchAssignments,players,new Set([latest.id]));
      let publicTournamentTopExpanded=false;
      const renderTournamentTop=()=>{
        const visible=publicTournamentTopExpanded?topTournament:topTournament.slice(0,10);
        if(boxTop)boxTop.innerHTML=visible.map((x,i)=>{
          const pos=topTournament.indexOf(x)+1;
          return '<div class="rank '+(x.guest?'guest-row':'')+'"><b>'+(pos===1?'👑':pos)+'</b><span><b>'+esc(x.name)+'</b><div class="muted">'+x.matches+' match'+(x.matches>1?'s':'')+' • ⚽ '+x.g+' • 🎯 '+x.a+'</div></span><b class="right">⭐ '+x.avg.toFixed(1)+'</b></div>';
        }).join('')||'<p class="muted">Aucune note disponible.</p>';
        if(btnTop){btnTop.classList.toggle('hidden',topTournament.length<=10);btnTop.textContent=publicTournamentTopExpanded?'Réduire':'Développer';}
      };
      renderTournamentTop();
      if(btnTop)btnTop.onclick=()=>{publicTournamentTopExpanded=!publicTournamentTopExpanded;renderTournamentTop();};
    }
    const trs=lteams.map(x=>({id:x.id,name:x.name,mj:0,v:0,n:0,d:0,bp:0,bc:0,pts:0}));
    const trm=new Map(trs.map(x=>[x.id,x]));
    lm.forEach(m=>{
      const h=trm.get(m.home_team_id),a=trm.get(m.away_team_id);if(!h||!a)return;
      h.mj++;a.mj++;h.bp+=m.home_score;h.bc+=m.away_score;a.bp+=m.away_score;a.bc+=m.home_score;
      if(m.home_score>m.away_score){h.v++;a.d++;h.pts+=3}
      else if(m.away_score>m.home_score){a.v++;h.d++;a.pts+=3}
      else{h.n++;a.n++;h.pts++;a.pts++}
    });
    trs.sort((a,b)=>b.pts-a.pts||(b.bp-b.bc)-(a.bp-a.bc)||b.bp-a.bp||a.name.localeCompare(b.name));
    $('#publicTeamRanking').innerHTML=trs.map((x,i)=>'<div class="rank"><b>'+(i===0?'👑':(i+1))+'</b><span><b>'+esc(x.name)+'</b><div class="muted">'+x.mj+' MJ • '+x.v+' V • '+x.n+' N • '+x.d+' D • '+x.bp+' BP • '+x.bc+' BC • Diff '+((x.bp-x.bc)>=0?'+':'')+(x.bp-x.bc)+'</div></span><b class="right">'+x.pts+' pts</b></div>').join('')||'<p class="muted">Aucun classement disponible.</p>';

    const championTeamId=trs.length?trs[0].id:null;
    $('#publicTeams').innerHTML=lteams.map(team=>{
      const bg=inferredTeamColor(team),fg=teamTextColor(bg),label=teamColorLabel(team);
            const playersHtml=teamPlayers.filter(tp=>tp.team_id===team.id).map(tp=>{const pl=pmap.get(tp.player_id);return pl?'<div class="public-team-player swe-player-with-avatar">'+playerAvatarHtml(pl)+esc(pl.name)+(pl.is_group_member===false?' <span class="guest-badge">Guest</span>':'')+'</div>':''}).join('');
      const crown=team.id===championTeamId?'👑 ':'';
      const champ=team.id===championTeamId?'<div class="public-team-shirt">🏆 Équipe victorieuse</div>':'';
      const avg=Number(team.team_score||0)>0?'<div class="public-team-average">🐶⚽ <b>Note équipe évaluée par Chien Boul Academy : '+Number(team.team_score).toFixed(1)+'/5</b>'+(team.mention?' • '+esc(team.mention):'')+'</div>':'';return '<div class="public-team-card"><div class="public-team-head" style="background:'+bg+';color:'+fg+'"><div>'+crown+esc(team.name)+'</div>'+champ+'<div class="public-team-shirt">👕 Maillots : '+esc(label)+'</div></div>'+avg+'<div class="public-team-players">'+(playersHtml||'<div class="muted">Aucun joueur</div>')+'</div></div>';
    }).join('')||(publicTeamReviewEnabled&&['pending','redraw_requested'].includes(publicTeamReviewStates.find(x=>String(x.tournament_id)===String(latest.id))?.status)?'<div class="public-review-wait"><b>🗳️ Composition en validation</b><div>Les co-gestionnaires présents disposent de 2 heures pour donner leur avis. Les équipes seront publiées dès validation.</div></div>':'<p class="muted">Aucune équipe.</p>');
    const publicAssigned=new Set(teamPlayers.map(x=>String(x.player_id)));
    const publicSubs=registrations.filter(r=>r.tournament_id===latest.id&&r.present&&r.is_substitute&&r.registration_status!=='waitlist'&&!publicAssigned.has(String(r.player_id))).map(r=>pmap.get(r.player_id)).filter(Boolean);
    if(publicSubs.length)$('#publicTeams').insertAdjacentHTML('beforeend','<div class="public-common-subs"><b>🟠 Remplaçants communs</b><div class="muted">Ils peuvent jouer pour n’importe quelle équipe.</div><div>'+publicSubs.map(pl=>'<span>'+esc(pl.name)+'</span>').join('')+'</div></div>');
    $('#publicResults').innerHTML=lm.map((m,i)=>{
      const mg=goals.filter(g=>g.match_id===m.id);
      const goalBlock=(teamId)=>{
        const rows=mg.filter(g=>String(g.team_id)===String(teamId)).map(g=>{
          const scorer=pmap.get(g.scorer_player_id);
          const assister=g.assister_player_id?pmap.get(g.assister_player_id):null;
          return '<div class="small" style="margin-top:5px">⚽ '+esc(scorer?.name||'?')+(assister?' <span class="muted">← '+esc(assister.name)+'</span>':'')+'</div>';
        }).join('');
        return rows||'<div class="small muted" style="margin-top:5px">Aucun buteur</div>';
      };
      const rated=publicPlayerRatingsEnabled?matchAssignments.filter(a=>a.match_id===m.id&&a.team_id).map(a=>{
        const pl=pmap.get(a.player_id),rr=ratingForMatchPlayer(m,a.player_id,a.team_id,goals);
        return rr&&pl?{name:pl.name,r:rr.rating,team:a.team_id}:null;
      }).filter(Boolean):[];
      const best=rated.length?Math.max(...rated.map(x=>x.r)):null;
      const noteCol=(teamId)=>{
        const rows=rated.filter(x=>String(x.team)===String(teamId)).sort((a,b)=>b.r-a.r||a.name.localeCompare(b.name));
        return rows.map(n=>'<div class="small" style="padding:4px 0">'+(n.r===best?'⭐ ':'')+esc(n.name)+' <b>'+n.r.toFixed(1)+'/10</b></div>').join('')||'<div class="small muted">Aucune note</div>';
      };
      const notesHtml=publicPlayerRatingsEnabled?'<div class="notes-columns" style="margin-top:10px">'+
        '<div class="player notes-column" style="margin:0"><b>'+esc(tmap.get(m.home_team_id)?.name||'?')+'</b>'+noteCol(m.home_team_id)+'</div>'+
        '<div class="player notes-column" style="margin:0"><b>'+esc(tmap.get(m.away_team_id)?.name||'?')+'</b>'+noteCol(m.away_team_id)+'</div>'+
        '</div>':'';
      return '<div class="player"><div class="muted">Match '+(i+1)+(m.pitch?' • '+esc(m.pitch):'')+'</div>'+
        '<div class="history-scoreline" style="margin-top:6px">'+
          '<b class="history-team-name">'+esc(tmap.get(m.home_team_id)?.name||'?')+'</b>'+
          '<div class="score">'+m.home_score+' - '+m.away_score+'</div>'+
          '<b class="history-team-name">'+esc(tmap.get(m.away_team_id)?.name||'?')+'</b>'+
          '<div class="history-goals home">'+goalBlock(m.home_team_id)+'</div>'+
          '<div class="history-goals away">'+goalBlock(m.away_team_id)+'</div>'+
        '</div>'+notesHtml+'</div>';
    }).join('')||'<p class="muted">Aucun résultat.</p>';
  } else {
    $('#publicTeamRanking').innerHTML='<p class="muted">Aucun tournoi disponible.</p>';
    $('#publicTournamentScorers').innerHTML='<p class="muted">Aucun tournoi disponible.</p>'; $('#publicTournamentAssists').innerHTML='<p class="muted">Aucun tournoi disponible.</p>'; if($('#publicTournamentTopPlayers'))$('#publicTournamentTopPlayers').innerHTML='<p class="muted">Aucune note disponible.</p>';
    $('#publicTeams').innerHTML='<p class="muted">Aucune équipe.</p>';
    $('#publicResults').innerHTML='<p class="muted">Aucun résultat.</p>';
  }
  const lastDetails=$('#publicLastTournamentDetails');
  const toggleLast=$('#toggleLastTournamentPublic');
  if(toggleLast){toggleLast.disabled=!latest;toggleLast.setAttribute('aria-expanded','false');toggleLast.textContent=latest?'Développer les derniers résultats':'Aucun résultat';}
  if(toggleLast&&lastDetails){
    toggleLast.onclick=()=>{
      if(regTour&&latest){location.href=publicHistoryUrl(token,latest.id);return;}
      const opening=lastDetails.classList.contains('hidden');
      lastDetails.classList.toggle('hidden',!opening);
      toggleLast.textContent=opening?'Réduire les derniers résultats':'Développer les derniers résultats';
      toggleLast.setAttribute('aria-expanded',String(opening));
    };
  }

  if(regTour&&toggleLast&&latest){toggleLast.textContent='Voir les derniers résultats →';toggleLast.removeAttribute('aria-expanded');}

  const pubHist=$('#publicHistory');
  pubHist.innerHTML='';
  pubHist.closest('.card')?.classList.toggle('hidden',regTour?.format==='league');
  finishedHistory.forEach(t=>{
    const d=document.createElement('div');d.className='player row';
    d.innerHTML='<span style="flex:1"><b>'+esc(t.name||('Tournoi du '+t.tournament_date))+'</b><div class="muted">'+t.tournament_date+' • Terminé</div></span>';
    const b=document.createElement('a');b.textContent='Voir les résultats';b.className='primary';
    b.href=publicHistoryUrl(token,t.id);
    d.appendChild(b);pubHist.appendChild(d);
  });
  if(!finishedHistory.length)pubHist.innerHTML='<p class="muted">Aucun tournoi terminé dans cette saison.</p>';
  if(regTour&&regTour.format!=='league'&&window.SWERegistrationPresentation){
    registrationPresentation=window.SWERegistrationPresentation.mount({token,appUrl:APP_URL,setEntryMode:setPublicEntryMode,loadRating:async playerId=>{const {data,error}=await sb.rpc('get_public_registration_player_rating',{p_token:token,p_tournament_id:regTour.id,p_player_id:playerId});if(error)throw error;return data;},loadRules:async()=>{const {data,error}=await sb.rpc('get_public_tournament_king_rules',{p_token:token,p_tournament_id:regTour.id});if(error)throw error;return data;},standings:tournamentStandings,rateMatch:(...args)=>ratingForMatchPlayer(...args),data:()=>({tournament:regTour,tournaments,seasons,players,registrations,teams,teamPlayers,matches,goals,matchAssignments,ratingGroupName,coorganizers:registrationCoorganizers,isCoorganizer:registrationIsCoorganizer,personalInstruction:registrationPersonalInstruction,ratingWindows:registrationRatingWindows,pitches:S.sportsPitches,groupLevels:tournamentGroupLevels})});
    refreshSeasonRankings();
    updateTournamentCountdowns();
    loadPresentationMetadata().catch(()=>{});
  }
}
authState();
document.addEventListener('click',e=>{const t=e.target?.closest?.('.tab[data-view="cooler"]');if(t)setTimeout(loadThirdHalfFunds,0);});

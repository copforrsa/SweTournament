Warning: truncated output (original token count: 143356)
Total output lines: 6864

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
// Creating, editing or deleting a match changes the official tournament record.
// Co-organizers (including temporary admins) can enter results, but only the
// workspace administrator can alter match structure or delete a match.
function canManageMatchStructure(){const t=currentTour();return !!t && t.status!=='finished' && isAdmin()}
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
…113356 tokens truncated…tName').value='';$('#publicPreviousGuest').value='';$('#publicGuestPhone').value='';$('#publicGuestMember').checked=false;
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

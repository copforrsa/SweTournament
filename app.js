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

const S={session:null,adminProfile:null,isSuperAdmin:false,superWorkspaces:[],workspace:null,members:[],coorgs:[],coorgCount:0,workspaceFeatures:{max_coorganizers:3,max_coorganizers_cap:100,rankings_enabled:true,league_enabled:true,tournaments_enabled:true,third_half_enabled:false,player_ratings_enabled:false,max_players_cap:35,payments_enabled:true,top_player_enabled:false,match_ratings_enabled:false,team_review_enabled:false},commercialAccess:{subscription_plan:'free',special_access_enabled:false,upgrade_requested_at:null},billingStatus:null,coorgPurchaseConfirming:false,myPermissions:{can_invite_coorganizers:false,can_enter_scores:false,can_add_members:false,can_delete_members:false,can_create_tournaments:false,can_view_players:true,can_generate_teams:false,temporary_admin_until:null},myRatings:[],lastCreatedInvite:null,invites:[],players:[],contacts:[],skillReviews:[],skillAggregates:[],teamCodes:[],seasons:[],leagues:[],leaguePlayers:[],activeLeague:null,tournaments:[],activeTour:null,tPlayers:[],teams:[],teamPlayers:[],matchAssignments:[],matches:[],goals:[],teamBalanceScores:[],rankMode:'season',channel:null,goalTeamSelections:{},sportsComplexes:[],sportsPitches:[],publicMode:false,publicToken:null,tournamentCreateOpen:false,seasonAdminOpen:false,editingTournamentId:null,teamCompetitionId:null,lastView:null,coorgQuotaRequest:null,superCoorgQuotaRequests:[],myLinkedPlayerId:null,playerDashboard:null,playerDirectory:[],organizerSettings:null,playerRequests:[],platformSettings:{consent_gate_enabled:false},thirdHalfFunds:[],teamReviewState:null,onboardingStatus:null,memberships:[],organizerAccess:null};

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
  if(v==='permissions'&&!isAdmin())v='home';
  if(v==='players'&&isCoorg()&&!hasTemporaryAdmin()&&!S.myPermissions.can_view_players)v='home';
  if(v==='tournaments'&&!S.workspaceFeatures.tournaments_enabled)v='home';
  if(v==='league'&&!S.workspaceFeatures.league_enabled)v='home';
  if(v==='ranking'&&!S.workspaceFeatures.rankings_enabled)v='home';
  if(v==='matches'&&isCoorg()&&!hasTemporaryAdmin()&&!S.myPermissions.can_enter_scores)v='home';
  document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+v));
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.view===v));
  const activeTab=document.querySelector('.tab.active');
  if(activeTab&&window.matchMedia('(max-width:650px)').matches){
    requestAnimationFrame(()=>activeTab.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}));
  }
  if(v==='teams'){
    if(previousView!=='teams'&&!S.teamCompetitionId&&S.activeTour&&S.tournaments.some(t=>String(t.id)===String(S.activeTour)))S.teamCompetitionId=S.activeTour;
    renderTeams();
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
  if(['home','myplayer','players','permissions','tournaments','teams','matches','league','cooler','ranking','simple-swe'].includes(v)&&!S.publicMode){window.swePageViewContext={page:'app:'+v};document.dispatchEvent(new Event('swe:page-view'));}
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
  const redirect=inviteIdFromUrl?APP_URL+'?invite='+encodeURIComponent(inviteIdFromUrl)+'&email='+encodeURIComponent(email):APP_URL;
  const {data,error}=await sb.auth.signUp({email,password:$('#password').value,options:{emailRedirectTo:redirect,data:S.platformSettings.consent_gate_enabled?{swe_consent_accepted:true,swe_terms_version:'2026-09-05-beta',swe_privacy_version:'2026-09-05-beta'}:{}}});
  if(error)return toast(friendlyAuthError(error));
  toast(data.session?'Compte créé. Ton ID SWÉ est rattaché à ton email.':'Compte créé : vérifie ton email puis reconnecte-toi avec la même adresse. Ton ID SWÉ sera retrouvé automatiquement.');
};
$('#authGoogle').onclick=()=>startSocialAuth('google');
$('#authApple').onclick=()=>startSocialAuth('apple');
async function startSocialAuth(provider){
  const redirectTo=APP_URL+'?oauth=done';
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
  box.innerHTML=rows.map(r=>{const links=Array.isArray(r.staff_links)?r.staff_links:[];return '<div class="sa-player-row">'+
    '<div class="sa-player-main"><div class="row" style="justify-content:flex-start;gap:7px;flex-wrap:wrap"><b>'+esc(r.display_name||'Joueur SWÉ')+'</b><span class="player-id-mini">'+esc(r.public_player_id||'—')+'</span><span class="guest-badge '+(r.consent_accepted?'consent-ok':'consent-pending')+'">'+(r.consent_accepted?'CONSENTEMENT OK':'À VALIDER')+'</span><span class="guest-badge identity-'+esc(r.identity_status||'active')+'">'+((r.identity_status||'active')==='active'?'IDENTITÉ OK':(r.identity_status==='review'?'VÉRIFICATION':'SUSPENDU'))+'</span></div>'+ 
    '<div class="muted">📧 '+esc(r.email||'—')+(r.phone_number?' • 📱 '+esc(r.phone_number):'')+(r.home_area?' • 📍 '+esc(r.home_area):'')+'</div></div>'+ 
    '<div class="sa-player-meta"><span><b>'+Number(r.groups_count||0)+'</b> groupe(s)</span><span><b>'+Number(r.local_profiles_count||0)+'</b> profil(s) lié(s)</span><span>'+(r.is_public?'🌐 Public':'🔒 Privé')+'</span><span>'+(r.discoverable?'🔎 Annuaire':'Annuaire désactivé')+'</span></div>'+ 
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
  if(!S.workspace||!isAdmin()||!S.workspaceFeatures.third_half_enabled){S.thirdHalfFunds=[];renderThirdHalfFunds();return;}
  const {data,error}=await sb.rpc('get_admin_third_half_funds',{p_workspace_id:S.workspace.id});
  if(error){toast(error.message);S.thirdHalfFunds=[];}else S.thirdHalfFunds=Array.isArray(data)?data:[];
  renderThirdHalfFunds();
}
function renderThirdHalfFunds(){
  const box=$('#coolerFundsList');if(!box)return;
  const rows=S.thirdHalfFunds||[];
  if(!rows.length){box.innerHTML='<div class="muted">Aucun Swé actif à administrer pour la glacière.</div>';return;}
  box.innerHTML=rows.map((r,i)=>{const target=Number(r.target_amount_cents||0),collected=Number(r.collected_amount_cents||0),pct=target?Math.min(100,Math.round(collected/target*100)):0;return '<div class="cooler-fund" data-cooler-row="'+esc(r.tournament_id)+'"><div class="cooler-fund-head"><div><b>'+esc(r.tournament_name||'Swé')+'</b><div class="muted">📅 '+esc(r.tournament_date||'')+' • '+(r.format==='league'?'Swé de Ligue':'Tournoi')+'</div></div><span class="cooler-status '+esc(r.status||'draft')+'">'+esc(String(r.status||'draft').toUpperCase())+'</span></div><div class="cooler-progress"><span style="width:'+pct+'%"></span></div><div class="muted small" style="margin-top:5px">Collecté : <b>'+euroCents(collected)+'</b>'+(target?' / objectif '+euroCents(target):' • aucun objectif défini')+'</div><div class="grid g2"><label><span class="muted">Statut</span><select data-cooler-status><option value="draft" '+(r.status==='draft'?'selected':'')+'>Brouillon</option><option value="open" '+(r.status==='open'?'selected':'')+'>Ouverte</option><option value="paused" '+(r.status==='paused'?'selected':'')+'>En pause</option><option value="closed" '+(r.status==='closed'?'selected':'')+'>Clôturée</option></select></label><label><span class="muted">Solution de cagnotte</span><select data-cooler-provider><option value="">Choisir</option>'+['Revolut','Leetchi','PayPal','Sumeria','Autre'].map(x=>'<option '+(r.provider===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label><span class="muted">Lien de cagnotte</span><input data-cooler-link type="url" placeholder="https://..." value="'+esc(r.payment_link||'')+'"></label><label><span class="muted">Participation conseillée (€)</span><input data-cooler-suggested type="number" min="0" step="0.50" value="'+(Number(r.suggested_amount_cents||0)/100)+'"></label><label><span class="muted">Objectif (€)</span><input data-cooler-target type="number" min="0" step="0.50" value="'+(target/100)+'"></label><label><span class="muted">Montant collecté (€)</span><input data-cooler-collected type="number" min="0" step="0.50" value="'+(collected/100)+'"></label></div><label style="margin-top:10px"><span class="muted">Note admin</span><textarea data-cooler-notes rows="2" placeholder="Ex. boissons, glace, repas...">'+esc(r.notes||'')+'</textarea></label><label class="player row" style="justify-content:flex-start;margin-top:10px"><input data-cooler-share type="checkbox" style="width:auto" '+(r.share_enabled?'checked':'')+'><span><b>Partager le lien aux joueurs</b><div class="muted">Le partage n’est possible que si un lien HTTPS est renseigné.</div></span></label>'+(r.payment_link?'<div class="cooler-link-preview" style="margin-top:7px">🔗 '+esc(r.payment_link)+'</div>':'')+'<div class="row" style="margin-top:10px"><button class="primary" data-save-cooler>💾 Enregistrer</button>'+(r.payment_link?'<button data-copy-cooler-link>Copier le lien</button>':'')+'</div></div>'}).join('');
}
document.addEventListener('change',e=>{if(e.target?.id==='saWorkspaceFilter')renderSuperAdminWorkspaces();});
document.addEventListener('click',async e=>{
  if(e.target?.id==='refreshCoolerFunds'){await loadThirdHalfFunds();return;}
  const row=e.target?.closest?.('[data-cooler-row]');if(!row)return;
  if(e.target?.matches?.('[data-copy-cooler-link]')){const link=row.querySelector('[data-cooler-link]')?.value.trim();if(!link)return;try{await navigator.clipboard.writeText(link);toast('Lien de cagnotte copié ✅')}catch(_e){toast('Copie impossible')}return;}
  if(e.target?.matches?.('[data-save-cooler]')){const b=e.target;b.disabled=true;const cents=x=>Math.round(Math.max(0,Number(x?.value||0))*100);const {error}=await sb.rpc('admin_save_third_half_fund',{p_tournament_id:row.dataset.coolerRow,p_status:row.querySelector('[data-cooler-status]').value,p_provider:row.querySelector('[data-cooler-provider]').value||null,p_payment_link:row.querySelector('[data-cooler-link]').value.trim()||null,p_target_amount_cents:cents(row.querySelector('[data-cooler-target]')),p_collected_amount_cents:cents(row.querySelector('[data-cooler-collected]')),p_suggested_amount_cents:cents(row.querySelector('[data-cooler-suggested]')),p_notes:row.querySelector('[data-cooler-notes]').value.trim()||null,p_share_enabled:row.querySelector('[data-cooler-share]').checked});b.disabled=false;if(error)return toast(error.message);toast('Cagnotte mise à jour ✅');await loadThirdHalfFunds();return;}
});
async function loadMyPlayerDashboard(){
  if(!S.session){S.playerDashboard=null;return null;}
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
  if($('#myPlayerOpportunities'))$('#myPlayerOpportunities').innerHTML=opp.length?opp.map(o=>{const mode=o.discovery_mode==='public'?'PUBLIC • INSCRIPTION DIRECTE':'SUR DEMANDE';const fee=Number(o.entry_fee_cents||0);const payment=o.external_payment_required?'<div class="player-opportunity-price">💳 Paiement en ligne requis • confirmation automatique</div>':'<div class="player-opportunity-price free">✓ Aucun paiement en ligne imposé au joueur externe</div>';const third=o.third_half_enabled?'<label class="player-pledge"><span>🧊 3e mi-temps</span><input type="number" min="0" step="0.50" data-pledge-for="'+o.tournament_id+'" placeholder="Contribution €" value="'+(Number(o.cooler_suggested_cents||0)/100||'')+'"></label>':'';return '<div class="player player-opportunity"><span class="guest-badge">'+esc(mode)+'</span><h3>'+esc(o.workspace_name)+' • '+esc(o.tournament_name||'Swé')+'</h3><div class="muted">📅 '+esc(o.tournament_date||'')+(o.start_time?' • '+esc(String(o.start_time).slice(0,5)):'')+'</div><div class="muted">📍 '+esc(o.venue||'Lieu à confirmer')+' • '+Number(o.remaining_places||0)+' place(s) restante(s)</div>'+payment+third+(o.discovery_mode==='public'?'<button class="primary" data-player-direct-join="'+o.tournament_id+'" style="margin-top:10px">⚡ Je participe</button>':'<textarea data-request-message-for="'+o.tournament_id+'" rows="2" placeholder="Message à l’organisateur (facultatif)" style="margin-top:10px"></textarea><button class="primary" data-player-request-join="'+o.tournament_id+'" style="margin-top:8px">🙋 Demander à participer</button>')+'</div>'}).join(''):'<div class="muted">Aucun nouveau Swé à afficher pour le moment.</div>';
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
    box.innerHTML='<div><b>🎁 Essai organisateur • '+Number(a.days_remaining||0)+' jour'+(Number(a.days_remaining||0)>1?'s':'')+' restant'+(Number(a.days_remaining||0)>1?'s':'')+'</b><span>Toutes les options sont débloquées pendant 60 jours. Ensuite, choisis un abonnement pour continuer à organiser.</span></div><button type="button" data-go="home">Voir mon espace</button>';
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
    if(S.onboardingStatus?.completed){
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
  }else{const startMode=new URLSearchParams(location.search).get('start');if(startMode==='player')setView('myplayer');else if(startMode==='home')setView('home');}
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
  if(e.target?.id==='becomeOrganizer'||e.target?.id==='coorgCreateOwnWorkspace'){openOrganizerSetup('group');$('#workspaceSetup')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(e.target?.id==='trialChoosePlan'){setView('home');setTimeout(()=>$('#homeEcosystemCard')?.scrollIntoView({behavior:'smooth',block:'start'}),100);return;}
});

async function loadInvites(){
  const box=$('#inviteList');box.innerHTML='';
  const userEmail=(S.session?.user?.email||'').trim().toLowerCase();
  if(!userEmail){$('#inviteBox').classList.add('hidden');return}
  let result;
  try{result=await Promise.race([sb.from('workspace_invites')
    .select('id,email,role,workspace_id,payment_responsibility,payment_status,workspaces(name)')
    .is('accepted_at',null)
    .ilike('email',userEmail),new Promise(resolve=>setTimeout(()=>resolve({data:null,error:{message:'Délai de chargement dépassé'}}),10000))]);}
  catch(error){result={data:null,error}}
  const {data,error}=result||{};
  if(error){const d=document.createElement('div');d.dataset.inviteLoadError='1';d.innerHTML='<span role="status">Impossible de charger toutes les invitations.</span> <button type="button">Réessayer</button>';d.querySelector('button').onclick=loadInvites;box.appendChild(d);$('#inviteBox').classList.remove('hidden');document.dispatchEvent(new CustomEvent('swe:invites-loaded',{detail:{count:0,error:true}}));window.SWECoorganizerInvites?.refresh();return}
  let mine=[...new Map((data||[]).filter(i=>(i.email||'').trim().toLowerCase()===userEmail).map(i=>[String(i.id),i])).values()];
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
  document.dispatchEvent(new CustomEvent('swe:invites-loaded',{detail:{count:mine.length}}));
  window.SWECoorganizerInvites?.refresh();
}
async function loadAll(){
  if(!S.workspace)return;const w=S.workspace.id;let r;
  S.adminProfile=null;
  if(isAdmin()){
    const ap=await sb.from('workspace_admin_profiles').select('first_name,last_name').eq('workspace_id',w).eq('user_id',S.session?.user?.id).maybeSingle();
    if(!ap.error&&ap.data)S.adminProfile=ap.data;
  }
  r=await sb.from('workspace_members').select('user_id,role,active').eq('workspace_id',w);S.members=r.data||[];
  r=await sb.rpc('get_workspace_coorganizer_count',{p_workspace_id:w});S.coorgCount=Number(r.data||0);
  const oa=await sb.rpc('get_workspace_organizer_access',{p_workspace_id:w});if(!oa.error)S.organizerAccess=oa.data||null;renderOrganizerAccessBanner();
  r=await sb.rpc('get_workspace_features_v2',{p_workspace_id:w});
  if(r.error){
    console.error('get_workspace_features_v2',r.error);
    toast('Impossible de vérifier les modules de cet espace. Recharge la page.');
  }else{
    const f=Array.isArray(r.data)?r.data[0]:r.data;
    if(f)S.workspaceFeatures={...S.workspaceFeatures,...f};
  }
  const commercial=await sb.rpc('get_workspace_commercial_access',{p_workspace_id:w});
  if(!commercial.error){const c=Array.isArray(commercial.data)?commercial.data[0]:commercial.data;if(c)S.commercialAccess={...S.commercialAccess,...c};}
  if(S.commercialAccess.special_access_enabled){S.workspaceFeatures={...S.workspaceFeatures,tournaments_enabled:true,league_enabled:true,rankings_enabled:true,third_half_enabled:true,player_ratings_enabled:true,top_player_enabled:true,match_ratings_enabled:true,team_review_enabled:true};}
  S.billingStatus=null;S.organizerSettings=null;S.playerRequests=[];
  if(isAdmin()){
    r=await sb.rpc('get_workspace_billing_status',{p_workspace_id:w});
    if(!r.error){const b=Array.isArray(r.data)?r.data[0]:r.data;S.billingStatus=b||null;}
    r=await sb.rpc('get_my_organizer_settings',{p_workspace_id:w});if(!r.error)S.organizerSettings=r.data||null;
    r=await sb.rpc('list_workspace_player_requests',{p_workspace_id:w});if(!r.error)S.playerRequests=Array.isArray(r.data)?r.data:[];
  }
  S.myRatings=[];
  if(isAdmin()){
    S.myPermissions={can_invite_coorganizers:true,can_enter_scores:true,can_add_members:true,can_delete_members:true,can_create_tournaments:true,can_view_players:true,can_generate_teams:true,temporary_admin_until:null};
    r=await sb.from('workspace_invites').select('id,email,role,accepted_at,created_at').eq('workspace_id',w).order('created_at',{ascending:false});S.invites=r.data||[];
    r=await sb.rpc('admin_get_coorganizer_permissions',{p_workspace_id:w});S.coorgs=r.data||[];
  }else if(isCoorg()){
    S.invites=[];S.coorgs=[];
    r=await sb.rpc('get_my_coorganizer_permissions',{p_workspace_id:w});
    if(r.error)console.error('permissions coorganisateur',r.error);
    const mp=Array.isArray(r.data)?(r.data[0]||null):r.data;
    S.myPermissions={can_invite_coorganizers:false,can_enter_scores:false,can_add_members:false,can_delete_members:false,can_create_tournaments:false,can_view_players:true,can_generate_teams:false,can_generate_team_codes:false,can_edit_player_personal_info:false,temporary_admin_until:null,...(mp||{})};
    if(S.workspaceFeatures.player_ratings_enabled){
      r=await sb.rpc('get_my_player_skill_ratings',{p_workspace_id:w});
      if(!r.error)S.myRatings=Array.isArray(r.data)?r.data:[];
    }
  }else{S.invites=[];S.coorgs=[];}
  if(isAdmin()){
    r=await sb.rpc('get_admin_workspace_players',{p_workspace_id:w});S.players=r.data||[];
    r=await sb.rpc('get_manager_player_contacts',{p_workspace_id:w});S.contacts=r.error?[]:(r.data||[]);
    if(S.workspaceFeatures.player_ratings_enabled){
      r=await sb.rpc('get_admin_player_skill_reviews',{p_workspace_id:w});S.skillReviews=r.error?[]:(r.data||[]);
      r=await sb.rpc('get_my_player_skill_ratings',{p_workspace_id:w});if(!r.error)S.myRatings=Array.isArray(r.data)?r.data:[];
    }else{S.skillReviews=[];S.myRatings=[];}
    r=await sb.rpc('get_manager_player_team_codes',{p_workspace_id:w});S.teamCodes=r.error?[]:(r.data||[]);
  }else{
    if(isCoorg()){
      r=await sb.rpc('get_workspace_players_safe',{p_workspace_id:w});
      if(r.error){console.error('players safe',r.error);S.players=[];toast('Impossible de charger la liste des joueurs.')}
      else S.players=Array.isArray(r.data)?r.data:[];
      if(S.myPermissions.can_edit_player_personal_info){
        r=await sb.rpc('get_manager_player_contacts',{p_workspace_id:w});S.contacts=r.error?[]:(r.data||[]);
      }else S.contacts=[];
      if(S.myPermissions.can_generate_team_codes){
        r=await sb.rpc('get_manager_player_team_codes',{p_workspace_id:w});S.teamCodes=r.error?[]:(r.data||[]);
      }else S.teamCodes=[];
    }else {S.players=[];S.contacts=[];S.teamCodes=[];}
    S.skillReviews=[];
  }
  if(isAdmin()||isCoorg()){
    if(S.workspaceFeatures.player_ratings_enabled){
      r=await sb.rpc('get_player_skill_aggregates',{p_workspace_id:w});
      S.skillAggregates=r.error?[]:(Array.isArray(r.data)?r.data:[]);
    }else S.skillAggregates=[];
    r=await sb.rpc('get_my_linked_player_id',{p_workspace_id:w});
    S.myLinkedPlayerId=r.error?null:(r.data||null);
  }else {S.skillAggregates=[];S.myLinkedPlayerId=null;}
  if(isAdmin()){
    const qr=await sb.rpc('get_my_coorganizer_quota_request',{p_workspace_id:w});
    S.coorgQuotaRequest=qr.error?null:(qr.data||null);
  }else S.coorgQuotaRequest=null;
  r=await sb.from('seasons').select('*').eq('workspace_id',w).order('starts_on',{ascending:false});S.seasons=r.data||[];
  r=await sb.from('leagues').select('*').eq('workspace_id',w).order('created_at',{ascending:false});S.leagues=r.data||[];
  if(S.leagues.length){
    const lids=S.leagues.map(x=>x.id);
    r=await sb.from('league_players').select('*').in('league_id',lids);S.leaguePlayers=r.data||[];
  }else S.leaguePlayers=[];
  if(!S.activeLeague){const al=S.leagues.find(l=>l.status==='active')||S.leagues[0];S.activeLeague=al?.id||null;}
  r=await sb.from('tournaments').select('*').eq('workspace_id',w).order('tournament_date',{ascending:false});S.tournaments=r.data||[];
  if(!S.activeTour){const next=S.tournaments.find(t=>t.status!=='finished');S.activeTour=next?next.id:null;}
  await loadTournament();
  const editingReview=document.activeElement?.closest?.('.player-skill-review');
  if(!editingReview)renderAll();
}
async function loadTournament(){
  const t=currentTour();if(!t){S.tPlayers=[];S.teams=[];S.teamPlayers=[];S.matchAssignments=[];S.matches=[];S.goals=[];S.teamBalanceScores=[];S.teamReviewState=null;return}let r;
  r=await sb.from('tournament_players').select('*').eq('tournament_id',t.id);S.tPlayers=r.data||[];
  r=await sb.from('teams').select('*').eq('tournament_id',t.id).order('created_at');S.teams=r.data||[];
  const tids=S.teams.map(x=>x.id);if(tids.length){r=await sb.from('team_players').select('*').in('team_id',tids);S.teamPlayers=r.data||[]}else S.teamPlayers=[];
  r=await sb.from('matches').select('*').eq('tournament_id',t.id).order('match_order');S.matches=r.data||[];
  const mids=S.matches.map(x=>x.id);
  if(mids.length){
    r=await sb.from('goals').select('*').in('match_id',mids).order('created_at');S.goals=r.data||[];
    r=await sb.from('match_player_assignments').select('*').in('match_id',mids);S.matchAssignments=r.data||[];
  }else{S.goals=[];S.matchAssignments=[];}
  const scoreRes=await sb.rpc('get_tournament_team_balance_scores',{p_tournament_id:t.id});
  S.teamBalanceScores=scoreRes.error?[]:(scoreRes.data||[]);
  S.teamReviewState=null;
  if(t.format!=='league'&&S.workspaceFeatures.team_review_enabled){
    const reviewRes=await sb.rpc('get_tournament_team_review_state',{p_tournament_id:t.id});
    if(!reviewRes.error)S.teamReviewState=reviewRes.data||null;
  }
  renderMatchPitchSelect();
}
const THIRD_HALF_PAYMENT_MODES={
  event_online:'Paiement en ligne',
  event_arena:'Paiement direct à l’Arena',
  cooler_online:'Participation en ligne à la glacière',
  cooler_cash:'Participation main à main'
};
function currentTour(){return S.tournaments.find(x=>x.id===S.activeTour)} function p(id){return S.players.find(x=>x.id===id)} function tm(id){return S.teams.find(x=>x.id===id)}

function matchTeamPlayerIds(matchId,teamId){
  const rows=S.matchAssignments.filter(a=>String(a.match_id)===String(matchId));
  if(rows.length)return rows.filter(a=>String(a.team_id||'')===String(teamId||'')).map(a=>a.player_id);
  return teamPlayerIds(teamId);
}
function ratingForMatchPlayer(match,playerId,teamId,goalRows=S.goals){
  if(!match||!teamId)return null;
  const hs=Number(match.home_score||0),as=Number(match.away_score||0);
  const isHome=String(teamId)===String(match.home_team_id),isAway=String(teamId)===String(match.away_team_id);
  if(!isHome&&!isAway)return null;
  const own=isHome?hs:as,opp=isHome?as:hs;
  const difference=own-opp;
  const base=difference>2?7:difference>0?6:difference===0?5:difference>=-2?4:difference>=-5?3:2;
  const mg=(goalRows||[]).filter(g=>String(g.match_id)===String(match.id));
  const goals=mg.filter(g=>String(g.scorer_player_id)===String(playerId)&&!g.is_own_goal).length;
  const assists=mg.filter(g=>String(g.assister_player_id||'')===String(playerId)).length;
  return {rating:Math.min(10,base+goals+(assists*.5)),base,goals,assists,result:own>opp?'V':(own===opp?'N':'D')};
}
function topPlayersFromData(matchRows,goalRows,assignmentRows,playerRows,tournamentIds=null){
  const matchMap=new Map((matchRows||[]).filter(m=>!tournamentIds||tournamentIds.has(m.tournament_id)).map(m=>[m.id,m]));
  const stats=new Map((playerRows||[]).map(pl=>[pl.id,{id:pl.id,name:pl.name,guest:pl.is_group_member===false,total:0,matches:0,g:0,a:0,avg:0}]));
  (assignmentRows||[]).forEach(a=>{
    const m=matchMap.get(a.match_id);if(!m||!a.team_id||!stats.has(a.player_id))return;
    const r=ratingForMatchPlayer(m,a.player_id,a.team_id,goalRows);if(!r)return;
    const s=stats.get(a.player_id);s.total+=r.rating;s.matches++;s.g+=r.goals;s.a+=r.assists;
  });
  return [...stats.values()].filter(x=>x.matches).map(x=>({...x,avg:x.total/x.matches}))
    .sort((a,b)=>b.avg-a.avg||b.g-a.g||b.a-a.a||a.name.localeCompare(b.name));
}

async function renderSeasonScorerSummary(){
  const box=$('#seasonScorerSummary');if(!box)return;
  const activeSeason=S.seasons.find(s=>s.is_active)||S.seasons[0];
  if(!activeSeason){box.innerHTML='<p class="muted">Aucune saison active.</p>';return}
  const tournaments=S.tournaments.filter(t=>t.season_id===activeSeason.id&&t.format!=='league');
  const tids=tournaments.map(t=>t.id);
  if(!tids.length){
    box.innerHTML='<div class="readonly-note"><b>'+esc(activeSeason.name)+'</b><div style="margin-top:5px">Aucun tournoi n’est rattaché à cette saison. Les statistiques des tournois hors saison restent visibles uniquement dans chaque tournoi.</div></div>';
    return;
  }
  const {data:matches,error:me}=await sb.from('matches').select('*').in('tournament_id',tids);
  if(me)throw me;
  const mids=(matches||[]).map(m=>m.id);
  if(!mids.length){
    box.innerHTML='<div class="readonly-note"><b>'+esc(activeSeason.name)+'</b><div style="margin-top:5px">'+tournaments.length+' tournoi'+(tournaments.length>1?'s':'')+' rattaché'+(tournaments.length>1?'s':'')+', mais aucun match enregistré.</div></div>';
    return;
  }
  const {data:goals,error:ge}=await sb.from('goals').select('*').in('match_id',mids);
  if(ge)throw ge;
  const stats=new Map(S.players.map(x=>[x.id,{id:x.id,name:x.name,is_group_member:x.is_group_member,g:0,a:0}]));
  (goals||[]).forEach(g=>{
    if(stats.has(g.scorer_player_id))stats.get(g.scorer_player_id).g++;
    if(g.assister_player_id&&stats.has(g.assister_player_id))stats.get(g.assister_player_id).a++;
  });
  let scor=[...stats.values()].filter(x=>x.g).sort((a,b)=>b.g-a.g||b.a-a.a||a.name.localeCompare(b.name));
  let ass=[...stats.values()].filter(x=>x.a).sort((a,b)=>b.a-a.a||b.g-a.g||a.name.localeCompare(b.name));
  scor=competitionRanks(scor,'g');ass=competitionRanks(ass,'a');

  const scorHtml=scor.map(x=>'<div class="rank '+(x.is_group_member===false?'guest-row':'')+'"><b>'+x.rank+'</b><span>'+esc(x.name)+(x.is_group_member===false?' <span class="guest-badge">'+esc(guestLabel(p(x.id)))+'</span>':'')+'</span><b class="right">'+x.g+' but'+(x.g>1?'s':'')+'</b></div>').join('')||'<p class="muted">Aucun but enregistré.</p>';
  const assHtml=ass.map(x=>'<div class="rank '+(x.is_group_member===false?'guest-row':'')+'"><b>'+x.rank+'</b><span>'+esc(x.name)+(x.is_group_member===false?' <span class="guest-badge">'+esc(guestLabel(p(x.id)))+'</span>':'')+'</span><b class="right">'+x.a+' passe'+(x.a>1?'s':'')+'</b></div>').join('')||'<p class="muted">Aucune passe enregistrée.</p>';

  box.innerHTML=
    '<div class="readonly-note"><b>📅 '+esc(activeSeason.name)+'</b><div style="margin-top:5px">'+tournaments.length+' tournoi'+(tournaments.length>1?'s':'')+' rattaché'+(tournaments.length>1?'s':'')+'. Seuls ces tournois sont cumulés dans les classements de saison.</div></div>'+
    '<div class="grid g2" style="margin-top:10px"><div class="player"><b>⚽ Buteurs cumulés</b><div style="margin-top:8px">'+scorHtml+'</div></div><div class="player"><b>🎯 Passeurs cumulés</b><div style="margin-top:8px">'+assHtml+'</div></div></div>';
}

function coorgInviteLink(inv){
  return APP_URL+'?invite='+encodeURIComponent(inv.id)+'&email='+encodeURIComponent(inv.email||'');
}
function coorgInviteMessage(inv){
  const link=coorgInviteLink(inv);
  return '⚽ SWÉ TOURNAMENT 5/5\n\n'+
    'Tu es invité à rejoindre SWÉ Tournament en tant que co-gestionnaire.\n\n'+
    'Pour activer ton accès :\n'+
    '1. Ouvre le lien ci-dessous.\n'+
    '2. Ajoute un mot de passe puis clique sur « Crée ton compte » avec l’adresse e-mail indiquée.\n'+
    '3. Une fois connecté, accepte l’invitation.\n\n'+
    '⚠️ IMPORTANT : ne modifie pas l’adresse e-mail indiquée. L’invitation est liée à cette adresse : '+inv.email+'\n\n'+
    '🎯 TON RÔLE\n'+
    'Dans ton espace, tu peux notamment évaluer les joueurs que tu connais suffisamment. Tu n’es pas obligé de noter tout le monde : si tu ne connais pas assez un joueur, ne le note pas.\n\n'+
    'Les évaluations doivent être objectives, impartiales et faites sans concertation. Elles seront croisées avec celles d’autres co-gestionnaires afin d’obtenir une vision plus homogène des joueurs et d’aider SWÉ Tournament à générer des équipes aléatoires mais mieux équilibrées. ⚖️\n\n'+
    '🔒 CONFIDENTIALITÉ\n'+
    'Ton rôle de co-gestionnaire/notateur ainsi que tes notes individuelles doivent rester confidentiels. Les autres évaluateurs travaillent également de manière indépendante afin d’éviter toute pression ou influence.\n\n'+
    '💬 GROUPE PRIVÉ TELEGRAM\nRejoins le groupe privé des co-gestionnaires. Il sert uniquement à signaler un problème, proposer une modification ou partager une idée d’amélioration de SWÉ Tournament. Les échanges et informations concernant les évaluations restent confidentiels.\n👉 https://t.me/+y3iSlJ7qLzVmMzYx\n\n'+
    'Si tu souhaites t’impliquer davantage dans l’organisation ou l’évolution de SWÉ Tournament, rapproche-toi directement de moi en privé. 👊🏽\n\n'+
    'Adresse du compte : '+inv.email+'\n\n'+
    'Lien d’invitation :\n'+link+'\n\n'+
    'Merci pour ton aide 👊🏽⚽️';
}
function renderAccess(){
  const box=$('#memberList');if(!box)return;
  if(isCoorg()){
    box.innerHTML='<div class="player"><b>👥 Co-organisateurs</b><div class="muted" style="margin-top:5px">Il y a actuellement <b>'+S.coorgCount+'</b> co-organisateur'+(S.coorgCount>1?'s':'')+' dans l’espace.'+(S.myPermissions.can_invite_coorganizers?' Tu es autorisé à envoyer des invitations.':' Seul un utilisateur autorisé par l’administrateur peut envoyer une invitation.')+'</div></div>';
    if(S.lastCreatedInvite&&S.myPermissions.can_invite_coorganizers){
      const i=S.lastCreatedInvite;
      const d=document.createElement('div');d.className='player';
      d.innerHTML='<b>Dernière invitation créée : '+esc(i.email||'')+'</b><div class="muted" style="margin-top:4px">Envoie ce lien à la personne concernée.</div>';
      const row=document.createElement('div');row.className='row';row.style.marginTop='8px';
      const copy=document.createElement('button');copy.textContent='🔗 Copier le lien';
      const wa=document.createElement('button');wa.textContent='📲 WhatsApp';wa.className='primary';
      const inv={id:i.id,email:i.email};
      copy.onclick=async()=>{try{await navigator.clipboard.writeText(coorgInviteLink(inv));toast('Lien copié ✅')}catch(e){toast('Copie impossible.')}};
      wa.onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(coorgInviteMessage(inv)),'_blank','noopener');
      row.append(copy,wa);d.appendChild(row);box.appendChild(d);
    }
    return;
  }
  if(!isAdmin())return;
  const activeCo=S.coorgs.filter(x=>x.active);
  const suspendedCo=S.coorgs.filter(x=>!x.active);
  const pending=S.invites.filter(x=>!x.accepted_at);
  const fmt=d=>d?new Date(d).toLocaleDateString('fr-FR'):'';

  const lim=Number(S.workspaceFeatures.max_coorganizers||0),cap=Number(S.workspaceFeatures.max_coorganizers_cap||100);
  box.innerHTML='<div class="player" style="background:#f7fbf8"><b>Limite de co-gestionnaires</b><div class="muted" style="margin-top:5px">Autorisation actuelle : <b>'+activeCo.length+' / '+lim+'</b>. Les accès inclus et les accès achetés sont cumulés automatiquement.</div>'+(S.coorgQuotaRequest?.status==='pending'?'<div class="muted" style="margin-top:6px;color:#b45309">⏳ Demande en attente pour passer à <b>'+Number(S.coorgQuotaRequest.requested_limit||lim)+'</b>.</div>':'<div class="muted" style="margin-top:6px">Besoin de plus d’accès ? Ajoute-les directement depuis l’accueil : activation automatique après paiement.</div>')+'</div>'+
    '<div class="muted" style="margin-bottom:8px"><b>'+activeCo.length+' / '+lim+' co-organisateur'+(activeCo.length>1?'s':'')+' actif'+(activeCo.length>1?'s':'')+'</b> • '+suspendedCo.length+' suspendu'+(suspendedCo.length>1?'s':'')+' • '+pending.length+' invitation'+(pending.length>1?'s':'')+' en attente</div>';

  S.coorgs.forEach(c=>{
    const d=document.createElement('div');d.className='player';
    const linked=(S.players||[]).find(p=>String(p.id)===String(c.linked_player_id||''));
    d.innerHTML='<div class="row"><span style="flex:1"><b>'+esc(c.email||'Co-organisateur')+'</b><div class="muted">Co-organisateur depuis le '+fmt(c.created_at)+'</div></span><span style="font-weight:700;color:'+(c.active?'#15803d':'#b45309')+'">'+(c.active?'🟢 Actif':'⏸️ Suspendu')+'</span></div>'+
      '<div style="margin-top:9px;padding:10px;border:1px solid '+(linked?'#b7ddc9':'#dbe7f5')+';border-radius:12px;background:'+(linked?'#f2faf6':'#f7faff')+'"><b>👤 Membre du groupe associé</b><div class="muted" style="margin-top:4px">'+(linked?'✅ '+esc(linked.name)+' • liaison active avec son ID SWÉ':'Aucun membre rattaché. Associe son compte au joueur correspondant dans ton groupe.')+'</div></div>';
    if(!linked){
      const used=new Set(S.coorgs.map(x=>x.linked_player_id).filter(Boolean).map(String));
      const eligible=(S.players||[]).filter(p=>p.active&&p.is_group_member!==false&&!used.has(String(p.id)));
      const linkRow=document.createElement('div');linkRow.className='row';linkRow.style.cssText='margin-top:8px;align-items:stretch;flex-wrap:wrap';
      const playerSelect=document.createElement('select');playerSelect.style.cssText='flex:1;min-width:210px';
      playerSelect.innerHTML='<option value="">Choisir le membre correspondant…</option>'+eligible.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('');
      const linkButton=document.createElement('button');linkButton.className='primary';linkButton.textContent='🔗 Rattacher ce membre';linkButton.disabled=!eligible.length;
      linkButton.onclick=async()=>{
        const playerId=playerSelect.value;if(!playerId)return toast('Choisis d’abord le membre correspondant.');
        const player=eligible.find(p=>String(p.id)===String(playerId));
        if(!confirm('Rattacher définitivement '+(c.email||'ce co-organisateur')+' à '+(player?.name||'ce membre')+' ?\n\nLes statistiques seront réunies sous le même ID SWÉ.'))return;
        linkButton.disabled=true;playerSelect.disabled=true;
        const {error}=await sb.rpc('admin_link_coorganizer_player_v1',{p_workspace_id:S.workspace.id,p_user_id:c.user_id,p_player_id:playerId});
        if(error){linkButton.disabled=false;playerSelect.disabled=false;return toast(error.message);}
        c.linked_player_id=playerId;toast('Co-organisateur rattaché au membre ✅');renderPermissions();renderAccess();
      };
      linkRow.append(playerSelect,linkButton);d.appendChild(linkRow);
    }
    const actions=document.createElement('div');actions.className='row';actions.style.marginTop='8px';actions.style.flexWrap='wrap';
    const suspend=document.createElement('button');suspend.textContent=c.active?'⏸️ Suspendre':'▶️ Réactiver';
    suspend.onclick=async()=>{
      if(!confirm(c.active?'Suspendre ce co-organisateur ? Il perdra immédiatement l’accès à l’espace.':'Réactiver ce co-organisateur ?'))return;
      suspend.disabled=true;
      const {error}=await sb.rpc('admin_set_coorganizer_active',{p_workspace_id:S.workspace.id,p_user_id:c.user_id,p_active:!c.active});
      suspend.disabled=false;if(error)return toast(error.message);
      toast(c.active?'Co-organisateur suspendu.':'Co-organisateur réactivé.');
      await loadAll();
    };
    const del=document.createElement('button');del.className='danger smallbtn';del.textContent='🗑 Supprimer';
    del.onclick=async()=>{
      if(!confirm('Supprimer définitivement '+(c.email||'ce co-organisateur')+' de l’organisation ?\n\nIl n’aura plus accès à cet espace.'))return;
      del.disabled=true;
      const {error}=await sb.rpc('admin_remove_coorganizer',{p_workspace_id:S.workspace.id,p_user_id:c.user_id});
      del.disabled=false;if(error)return toast(error.message);
      toast('Co-organisateur supprimé.');
      await loadAll();
    };
    actions.append(suspend,del);d.appendChild(actions);box.appendChild(d);
  });

  pending.forEach(i=>{
    const d=document.createElement('div');d.className='player';
    d.innerHTML='<div class="row"><span style="flex:1"><b>'+esc(i.email)+'</b><div class="muted">Invitation créée le '+fmt(i.created_at)+' • Aucun e-mail automatique n’est envoyé.</div></span><span style="font-weight:700;color:#b45309">🟠 En attente</span></div>';
    const actions=document.createElement('div');actions.className='row';actions.style.marginTop='8px';actions.style.flexWrap='wrap';
    const copy=document.createElement('button');copy.textContent='🔗 Copier le lien';
    const wa=document.createElement('button');wa.textContent='📲 WhatsApp';wa.className='primary';
    const cancel=document.createElement('button');cancel.textContent='Annuler';cancel.className='danger smallbtn';
    copy.onclick=async()=>{
      const link=coorgInviteLink(i);
      try{await navigator.clipboard.writeText(link);toast('Lien d’invitation copié ✅')}catch(e){toast('Impossible de copier automatiquement.')}
    };
    wa.onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(coorgInviteMessage(i)),'_blank','noopener');
    cancel.onclick=async()=>{
      if(!confirm("Annuler cette invitation ?"))return;
      const {error}=await sb.from('workspace_invites').delete().eq('id',i.id).eq('workspace_id',S.workspace.id).is('accepted_at',null);
      if(error)return toast(error.message);
      toast('Invitation annulée.');await loadAll();
    };
    actions.append(copy,wa,cancel);d.appendChild(actions);box.appendChild(d);
  });

  if(!S.coorgs.length&&!pending.length)box.innerHTML+='<div class="muted">Aucun co-organisateur pour le moment.</div>';
}

function renderStripeBilling(){
  const card=$('#stripeBillingCard');if(!card)return;
  card.classList.toggle('hidden',!isAdmin());
  if(!isAdmin())return;
  const b=S.billingStatus||{},os=S.organizerSettings||{};
  const connected=!!b.stripe_connect_account_id,ready=!!b.connect_charges_enabled;
  if($('#organizerLegalStatus'))$('#organizerLegalStatus').value=os.legal_status||'individual';
  if($('#organizerWhatsappPhone')&&document.activeElement!==$('#organizerWhatsappPhone'))$('#organizerWhatsappPhone').value=os.whatsapp_contact_phone||'';
  if($('#organizerWhatsappGroup')&&document.activeElement!==$('#organizerWhatsappGroup'))$('#organizerWhatsappGroup').value=os.whatsapp_group_url||'';
  if($('#organizerPaymentEligibility')){$('#organizerPaymentEligibility').textContent=os.external_payment_ready?'✅ Organisateur PRO • paiement en ligne autorisé':'👤 Particulier • paiement sur place uniquement';$('#organizerPaymentEligibility').style.background=os.external_payment_ready?'#dcfce7':'#eef2f7';const host=$('#organizerPaymentEligibility').parentElement?.parentElement;if(host&&os.external_payment_ready&&!host.querySelector('.pro-payment-warning')){const n=document.createElement('div');n.className='pro-payment-warning';n.innerHTML='<b>⚠️ Engagement organisateur PRO</b><div>Les inscriptions réalisées via SWÉ doivent être régularisées conformément aux conditions du complexe. Un impayé ou litige confirmé peut entraîner la suspension temporaire des fonctions de paiement jusqu’à régularisation. Les incidents Stripe sont traités selon les procédures Stripe applicables.</div>';host.appendChild(n);}}
  const extPay=$('#tourExternalPaymentRequired');if(extPay){extPay.disabled=!os.external_payment_ready;if(!os.external_payment_ready)extPay.checked=false;}
  const extNote=$('#tourExternalPaymentNote');if(extNote)extNote.textContent=os.external_payment_ready?'Stripe Connect est opérationnel : tu peux exiger le paiement en ligne des joueurs externes.':'Pour exiger un paiement externe : module Paiements actif + compte Stripe Connect complètement validé.';
  const toggle=$('#stripePaymentsToggle'),details=$('#stripeBillingDetails');
  if(toggle){ if(connected) toggle.checked=true; details?.classList.toggle('hidden',!toggle.checked); }
  const badge=$('#stripeStatusBadge');
  if(badge)badge.textContent=ready?'🟢 Paiements actifs':(connected?'⚠️ Configuration à terminer':'⚪ Non configuré');
  const incomplete=$('#stripeIncompleteWarning');if(incomplete)incomplete.classList.toggle('hidden',!(connected&&!ready));
  const homeWarn=$('#homeStripeWarning');if(homeWarn)homeWarn.classList.toggle('hidden',!(connected&&!ready));
  const plan=b.plan_code==='pro_dev'?'PRO • test':String(b.plan_code||'free').toUpperCase();
  $('#stripeBillingStatus').innerHTML='<div class="grid g2">'+
    '<div><span class="muted">Formule</span><div><b>'+esc(plan)+'</b></div></div>'+
    '<div><span class="muted">Compte organisateur</span><div><b>'+(connected?'Connecté':'À connecter')+'</b></div></div>'+
    '<div><span class="muted">Encaissements</span><div><b>'+(ready?'✅ Autorisés':(connected?'⚠️ À finaliser':'⏳ En attente'))+'</b></div></div>'+
    '<div><span class="muted">Virements</span><div><b>'+(b.connect_payouts_enabled?'✅ Autorisés':(connected?'⚠️ À finaliser':'⏳ En attente'))+'</b></div></div>'+
  '</div>';
  const btn=$('#stripeConnectBtn');if(btn){btn.textContent=connected&&!ready?'⚠️ Terminer la configuration Stripe':(connected?'🔗 Mettre à jour Stripe':'🔗 Activer les paiements Stripe'); if(connected&&!ready)btn.style.fontWeight='900';}
}
async function refreshStripeConnectStatus(showToast=true){
  if(!isAdmin()||!S.workspace)return;
  const btn=$('#stripeRefreshBtn');if(btn)btn.disabled=true;
  const {data,error}=await sb.functions.invoke('stripe-connect-status',{body:{workspace_id:S.workspace.id}});
  if(btn)btn.disabled=false;
  if(error||data?.error){if(showToast)toast(data?.error||error?.message||'Impossible de vérifier Stripe.');return}
  const r=await sb.rpc('get_workspace_billing_status',{p_workspace_id:S.workspace.id});
  if(!r.error){const b=Array.isArray(r.data)?r.data[0]:r.data;S.billingStatus=b||null;renderStripeBilling();}
  if(showToast)toast(data?.charges_enabled?'Stripe est prêt à encaisser ✅':'⚠️ Stripe n’est pas encore prêt : termine la configuration pour activer les paiements.');
}

document.addEventListener('click',(e)=>{
  if(e.target?.id==='homeStripeFinishBtn'){
    setTimeout(()=>$('#stripeBillingCard')?.scrollIntoView({behavior:'smooth',block:'start'}),120);
  }
});
document.addEventListener('change',(e)=>{
  if(e.target?.id==='stripePaymentsToggle'){
    const details=$('#stripeBillingDetails');
    details?.classList.toggle('hidden',!e.target.checked);
    if(!e.target.checked && S.billingStatus?.stripe_connect_account_id){
      e.target.checked=true; details?.classList.remove('hidden');
      toast('Stripe est déjà relié à ce compte. Tu peux continuer ou mettre à jour la configuration.');
    }
  }
});
document.addEventListener('click',async(e)=>{
  if(e.target?.id==='stripeConnectBtn'){
    if(!isAdmin()||!S.workspace)return;
    const b=e.target;b.disabled=true;b.textContent='Ouverture de Stripe…';
    const {data,error}=await sb.functions.invoke('stripe-connect-onboarding',{body:{
      workspace_id:S.workspace.id,
      return_url:APP_URL+'?stripe=return',
      refresh_url:APP_URL+'?stripe=refresh'
    }});
    b.disabled=false;renderStripeBilling();
    if(error||data?.error)return toast(data?.error||error?.message||'Impossible d’ouvrir Stripe.');
    if(data?.url)location.href=data.url;
  }
  if(e.target?.id==='stripeRefreshBtn')await refreshStripeConnectStatus(true);
});

function renderPermissions(){
  const box=$('#permissionsList');if(!box)return;
  if(!isAdmin()){box.innerHTML='';return}
  if(!S.coorgs.length){box.innerHTML='<p class="muted">Aucun co-organisateur à paramétrer.</p>';return}
  box.innerHTML='<div class="player" style="margin-bottom:12px;background:#f7faff;border-color:#bfdbfe"><b>🔐 Autorisations des co-gestionnaires</b><div class="muted" style="margin-top:5px">Par défaut, un nouveau co-gestionnaire peut uniquement <b>voir la liste des joueurs et les évaluer</b>. Tu peux ensuite lui ajouter d’autres droits ici. Cet écran ne se rafraîchit plus automatiquement pendant tes modifications.</div></div>';
  const defs=[
    ['can_invite_coorganizers','Inviter des co-organisateurs','Peut créer et partager une invitation.'],
    ['can_enter_scores','Saisir les scores pendant les matchs','Peut modifier les scores et ajouter/annuler des buts pendant un tournoi en cours.'],
    ['can_add_members','Ajouter des membres','Peut ajouter de nouveaux joueurs à la liste.'],

    ['can_create_tournaments','Créer un nouveau tournoi','Peut créer un nouveau tournoi depuis l’onglet Tournois.'],
    ['can_view_players','Voir la liste des joueurs','Affiche l’onglet Joueurs et permet de consulter la liste et donner un avis de niveau.'],
    ['can_generate_teams','Générer des équipes','Peut lancer la génération automatique des équipes équilibrées sans voir les niveaux privés de l’administrateur.'],
    ['can_generate_team_codes','Générer les codes équipe','Peut générer, régénérer, activer ou désactiver le code équipe personnel d’un joueur.'],
    ['can_edit_player_personal_info','Modifier les informations personnelles des joueurs','Peut modifier le nom, le statut membre/guest, le rattachement Guest de… et le numéro de téléphone.']
  ];
  S.coorgs.forEach(c=>{
    const card=document.createElement('div');card.className='player';card.style.marginBottom='12px';
    card.innerHTML='<div class="row"><span style="flex:1"><b>'+esc(c.email||'Co-organisateur')+'</b><div class="muted">'+(c.active?'🟢 Actif':'⏸️ Suspendu')+'</div></span></div>';
    const linkBox=document.createElement('div');linkBox.style.cssText='margin-top:10px;padding:10px;border:1px solid #dbe7f5;border-radius:12px;background:#f7faff';
    const linkedSel=document.createElement('select');linkedSel.dataset.linkedPlayer='1';linkedSel.style.width='100%';
    linkedSel.innerHTML='<option value="">Aucun joueur rattaché</option>'+S.players.filter(p=>p.active&&p.is_group_member!==false).map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('');
    linkedSel.value=c.linked_player_id||'';
    if(c.linked_player_id) linkedSel.disabled=true;
    linkBox.innerHTML='<b>👤 Compte associé à un joueur</b><div class="muted small" style="margin:4px 0 7px">'+(c.linked_player_id?'🔒 Liaison définitive : ce membre utilise désormais le même ID SWÉ que le co-gestionnaire. Seul le Super Admin peut délier ce profil.':'Identifie le membre correspondant au co-gestionnaire. S’il possède déjà un ID SWÉ, ses statistiques seront automatiquement rattachées à cet ID.')+'</div>';
    linkBox.appendChild(linkedSel);card.appendChild(linkBox);
    const instructionBox=document.createElement('label');instructionBox.style.cssText='display:block;margin-top:10px;padding:10px;border:1px solid #d7e7df;border-radius:12px;background:#f7fbf8';
    instructionBox.innerHTML='<b>📣 Consigne personnalisée</b><div class="muted small" style="margin:4px 0 7px">Visible uniquement par ce co-gestionnaire lorsqu’il est connecté.</div><textarea data-personal-instructions maxlength="2000" rows="3" placeholder="Ex. Observe en priorité les nouveaux joueurs et vérifie les présences.">'+esc(c.personal_instructions||'')+'</textarea>';
    card.appendChild(instructionBox);
    defs.forEach(([key,label,help])=>{
      const row=document.createElement('label');row.className='row';row.style.justifyContent='flex-start';row.style.alignItems='flex-start';row.style.marginTop='10px';
      const cb=document.createElement('input');cb.type='checkbox';cb.style.width='auto';cb.checked=!!c[key];cb.dataset.perm=key;
      const txt=document.createElement('span');txt.style.flex='1';txt.innerHTML='<b>'+label+'</b><div class="muted">'+help+'</div>';
      row.append(cb,txt);card.appendChild(row);
    });
    const temp=document.createElement('div');temp.className='player';temp.style.marginTop='12px';temp.style.background='#fff8e8';
    const tempActive=c.temporary_admin_until&&new Date(c.temporary_admin_until).getTime()>Date.now();
    const localValue=c.temporary_admin_until?new Date(new Date(c.temporary_admin_until).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):'';
    temp.innerHTML='<b>👑 Droits admin temporaires</b><div class="muted" style="margin:5px 0 8px">Donne temporairement les droits de gestion du tournoi : créer/terminer/supprimer un tournoi, gérer les présences, équipes et matchs. Les autorisations de sécurité restent réservées à l’administrateur principal.</div>'+
      '<div class="row"><input type="datetime-local" data-temp-admin-until value="'+esc(localValue)+'" style="flex:1"><button type="button" data-clear-temp>Retirer</button></div>'+
      '<div class="muted" style="margin-top:6px">'+(tempActive?'🟢 Actif jusqu’au '+new Date(c.temporary_admin_until).toLocaleString('fr-FR'):'Aucun droit admin temporaire actif')+'</div>';
    temp.querySelector('[data-clear-temp]').onclick=()=>{temp.querySelector('[data-temp-admin-until]').value='';};
    card.appendChild(temp);

    const save=document.createElement('button');save.className='primary';save.style.marginTop='12px';save.textContent='Enregistrer les autorisations';
    save.onclick=async()=>{
      const vals={};card.querySelectorAll('[data-perm]').forEach(cb=>vals[cb.dataset.perm]=cb.checked);
      const tempInput=card.querySelector('[data-temp-admin-until]');
      const tempUntil=tempInput&&tempInput.value?new Date(tempInput.value).toISOString():null;
      if(tempUntil&&new Date(tempUntil).getTime()<=Date.now())return toast('Choisis une date de fin future pour les droits admin temporaires.');
      save.disabled=true;
      const linkedPlayerId=card.querySelector('[data-linked-player]')?.value||null;
      const {error}=await sb.rpc('admin_save_coorganizer_settings',{
        p_workspace_id:S.workspace.id,p_user_id:c.user_id,
        p_can_invite:!!vals.can_invite_coorganizers,p_can_scores:!!vals.can_enter_scores,
        p_can_add:!!vals.can_add_members,p_can_delete:!!vals.can_delete_members,
        p_can_create_tournaments:!!vals.can_create_tournaments,
        p_can_view_players:!!vals.can_view_players,
        p_can_generate_teams:!!vals.can_generate_teams,
        p_can_generate_team_codes:!!vals.can_generate_team_codes,
        p_can_edit_player_personal_info:!!vals.can_edit_player_personal_info,
        p_linked_player_id:linkedPlayerId,
        p_temporary_admin_until:tempUntil,
        p_personal_instructions:card.querySelector('[data-personal-instructions]')?.value.trim()||null
      });
      if(error){save.disabled=false;return toast(error.message);}
      Object.assign(c,vals,{linked_player_id:linkedPlayerId,temporary_admin_until:tempUntil,personal_instructions:card.querySelector('[data-personal-instructions]')?.value.trim()||null});
      // Relit la configuration via la même source RPC que celle utilisée au chargement.
      // Cela évite les états incohérents liés à une lecture RLS différente de l'écriture RPC.
      try{
        const {data:freshList,error:freshError}=await sb.rpc('admin_get_coorganizer_permissions',{p_workspace_id:S.workspace.id});
        if(!freshError){
          const fresh=(Array.isArray(freshList)?freshList:[]).find(x=>x.user_id===c.user_id);
          if(fresh)Object.assign(c,fresh);
        }
      }catch(e){console.warn('permission verification',e)}
      save.disabled=false;
      save.textContent='✓ Enregistré';
      toast('Autorisations enregistrées ✅');
      setTimeout(()=>{if(save.isConnected)save.textContent='Enregistrer les autorisations';},1200);
    };
    card.appendChild(save);box.appendChild(card);
  });
}
function renderAll(){
  renderHostWelcome();
  renderHome();
  renderRegisteredPlayersAdmin().catch(e=>console.error('registered players',e));
  renderPlayers();
  renderPlayerDirectoryCard();renderAdminPlayerRequests();
  renderMyPlayerHub();
  renderPermissions();
  renderStripeBilling();
  renderTournaments();
  renderTeams();
  renderMatches();
  renderLeague().catch(e=>console.error('league',e));
  applyPermissions();
  renderAccess();
  if($('#publicLink')&&S.workspace?.public_token)$('#publicLink').value=APP_URL+'?public='+S.workspace.public_token; // lien public général de consultation ; les inscriptions utilisent registrationLink(t)
  renderRanking().catch(e=>console.error('ranking',e));
  renderSeasonScorerSummary().catch(e=>console.error('season ranking',e));
}

async function renderRegisteredPlayersAdmin(){
  const card=$('#registeredPlayersAdminCard');if(!card)return;
  const t=currentTour();
  card.classList.toggle('hidden',!t);
  if(!t)return;
  const label=$('#registeredPlayersCompetitionLabel');
  if(label)label.textContent=(t.format==='league'?'Swé de Ligue : ':'Tournoi : ')+(t.name||t.tournament_date)+' • '+t.tournament_date;
  const {data,error}=await sb.rpc('get_registered_players_for_tournament',{p_tournament_id:t.id});
  const box=$('#registeredPlayersAdminList'),sel=$('#manualRegisteredPlayerSelect');
  if(error){box.innerHTML='<p class="muted">'+esc(error.message)+'</p>';return}
  const rows=Array.isArray(data)?data:[];
  const registeredIds=new Set(rows.filter(r=>r.present).map(r=>r.player_id));
  const available=(S.players||[]).filter(p=>p.active&&p.is_group_member!==false&&!registeredIds.has(p.id)).sort((a,b)=>a.name.localeCompare(b.name));
  if(sel)sel.innerHTML='<option value="">Ajouter un membre inscrit manuellement</option>'+available.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('');
  if(!rows.length){box.innerHTML='<p class="muted">Aucun joueur inscrit pour le moment.</p>';return}
  box.innerHTML='';
  rows.filter(r=>r.present).forEach((r,i)=>{
    const d=document.createElement('div');d.className='player row';d.style.marginBottom='8px';
    d.innerHTML='<b style="min-width:28px">'+(i+1)+'.</b><span style="flex:1">'+esc(r.player_name)+(r.is_group_member===false?' <span class="guest-badge">Guest</span>':'')+'</span><span class="guest-badge">'+(r.registration_status==='waitlist'||r.is_substitute?'Remplaçant':'Confirmé')+'</span>';
    const remove=document.createElement('button');remove.className='danger';remove.textContent='Retirer';remove.onclick=async()=>{
      if(!confirm('Retirer '+r.player_name+' de cette inscription ?'))return;
      const {error}=await sb.rpc('remove_registered_member_from_tournament',{p_tournament_id:t.id,p_player_id:r.player_id});
      if(error)return toast(error.message);
      if(t.format!=='league'&&S.teams.length){
        try{await syncTournamentSubstitutes(t.id)}catch(syncError){return toast(syncError.message)}
      }
      await loadTournament();renderRegisteredPlayersAdmin();renderHome();toast('Inscription retirée.');
    };
    d.appendChild(remove);box.appendChild(d);
  });
}

function renderHomeCoorgVotes(){
  const card=$('#homeCoorgVotesCard');
  const box=$('#homeCoorgVotes');
  if(!card||!box)return;
  const show=isAdmin();
  card.classList.toggle('hidden',!show);
  if(!show)return;
  const active=(S.coorgs||[]).filter(c=>c.active!==false);
  if(!active.length){
    box.innerHTML='<div class="muted">Aucun co-gestionnaire actif pour le moment.</div>';
    return;
  }
  const reviews=Array.isArray(S.skillReviews)?S.skillReviews:[];
  const rows=active.map(c=>{
    const linked=(S.players||[]).find(p=>String(p.id)===String(c.linked_player_id));
    const label=linked?.name||((c.email||'Co-gestionnaire').split('@')[0]);
    const mine=reviews.filter(r=>String(r.evaluator_user_id)===String(c.user_id)&&r.player_id);
    const votedIds=[...new Set(mine.map(r=>String(r.player_id)))];
    const votedPlayers=votedIds.map(id=>(S.players||[]).find(p=>String(p.id)===id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
    const max=Math.max(0,(S.players||[]).filter(p=>p.active&&p.is_group_member!==false&&String(p.id)!==String(c.linked_player_id||'')).length);
    return {userId:c.user_id,label,email:c.email||'',voted:votedIds.length,max,votedPlayers};
  }).sort((a,b)=>b.voted-a.voted||a.label.localeCompare(b.label,'fr'));
  box.innerHTML='<div style="display:grid;gap:8px">'+rows.map((r,i)=>{
    const pct=r.max?Math.min(100,Math.round(r.voted/r.max*100)):0;
    const detailsId='coorgVotesDetails'+i;
    const detailHtml=r.votedPlayers.length?r.votedPlayers.map(p=>'<span class="guest-badge" style="margin:3px 5px 3px 0;display:inline-block">'+esc(p.name)+'</span>').join(''):'<span class="muted">Aucun joueur évalué.</span>';
    return '<div class="player" style="padding:10px 12px">'+
      '<div class="row" style="justify-content:space-between;align-items:center;gap:10px">'+
        '<div style="min-width:0"><b>'+esc(r.label)+'</b>'+(r.email&&r.email.split('@')[0]!==r.label?'<div class="muted" style="font-size:12px">'+esc(r.email)+'</div>':'')+'</div>'+
        '<div style="text-align:right;white-space:nowrap"><b style="font-size:18px">'+r.voted+'</b><span class="muted"> vote'+(r.voted>1?'s':'')+'</span><div class="muted" style="font-size:12px">sur '+r.max+' joueur'+(r.max>1?'s':'')+'</div></div>'+
      '</div>'+
      '<div style="height:6px;background:#e8ecea;border-radius:999px;overflow:hidden;margin-top:8px"><div style="height:100%;width:'+pct+'%;background:#b38b2e;border-radius:999px"></div></div>'+
      '<button class="secondary" type="button" style="margin-top:8px;padding:7px 10px" data-toggle-coorg-votes="'+detailsId+'">👁️ Voir les joueurs notés ('+r.voted+')</button>'+
      '<div id="'+detailsId+'" class="hidden" style="margin-top:8px;padding-top:8px;border-top:1px solid #e8ecea"><div class="muted" style="font-size:12px;margin-bottom:5px">Joueurs évalués par '+esc(r.label)+' :</div>'+detailHtml+'</div>'+
    '</div>';
  }).join('')+'</div>';
  box.querySelectorAll('[data-toggle-coorg-votes]').forEach(btn=>btn.addEventListener('click',()=>{
    const target=document.getElementById(btn.dataset.toggleCoorgVotes);
    if(!target)return;
    const opening=target.classList.contains('hidden');
    target.classList.toggle('hidden',!opening);
    const count=(target.querySelectorAll('.guest-badge')||[]).length;
    btn.textContent=opening?'🙈 Masquer la liste':'👁️ Voir les joueurs notés ('+count+')';
  }));
}


function coorgUnitCents(period){
  return period==='year'?1990:199;
}
function coorgBillingPeriod(){
  return $('#homeCoorgBillingPeriod')?.value==='year'?'year':'month';
}
function euroCents(c){return (Number(c||0)/100).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'}
function refreshCoorgPurchasePrice(){
  const input=$('#homeCoorgQty');
  let q=Math.max(1,Math.min(100,Math.floor(Number(input?.value||1))||1));if(input)input.value=q;
  const period=coorgBillingPeriod(),unit=coorgUnitCents(period),total=unit*q;
  const suffix=period==='year'?'/an':'/mois';
  const periodLabel=period==='year'?'par an':'par mois';
  const frequencyLabel=period==='year'?'facturation annuelle':'facturation mensuelle';
  const u=$('#homeCoorgUnitPrice');if(u)u.textContent='Tarif unitaire : 1 accès équipe à '+euroCents(unit)+' '+periodLabel;
  const label=$('#homeCoorgTotalLabel');if(label)label.textContent=period==='year'?'Total annuel':'Total mensuel';
  const t=$('#homeCoorgTotal');if(t)t.innerHTML='<b>'+euroCents(total)+suffix+'</b><div class="muted">'+q+' accès × '+euroCents(unit)+' • '+frequencyLabel+'</div>';
  const b=$('#homeBuyCoorg');if(b&&!S.coorgCheckoutPending)b.innerHTML='💳 Ajouter '+q+' accès équipe — '+euroCents(total)+suffix+' <span>→</span>';
}
async function confirmCoorgCheckoutFromUrl(){
  const p=new URLSearchParams(location.search);
  if(p.get('coorg')!=='success'||!S.session||!S.workspace||!isAdmin()||S.coorgPurchaseConfirming)return;
  S.coorgPurchaseConfirming=true;
  try{
    // V41: the browser never activates paid rights. Stripe webhook is the only authority.
    toast('Paiement reçu ✅ Activation sécurisée en cours…');
    for(let i=0;i<3;i++){
      if(i) await new Promise(r=>setTimeout(r,1500));
      await loadAll();
    }
    const u=new URL(location.href);u.searchParams.delete('coorg');u.searchParams.delete('coorg_session_id');history.replaceState({},'',u.toString());
    toast('Option équipe synchronisée avec Stripe ✅');
  }catch(err){
    console.warn(err);
    toast('Paiement reçu. Stripe finalise l’activation automatiquement.');
  }finally{S.coorgPurchaseConfirming=false;}
}
function renderEcosystemCommercial(){
  const ecosystemCard=$('#homeEcosystemCard');
  if(ecosystemCard) ecosystemCard.classList.toggle('hidden',!isAdmin());
  const purchaseCard=$('#homeCoorgOfferCard');
  if(purchaseCard&&!isAdmin())purchaseCard.classList.add('hidden');
  if(!isAdmin()) return;
  const c=S.commercialAccess||{};
  const a=S.organizerAccess||{};
  const trialActive=!!a.trial_active&&!c.special_access_enabled;
  const hasLockedModules=['player_ratings_enabled','third_half_enabled','tournaments_enabled'].some(key=>!S.workspaceFeatures[key]);
  for(const id of ['#homeCoorgOfferCard','#homeModulesDisclosure']){const section=$(id);if(section&&section.dataset.workspace!==String(S.workspace?.id||'')){section.open=false;section.dataset.workspace=String(S.workspace?.id||'');}}
  const badge=$('#homePlanBadge');if(badge)badge.textContent=trialActive?('ESSAI • '+Number(a.days_remaining||0)+' J'):(c.special_access_enabled?'ACCÈS SPÉCIAL • ':'')+String(c.subscription_plan||'free').toUpperCase();
  const special=$('#homeSpecialAccessNotice');if(special){special.classList.toggle('hidden',!c.special_access_enabled);special.innerHTML=c.special_access_enabled?'<div class="player" style="background:#ecfdf3;border-color:#86d6a3"><b>🎁 Autorisation spéciale SWÉ active</b><div class="muted" style="margin-top:4px">Tous les modules sont débloqués pour faire découvrir la solution, sans modifier ton abonnement commercial.</div></div>':'';}
  const trialNotice=$('#homeTrialPricingNotice');
  const coorgOffer=$('#homeCoorgOfferCard');
  const upgradeCard=$('#homeUpgradeCard');
  if(trialNotice){
    trialNotice.classList.toggle('hidden',!trialActive);
    trialNotice.innerHTML=trialActive?'<div class="home-trial-strip"><b>🎁 Offre découverte · '+Number(a.days_remaining||0)+' jour'+(Number(a.days_remaining||0)>1?'s':'')+' restant'+(Number(a.days_remaining||0)>1?'s':'')+'</b><span>Retrouve le statut de chaque option dans « Voir nos modules ».</span><details><summary>Gérer mon essai</summary><button type="button" id="endTrialToPay" class="secondary">Arrêter mon essai et voir les offres payantes</button></details></div>':'';
  }
  if(coorgOffer)coorgOffer.classList.toggle('hidden',trialActive);
  if(upgradeCard)upgradeCard.classList.toggle('hidden',!hasLockedModules);
  const paint=(id,on)=>{const el=$(id);if(!el)return;el.dataset.moduleState=on?(trialActive?'trial':'active'):'locked';let st=el.querySelector('[data-module-status]');if(!st){st=document.createElement('div');st.dataset.moduleStatus='1';el.appendChild(st);}st.className='home-module-status';st.textContent=on?(trialActive?'🎁 Offert pendant l’essai':'✓ Module actif'):'＋ À débloquer';};
  paint('#ecoRatingsModule',!!S.workspaceFeatures.player_ratings_enabled);paint('#ecoThirdHalfModule',!!S.workspaceFeatures.third_half_enabled);paint('#ecoTournamentModule',!!S.workspaceFeatures.tournaments_enabled);
  const up=$('#homeRequestUpgrade');if(up){up.textContent=c.upgrade_requested_at?'⏳ Demande envoyée':'Demander une activation';up.disabled=!!c.upgrade_requested_at;}
  refreshCoorgPurchasePrice();
}


function renderHome(){
  renderEcosystemCommercial();
  renderCoorgOrganizerCta();
  setTimeout(confirmCoorgCheckoutFromUrl,0);
  const ongoingTournaments=S.tournaments.filter(x=>x.format!=='league'&&x.status!=='finished').length;
  const ongoingLeagues=S.leagues.filter(x=>x.status!=='finished').length;
  const groupMembers=S.players.filter(x=>x.active&&x.is_group_member!==false).length;
  const allowedCoorg=Number(S.workspaceFeatures.max_coorganizers||0);
  const activeCoorg=Number(S.coorgCount||0);
  const wsStats=$('#homeWorkspaceStats');
  if(wsStats){
    wsStats.innerHTML=
      '<div class="home-kpi blue"><b>'+ongoingTournaments+'</b><div class="muted">⚽ tournoi'+(ongoingTournaments>1?'s':'')+' en cours</div></div>'+
      '<div class="home-kpi green"><b>'+ongoingLeagues+'</b><div class="muted">🏁 ligue'+(ongoingLeagues>1?'s':'')+' en cours</div></div>'+
      '<div class="home-kpi orange"><b>'+groupMembers+'</b><div class="muted">👥 membre'+(groupMembers>1?'s':'')+' dans le groupe</div></div>'+
      (isAdmin()?'<div class="home-kpi violet"><b>'+activeCoorg+' / '+allowedCoorg+'</b><div class="muted">🤝 co-gestionnaire'+(allowedCoorg>1?'s':'')+' autorisé'+(allowedCoorg>1?'s':'')+'</div></div>':'');
  }
  const quotaBox=$('#homeCoorgQuotaRequest');
  if(quotaBox){
    quotaBox.innerHTML='';
    if(isAdmin()) quotaBox.innerHTML='<div class="muted" style="font-size:12px">🤝 Capacité actuelle : <b>'+activeCoorg+' / '+allowedCoorg+'</b>. Pour ajouter des accès, utilise la section <b>Mon abonnement & options SWÉ</b>.</div>';
  }
  renderHomeCoorgVotes();
}

document.addEventListener('change',e=>{if(e.target?.id==='saWorkspaceFilter')renderSuperAdminWorkspaces();});
document.addEventListener('click',async e=>{
  if(e.target?.id==='homeRequestMoreCoorg'){
    const n=Number($('#homeRequestedCoorgLimit')?.value||0);
    const current=Number(S.workspaceFeatures.max_coorganizers||0);
    if(!Number.isFinite(n)||n<=current)return toast('Choisis une limite supérieure à '+current+'.');
    const b=e.target;b.disabled=true;
    const {data,error}=await sb.rpc('request_more_coorganizers',{p_workspace_id:S.workspace.id,p_requested_limit:n});
    b.disabled=false;if(error)return toast(error.message);
    S.coorgQuotaRequest=data||null;renderHome();toast('Demande envoyée au Super Admin ✅');
    return;
  }
  if(e.target?.id==='refreshRegisteredPlayers')await renderRegisteredPlayersAdmin();
  if(e.target?.id==='manualRegisterPlayer'){
    const t=currentTour();const pid=$('#manualRegisteredPlayerSelect')?.value;
    if(!t)return toast('Aucune compétition sélectionnée.');
    if(!pid)return toast('Choisis un membre du groupe.');
    const b=e.target;b.disabled=true;
    const {data,error}=await sb.rpc('add_registered_member_to_tournament',{p_tournament_id:t.id,p_player_id:pid});
    b.disabled=false;if(error)return toast(error.message);
    if(t.format!=='league'&&S.teams.length){
      try{await syncTournamentSubstitutes(t.id)}catch(syncError){return toast(syncError.message)}
    }
    await loadTournament();renderRegisteredPlayersAdmin();renderHome();
    const fresh=S.tPlayers.find(tp=>String(tp.player_id)===String(pid));
    toast(data==='waitlist'||fresh?.is_substitute?'Joueur ajouté comme remplaçant 🟠':'Joueur ajouté aux inscrits ✅');
  }
  if(e.target?.id==='managerAddGuest'){
    const t=currentTour(),name=$('#managerGuestName')?.value.trim();
    if(!t)return toast('Aucune compétition sélectionnée.');
    if(!name)return toast('Indique le nom de l’invité.');
    const b=e.target;b.disabled=true;
    const {data,error}=await sb.rpc('manager_register_tournament_guest',{p_tournament_id:t.id,p_guest_name:name});
    b.disabled=false;if(error)return toast(error.message);
    $('#managerGuestName').value='';
    if(t.format!=='league'&&S.teams.length){
      try{await syncTournamentSubstitutes(t.id)}catch(syncError){return toast(syncError.message)}
    }
    await loadTournament();renderRegisteredPlayersAdmin();renderHome();renderTeams();
    const fresh=S.tPlayers.find(tp=>String(tp.player_id)===String(data?.player_id));
    toast(data?.status==='waitlist'||fresh?.is_substitute?'Invité ajouté comme remplaçant 🟠':'Invité ajouté ✅');
  }
});


function closeCoorgOptionsManager(){document.querySelector('.swe-option-modal-backdrop')?.remove();}
function coorgSubPeriodEnd(ts){
  if(!ts)return '';
  try{return new Date(Number(ts)*1000).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(_){return ''}
}
async function openCoorgOptionsManager(){
  closeCoorgOptionsManager();
  const trigger=$('#homeCancelCoorg');
  if(trigger){trigger.disabled=true;trigger.textContent='Chargement des options…';}
  const {data,error}=await sb.functions.invoke('stripe-cancel-coorganizer-subscription',{body:{workspace_id:S.workspace.id,action:'list'}});
  if(trigger){trigger.disabled=false;trigger.textContent='Gérer / résilier mes options équipe';}
  if(error||data?.error)return toast(data?.error||error?.message||'Impossible de charger tes options.');
  const subs=Array.isArray(data?.subscriptions)?data.subscriptions:[];
  const overlay=document.createElement('div');overlay.className='swe-option-modal-backdrop';
  overlay.innerHTML='<div class="swe-option-modal" role="dialog" aria-modal="true" aria-labelledby="coorgOptionsTitle">'+
    '<div class="swe-option-modal-head"><div><h3 id="coorgOptionsTitle">⚙️ Gérer mes options équipe</h3><p>Sélectionne uniquement les options que tu souhaites arrêter. Les autres restent actives.</p></div><button type="button" class="swe-option-modal-close" aria-label="Fermer">×</button></div>'+
    '<div class="swe-option-modal-body">'+
      (subs.length?'<div class="swe-option-list">'+subs.map((x,i)=>{
        const annual=x.interval==='year',qty=Math.max(0,Number(x.quantity||0)),unit=Number(x.unit_amount_cents||0),total=qty*unit;
        const end=coorgSubPeriodEnd(x.current_period_end);
        const state=x.cancel_at_period_end?'Renouvellement déjà arrêté':(annual?'Annuel':'Mensuel');
        return '<label class="swe-option-row"><input type="checkbox" data-cancel-sub="'+esc(x.subscription_id)+'" '+(x.cancel_at_period_end?'disabled':'')+'><div><div class="swe-option-row-title">'+qty+' accès équipe'+(qty>1?'s':'')+' · '+state+'</div><div class="swe-option-row-meta">'+(annual?'Facturation annuelle':'Facturation mensuelle')+(annual&&end?' · actif jusqu’au '+esc(end):'')+(x.cancel_at_period_end?' · aucune action nécessaire':'')+'</div></div><div class="swe-option-row-price">'+euroCents(total)+'<small>'+(annual?'/ an':'/ mois')+'</small></div></label>';
      }).join('')+'</div>':'<div class="swe-option-modal-empty"><b>Aucune option équipe payante active.</b><div class="muted" style="margin-top:5px">Les accès inclus ou offerts dans ton espace SWÉ ne sont pas concernés.</div></div>')+
      '<div class="swe-option-modal-note"><b>À savoir :</b> une option mensuelle sélectionnée est arrêtée immédiatement. Pour une option annuelle, seul le renouvellement est arrêté : les accès restent actifs jusqu’à la fin de la période déjà payée.</div>'+
    '</div><div class="swe-option-modal-actions"><button type="button" class="secondary" data-close-options>Fermer</button><button type="button" class="primary swe-option-cancel-confirm" data-confirm-options disabled>Résilier la sélection</button></div></div>';
  document.body.appendChild(overlay);
  const update=()=>{const n=overlay.querySelectorAll('[data-cancel-sub]:checked').length;const b=overlay.querySelector('[data-confirm-options]');if(b){b.disabled=n===0;b.textContent=n?'Résilier '+n+' option'+(n>1?'s':''):'Résilier la sélection';}};
  overlay.querySelectorAll('[data-cancel-sub]').forEach(x=>x.addEventListener('change',update));
  overlay.querySelector('.swe-option-modal-close')?.addEventListener('click',closeCoorgOptionsManager);
  overlay.querySelector('[data-close-options]')?.addEventListener('click',closeCoorgOptionsManager);
  overlay.addEventListener('click',ev=>{if(ev.target===overlay)closeCoorgOptionsManager();});
  overlay.querySelector('[data-confirm-options]')?.addEventListener('click',async ev=>{
    const ids=[...overlay.querySelectorAll('[data-cancel-sub]:checked')].map(x=>x.dataset.cancelSub).filter(Boolean);
    if(!ids.length)return;
    const annualSelected=subs.some(x=>ids.includes(x.subscription_id)&&x.interval==='year');
    const msg='Confirmer la résiliation de '+ids.length+' option'+(ids.length>1?'s':'')+' sélectionnée'+(ids.length>1?'s':'')+' ?'+(annualSelected?'\\n\\nLes options annuelles resteront actives jusqu’à la fin de leur période déjà payée.':'');
    if(!confirm(msg))return;
    const b=ev.currentTarget;b.disabled=true;b.textContent='Résiliation en cours…';
    const {data:cancelData,error:cancelError}=await sb.functions.invoke('stripe-cancel-coorganizer-subscription',{body:{workspace_id:S.workspace.id,action:'cancel',subscription_ids:ids}});
    if(cancelError||cancelData?.error){b.disabled=false;update();return toast(cancelData?.error||cancelError?.message||'Impossible de résilier la sélection.');}
    closeCoorgOptionsManager();
    await loadAll();renderHome();
    toast(cancelData?.message||'Résiliation enregistrée ✅');
  });
}

document.addEventListener('change',e=>{if(e.target?.id==='saWorkspaceFilter')renderSuperAdminWorkspaces();});
document.addEventListener('click',async e=>{
  const stepBtn=e.target?.closest?.('[data-coorg-step]');
  if(stepBtn){const input=$('#homeCoorgQty');if(input){input.value=Math.max(1,Math.min(100,Math.floor(Number(input.value||1))+Number(stepBtn.dataset.coorgStep||0)));refreshCoorgPurchasePrice();}return;}
  const billingBtn=e.target?.closest?.('[data-coorg-billing]');
  if(billingBtn){
    const period=billingBtn.dataset.coorgBilling==='year'?'year':'month';
    const hidden=$('#homeCoorgBillingPeriod');if(hidden)hidden.value=period;
    document.querySelectorAll('[data-coorg-billing]').forEach(btn=>{const active=btn===billingBtn;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false');});
    refreshCoorgPurchasePrice();
    return;
  }
  if(e.target?.id==='homeCancelCoorg'){
    if(!isAdmin())return toast('Réservé à l’administrateur.');
    await openCoorgOptionsManager();
    return;
  }
  const purchaseButton=e.target?.closest?.('#homeBuyCoorg');
  if(purchaseButton){
    if(!isAdmin())return toast('Réservé à l’administrateur.');
    if(S.coorgCheckoutPending)return;
    const qty=Math.max(1,Math.min(100,Math.floor(Number($('#homeCoorgQty')?.value||1))||1));
    const billingPeriod=coorgBillingPeriod(),workspaceId=S.workspace.id;
    const key=[workspaceId,qty,billingPeriod].join(':');
    if(S.coorgCheckoutRequest?.key!==key)S.coorgCheckoutRequest={key,id:crypto.randomUUID()};
    S.coorgCheckoutPending=true;purchaseButton.disabled=true;purchaseButton.textContent='Ouverture du paiement…';
    try{
      const {data,error}=await sb.functions.invoke('stripe-create-coorganizer-checkout',{body:{workspace_id:workspaceId,quantity:qty,billing_period:billingPeriod,request_id:S.coorgCheckoutRequest.id}});
      if(error){let detail;try{detail=await error.context?.json()}catch(_){}throw new Error(detail?.error||'Le paiement ne peut pas être ouvert. Réessaie dans un instant.');}
      if(data?.error)throw new Error(data.error);
      if(!data?.url)throw new Error('Lien de paiement indisponible.');
      location.href=data.url;
    }catch(error){toast(error.message||'Impossible d’ouvrir le paiement.');}
    finally{S.coorgCheckoutPending=false;purchaseButton.disabled=false;refreshCoorgPurchasePrice();}
    return;
  }
  if(e.target?.id==='endTrialToPay'){
    if(!isAdmin())return toast('Réservé à l’administrateur.');
    if(!confirm('Mettre fin maintenant à ton essai gratuit ?\n\nLes fonctions organisateur premium ne seront plus accessibles tant qu’aucun abonnement n’est actif. Tu pourras alors consulter les offres et tarifs. Cette action est immédiate.'))return;
    const b=e.target;b.disabled=true;b.textContent='Fin de l’essai…';
    const {data,error}=await sb.rpc('end_my_organizer_trial',{p_workspace_id:S.workspace.id});
    if(error){b.disabled=false;b.textContent='Je veux arrêter mon essai et voir les offres payantes';return toast(error.message);}
    S.organizerAccess=data||{trial_active:false,requires_subscription:true,days_remaining:0};
    await loadAll();
    renderHome();
    toast('Essai terminé. Les offres payantes sont maintenant visibles.');
    return;
  }
  if(e.target?.id==='homeRequestUpgrade'){
    if(!isAdmin())return toast('Réservé à l’administrateur.');if(!confirm('Demander à faire évoluer ton espace SWÉ pour débloquer des modules avancés ?'))return;
    const {error}=await sb.rpc('request_workspace_upgrade',{p_workspace_id:S.workspace.id});if(error)return toast(error.message);S.commercialAccess.upgrade_requested_at=new Date().toISOString();renderHome();toast('Demande d’évolution envoyée ✅');return;
  }
});


document.addEventListener('change',e=>{if(e.target?.id==='homeCoorgQty')refreshCoorgPurchasePrice();});
document.addEventListener('input',e=>{if(e.target?.id==='homeCoorgQty')refreshCoorgPurchasePrice();});

document.addEventListener('change',e=>{
  if(e.target?.id==='myPlayerPublic'){
    const on=e.target.checked;
    if($('#myPlayerDiscoverable')){ $('#myPlayerDiscoverable').disabled=!on; if(!on)$('#myPlayerDiscoverable').checked=false; }
    if($('#myPlayerNotify'))$('#myPlayerNotify').disabled=false;
  }
});
document.addEventListener('change',e=>{if(e.target?.id==='saWorkspaceFilter')renderSuperAdminWorkspaces();});
document.addEventListener('click',async e=>{
  if(e.target?.id==='myPlayerCreate'){
    const name=$('#myPlayerCreateName').value.trim();if(!name)return toast('Indique ton nom ou ton pseudo joueur.');
    e.target.disabled=true;const {error}=await sb.rpc('ensure_my_global_player_profile',{p_display_name:name});e.target.disabled=false;if(error)return toast(error.message);await loadMyPlayerDashboard();toast('Ton ID joueur SWÉ est créé ✅');return;
  }
  if(e.target?.id==='myPlayerSave'){
    const name=$('#myPlayerName').value.trim();if(!name)return toast('Ton nom joueur est obligatoire.');
    e.target.disabled=true;const {error}=await sb.rpc('update_my_global_player_profile',{p_display_name:name,p_is_public:$('#myPlayerPublic').checked,p_discoverable:$('#myPlayerDiscoverable').checked,p_notify_upcoming_swes:$('#myPlayerNotify').checked,p_home_area:$('#myPlayerArea').value.trim()||null});e.target.disabled=false;if(error)return toast(error.message);await loadMyPlayerDashboard();toast('Profil joueur mis à jour ✅');return;
  }
  if(e.target?.id==='mySweHistorySearch'){
    const code=$('#mySweHistoryCode')?.value.trim();if(!code)return toast('Indique l’ID du tournoi ou de la ligue.');
    e.target.disabled=true;const {data,error}=await sb.rpc('find_swe_identity_source',{p_code:code});e.target.disabled=false;if(error)return toast(error.message);S.sweIdentitySource=data||null;renderSweIdentitySource();return;
  }
  const claimHistory=e.target?.closest?.('[data-claim-history-player]');if(claimHistory){
    const src=S.sweIdentitySource;if(!src)return;const player=(src.players||[]).find(p=>String(p.player_id)===String(claimHistory.dataset.claimHistoryPlayer));
    if(!confirm('Confirmer que tu es bien « '+(player?.name||'ce joueur')+' » ? Cette liaison associera ses statistiques à ton compte SWÉ.'))return;
    claimHistory.disabled=true;const {data,error}=await sb.rpc('claim_swe_identity_player',{p_source_type:src.source_type,p_source_id:src.source_id,p_player_id:claimHistory.dataset.claimHistoryPlayer});claimHistory.disabled=false;if(error)return toast(error.message);
    if(data?.status==='disputed'){S.sweIdentitySource=null;renderSweIdentitySource();await loadMyPlayerDashboard();return toast('Conflit détecté : les deux comptes sont placés en vérification. L’équipe SWÉ devra trancher.');}
    S.sweIdentitySource=null;renderSweIdentitySource();await loadMyPlayerDashboard();if(S.workspace)await loadAll();toast('Profil « '+(data?.player_name||'joueur')+' » relié à ton compte SWÉ ✅');return;
  }
  if(e.target?.id==='myPlayerSelfLink'){
    const playerId=$('#myPlayerSelfMember')?.value;if(!playerId)return toast('Choisis ton profil membre dans la liste.');
    const player=(S.players||[]).find(x=>String(x.id)===String(playerId));
    if(!confirm('Relier définitivement ton compte SWÉ au membre « '+(player?.name||'sélectionné')+' » dans ce groupe ?'))return;
    e.target.disabled=true;const {data,error}=await sb.rpc('link_my_member_player_to_swe',{p_workspace_id:S.workspace.id,p_player_id:playerId});e.target.disabled=false;
    if(error)return toast(error.message);await loadAll();await loadMyPlayerDashboard();toast('Compte lié à « '+(data?.player_name||player?.name||'membre')+' » • ID '+(data?.public_player_id||'SWÉ')+' ✅');return;
  }
  if(e.target?.id==='myPlayerRefresh'){await loadMyPlayerDashboard();toast('Profil actualisé ✅');return;}
  const accept=e.target?.closest?.('[data-player-invite-accept]');if(accept){accept.disabled=true;const {data,error}=await sb.rpc('respond_global_player_tournament_invite',{p_invite_id:accept.dataset.playerInviteAccept,p_accept:true});accept.disabled=false;if(error)return toast(error.message);await loadMyPlayerDashboard();toast(data?.status==='waitlist'?'Invitation acceptée • tu es actuellement remplaçant.':'Invitation acceptée ✅');return;}
  const decline=e.target?.closest?.('[data-player-invite-decline]');if(decline){decline.disabled=true;const {error}=await sb.rpc('respond_global_player_tournament_invite',{p_invite_id:decline.dataset.playerInviteDecline,p_accept:false});decline.disabled=false;if(error)return toast(error.message);await loadMyPlayerDashboard();toast('Invitation refusée.');return;}
  const direct=e.target?.closest?.('[data-player-direct-join]');if(direct){const tid=direct.dataset.playerDirectJoin;const pledgeEl=document.querySelector('[data-pledge-for="'+tid+'"]');const pledge=Math.round(Math.max(0,Number(pledgeEl?.value||0))*100);direct.disabled=true;const {data,error}=await sb.rpc('join_discoverable_tournament',{p_tournament_id:tid,p_third_half_pledge_cents:pledge});direct.disabled=false;if(error)return toast(error.message);if(data?.payment_required){const {data:pay,error:pe}=await sb.functions.invoke('stripe-create-entry-checkout',{body:{public_token:data.public_token,tournament_id:tid,player_id:data.player_id,payer_email:S.session?.user?.email||null,success_url:APP_URL+'?playerPayment=success',cancel_url:APP_URL+'?playerPayment=cancel'}});if(pe||pay?.error)return toast(pay?.error||pe?.message||'Impossible d’ouvrir le paiement.');if(pay?.url){location.href=pay.url;return;}}await loadMyPlayerDashboard();toast(data?.status==='waitlist'?'Inscription enregistrée • tu es remplaçant.':'Inscription confirmée ✅');return;}
  const requestJoin=e.target?.closest?.('[data-player-request-join]');if(requestJoin){const tid=requestJoin.dataset.playerRequestJoin;const pledgeEl=document.querySelector('[data-pledge-for="'+tid+'"]');const msgEl=document.querySelector('[data-request-message-for="'+tid+'"]');const pledge=Math.round(Math.max(0,Number(pledgeEl?.value||0))*100);requestJoin.disabled=true;const {error}=await sb.rpc('request_discoverable_tournament',{p_tournament_id:tid,p_message:msgEl?.value.trim()||null,p_third_half_pledge_cents:pledge});requestJoin.disabled=false;if(error)return toast(error.message);await loadMyPlayerDashboard();toast('Demande envoyée à l’organisateur ✅');return;}
  const payBtn=e.target?.closest?.('[data-player-pay]');if(payBtn){payBtn.disabled=true;const {data,error}=await sb.functions.invoke('stripe-create-entry-checkout',{body:{public_token:payBtn.dataset.publicToken,tournament_id:payBtn.dataset.tournamentId,player_id:payBtn.dataset.playerId,payer_email:S.session?.user?.email||null,success_url:APP_URL+'?playerPayment=success',cancel_url:APP_URL+'?playerPayment=cancel'}});payBtn.disabled=false;if(error||data?.error)return toast(data?.error||error?.message||'Impossible d’ouvrir le paiement.');if(data?.url)location.href=data.url;return;}
  const open=e.target?.closest?.('[data-open-player-opportunity]');if(open){location.href=open.dataset.openPlayerOpportunity;return;}
  if(e.target?.id==='playerDirectoryBtn'){
    if(!isAdmin())return toast('Réservé à l’administrateur.');
    e.target.disabled=true;const {data,error}=await sb.rpc('search_public_global_players',{p_workspace_id:S.workspace.id,p_query:$('#playerDirectorySearch').value.trim()||null,p_limit:50});e.target.disabled=false;if(error)return toast(error.message);S.playerDirectory=Array.isArray(data)?data:[];renderPlayerDirectoryCard();renderAdminPlayerRequests();return;
  }
  const invite=e.target?.closest?.('[data-directory-invite]');if(invite){
    const tid=$('#playerDirectoryTournament').value;if(!tid)return toast('Choisis d’abord le Swé à compléter.');
    const row=(S.playerDirectory||[]).find(r=>String(r.global_player_id)===String(invite.dataset.directoryInvite));
    if(!confirm('Inviter '+(row?.display_name||'ce joueur')+' à rejoindre ce Swé ?'))return;
    invite.disabled=true;const {error}=await sb.rpc('invite_public_player_to_tournament',{p_workspace_id:S.workspace.id,p_tournament_id:tid,p_global_player_id:invite.dataset.directoryInvite,p_message:'Ton profil public correspond à un besoin pour compléter ce Swé.'});invite.disabled=false;if(error)return toast(error.message);toast('Invitation envoyée dans son espace joueur SWÉ ✅');return;
  }
});

document.addEventListener('change',e=>{if(e.target?.id==='saWorkspaceFilter')renderSuperAdminWorkspaces();});
document.addEventListener('click',async e=>{
  if(e.target?.id==='saveOrganizerSettings'){if(!isAdmin())return;const b=e.target;b.disabled=true;const {data,error}=await sb.rpc('update_my_organizer_settings',{p_workspace_id:S.workspace.id,p_legal_status:$('#organizerLegalStatus').value,p_whatsapp_group_url:$('#organizerWhatsappGroup').value.trim()||null,p_whatsapp_contact_phone:$('#organizerWhatsappPhone').value.trim()||null});b.disabled=false;if(error)return toast(error.message);S.organizerSettings=data||null;renderStripeBilling();toast('Profil organisateur mis à jour ✅');return;}
  if(e.target?.id==='refreshPlayerRequests'){const {data,error}=await sb.rpc('list_workspace_player_requests',{p_workspace_id:S.workspace.id});if(error)return toast(error.message);S.playerRequests=Array.isArray(data)?data:[];renderAdminPlayerRequests();toast('Demandes actualisées ✅');return;}
  const a=e.target?.closest?.('[data-request-accept]');if(a){if(!confirm('Accepter cette demande de participation ?'))return;a.disabled=true;const {data,error}=await sb.rpc('respond_global_player_participation_request',{p_request_id:a.dataset.requestAccept,p_accept:true});a.disabled=false;if(error)return toast(error.message);await loadAll();renderAdminPlayerRequests();toast(data?.status==='payment_pending'?'Demande acceptée • le joueur doit maintenant payer sa place.':'Demande acceptée ✅');return;}
  const d=e.target?.closest?.('[data-request-decline]');if(d){if(!confirm('Refuser cette demande ?'))return;d.disabled=true;const {error}=await sb.rpc('respond_global_player_participation_request',{p_request_id:d.dataset.requestDecline,p_accept:false});d.disabled=false;if(error)return toast(error.message);await loadAll();renderAdminPlayerRequests();toast('Demande refusée.');return;}
});

$('#sendInvite').onclick=async()=>{
  if(!S.workspace)return;
  if(!(isAdmin()||(isCoorg()&&S.myPermissions.can_invite_coorganizers)))return toast('Tu n’es pas autorisé à inviter un co-organisateur.');
  if(S.coorgCount>=Number(S.workspaceFeatures.max_coorganizers||0))return toast('Limite de co-organisateurs atteinte.');
  const email=$('#inviteEmail').value.trim().toLowerCase();if(!email)return;
  const {data,error}=await sb.rpc('create_coorganizer_invite',{p_workspace_id:S.workspace.id,p_email:email});
  if(error)return toast(error.message);
  const inv=Array.isArray(data)?data[0]:data;
  S.lastCreatedInvite=inv||null;
  if(isAdmin()){const codeRes=await sb.rpc('admin_get_coorganizer_swe_code',{p_workspace_id:S.workspace.id,p_email:email});if(!codeRes.error&&codeRes.data){S.lastCreatedInvite.swe_code=codeRes.data.code;S.lastCreatedInvite.public_player_id=codeRes.data.public_player_id||null;try{await navigator.clipboard.writeText(codeRes.data.code)}catch(_e){}}}
  $('#inviteEmail').value='';
  if(isAdmin())await loadAll();else renderAccess();
  toast(S.lastCreatedInvite?.swe_code?'Co-gestionnaire ajouté ✅ Code SWÉ '+S.lastCreatedInvite.swe_code+' copié.':'Invitation créée ✅ Utilise Copier le lien ou WhatsApp.');
};
$('#copyPublicLink').onclick=async()=>{
  const link=$('#publicLink').value;if(!link)return;
  try{await navigator.clipboard.writeText(link);toast('Lien public copié ✅')}
  catch(e){$('#publicLink').focus();$('#publicLink').select();toast('Lien sélectionné : copie-le.')}
};



function guestLabel(pl){
  if(!pl||pl.is_group_member!==false)return '';
  const host=pl.guest_of_player_id?p(pl.guest_of_player_id):null;
  return host?'Guest de '+host.name:'Guest';
}
function playerDisplayName(pl){
  if(!pl)return '';
  const g=guestLabel(pl);
  return pl.name+(g?' — '+g:'');
}
function refreshGuestOfSelect(){
  const sel=$('#guestOfPlayer');if(!sel)return;
  const keep=sel.value;
  sel.innerHTML='<option value="">Guest de… (facultatif)</option>'+S.players.filter(x=>x.active&&x.is_group_member!==false).map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join('');
  if([...sel.options].some(o=>o.value===keep))sel.value=keep;
}
function skillRoleLabel(role){
  return ({defenseur:'🛡️ Défenseur',metronome:'🎼 Métronome',ratisseur:'🧹 Ratisseur',finisseur:'🥅 Finisseur',dribbleur:'🪄 Dribbleur',frappeur:'💥 Frappeur',top_player:'⭐ Top player'})[role]||'—';
}
function playerSkillAggregate(playerId){
  return S.skillAggregates.find(r=>r.player_id===playerId)||null;
}
function playerSkillReviewSummary(player){
  const all=S.skillReviews.filter(r=>r.player_id===player.id);
  const adminUid=S.session?.user?.id||null;
  const valid=all.filter(r=>Number.isFinite(Number(r.rating)));
  const coorgReviews=valid.filter(r=>String(r.evaluator_user_id)!==String(adminUid));
  const adminReview=valid.find(r=>String(r.evaluator_user_id)===String(adminUid))||null;
  const avgField=(field)=>{
    const vals=valid.map(r=>Number(r[field])).filter(Number.isFinite);
    return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
  };
  const roles={};
  valid.forEach(r=>{if(r.preferred_role)roles[r.preferred_role]=(roles[r.preferred_role]||0)+1});
  const topRole=Object.entries(roles).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  return {
    reviews:valid,coorgReviews,adminReview,
    count:valid.length,
    avg:avgField('rating'),
    cardio:avgField('cardio'),dribble:avgField('dribble'),collectif:avgField('collectif'),frappe:avgField('frappe'),
    topRole
  };
}
function renderPlayers(){
  const box=$('#playersList');box.innerHTML='';
  if(isCoorg()){
    const info=document.createElement('div');info.className='readonly-note';
    info.innerHTML=S.workspaceFeatures.player_ratings_enabled
      ?'👥 <b>'+S.players.length+' joueur'+(S.players.length>1?'s':'')+'</b> accessible'+(S.players.length>1?'s':'')+'. Tu peux consulter les critères et donner ton évaluation pour chaque joueur.<div style="margin-top:7px;padding:8px 10px;border-radius:10px;background:#fff3cd;color:#6b4f00"><b>🔒 Confidentiel :</b> les évaluations sont croisées de manière indépendante et suivent l’ID SWÉ du joueur.</div>'
      :'👥 <b>'+S.players.length+' joueur'+(S.players.length>1?'s':'')+'</b> dans le groupe. Le module Notation est désactivé : seules les informations joueurs et les actions autorisées sont disponibles.';
    box.appendChild(info);
  }
  refreshGuestOfSelect();
  S.players.forEach(x=>{
    const d=document.createElement('div');d.className='player'+(x.is_group_member===false?' guest-row':'');
    const top=document.createElement('div');top.className='row';
    const info=document.createElement('span');info.style.flex='1';
    const g=guestLabel(x);
    let meta=(x.active?'Actif':'Inactif')+(g?' • '+esc(g):' • Membre du groupe');
    if(S.workspaceFeatures.player_ratings_enabled&&isAdmin()){
      const aggregate=playerSkillAggregate(x.id);
      meta+=aggregate&&Number(aggregate.voter_count)>0?' • Moyenne '+Number(aggregate.avg_rating).toFixed(1)+'/5 • '+aggregate.voter_count+' votant'+(Number(aggregate.voter_count)>1?'s':''):' • Aucun avis';
    }else if(S.workspaceFeatures.player_ratings_enabled&&isCoorg()){
      const aggregate=playerSkillAggregate(x.id);
      if(aggregate&&Number(aggregate.voter_count)>0)meta+=' • Verdict des co-gestionnaires : '+Number(aggregate.avg_rating).toFixed(1)+'/5';
    }
    info.innerHTML='<b>'+esc(x.name)+'</b>'+(x.is_group_member===false?'<span class="guest-badge">Guest</span>':'')+
      '<div class="muted">'+meta+'</div>';
    if(isAdmin()){
      const toggle=document.createElement('button');toggle.textContent=x.active?'Désactiver':'Réactiver';toggle.className=x.active?'player-action-disable':'player-action-enable';
      toggle.onclick=async()=>{
        const next=!x.active;
        if(!confirm(next?'Réactiver '+x.name+' dans le groupe ?':'Suspendre '+x.name+' du groupe ? Son historique sera conservé.'))return;
        toggle.disabled=true;
        const {error}=await sb.rpc('admin_set_player_active',{p_player_id:x.id,p_active:next});
        toggle.disabled=false;
        if(error)return toast(error.message);
        await loadAll();
        toast(next?'Joueur réactivé ✅':'Joueur suspendu.');
      };
      const del=document.createElement('button');
      del.textContent='🗑 Supprimer';
      del.className='danger smallbtn';
      del.onclick=async()=>{
        if(!confirm('Supprimer '+x.name+' du groupe ?\n\nSi ce joueur possède déjà un historique sportif, il sera suspendu afin de préserver ses statistiques.'))return;
        del.disabled=true;
        const {data,error}=await sb.rpc('remove_player_member',{p_player_id:x.id});
        del.disabled=false;
        if(error)return toast(error.message);
        await loadAll();
        toast(data==='archived'?'Joueur suspendu : historique conservé.':'Joueur supprimé.');
      };
      top.append(info,toggle,del);
    }else if(isCoorg()){
      top.append(info);
    }else top.append(info);
    d.appendChild(top);

    if(isAdmin()&&S.workspaceFeatures.player_ratings_enabled){
      const summary=playerSkillReviewSummary(x);
      const aggregate=playerSkillAggregate(x.id);
      const reviewBox=document.createElement('div');reviewBox.style.cssText='margin-top:8px;padding:10px 12px;border:1px solid #dbe8df;border-radius:13px;background:#f8fbf9';
      if(!summary.count){
        reviewBox.innerHTML='<b>📊 Synthèse des évaluations</b><div class="muted small" style="margin-top:4px">Aucune évaluation pour le moment.</div>';
      }else{
        const n=v=>v==null?'—':Number(v).toFixed(1)+'/5';
        const chips='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">'+
          '<span class="guest-badge">❤️ Cardio '+n(aggregate?.avg_cardio??summary.cardio)+'</span>'+
          '<span class="guest-badge">🪄 Dribble '+n(aggregate?.avg_dribble??summary.dribble)+'</span>'+
          '<span class="guest-badge">🤝 Collectif '+n(aggregate?.avg_collectif??summary.collectif)+'</span>'+
          '<span class="guest-badge">🎯 Frappe '+n(aggregate?.avg_frappe??summary.frappe)+'</span>'+
          '<span class="guest-badge">'+skillRoleLabel(aggregate?.top_role||summary.topRole)+'</span></div>';
        const roleName=r=>skillRoleLabel(r.preferred_role).replace(/^[^ ]+\s/,'');
        const voters=summary.reviews.map(r=>{
          const who=String(r.evaluator_user_id)===String(S.session?.user?.id)?'Admin':((r.evaluator_email||'Co-organisateur').split('@')[0]);
          const detail='Cardio '+(r.cardio??'—')+'/5 • Dribble '+(r.dribble??'—')+'/5 • Collectif '+(r.collectif??'—')+'/5 • Frappe '+(r.frappe??'—')+'/5 • Rôle : '+roleName(r);
          return '<span title="'+esc(detail)+'" style="display:inline-flex;gap:4px;align-items:center;margin:4px 6px 0 0;padding:5px 8px;border-radius:9px;background:#fff;border:1px solid #e3ebe6;cursor:help"><b>'+esc(who)+'</b> '+Number(r.rating).toFixed(1)+'/5 <small>ⓘ</small></span>';
        }).join('');
        const count=Number(aggregate?.voter_count??summary.count);
        const avg=aggregate?.avg_rating!=null?Number(aggregate.avg_rating):summary.avg;
        reviewBox.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><b>📊 Synthèse des évaluations</b><span><b>'+avg.toFixed(1)+'/5</b> • '+count+' votant'+(count>1?'s':'')+'</span></div>'+chips+'<div class="small muted" style="margin-top:5px">Survole une note ⓘ pour voir son détail.</div><div class="small" style="margin-top:2px">'+voters+'</div>';
      }
      d.appendChild(reviewBox);
    }

    if(isAdmin()){
      const identityBox=document.createElement('div');identityBox.className='player-link-box';
      if(x.global_player_id){
        identityBox.innerHTML='<div><b>🪪 Identité SWÉ liée</b><div class="muted small">Ce membre est rattaché à un compte SWÉ. La liaison ne peut être modifiée que par le Super Admin.</div></div><span class="linked-ok">✓ LIÉ</span>';
      }else{
        identityBox.innerHTML='<div><b>🪪 Aucun compte SWÉ lié</b><div class="muted small">Le joueur pourra récupérer ses statistiques après création de son compte, en recherchant l’ID du tournoi ou l’ID SWÉ de la ligue puis en sélectionnant son nom.</div></div><span class="guest-badge">NON LIÉ</span>';
      }
      d.appendChild(identityBox);

      const edit=document.createElement('div');edit.className='row';edit.style.marginTop='8px';edit.style.flexWrap='wrap';
      const nameInput=document.createElement('input');nameInput.style.flex='1';nameInput.value=x.name||'';nameInput.placeholder='Nom du joueur';
      const status=document.createElement('select');status.style.flex='1';
      status.innerHTML='<option value="member">Membre</option><option value="guest">Guest</option>';
      status.value=x.is_group_member===false?'guest':'member';

      const host=document.createElement('select');host.style.flex='1';
      host.innerHTML='<option value="">Guest de…</option>'+S.players.filter(y=>y.id!==x.id&&y.active&&y.is_group_member!==false).map(y=>'<option value="'+y.id+'">'+esc(y.name)+'</option>').join('');
      host.value=x.guest_of_player_id||'';
      host.classList.toggle('hidden',status.value!=='guest');
      status.onchange=()=>host.classList.toggle('hidden',status.value!=='guest');

      const phone=document.createElement('input');phone.type='tel';phone.inputMode='tel';phone.placeholder='Mobile (privé)';
      phone.style.flex='1';phone.value=(S.contacts.find(c=>c.player_id===x.id)?.phone_number)||'';

      const save=document.createElement('button');save.textContent='Enregistrer les infos';save.className='player-action-s…70709 tokens truncated…'}).join('')+
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
      const teamCard=team=>{if(!team)return '';const members=teamPlayers.filter(tp=>tp.team_id===team.id).map(tp=>pmap.get(tp.player_id)).filter(Boolean);return '<div class="public-team-card"><div class="public-team-head"><b>'+esc(team.name)+'</b></div><div class="public-team-players">'+(members.map(pl=>'<div class="public-team-player">'+esc(pl.name)+'</div>').join('')||'<div class="muted">Composition non enregistrée</div>')+'</div></div>';};
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
            const playersHtml=teamPlayers.filter(tp=>tp.team_id===team.id).map(tp=>{const pl=pmap.get(tp.player_id);return pl?'<div class="public-team-player">'+esc(pl.name)+(pl.is_group_member===false?' <span class="guest-badge">Guest</span>':'')+'</div>':''}).join('');
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

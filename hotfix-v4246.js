(()=>{
'use strict';
const VERSION='42.47';
let canCustomVenue=false;
let savedVenues=[];
let venueLoadedFor=null;
let previewSnapshot47=null;

function setVersion46(){window.SWEApplyBuild?.();}
function E(id){return document.getElementById(id)}
function escapeHtml(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function moneyCents(v){return Math.round(Math.max(0,Number(v)||0)*100)}
function deadlineIso(v){
  if(typeof registrationDeadlineIso==='function')return registrationDeadlineIso(v);
  if(!v)return null;
  const d=new Date(v+':00-04:00');return Number.isFinite(d.getTime())?d.toISOString():null;
}
async function loadVenueEntitlement(){
  if(typeof S==='undefined'||!S.workspace?.id)return;
  const wid=String(S.workspace.id);
  if(venueLoadedFor===wid)return;
  venueLoadedFor=wid;
  const a=await sb.rpc('workspace_can_use_custom_venues',{p_workspace_id:S.workspace.id});
  canCustomVenue=!a.error&&a.data===true;
  if(canCustomVenue){
    const r=await sb.rpc('get_workspace_saved_venues',{p_workspace_id:S.workspace.id});
    savedVenues=r.error?[]:(r.data||[]);
  }else savedVenues=[];
}
function customFieldsHtml(){
  const opts=savedVenues.map(v=>'<option value="'+v.id+'">'+escapeHtml(v.name)+' • '+escapeHtml(v.address)+'</option>').join('');
  return '<div id="sweCustomVenue46" class="player" style="margin-top:10px;background:#fff;border:1px solid #d8eadf">'+
    '<div class="grid g2"><label><span class="muted">Lieu enregistré</span><select id="sweSavedVenue46"><option value="">Nouveau lieu</option>'+opts+'</select></label>'+
    '<label><span class="muted">Nom du lieu *</span><input id="sweVenueName46" placeholder="Ex. Terrain privé de Bellevue"></label></div>'+
    '<label style="display:block;margin-top:8px"><span class="muted">Adresse complète *</span><input id="sweVenueAddress46" placeholder="Adresse, commune, Martinique"></label>'+
    '<div class="row" style="margin-top:9px;flex-wrap:wrap"><label style="display:flex;align-items:center;gap:7px"><input id="sweSaveVenue46" type="checkbox" style="width:auto"> Enregistrer ce lieu pour mes prochains Swés</label>'+
    '<label style="display:flex;align-items:center;gap:7px"><input id="sweShareLocation46" type="checkbox" checked style="width:auto"> Partager la localisation aux joueurs</label></div>'+
    '<div class="muted" style="margin-top:7px">Si la localisation est partagée, les joueurs auront les boutons Google Maps et Waze sur la page d’inscription.</div></div>';
}
function ensureLeagueVenueUI(){
  const complex=E('leagueSessionComplex'); if(!complex||E('sweVenueMode46'))return;
  const grid=complex.closest('.grid'); if(!grid)return;
  const wrap=document.createElement('div');wrap.id='sweVenueChoice46';wrap.style.marginBottom='10px';
  wrap.innerHTML='<label class="player" style="display:block;background:#eef8f2;border-color:#b7dfc4"><span class="muted">Type de lieu</span><select id="sweVenueMode46"><option value="complex">🏟️ Complexe SWÉ référencé</option>'+(canCustomVenue?'<option value="custom">📍 Autre lieu / terrain privé ou public</option>':'')+'</select><div id="sweVenuePlanNote46" class="muted" style="margin-top:6px">'+(canCustomVenue?'Tu peux utiliser un complexe SWÉ ou un lieu personnalisé et le mémoriser.':'Offre gratuite : les Swés se créent uniquement dans les complexes référencés par SWÉ. Les lieux personnalisés sont disponibles avec une offre payante.')+'</div></label>';
  grid.parentElement.insertBefore(wrap,grid);
  const custom=document.createElement('div');custom.innerHTML=customFieldsHtml();grid.insertAdjacentElement('afterend',custom.firstElementChild);E('sweCustomVenue46').classList.add('hidden');
  E('sweVenueMode46').onchange=syncVenueMode;
  E('sweSavedVenue46')?.addEventListener('change',syncSavedVenue);
}
function syncVenueMode(){
  const custom=E('sweVenueMode46')?.value==='custom';
  const grid=E('leagueSessionComplex')?.closest('.grid');
  if(grid)grid.classList.toggle('hidden',custom);
  E('sweCustomVenue46')?.classList.toggle('hidden',!custom);
}
function syncSavedVenue(){
  const id=E('sweSavedVenue46')?.value||'';const v=savedVenues.find(x=>String(x.id)===String(id));
  const n=E('sweVenueName46'),a=E('sweVenueAddress46'),save=E('sweSaveVenue46');
  if(v){if(n)n.value=v.name||'';if(a)a.value=v.address||'';if(n)n.disabled=true;if(a)a.disabled=true;if(save){save.checked=false;save.disabled=true;}}
  else {if(n)n.disabled=false;if(a)a.disabled=false;if(save)save.disabled=false;}
}
function getSelectedVenuePayload(){
  const custom=E('sweVenueMode46')?.value==='custom';
  if(!custom)return {custom:false,complexId:E('leagueSessionComplex')?.value||'',pitchId:E('leagueSessionPitch')?.value||''};
  const savedId=E('sweSavedVenue46')?.value||null;
  return {custom:true,savedId,name:E('sweVenueName46')?.value.trim()||'',address:E('sweVenueAddress46')?.value.trim()||'',save:!!E('sweSaveVenue46')?.checked,share:!!E('sweShareLocation46')?.checked};
}
function installCreateHandler(){
  const btn=E('createLeagueSession');if(!btn||btn.dataset.v4246)return;btn.dataset.v4246='1';
  btn.onclick=async()=>{
    if(typeof S==='undefined'||!S.leagues?.some(l=>l.status!=='finished'))return toast(typeof hasAdminOps==='function'&&hasAdminOps()?'Crée d’abord une Ligue.':'Demande à l’administrateur de créer une Ligue.');
    const leagueId=E('leagueSessionLeague')?.value||'';const league=S.leagues.find(l=>l.id===leagueId&&l.status!=='finished');if(!league)return toast('Choisis la Ligue concernée.');
    const date=E('leagueSessionDate')?.value||'';if(!date)return toast('Choisis la date du Swé.');
    const start=E('leagueSessionStartTime')?.value||'';if(!start)return toast('Indique l’heure de réservation.');
    const deadline=deadlineIso(E('leagueSessionRegistrationDeadline')?.value||'');if(!deadline)return toast('Indique la date et l’heure de fin des inscriptions.');
    const startMs=new Date(date+'T'+start+':00-04:00').getTime();if(new Date(deadline).getTime()>=startMs)return toast('La fin des inscriptions doit être avant le début du Swé.');
    const fee=E('leagueSessionEntryFee')?.value;if(fee===''||Number(fee)<0)return toast('Indique le prix par participant.');
    const venue=getSelectedVenuePayload();
    if(venue.custom){
      if(!canCustomVenue)return toast('Les lieux personnalisés nécessitent une offre payante.');
      if(!venue.savedId&&venue.name.length<2)return toast('Indique le nom du lieu.');
      if(!venue.savedId&&venue.address.length<5)return toast('Indique l’adresse complète du lieu.');
    }else{
      if(!venue.complexId)return toast('Choisis le complexe du Swé.');
      if(!venue.pitchId)return toast('Choisis le terrain du Swé.');
    }
    btn.disabled=true;const old=btn.textContent;btn.textContent='Création…';
    const q={
      p_league_id:league.id,p_date:date,p_name:E('leagueSessionName')?.value.trim()||null,p_max_players:100,
      p_complex_id:venue.custom?null:venue.complexId,p_pitch_id:venue.custom?null:venue.pitchId,
      p_custom_venue_id:venue.custom?venue.savedId:null,p_custom_venue_name:venue.custom&&!venue.savedId?venue.name:null,p_custom_venue_address:venue.custom&&!venue.savedId?venue.address:null,
      p_custom_venue_latitude:null,p_custom_venue_longitude:null,p_save_custom_venue:venue.custom&&!venue.savedId&&venue.save,p_share_location:venue.custom?venue.share:true,
      p_start_time:start,p_entry_fee_cents:moneyCents(fee),p_reservation_reference:E('leagueSessionReservationRef')?.value.trim()||null,
      p_cooler_suggested_cents:S.workspaceFeatures?.third_half_enabled?moneyCents(E('leagueSessionCoolerSuggested')?.value):0,p_registration_deadline:deadline
    };
    const r=await sb.rpc('create_league_session_v3',q);btn.disabled=false;btn.textContent=old;
    if(r.error)return toast(r.error.message);
    if(typeof loadAll==='function')await loadAll();if(typeof setView==='function')setView('league');toast('Swé de Ligue créé ✅');
    venueLoadedFor=null;await loadVenueEntitlement();
  };
}
function mapsQuery(t){
  if(t?.venue_latitude!=null&&t?.venue_longitude!=null)return String(t.venue_latitude)+','+String(t.venue_longitude);
  return (t?.venue_address||t?.venue||'').trim();
}
function navigationHtml(t){
  if(!t)return '';
  const isCustom=!!t.custom_venue_id||(!t.complex_id&&!!t.venue_address);
  if(isCustom&&!t.share_location)return '';
  const q=mapsQuery(t);if(!q)return '';
  const enc=encodeURIComponent(q);
  return '<div data-swe-nav46 class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><a class="button" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query='+enc+'">📍 Google Maps</a><a class="button" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center" target="_blank" rel="noopener noreferrer" href="https://www.waze.com/ul?q='+enc+'&navigate=yes">🚗 Waze</a></div>';
}
function decoratePublicNavigation(){
  if(typeof S==='undefined'||!S.publicMode)return;
  const pv=E('publicView');if(!pv||pv.querySelector('[data-swe-nav46]'))return;
  const u=new URL(location.href);const tid=u.searchParams.get('tournament');if(!tid)return;
  const t=(S.tournaments||[]).find(x=>String(x.id)===String(tid));if(!t)return;
  const html=navigationHtml(t);if(!html)return;
  if(u.searchParams.get('view')==='league-session'){
    const cards=[...pv.querySelectorAll('.card')];const c=cards.find(x=>/Inscription à ce Swé/i.test(x.textContent||''));if(c)c.insertAdjacentHTML('beforeend',html);
  }else{
    const info=[...pv.querySelectorAll('.player')].find(x=>/Infos pratiques/i.test(x.textContent||''));if(info)info.insertAdjacentHTML('beforeend',html);
  }
}

function menuIcons47(){
  document.querySelectorAll('.tabs .tab').forEach(tab=>{
    const v=tab.dataset.view;
    if(v==='myplayer'&&!/^👤/.test(tab.textContent.trim()))tab.textContent='👤 '+tab.textContent.trim();
    if(v==='cooler'&&!/^🧊/.test(tab.textContent.trim()))tab.textContent='🧊 '+tab.textContent.trim();
  });
}
function previewStyles47(){
  if(E('swePreviewStyle47'))return;
  const s=document.createElement('style');s.id='swePreviewStyle47';s.textContent=`
  .swe-preview47{margin-top:14px}.swe-preview-toolbar47{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:10px;align-items:end}.swe-preview-grid47{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.swe-preview-card47{border:1px solid #dbe7e0;border-radius:16px;padding:14px;background:#fff}.swe-preview-card47 h3{margin:0 0 5px}.swe-preview-chip47{display:inline-block;font-size:10px;font-weight:900;padding:4px 7px;border-radius:999px;background:#edf7f1;color:#11663f;margin-bottom:8px}.swe-preview-actions47{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}.swe-preview-phone47{width:min(360px,100%);margin:0 auto;background:#071b12;border-radius:30px;padding:10px;box-shadow:0 18px 50px rgba(0,0,0,.25)}.swe-preview-screen47{background:#f5f8f6;border-radius:22px;min-height:560px;padding:15px;overflow:hidden}.swe-preview-screen47 .pv-hero{background:linear-gradient(135deg,#0b6b42,#072d20);color:#fff;border-radius:18px;padding:18px}.swe-preview-screen47 .pv-card{background:#fff;border:1px solid #dfe8e3;border-radius:15px;padding:13px;margin-top:10px}.swe-preview-screen47 .pv-row{display:flex;justify-content:space-between;gap:8px;margin-top:7px;font-size:12px}.swe-preview-screen47 .pv-btn{display:block;text-align:center;border-radius:12px;padding:11px;margin-top:9px;background:#0f7a4b;color:#fff;font-weight:900}.swe-preview-modal47{position:fixed;inset:0;background:rgba(2,15,10,.68);z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px}.swe-preview-modal47.hidden{display:none}.swe-preview-modalbox47{width:min(980px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:22px;padding:18px}.swe-preview-top47{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}@media(max-width:760px){.swe-preview-grid47{grid-template-columns:1fr}.swe-preview-toolbar47{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
}
function previewWorkspaceOptions47(){
  const list=Array.isArray(S?.superWorkspaces)?S.superWorkspaces:[];
  return '<option value="">Choisir un espace</option>'+list.map(w=>'<option value="'+escapeHtml(w.id)+'">'+escapeHtml(w.name||'Espace SWÉ')+'</option>').join('');
}
function ensurePreviewStudio47(){
  if(typeof S==='undefined'||!S.isSuperAdmin)return;
  previewStyles47();
  const tabs=document.querySelector('.sa-admin-tabs');if(!tabs)return;
  if(!E('saPreviewTab47')){
    const b=document.createElement('button');b.type='button';b.id='saPreviewTab47';b.dataset.saTab='previews47';b.textContent='🖼️ Visuels publics';tabs.appendChild(b);
    b.onclick=()=>showPreviewStudio47();
  }
  if(E('saPreviewSection47'))return;
  const host=E('superAdminPanel');if(!host)return;
  const sec=document.createElement('div');sec.id='saPreviewSection47';sec.className='hidden';sec.innerHTML=`<div class="card swe-preview47"><div class="sa-eyebrow">LAB VISUELS PUBLICS</div><h2 class="sectiontitle">🖼️ Prévisualiser tous les liens générés</h2><p class="muted">Le Super Admin peut contrôler le rendu des pages publiques avant commercialisation : inscription, suivi des paiements, résultats de saison, ligue et autres liens disponibles. Le mode test n'effectue aucune inscription ni aucun paiement.</p><div class="swe-preview-toolbar47"><label><span class="muted">Espace à prévisualiser</span><select id="saPreviewWorkspace47">${previewWorkspaceOptions47()}</select></label><button id="saLoadPreviews47" class="primary">Générer les aperçus</button></div><div id="saPreviewStatus47" class="muted" style="margin-top:8px"></div><div id="saPreviewGrid47" class="swe-preview-grid47"></div></div>`;
  host.appendChild(sec);
  E('saLoadPreviews47').onclick=loadPreviews47;
}
function showPreviewStudio47(){
  document.querySelectorAll('[id^="sa"][id$="Section"],#saSpacesSection,#saPlayersSection').forEach(x=>x.classList?.add('hidden'));
  E('saPreviewSection47')?.classList.remove('hidden');
  document.querySelectorAll('.sa-admin-tabs button').forEach(x=>x.classList.toggle('active',x.id==='saPreviewTab47'));
}
function appBase47(){return location.origin+location.pathname.replace(/[^/]*$/,'')}
function linkFor47(kind,item,snap,workspace){
  const base=appBase47(),token=workspace.public_token||snap?.workspace?.public_token||'';
  if(kind==='tournament')return item.short_code?base+'?s='+encodeURIComponent(String(item.short_code).toUpperCase()):(token?base+'?public='+encodeURIComponent(token)+'&view=tournament&tournament='+encodeURIComponent(item.id):'');
  if(kind==='league-session')return item.short_code?base+'?s='+encodeURIComponent(String(item.short_code).toUpperCase()):(token?base+'?public='+encodeURIComponent(token)+'&view=league-session&league='+encodeURIComponent(item.league_id||'')+'&tournament='+encodeURIComponent(item.id):'');
  if(kind==='payment')return item.payment_short_code?base+'?pay='+encodeURIComponent(String(item.payment_short_code).toUpperCase()):'';
  if(kind==='league')return token?base+'?public='+encodeURIComponent(token)+'&view=league&league='+encodeURIComponent(item.id):'';
  if(kind==='season'){
    const t=(snap?.tournaments||[]).find(x=>x.season_id===item.id&&x.format!=='league'&&x.short_code);
    return t?.short_code?base+'saison/?s='+encodeURIComponent(String(t.short_code).toUpperCase()):(token?base+'saison/?public='+encodeURIComponent(token)+'&season='+encodeURIComponent(item.id):'');
  }
  return '';
}
function visualTypeLabel47(kind){return ({tournament:'Inscription tournoi','league-session':'Inscription Swé de Ligue',payment:'Suivi des paiements','league':'Inscription Ligue',season:'Résultats de saison'})[kind]||'Lien public'}
function sampleVisual47(kind,item,workspace){
  const name=escapeHtml(item?.name||workspace?.name||'SWÉ du dimanche');
  const date=escapeHtml(item?.tournament_date||item?.starts_on||new Date().toISOString().slice(0,10));
  if(kind==='payment')return `<div class="pv-hero"><b>SWÉ • Suivi paiement</b><h3>${name}</h3><small>Vue privée organisateur</small></div><div class="pv-card"><b>Participants</b><div class="pv-row"><span>Johnathan</span><b>✅ PAYÉ</b></div><div class="pv-row"><span>Mika</span><b>NON PAYÉ</b></div><div class="pv-row"><span>Flo</span><b>✅ PAYÉ</b></div></div>`;
  if(kind==='season')return `<div class="pv-hero"><b>SWÉ • Résultats de la saison</b><h3>${name}</h3><small>Classements & statistiques</small></div><div class="pv-card"><b>🏆 Classement</b><div class="pv-row"><span>1. Team Rocket</span><b>18 pts</b></div><div class="pv-row"><span>2. Bleus</span><b>15 pts</b></div></div><div class="pv-card"><b>⚽ Buteurs</b><div class="pv-row"><span>Charly</span><b>11</b></div><div class="pv-row"><span>Forssa</span><b>2</b></div></div>`;
  if(kind==='league')return `<div class="pv-hero"><b>🏁 SWÉ Ligue</b><h3>${name}</h3><small>Inscription à la Ligue</small></div><div class="pv-card"><b>Saison en cours</b><div class="pv-row"><span>Début</span><b>${date}</b></div><div class="pv-row"><span>Membres</span><b>15 joueurs</b></div></div><span class="pv-btn">Je rejoins la Ligue</span>`;
  return `<div class="pv-hero"><b>SWÉ TOURNAMENT 5/5</b><h3>${name}</h3><small>${kind==='league-session'?'Swé de Ligue':'Inscription au tournoi'} • ${date}</small></div><div class="pv-card"><b>📍 Infos pratiques</b><div class="pv-row"><span>Terrain</span><b>Complexe SWÉ</b></div><div class="pv-row"><span>Heure</span><b>09:00</b></div><div class="pv-row"><span>Prix</span><b>10 €</b></div></div><div class="pv-card"><b>✅ Inscription</b><small>Choisis ton nom puis confirme ta participation.</small></div><span class="pv-btn">Je participe</span>`;
}
function openPreviewModal47(kind,item,workspace,url){
  E('swePreviewModal47')?.remove();const m=document.createElement('div');m.id='swePreviewModal47';m.className='swe-preview-modal47';m.innerHTML=`<div class="swe-preview-modalbox47"><div class="swe-preview-top47"><div><div class="sa-eyebrow">APERÇU TEST</div><h2 style="margin:2px 0">${escapeHtml(visualTypeLabel47(kind))}</h2></div><button id="sweClosePreview47">✕ Fermer</button></div><div class="swe-preview-phone47"><div class="swe-preview-screen47">${sampleVisual47(kind,item,workspace)}</div></div>${url?`<div class="row" style="justify-content:center;margin-top:14px"><a class="button primary" target="_blank" rel="noopener noreferrer" href="${escapeHtml(url)}">Ouvrir le vrai lien</a></div>`:''}</div>`;document.body.appendChild(m);E('sweClosePreview47').onclick=()=>m.remove();m.onclick=e=>{if(e.target===m)m.remove()};
}
function addPreviewCard47(grid,kind,item,workspace,snap){
  const url=linkFor47(kind,item,snap,workspace);const d=document.createElement('div');d.className='swe-preview-card47';d.innerHTML=`<span class="swe-preview-chip47">${escapeHtml(visualTypeLabel47(kind))}</span><h3>${escapeHtml(item?.name||workspace.name||'Visuel test')}</h3><div class="muted">${url?'Lien réel disponible • aperçu test sans action':'Aucun lien réel disponible pour cet élément • aperçu graphique uniquement'}</div><div class="swe-preview-actions47"><button data-preview47>👁️ Prévisualiser</button>${url?`<a class="button" target="_blank" rel="noopener noreferrer" href="${escapeHtml(url)}">↗ Ouvrir</a>`:''}</div>`;d.querySelector('[data-preview47]').onclick=()=>openPreviewModal47(kind,item,workspace,url);grid.appendChild(d);
}
async function loadPreviews47(){
  const wid=E('saPreviewWorkspace47')?.value||'';const workspace=(S.superWorkspaces||[]).find(w=>String(w.id)===String(wid));if(!workspace)return toast('Choisis un espace.');
  const status=E('saPreviewStatus47'),grid=E('saPreviewGrid47');status.textContent='Chargement des visuels…';grid.innerHTML='';previewSnapshot47=null;
  let token=workspace.public_token||'';
  if(!token){
    const r=await sb.rpc('super_admin_get_workspace_preview_token',{p_workspace_id:workspace.id});if(!r.error)token=r.data||'';
  }
  if(token){const r=await sb.rpc('get_public_workspace_snapshot_v2',{p_token:token});if(!r.error)previewSnapshot47=r.data||null;}
  const snap=previewSnapshot47||{tournaments:[],leagues:[],seasons:[]};const w={...workspace,public_token:token};
  const tours=(snap.tournaments||[]).filter(t=>t.format!=='league').slice(-4).reverse();
  const leagueSessions=(snap.tournaments||[]).filter(t=>t.format==='league').slice(-3).reverse();
  const leagues=(snap.leagues||[]).slice(-2).reverse();const seasons=(snap.seasons||[]).slice(-2).reverse();
  if(!tours.length)addPreviewCard47(grid,'tournament',{name:'Tournoi test',tournament_date:new Date().toISOString().slice(0,10)},w,snap);else tours.forEach(t=>addPreviewCard47(grid,'tournament',t,w,snap));
  if(!leagueSessions.length)addPreviewCard47(grid,'league-session',{name:'Swé Ligue test',tournament_date:new Date().toISOString().slice(0,10)},w,snap);else leagueSessions.forEach(t=>addPreviewCard47(grid,'league-session',t,w,snap));
  if(!leagues.length)addPreviewCard47(grid,'league',{name:'Ligue test',starts_on:new Date().toISOString().slice(0,10)},w,snap);else leagues.forEach(l=>addPreviewCard47(grid,'league',l,w,snap));
  if(!seasons.length)addPreviewCard47(grid,'season',{name:'Saison test',id:'test'},w,snap);else seasons.forEach(s=>addPreviewCard47(grid,'season',s,w,snap));
  const pay=(snap.tournaments||[]).find(t=>t.payment_short_code);addPreviewCard47(grid,'payment',pay||{name:'Suivi paiements test'},w,snap);
  status.innerHTML='<b>'+grid.children.length+' visuel'+(grid.children.length>1?'s':'')+'</b> disponible'+(grid.children.length>1?'s':'')+' pour contrôle. Les aperçus test sont en lecture seule.';
}
async function ensurePreviewTokenRpc47(){
  // RPC optional: workspace public token is usually already returned to the super admin.
}

async function apply46(){setVersion46();menuIcons47();if(typeof S!=='undefined'&&S.workspace?.id){await loadVenueEntitlement();ensureLeagueVenueUI();installCreateHandler();syncVenueMode();}decoratePublicNavigation();ensurePreviewStudio47();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>apply46(),250),{once:true});else setTimeout(()=>apply46(),250);
document.addEventListener('swe:rendered',()=>setTimeout(()=>apply46(),100));
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="league"],.tab,.sa-admin-tabs'))setTimeout(()=>apply46(),150)},true);
new MutationObserver(()=>{menuIcons47();if(typeof S!=='undefined'&&S.publicMode)decoratePublicNavigation();if(typeof S!=='undefined'&&S.isSuperAdmin)ensurePreviewStudio47();}).observe(document.documentElement,{childList:true,subtree:true});
})();

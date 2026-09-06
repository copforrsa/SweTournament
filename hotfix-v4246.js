(()=>{
'use strict';
const VERSION='42.46';
let canCustomVenue=false;
let savedVenues=[];
let venueLoadedFor=null;

function setVersion46(){
  document.title=document.title.replace(/V42\.\d+/g,'V'+VERSION);
  document.querySelectorAll('h1 span').forEach(x=>{if(/^V42\./.test((x.textContent||'').trim()))x.textContent='V'+VERSION});
  document.querySelectorAll('.build-badge').forEach(x=>x.textContent='MAJ '+VERSION);
}
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
async function apply46(){setVersion46();if(typeof S!=='undefined'&&S.workspace?.id){await loadVenueEntitlement();ensureLeagueVenueUI();installCreateHandler();syncVenueMode();}decoratePublicNavigation();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>apply46(),250),{once:true});else setTimeout(()=>apply46(),250);
document.addEventListener('swe:rendered',()=>setTimeout(()=>apply46(),100));
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="league"],.tab'))setTimeout(()=>apply46(),150)},true);
new MutationObserver(()=>{if(typeof S!=='undefined'&&S.publicMode)decoratePublicNavigation();}).observe(document.documentElement,{childList:true,subtree:true});
})();

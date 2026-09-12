(()=>{
'use strict';
const isPublic=()=>{const q=new URLSearchParams(location.search);return q.has('public')||q.has('s')||q.has('pay')||q.has('paydesk')};
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
function tournamentIdFromContext(){try{const q=new URLSearchParams(location.search);if(q.get('tournament'))return q.get('tournament');const r=window.__sweResolvedShortLink;if(r?.tournament)return String(r.tournament);return ''}catch(_){return ''}}
async function resolveVenue(){
  if(typeof sb==='undefined')return null;
  const q=new URLSearchParams(location.search);
  let token=q.get('public')||'';
  const tid=tournamentIdFromContext();
  if(!token&&q.get('s')){
    const r=await sb.rpc('resolve_public_tournament_short_link',{p_code:String(q.get('s')).trim().toUpperCase()});
    if(!r.error){token=r.data?.public_token||'';}
  }
  if(!token||!tid)return null;
  const [snap,venues]=await Promise.all([
    sb.rpc('get_public_workspace_snapshot_v2',{p_token:token}),
    sb.rpc('get_sports_venues')
  ]);
  if(snap.error||!snap.data)return null;
  const tour=(snap.data.tournaments||[]).find(t=>String(t.id)===String(tid));
  if(!tour)return null;
  const complexes=Array.isArray(venues.data?.complexes)?venues.data.complexes:[];
  const c=complexes.find(x=>String(x.id)===String(tour.complex_id));
  return {tour,complex:c||null};
}
function mapLinks(v){
  const c=v?.complex;
  const tour=v?.tour;
  const label=[c?.name,c?.address,c?.city,'Martinique'].filter(Boolean).join(', ')||tour?.venue||'';
  if(!label)return null;
  const q=encodeURIComponent(label);
  return {
    label,
    google:'https://www.google.com/maps/search/?api=1&query='+q,
    waze:'https://www.waze.com/ul?q='+q+'&navigate=yes'
  };
}
function injectMapButtons(links){
  if(!links||document.getElementById('swePublicMapActions'))return;
  const cards=[...document.querySelectorAll('#publicRegistration .player,#publicView .player')];
  const target=cards.find(x=>/Infos pratiques/i.test(x.textContent||''))||cards.find(x=>/Complexe\s*\/\s*terrains/i.test(x.textContent||''));
  if(!target)return;
  const box=document.createElement('div');box.id='swePublicMapActions';box.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:12px';
  box.innerHTML='<a href="'+esc(links.google)+'" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-flex;align-items:center;gap:7px;padding:10px 13px;border-radius:12px;background:#fff;border:1px solid #d8e3dc;font-weight:850;color:#173c2d">📍 Google Maps</a><a href="'+esc(links.waze)+'" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-flex;align-items:center;gap:7px;padding:10px 13px;border-radius:12px;background:#33ccff;border:1px solid #1bb7e7;font-weight:850;color:#06394b">🚗 Waze</a>';
  target.appendChild(box);
}
async function repairPaymentIfNeeded(){
  const box=document.getElementById('publicPaymentBox');
  const sel=document.getElementById('publicPlayerSelect');
  if(!box||!sel?.value||!/Statut indisponible pour le moment/i.test(box.textContent||''))return;
  try{
    const q=new URLSearchParams(location.search);let token=q.get('public')||'';const tid=tournamentIdFromContext();
    if(!token&&q.get('s')){const r=await sb.rpc('resolve_public_tournament_short_link',{p_code:String(q.get('s')).trim().toUpperCase()});if(!r.error)token=r.data?.public_token||'';}
    if(!token||!tid)return;
    const st=await sb.rpc('public_tournament_payment_status',{p_token:token,p_tournament_id:tid,p_player_id:sel.value});
    if(st.error||!st.data)return;
    if(st.data.available){
      if(typeof renderPublicPaymentBox==='function'){await renderPublicPaymentBox({skipStripeReconcile:true});return;}
      box.innerHTML='<b>💳 Paiement de la participation</b><div class="muted" style="margin-top:5px">Paiement en ligne disponible. Resélectionne ton nom pour actualiser les options.</div>';
    }
  }catch(_){}
}
async function boot(){
  if(!isPublic())return;
  let venue=null;
  try{venue=await resolveVenue()}catch(_){}
  const links=mapLinks(venue);
  [250,700,1400,2400].forEach(ms=>setTimeout(()=>{injectMapButtons(links);},ms));
  document.getElementById('publicPlayerSelect')?.addEventListener('change',()=>setTimeout(repairPaymentIfNeeded,150));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
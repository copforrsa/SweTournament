(()=>{
'use strict';
const VERSION='42.31';
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function appBase(){return new URL('./',location.href)}
function makeUrls(t){
  const base=appBase();
  let reg='';
  try{reg=typeof registrationLink==='function'?registrationLink(t):''}catch(_){reg=''}
  if(!reg&&t?.short_code){const u=new URL(base);u.searchParams.set('s',String(t.short_code).toUpperCase());reg=u.toString()}
  const live=new URL('live.html',base);
  if(t?.short_code)live.searchParams.set('s',String(t.short_code).toUpperCase());
  else if(typeof S!=='undefined'&&S?.workspace?.public_token&&t?.id){live.searchParams.set('public',S.workspace.public_token);live.searchParams.set('tournament',t.id)}
  const pay=new URL(base);
  if(t?.payment_short_code)pay.searchParams.set('pay',String(t.payment_short_code).toUpperCase());
  return {reg,live:live.toString(),pay:t?.payment_short_code?pay.toString():''};
}
async function copyText(text){
  if(!text)return false;
  try{await navigator.clipboard.writeText(text);return true}catch(_){
    const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(__){}ta.remove();return ok;
  }
}
let renderedKey='';
function renderLinks(){
  if(typeof S==='undefined'||!S?.workspace||typeof currentTour!=='function')return;
  const view=document.getElementById('view-tournaments');const t=currentTour();if(!view||!t)return;
  const urls=makeUrls(t);const key=[t.id,urls.reg,urls.live,urls.pay,typeof isAdmin==='function'&&isAdmin()].join('|');
  let card=document.getElementById('sweTournamentLinksCard');
  if(card&&renderedKey===key)return;
  if(!card){card=document.createElement('div');card.id='sweTournamentLinksCard';card.className='card';card.style.border='2px solid #79b7ff';card.style.background='#f7fbff';card.style.marginBottom='12px';view.insertAdjacentElement('afterbegin',card)}
  renderedKey=key;
  const row=(icon,title,desc,url,type)=>'<div class="player" style="margin-top:8px"><div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center"><div><b>'+icon+' '+esc(title)+'</b><div class="muted" style="margin-top:3px">'+esc(desc)+'</div><input readonly value="'+esc(url||'Indisponible')+'" style="margin-top:7px;width:100%;font-size:12px"></div><div class="row" style="flex-wrap:wrap;justify-content:flex-end"><button type="button" data-swe-copy="'+type+'" '+(!url?'disabled':'')+'>📋 Copier</button><a class="button" href="'+esc(url||'#')+'" '+(!url?'aria-disabled="true" tabindex="-1"':'target="_blank" rel="noopener noreferrer"')+'>👁️ Ouvrir</a></div></div></div>';
  card.innerHTML='<div><div class="sa-eyebrow">LIENS DU TOURNOI</div><h2 style="margin:3px 0">🔗 '+esc(t.name||'Tournoi SWÉ')+'</h2><div class="muted">Tous les liens utiles du tournoi sont regroupés ici.</div></div>'+row('📝','Inscription','Lien à partager avant la clôture des inscriptions.',urls.reg,'reg')+row('📡','Suivi Live','Équipes, classement et résultats en direct du tournoi sélectionné.',urls.live,'live')+row('💶','Suivi des paiements','Feuille privée pour marquer PAYÉ / NON PAYÉ, remplaçants compris.',urls.pay,'pay')+((typeof isAdmin==='function'&&isAdmin())?'<div class="row" style="margin-top:10px;justify-content:flex-end"><button id="sweAdminResetPayments" class="danger" type="button">Réinitialiser la feuille de paiement</button></div>':'');
  card.dataset.reg=urls.reg;card.dataset.live=urls.live;card.dataset.pay=urls.pay;
  document.getElementById('sweLiveShareCard')?.style.setProperty('display','none','important');
  document.querySelectorAll('.payment-link-card').forEach(el=>{if(!card.contains(el))el.style.display='none'});
}
document.addEventListener('click',async e=>{
  const b=e.target.closest?.('[data-swe-copy]');
  if(b){e.preventDefault();const card=document.getElementById('sweTournamentLinksCard');const url=card?.dataset?.[b.dataset.sweCopy]||'';const ok=await copyText(url);if(typeof toast==='function')toast(ok?'Lien copié ✅':'Impossible de copier le lien.');return;}
  if(e.target?.id==='sweAdminResetPayments'){
    if(!(typeof isAdmin==='function'&&isAdmin()))return;
    const t=typeof currentTour==='function'?currentTour():null;if(!t)return;
    if(!confirm('Réinitialiser toute la feuille de paiement de ce tournoi ? Tous les statuts PAYÉ seront effacés ainsi que les ajouts sur place.'))return;
    e.target.disabled=true;const r=await sb.rpc('admin_reset_tournament_payment_sheet',{p_tournament_id:t.id});e.target.disabled=false;if(r.error)return toast(r.error.message);toast('Feuille de paiement réinitialisée ✅');
  }
},true);
function setVersion(){document.title=document.title.replace(/V42\.\d+/,'V'+VERSION);document.querySelectorAll('h1 span').forEach(x=>{if(/^V42\./.test(x.textContent.trim()))x.textContent='V'+VERSION});document.querySelectorAll('.build-badge').forEach(x=>x.textContent='MAJ '+VERSION)}
function tick(){setVersion();renderLinks();document.getElementById('paymentDeskReset')?.remove()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});else tick();setInterval(tick,1200);
})();

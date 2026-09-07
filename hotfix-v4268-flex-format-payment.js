(()=>{
'use strict';
if(window.__SWE_FLEX_4268)return;window.__SWE_FLEX_4268=true;
const E=id=>document.getElementById(id);
const clamp=n=>Math.max(2,Math.min(11,Number(n)||5));
function fieldHtml(id){return `<div class="player" style="margin:8px 0;background:#f8fbf9"><b>👥 Joueurs par équipe</b><div class="muted" style="margin:4px 0 7px">Choisis le format du Swé : 3v3 à 11v11. Le tirage et la capacité des équipes utiliseront ce nombre.</div><select id="${id}" style="width:100%">${[3,4,5,6,7,8,9,10,11].map(n=>`<option value="${n}" ${n===5?'selected':''}>${n} joueurs par équipe (${n}v${n})</option>`).join('')}</select></div>`}
function injectFields(){
  if(!E('tourTeamSize')){const a=E('tourMaxPlayers');if(a){const w=document.createElement('div');w.innerHTML=fieldHtml('tourTeamSize');const el=w.firstElementChild;(a.closest('label')||a).insertAdjacentElement('afterend',el)}}
  if(!E('leagueSessionTeamSize')){const form=E('leagueSessionForm');const a=E('leagueSessionName');if(form){const w=document.createElement('div');w.innerHTML=fieldHtml('leagueSessionTeamSize');const el=w.firstElementChild;(a?.closest('label')||a||form.firstElementChild)?.insertAdjacentElement('afterend',el)}}
}
async function persistNewTeamSize(before,size){
  let tries=0;const t=setInterval(async()=>{tries++;try{const after=typeof S!=='undefined'?S.activeTour:null;if(after&&String(after)!==String(before)){clearInterval(t);const r=await sb.from('tournaments').update({team_size:clamp(size)}).eq('id',after);if(!r.error){const row=(S.tournaments||[]).find(x=>String(x.id)===String(after));if(row)row.team_size=clamp(size);if(typeof toast==='function')toast(`Format ${clamp(size)}v${clamp(size)} enregistré ✅`)}return}}catch(_){}if(tries>40)clearInterval(t)},250)
}
function bindCreation(){
  const t=E('createTournament');if(t&&!t.dataset.flex4268){t.dataset.flex4268='1';t.addEventListener('click',()=>persistNewTeamSize(typeof S!=='undefined'?S.activeTour:null,E('tourTeamSize')?.value||5),true)}
  const l=E('createLeagueSession');if(l&&!l.dataset.flex4268){l.dataset.flex4268='1';l.addEventListener('click',()=>persistNewTeamSize(typeof S!=='undefined'?S.activeTour:null,E('leagueSessionTeamSize')?.value||5),true)}
}
function publicContext(){try{const q=new URLSearchParams(location.search);return q.has('public')||q.has('s')||q.has('pay')||q.has('paydesk')}catch(_){return false}}
async function resolvePublicContext(){
  const q=new URLSearchParams(location.search);let token=q.get('public')||'';let tid=q.get('tournament')||'';
  if(q.get('s')){const r=await sb.rpc('resolve_public_tournament_short_link',{p_code:String(q.get('s')).trim().toUpperCase()});if(!r.error){token=token||r.data?.public_token||'';tid=tid||r.data?.tournament_id||''}}
  if(!tid&&window.__sweResolvedShortLink?.tournament)tid=String(window.__sweResolvedShortLink.tournament);
  return {token,tid};
}
let paying=false;
async function forcePublicCheckout(btn){
  if(paying)return;paying=true;const old=btn.innerHTML;btn.disabled=true;btn.textContent='Ouverture du paiement…';
  try{
    const {token,tid}=await resolvePublicContext();const pid=E('publicPlayerSelect')?.value||'';
    if(!token||!tid||!pid)throw new Error('Sélectionne ton nom avant de payer.');
    const st=await sb.rpc('public_tournament_payment_status',{p_token:token,p_tournament_id:tid,p_player_id:pid});
    if(st.error)throw st.error;if(!st.data?.available)throw new Error('Paiement en ligne indisponible pour cette inscription.');
    const u=new URL(location.href);u.searchParams.delete('stripe');u.searchParams.delete('session_id');u.searchParams.delete('pay_player');
    const success=new URL(u.toString());success.searchParams.set('stripe','success');success.searchParams.set('pay_player',pid);success.searchParams.set('session_id','{CHECKOUT_SESSION_ID}');
    const cancel=new URL(u.toString());cancel.searchParams.set('stripe','cancel');cancel.searchParams.set('pay_player',pid);
    const {data,error}=await sb.functions.invoke('stripe-create-entry-checkout',{body:{public_token:token,tournament_id:tid,player_id:pid,success_url:success.toString(),cancel_url:cancel.toString()}});
    if(error||data?.error)throw new Error(data?.error||error?.message||'Impossible de créer le paiement Stripe.');
    if(!data?.url)throw new Error('Stripe n’a pas renvoyé de lien de paiement.');
    location.assign(data.url);
  }catch(e){btn.disabled=false;btn.innerHTML=old;if(typeof toast==='function')toast(e?.message||String(e));paying=false}
}
function bindPaymentCapture(){
  document.addEventListener('click',e=>{const b=e.target.closest?.('#publicPayEntry');if(!b||!publicContext())return;e.preventDefault();e.stopImmediatePropagation();forcePublicCheckout(b)},true)
}
function updatePublicFormatText(){
  if(!publicContext())return;let size=5;try{if(typeof regTour!=='undefined'&&regTour?.team_size)size=clamp(regTour.team_size)}catch(_){}
  if(size===5)return;
  const roots=[E('publicRegistration'),E('publicView')].filter(Boolean);roots.forEach(root=>root.querySelectorAll('.player,.muted,b').forEach(el=>{const txt=el.textContent||'';if(/places réservées/.test(txt)&&/\/5/.test(txt))el.textContent=txt.replace(/\/5/g,'/'+size).replace(/5 places/g,size+' places')}));
}
function boot(){injectFields();bindCreation();bindPaymentCapture();[300,900,1800].forEach(ms=>setTimeout(()=>{injectFields();bindCreation();updatePublicFormatText()},ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();document.addEventListener('swe:rendered',()=>setTimeout(()=>{injectFields();bindCreation();updatePublicFormatText()},80));
})();
(()=>{
'use strict';
if(window.__SWE_4274)return;window.__SWE_4274=true;
const E=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const money=c=>((Number(c)||0)/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
const PUBKEY='sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp';
const PROJECT='fbppesfxkvledwjemwsn';
function isPublic(){const q=new URLSearchParams(location.search);return q.has('public')||q.has('s')||q.has('pay')||q.has('paydesk')}
async function ids(){const q=new URLSearchParams(location.search);let token=q.get('public')||'';let tid=q.get('tournament')||'';if(q.get('s')&&typeof sb!=='undefined'){const r=await sb.rpc('resolve_public_tournament_short_link',{p_code:String(q.get('s')).trim().toUpperCase()});if(!r.error){token=token||r.data?.public_token||'';tid=tid||r.data?.tournament_id||''}}try{if(!token&&typeof S!=='undefined')token=S.publicToken||'';if(!tid&&window.__sweResolvedShortLink?.tournament)tid=String(window.__sweResolvedShortLink.tournament)}catch(_){ }return {token,tid}}
let payBusy=false;
async function invokeCheckout(body){
 const url='https://'+PROJECT+'.supabase.co/functions/v1/stripe-create-entry-checkout';
 const headers={'Content-Type':'application/json','apikey':PUBKEY,'Authorization':'Bearer '+PUBKEY};
 const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)});let data={};try{data=await r.json()}catch(_){ }
 if(!r.ok||data?.error)throw new Error(data?.error||('Paiement HTTP '+r.status));return data;
}
async function renderPayment(){
 if(!isPublic()||typeof sb==='undefined')return;const old=E('publicPaymentBox'),sel=E('publicPlayerSelect');if(!old||!sel)return;
 old.dataset.swe4274='1';const pid=sel.value;if(!pid){old.innerHTML='<b>💳 Paiement de la participation</b><div class="muted" style="margin-top:6px">Sélectionne ton nom pour afficher les moyens de paiement.</div>';return}
 const {token,tid}=await ids();if(!token||!tid){old.innerHTML='<b>💳 Paiement de la participation</b><div style="color:#b91c1c;margin-top:6px">Lien de tournoi incomplet.</div>';return}
 old.innerHTML='<b>💳 Paiement de la participation</b><div class="muted" style="margin-top:6px">Vérification…</div>';
 const st=await sb.rpc('public_tournament_payment_status',{p_token:token,p_tournament_id:tid,p_player_id:pid});
 if(st.error||!st.data){old.innerHTML='<b>💳 Paiement de la participation</b><div style="color:#b91c1c;margin-top:7px;font-weight:700">'+esc(st.error?.message||'Impossible de vérifier le paiement.')+'</div>';return}
 const s=st.data;if(String(s.payment_status||'')==='paid'||s.paid_at){old.innerHTML='<b>✅ Participation payée</b><div class="muted" style="margin-top:5px">Ton paiement est bien enregistré.</div>';return}
 if(!s.available){old.innerHTML='<b>💳 Paiement de la participation</b><div style="color:#b91c1c;margin-top:7px;font-weight:700">Paiement indisponible : '+esc(s.reason||'configuration incomplète')+'</div>';return}
 const ch=await sb.rpc('public_tournament_payment_choice_status',{p_token:token,p_tournament_id:tid,p_player_id:pid});const pref=ch.error?null:(ch.data?.payment_preference||null);
 old.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><b>💳 Paiement de la participation</b><b style="font-size:18px">'+money(s.total_cents)+'</b></div><div class="muted" style="margin-top:4px">Participation '+money(s.entry_fee_cents)+' • frais '+money(s.service_fee_cents)+'</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px"><button type="button" id="swePayOnline4274" class="primary">💳 Payer en ligne</button><button type="button" id="swePayOnsite4274">💶 Payer sur place</button></div>'+(pref==='onsite'?'<div style="margin-top:9px;padding:8px 10px;border-radius:10px;background:#f0fdf4;color:#166534;font-weight:700">Choix actuel : paiement sur place</div>':'')+'<div id="swePayErr4274" style="margin-top:8px;color:#b91c1c;font-weight:700"></div>';
 const online=E('swePayOnline4274'),onsite=E('swePayOnsite4274');
 online.onclick=async()=>{if(payBusy)return;payBusy=true;const label=online.textContent;online.disabled=true;online.textContent='Ouverture de Stripe…';const err=E('swePayErr4274');if(err)err.textContent='';try{const prefRes=await sb.rpc('public_set_tournament_payment_preference',{p_token:token,p_tournament_id:tid,p_player_id:pid,p_preference:'online'});if(prefRes.error)throw prefRes.error;const here=new URL(location.href);['stripe','session_id','pay_player'].forEach(k=>here.searchParams.delete(k));const success=new URL(here);success.searchParams.set('stripe','success');success.searchParams.set('pay_player',pid);success.searchParams.set('session_id','{CHECKOUT_SESSION_ID}');const cancel=new URL(here);cancel.searchParams.set('stripe','cancel');cancel.searchParams.set('pay_player',pid);const data=await invokeCheckout({public_token:token,tournament_id:tid,player_id:pid,success_url:success.toString(),cancel_url:cancel.toString()});if(!data.url)throw new Error('Aucun lien Stripe reçu.');location.href=data.url}catch(e){payBusy=false;online.disabled=false;online.textContent=label;if(err)err.textContent=e?.message||String(e);if(typeof toast==='function')toast(e?.message||String(e))}};
 onsite.onclick=async()=>{onsite.disabled=true;const r=await sb.rpc('public_set_tournament_payment_preference',{p_token:token,p_tournament_id:tid,p_player_id:pid,p_preference:'onsite'});onsite.disabled=false;if(r.error){E('swePayErr4274').textContent=r.error.message;return}renderPayment()};
}
function bindPayment(){const sel=E('publicPlayerSelect');if(sel&&!sel.dataset.swe4274){sel.dataset.swe4274='1';sel.addEventListener('change',()=>setTimeout(renderPayment,40))}if(isPublic())renderPayment()}
function fixWaze(){const box=E('swePublicMapActions');if(!box)return;box.querySelectorAll('a').forEach(a=>{if(/Waze/i.test(a.textContent||'')){a.innerHTML='<img src="/waze-logo-v4274.svg" alt="Waze" style="width:24px;height:24px;display:block"><span>Ouvrir dans Waze</span>';a.style.display='inline-flex';a.style.alignItems='center';a.style.gap='8px'}})}
function installRating(){try{if(typeof ratingForMatchPlayer!=='function')return;ratingForMatchPlayer=function(match,playerId,teamId,goalRows=S.goals){if(!match||!teamId)return null;const hs=Number(match.home_score||0),as=Number(match.away_score||0);const home=String(teamId)===String(match.home_team_id),away=String(teamId)===String(match.away_team_id);if(!home&&!away)return null;const own=home?hs:as,opp=home?as:hs,diff=opp-own;let base=5;if(own>opp)base=(own-opp)>2?7:6;else if(own<opp){base=diff<=2?4:(diff<=5?3:2)}const mg=(goalRows||[]).filter(g=>String(g.match_id)===String(match.id));const goals=mg.filter(g=>String(g.scorer_player_id)===String(playerId)&&!g.is_own_goal).length;const assists=mg.filter(g=>String(g.assister_player_id||'')===String(playerId)).length;return {rating:Math.min(10,base+goals+assists*.5),base,goals,assists,result:own>opp?'V':own===opp?'N':'D'};};}catch(e){console.warn('SWÉ rating 4274',e)}}
function hideFormula(){document.querySelectorAll('#view-matches .muted,#view-matches p,#view-matches div').forEach(el=>{const t=(el.textContent||'').trim();if(/^⭐?\s*Note automatique\s*:/i.test(t)||/victoire\s*\d+\s*•\s*nul\s*\d+/i.test(t)){el.style.display='none'}})}
function refreshMatchNotes(){document.querySelectorAll('.match-notes-details').forEach(d=>delete d.dataset.swe4273);try{const ev=new Event('swe:rendered');document.dispatchEvent(ev)}catch(_){}}
async function apply(){installRating();bindPayment();fixWaze();hideFormula();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,250),{once:true});else setTimeout(apply,100);
[500,1200,2500].forEach(ms=>setTimeout(apply,ms));document.addEventListener('swe:rendered',()=>setTimeout(apply,60));window.addEventListener('pageshow',()=>setTimeout(apply,100));
})();
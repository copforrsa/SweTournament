(()=>{
'use strict';
if(window.__SWE_COORG_SELFPAY_4308)return;
window.__SWE_COORG_SELFPAY_4308=true;
const q=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let busy=false,paintBusy=false;

function style(){
 if(q('#sweCoorgSelfPay4308Style'))return;
 const s=document.createElement('style');s.id='sweCoorgSelfPay4308Style';s.textContent=`
 #sweCoorgPayer4308{margin:10px 0;padding:12px;border:1px solid #d7e7df;border-radius:15px;background:#f8fbf9}
 #sweCoorgPayer4308 .title{font-weight:900;margin-bottom:8px}
 #sweCoorgPayer4308 .opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
 #sweCoorgPayer4308 label{display:flex;gap:8px;align-items:flex-start;padding:10px;border:1px solid #dce7e1;border-radius:12px;background:#fff;cursor:pointer}
 #sweCoorgPayer4308 label:has(input:checked){border-color:#16835a;box-shadow:0 0 0 2px rgba(22,131,90,.08)}
 #sweCoorgPayer4308 input{width:auto;margin-top:3px}#sweCoorgPayer4308 small{display:block;color:#65776e;margin-top:3px;line-height:1.35}
 .swe-selfpay-invite{padding:16px;border:1px solid #cfe4d8;border-radius:17px;background:linear-gradient(145deg,#fff,#f2faf6);margin:8px 0}
 .swe-selfpay-price{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.swe-selfpay-price button{padding:13px;border-radius:13px;font-weight:900}.swe-selfpay-price button.primary{background:#0d7549;color:#fff}
 @media(max-width:560px){#sweCoorgPayer4308 .opts,.swe-selfpay-price{grid-template-columns:1fr}}
 `;document.head.appendChild(s);
}
function isAdminSafe(){try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}}
function state(){try{return typeof S!=='undefined'?S:null}catch(_){return null}}
function client(){try{return typeof sb!=='undefined'?sb:null}catch(_){return null}}

function paintPriceWording(){
 const u=q('#homeCoorgUnitPrice');if(u&&/accès équipe/i.test(u.textContent||''))u.textContent=(u.textContent||'').replace(/1 accès équipe/i,'1 accès co-gestionnaire');
 const b=q('#homeBuyCoorg');if(b&&/accès équipe/i.test(b.textContent||''))b.innerHTML=b.innerHTML.replace(/accès équipe/gi,'accès co-gestionnaire');
 const pill=q('.swe4275-pricepill');if(pill)pill.textContent='1 accès co-gestionnaire dès 1,99 € / mois';
}
function installPayerChoice(){
 if(!isAdminSafe())return;
 const email=q('#inviteEmail'),send=q('#sendInvite');if(!email||!send||q('#sweCoorgPayer4308'))return;
 const box=document.createElement('div');box.id='sweCoorgPayer4308';box.innerHTML=`<div class="title">💳 Qui paie l’accès co-gestionnaire ?</div><div class="opts"><label><input type="radio" name="sweCoorgPayer4308" value="admin" checked><span><b>L’administrateur</b><small>L’accès supplémentaire est ajouté à la facturation de l’espace.</small></span></label><label><input type="radio" name="sweCoorgPayer4308" value="invitee"><span><b>Le co-gestionnaire invité</b><small>L’admin n’est pas facturé. L’invité choisit 1,99 €/mois ou 19,90 €/an avant activation.</small></span></label></div>`;
 send.insertAdjacentElement('beforebegin',box);
 box.addEventListener('change',()=>{const self=box.querySelector('input:checked')?.value==='invitee';send.textContent=self?'📨 Inviter — paiement à sa charge':'Inviter le co-organisateur';});
}
async function createSelfPaidInvite(e){
 const send=e.target?.closest?.('#sendInvite');if(!send)return;
 const box=q('#sweCoorgPayer4308');if(!box||box.querySelector('input:checked')?.value!=='invitee')return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 if(busy)return;const st=state(),c=client();if(!st?.workspace?.id||!c)return;
 const email=(q('#inviteEmail')?.value||'').trim().toLowerCase();if(!email){if(typeof toast==='function')toast('Saisis l’adresse e-mail du co-gestionnaire.');return;}
 busy=true;send.disabled=true;send.textContent='Création de l’invitation…';
 try{
   const {data,error}=await c.rpc('create_self_paid_coorganizer_invite',{p_workspace_id:st.workspace.id,p_email:email});if(error)throw error;
   const inv=Array.isArray(data)?data[0]:data;st.lastCreatedInvite=inv||null;if(st.lastCreatedInvite)st.lastCreatedInvite.payment_responsibility='invitee';
   if(q('#inviteEmail'))q('#inviteEmail').value='';
   try{if(typeof renderAccess==='function')renderAccess()}catch(_){}
   const link=inv?(typeof coorgInviteLink==='function'?coorgInviteLink(inv):location.origin+location.pathname+'?invite='+encodeURIComponent(inv.id)+'&email='+encodeURIComponent(inv.email||email)):'';
   try{if(link)await navigator.clipboard.writeText(link)}catch(_){}
   if(typeof toast==='function')toast('Invitation créée ✅ L’invité paiera son propre accès. Lien copié.');
 }catch(err){if(typeof toast==='function')toast(err?.message||'Impossible de créer l’invitation.');}
 finally{busy=false;send.disabled=false;send.textContent='📨 Inviter — paiement à sa charge';}
}

async function renderSelfPaidInvites(){
 if(paintBusy)return;const c=client(),st=state();if(!c||!st?.session?.user)return;paintBusy=true;
 try{
   const {data,error}=await c.rpc('get_my_self_paid_coorganizer_invites');if(error)return;
   const rows=Array.isArray(data)?data:[];if(!rows.length)return;
   const box=q('#inviteList'),wrap=q('#inviteBox');if(!box||!wrap)return;wrap.classList.remove('hidden');
   box.innerHTML=rows.map(i=>`<div class="swe-selfpay-invite" data-selfpay-invite="${esc(i.id)}"><b>🤝 ${esc(i.workspace_name||'SWÉ TOURNAMENT')}</b><div class="muted" style="margin-top:5px">L’administrateur t’invite comme co-gestionnaire. <b>Ton accès est à ta charge</b> et ne sera activé qu’après paiement.</div><div style="margin-top:9px"><b>Choisis ton abonnement :</b></div><div class="swe-selfpay-price"><button type="button" class="primary" data-selfpay-period="month" data-invite-id="${esc(i.id)}">1,99 € / mois</button><button type="button" data-selfpay-period="year" data-invite-id="${esc(i.id)}">19,90 € / an <small style="display:block">≈ 1,66 €/mois</small></button></div><div class="muted" style="margin-top:8px">Paiement sécurisé par Stripe. Ton accès s’active automatiquement après confirmation du paiement.</div></div>`).join('');
 }finally{paintBusy=false;}
}
async function startInviteCheckout(e){
 const b=e.target?.closest?.('[data-selfpay-period][data-invite-id]');if(!b)return;e.preventDefault();
 const c=client();if(!c||busy)return;busy=true;const period=b.dataset.selfpayPeriod==='year'?'year':'month',inviteId=b.dataset.inviteId;b.disabled=true;b.textContent='Ouverture du paiement…';
 try{const {data,error}=await c.functions.invoke('stripe-create-invite-coorganizer-checkout',{body:{invite_id:inviteId,billing_period:period,request_id:crypto.randomUUID()}});if(error||data?.error)throw new Error(data?.error||error?.message||'Paiement indisponible');if(data?.url)location.href=data.url;else throw new Error('Lien de paiement indisponible');}
 catch(err){b.disabled=false;b.textContent=period==='year'?'19,90 € / an':'1,99 € / mois';if(typeof toast==='function')toast(err?.message||'Impossible d’ouvrir le paiement.');busy=false;}
}
async function handleReturn(){
 const p=new URLSearchParams(location.search);if(p.get('coorg_invite')!=='success')return;
 if(typeof toast==='function')toast('Paiement reçu ✅ Activation de ton accès…');
 const c=client();if(!c)return;for(let n=0;n<8;n++){await new Promise(r=>setTimeout(r,900));const {data}=await c.rpc('get_my_self_paid_coorganizer_invites');if(Array.isArray(data)&&!data.some(x=>String(x.id)===String(p.get('invite')))){const u=new URL(location.href);u.searchParams.delete('coorg_invite');u.searchParams.delete('invite');history.replaceState({},'',u.pathname+u.search);location.reload();return;}}
}
function paint(){style();paintPriceWording();installPayerChoice();renderSelfPaidInvites();}
function boot(){paint();setTimeout(paint,400);setTimeout(paint,1200);handleReturn();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('click',createSelfPaidInvite,true);document.addEventListener('click',startInviteCheckout);
document.addEventListener('swe:rendered',()=>setTimeout(paint,80));window.addEventListener('pageshow',()=>setTimeout(paint,120));
})();
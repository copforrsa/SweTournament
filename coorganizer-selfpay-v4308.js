(()=>{
'use strict';
if(window.__SWE_COORG_SELFPAY_4308)return;
window.__SWE_COORG_SELFPAY_4308=true;
const q=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let busy=false,paintBusy=false,paintQueued=false;
const checkoutRequests=new Map();
let returnBusy=false;
const startupTimers=[];
let inviteObserver=null,observerStop=null,observerDebounce=null;

function style(){
 if(q('#sweCoorgSelfPay4308Style'))return;
 const s=document.createElement('style');s.id='sweCoorgSelfPay4308Style';s.textContent=`
 #sweCoorgPayer4308{margin:10px 0;padding:12px;border:1px solid #d7e7df;border-radius:15px;background:#f8fbf9}
 #sweCoorgPayer4308 .title{font-weight:900;margin-bottom:8px}
 #sweCoorgPayer4308 .opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
 #sweCoorgPayer4308 label{display:flex;gap:8px;align-items:flex-start;padding:10px;border:1px solid #dce7e1;border-radius:12px;background:#fff;cursor:pointer}
 #sweCoorgPayer4308 label:has(input:checked){border-color:#16835a;box-shadow:0 0 0 2px rgba(22,131,90,.08)}
 #sweCoorgPayer4308 input{width:auto;margin-top:3px}#sweCoorgPayer4308 small{display:block;color:#65776e;margin-top:3px;line-height:1.35}
 .swe-selfpay-invite{padding:12px;border:1px solid #ccdeef;border-radius:14px;background:linear-gradient(130deg,#f6faff,#fff);margin:6px 0;color:#102746}.swe-selfpay-invite p{margin:5px 0;font-size:13px}.swe-selfpay-invite summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:12px;align-items:center;font-weight:850}.swe-selfpay-invite summary::-webkit-details-marker{display:none}.swe-selfpay-invite summary span{font-size:12px;color:#145ba9}.swe-selfpay-invite summary span:after{content:' ＋'}.swe-selfpay-invite details[open] summary span:after{content:' −'}.swe-selfpay-invite [role=status]{font-size:13px;margin-top:8px;color:#9c3328}
 .swe-selfpay-price{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.swe-selfpay-price button{padding:11px;border-radius:11px;font-weight:900}.swe-selfpay-price button.primary{background:linear-gradient(110deg,#1859d1,#08a8cc);color:#fff}
 @media(max-width:560px){#sweCoorgPayer4308 .opts,.swe-selfpay-price{grid-template-columns:1fr}}
 `;document.head.appendChild(s);
}
function isAdminSafe(){try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}}
function state(){try{return typeof S!=='undefined'?S:null}catch(_){return null}}
function client(){try{return typeof sb!=='undefined'?sb:null}catch(_){return null}}
function feedback(message,error=false){const el=q('#coorgInviteFeedback');if(el){el.textContent=message;el.classList.remove('hidden');el.style.color=error?'#b42318':'#176b4f';el.style.fontWeight='750'}if(typeof toast==='function')toast(message)}

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
 const input=q('#inviteEmail'),email=(input?.value||'').trim().toLowerCase();if(!email||!input?.checkValidity()){feedback('Saisis une adresse e-mail valide.',true);return;}
 busy=true;send.disabled=true;send.textContent='Création de l’invitation…';
 try{
   const {data,error}=await c.rpc('create_self_paid_coorganizer_invite',{p_workspace_id:st.workspace.id,p_email:email});if(error)throw error;
   const inv=Array.isArray(data)?data[0]:data;st.lastCreatedInvite=inv||null;if(st.lastCreatedInvite)st.lastCreatedInvite.payment_responsibility='invitee';
   if(q('#inviteEmail'))q('#inviteEmail').value='';
   if(typeof loadAll==='function')await loadAll();else{try{if(Array.isArray(st.invites)&&inv&&!st.invites.some(x=>String(x.id)===String(inv.id)))st.invites.unshift({...inv,payment_responsibility:'invitee'});if(typeof renderAccess==='function')renderAccess()}catch(_){}}
   const link=inv?(typeof coorgInviteLink==='function'?coorgInviteLink(inv):location.origin+location.pathname+'?invite='+encodeURIComponent(inv.id)+'&email='+encodeURIComponent(inv.email||email)):'';
   try{if(link)await navigator.clipboard.writeText(link)}catch(_){}
   feedback('Invitation créée ✅ Elle apparaît ci-dessous et le lien est copié. L’invité paiera son propre accès.');
 }catch(err){feedback(err?.message||'Impossible de créer l’invitation.',true);}
 finally{busy=false;send.disabled=false;send.textContent='📨 Inviter — paiement à sa charge';}
}

async function renderSelfPaidInvites(){
 if(paintBusy||busy){paintQueued=true;return}const c=client(),st=state();if(!c||!st?.session?.user)return;paintBusy=true;paintQueued=false;
 const userId=st.session.user.id;
 try{
   let timeout;const {data,error}=await Promise.race([c.rpc('get_my_self_paid_coorganizer_invites'),new Promise(resolve=>{timeout=setTimeout(()=>resolve({data:null,error:{message:'Délai de chargement dépassé'}}),10000)})]);clearTimeout(timeout);
   if(state()?.session?.user?.id!==userId||busy)return;
   const box=q('#inviteList'),wrap=q('#inviteBox');if(!box||!wrap)return;
   if(error){
     box.querySelectorAll('[data-selfpay-invite]').forEach(card=>{
       card.textContent='Invitation co-gestionnaire : impossible de charger les options.';
       const retry=document.createElement('button');retry.type='button';retry.textContent='Réessayer';retry.onclick=()=>renderSelfPaidInvites();card.appendChild(retry);
     });return;
   }
   const rows=Array.isArray(data)?data:[],ids=new Set(rows.map(i=>String(i.id)));box.querySelectorAll('[data-invite-load-error]').forEach(card=>card.remove());
   const seen=new Set();box.querySelectorAll('[data-selfpay-invite]').forEach(card=>{const id=String(card.dataset.selfpayInvite||'');if(!ids.has(id)||seen.has(id))card.remove();else seen.add(id)});
   for(const i of rows){
     let card=[...box.querySelectorAll('[data-selfpay-invite]')].find(el=>el.dataset.selfpayInvite===String(i.id));
     if(!card){card=document.createElement('div');card.className='swe-selfpay-invite';card.dataset.selfpayInvite=i.id;box.appendChild(card)}
     const signature=JSON.stringify([i.workspace_name,i.payment_status]);
     if(card.dataset.signature===signature)continue;
     const opened=card.querySelector('details')?.open||false;
     card.dataset.signature=signature;
     card.innerHTML=`<details${opened?' open':''}><summary><b>🤝 ${esc(i.workspace_name||'SWÉ TOURNAMENT')}</b><span>Voir l’invitation</span></summary><p>L’administrateur te propose de devenir <b>co-gestionnaire</b> de ce groupe et te laisse régler cet abonnement.</p><p>Ton profil joueur reste gratuit. Cet abonnement concerne uniquement cette invitation.</p><div class="swe-selfpay-price"><button type="button" class="primary" data-selfpay-period="month" data-invite-id="${esc(i.id)}">S’abonner · 1,99 € / mois</button><button type="button" data-selfpay-period="year" data-invite-id="${esc(i.id)}">S’abonner · 19,90 € / an</button></div><p class="muted">Abonnement récurrent · paiement sécurisé par Stripe · accès activé après confirmation.</p><div role="status" aria-live="polite"></div></details>`;
   }
   wrap.classList.toggle('hidden',!box.children.length);
   if(rows.length){const title=wrap.querySelector('h2');if(title)title.textContent='Invitations à co-gérer un groupe'}
 }catch(error){
   const box=q('#inviteList'),wrap=q('#inviteBox');
   if(box&&wrap){box.querySelectorAll('[data-selfpay-invite]').forEach(card=>{card.innerHTML='<p role="status">Impossible de charger cette invitation pour le moment.</p><button type="button" data-selfpay-retry="1">Réessayer</button>'});wrap.classList.toggle('hidden',!box.children.length)}
   console.warn('[coorganizer-invites]',error);
 }finally{paintBusy=false;if(paintQueued)setTimeout(renderSelfPaidInvites,0)}
}
async function checkoutError(error,data){
 if(data?.error)return data.error;
 try{const body=await error?.context?.json();if(body?.error)return body.error}catch(_){}
 if(error?.name==='FunctionsFetchError'||/Failed to (send|fetch)|NetworkError/i.test(error?.message||''))return 'Le service de paiement est momentanément inaccessible. Réessaie dans quelques instants.';
 return error?.message||'Impossible d’ouvrir le paiement.';
}
async function startInviteCheckout(e){
 const b=e.target?.closest?.('[data-selfpay-period][data-invite-id]');if(!b)return;
 e.preventDefault();e.stopPropagation();
 const c=client(),st=state();if(!c||busy)return;
 const card=b.closest('[data-selfpay-invite]'),message=card?.querySelector('[role="status"]');
 if(!st?.session?.user){if(message)message.textContent='Reconnecte-toi pour répondre à cette invitation.';return}
 busy=true;const period=b.dataset.selfpayPeriod==='year'?'year':'month',inviteId=b.dataset.inviteId;
 const key=st.session.user.id+':'+inviteId+':'+period;
 const original=b.innerHTML;const buttons=[...(card?.querySelectorAll('button')||[b])];
 buttons.forEach(button=>button.disabled=true);b.textContent='Ouverture de Stripe…';if(message)message.textContent='';
 try{
   if(!checkoutRequests.has(key))checkoutRequests.set(key,crypto.randomUUID());
   const {data,error}=await c.functions.invoke('stripe-create-invite-coorganizer-checkout',{body:{invite_id:inviteId,billing_period:period,request_id:checkoutRequests.get(key)}});
   if(error||data?.error)throw new Error(await checkoutError(error,data));
   if(!data?.url)throw new Error('Lien de paiement indisponible. Réessaie.');
   const target=new URL(data.url);if(target.protocol!=='https:'||target.hostname!=='checkout.stripe.com')throw new Error('Lien de paiement non reconnu. Contacte l’organisateur.');
   location.href=target.href;
 }catch(err){
   const text=err?.message||'Impossible d’ouvrir le paiement.';if(message)message.textContent=text;
   if(typeof toast==='function')toast(text);
   buttons.forEach(button=>button.disabled=false);b.innerHTML=original;busy=false;
 }
}
async function handleReturn(){
 const p=new URLSearchParams(location.search);if(p.get('coorg_invite')!=='success'||returnBusy||!state()?.session?.user)return;
 const c=client();if(!c)return;returnBusy=true;
 const userId=state().session.user.id;
 if(typeof toast==='function')toast('Vérification du paiement et de ton invitation…');
 try{
   for(let n=0;n<8;n++){
     if(state()?.session?.user?.id!==userId)return;
     const {data,error}=await c.from('workspace_invites').select('workspace_id,payment_status,accepted_at').eq('id',p.get('invite')).maybeSingle();
     if(!error&&data?.payment_status==='paid'&&data.accepted_at){
       localStorage.setItem('swe_workspace_id',data.workspace_id);
       const u=new URL(location.href);['coorg_invite','invite','email'].forEach(k=>u.searchParams.delete(k));
       history.replaceState({},'',u.pathname+u.search);location.reload();return;
     }
     await new Promise(r=>setTimeout(r,1200));
   }
   if(typeof toast==='function')toast('Confirmation encore en cours. Actualise la page dans quelques instants.');
 }finally{returnBusy=false}
}
window.SWECoorganizerInvites={refresh:()=>{renderSelfPaidInvites();handleReturn()}};
function paint(){style();paintPriceWording();installPayerChoice();renderSelfPaidInvites();}
function scheduleStartup(){startupTimers.splice(0).forEach(clearTimeout);[0,300,900,1800,3500,7000].forEach(delay=>startupTimers.push(setTimeout(paint,delay)))}
function watchInviteList(){const list=q('#inviteList');if(!list||inviteObserver)return;inviteObserver=new MutationObserver(()=>{const pending=[...list.querySelectorAll('[data-selfpay-invite]')].some(card=>/Chargement de ton invitation/i.test(card.textContent||''));if(!pending)return;clearTimeout(observerDebounce);observerDebounce=setTimeout(renderSelfPaidInvites,40)});inviteObserver.observe(list,{childList:true,subtree:true,characterData:true});clearTimeout(observerStop);observerStop=setTimeout(()=>{inviteObserver?.disconnect();inviteObserver=null},45000)}
function toggleInvite(e){const summary=e.target.closest?.('.swe-selfpay-invite summary');if(!summary)return;e.preventDefault();e.stopPropagation();const details=summary.closest('details');if(!details)return;details.open=!details.open;summary.setAttribute('aria-expanded',String(details.open))}
function boot(){watchInviteList();scheduleStartup();handleReturn();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('click',toggleInvite,true);document.addEventListener('click',createSelfPaidInvite,true);document.addEventListener('click',startInviteCheckout);document.addEventListener('click',e=>{if(e.target.closest?.('[data-selfpay-retry]'))renderSelfPaidInvites()});
document.addEventListener('swe:rendered',()=>setTimeout(()=>{watchInviteList();paint()},80));document.addEventListener('swe:invites-loaded',()=>setTimeout(renderSelfPaidInvites,0));document.addEventListener('swe:player-ui-ready',()=>setTimeout(renderSelfPaidInvites,0));document.addEventListener('swe:page-view',()=>setTimeout(renderSelfPaidInvites,80));window.addEventListener('pageshow',()=>{watchInviteList();scheduleStartup()});
})();

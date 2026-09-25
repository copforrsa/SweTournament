(()=>{
'use strict';
if(window.__SWE_PUBLIC_THIRD_HALF_PAYMENT_5063)return;
window.__SWE_PUBLIC_THIRD_HALF_PAYMENT_5063=true;

const E=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));

function context(){return window.swePageViewContext||null;}
function client(){try{return typeof sb!=='undefined'?sb:null;}catch(_){return null;}}
function remove(){E('publicThirdHalfPaymentLink5063')?.remove();}
function insertCard(data){
  remove();
  if(!data?.payment_link_ready||!data?.payment_link)return;
  const target=E('publicPaymentBox')||E('publicParticipationActions')||E('publicRegistration');
  if(!target)return;
  const provider=String(data.provider||'Paiement').trim();
  const amount=Number(data.suggested_amount_cents||0);
  const amountText=amount>0?'Participation conseillée : <b>'+esc((amount/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'}))+'</b>.':'Participation libre.';
  const card=document.createElement('section');
  card.id='publicThirdHalfPaymentLink5063';
  card.className='player swe-third-half-payment-card';
  card.style.cssText='margin-top:12px;background:linear-gradient(135deg,#ecfdf5,#eff6ff);border:1px solid #86efac;padding:14px;border-radius:14px';
  card.innerHTML='<div style="display:flex;gap:10px;align-items:flex-start"><span aria-hidden="true" style="font-size:24px">🧊</span><div style="min-width:0;flex:1"><b>Participation à la Glacière</b><div class="muted" style="margin-top:4px;line-height:1.55">'+esc(provider)+' · '+amountText+'</div><a href="'+esc(data.payment_link)+'" target="_blank" rel="noopener noreferrer" class="primary" style="display:inline-block;margin-top:10px;text-decoration:none">Ouvrir le lien '+esc(provider)+' ↗</a></div></div>';
  target.after(card);
}
async function refresh(){
  const page=context(),api=client();
  if(!page||page.page!=='registration'||!page.token||!page.id||!api?.rpc){remove();return;}
  try{
    const {data,error}=await api.rpc('get_public_third_half_registration_v2',{p_token:page.token,p_tournament_id:page.id});
    if(error)throw error;
    insertCard(data);
  }catch(_){remove();}
}
function queueRefresh(){[0,180,700,1400].forEach(delay=>setTimeout(refresh,delay));}
document.addEventListener('swe:page-view',queueRefresh);
document.addEventListener('change',event=>{if(event.target?.id==='publicPlayerSelect')queueRefresh();});
document.addEventListener('click',event=>{if(event.target?.closest?.('#publicJoin,#publicLeave,#publicAddGuest'))setTimeout(queueRefresh,80);},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queueRefresh,{once:true});else queueRefresh();
})();

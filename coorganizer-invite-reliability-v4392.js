(()=>{
'use strict';
if(window.__SWE_COORGANIZER_INVITE_RELIABILITY_4392)return;
window.__SWE_COORGANIZER_INVITE_RELIABILITY_4392=true;
let busy=false;
const q=s=>document.querySelector(s);
function state(){try{return typeof S!=='undefined'?S:null}catch(_){return null}}
function client(){try{return typeof sb!=='undefined'?sb:null}catch(_){return null}}
function isAllowed(st){try{return (typeof isAdmin==='function'&&isAdmin())||(typeof isCoorg==='function'&&isCoorg()&&st?.myPermissions?.can_invite_coorganizers)}catch(_){return false}}
function report(message,error=false){
 const el=q('#coorgInviteFeedback');
 if(el){el.textContent=message;el.classList.remove('hidden');el.style.color=error?'#b42318':'#176b4f';el.style.fontWeight='750'}
 try{if(typeof toast==='function')toast(message)}catch(_){}
}
async function createOrganizerPaidInvite(event){
 const button=event.target?.closest?.('#sendInvite');if(!button)return;
 const payer=q('#sweCoorgPayer4308 input:checked')?.value;if(payer==='invitee')return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 if(busy)return;
 const st=state(),c=client(),input=q('#inviteEmail');
 if(!st?.workspace?.id||!c)return report('Recharge la page puis réessaie.',true);
 if(!isAllowed(st))return report('Tu n’es pas autorisé à inviter un co-organisateur.',true);
 const email=(input?.value||'').trim().toLowerCase();
 if(!email||!input?.checkValidity())return report('Saisis une adresse e-mail valide.',true);
 busy=true;button.disabled=true;button.textContent='Création…';q('#coorgInviteFeedback')?.classList.add('hidden');
 try{
  const {data,error}=await c.rpc('create_coorganizer_invite',{p_workspace_id:st.workspace.id,p_email:email});if(error)throw error;
  const inv=Array.isArray(data)?data[0]:data;if(!inv?.id)throw new Error('La base n’a pas confirmé la création de l’invitation.');
  st.lastCreatedInvite=inv;
  try{if(typeof isAdmin==='function'&&isAdmin()){const codeRes=await c.rpc('admin_get_coorganizer_swe_code',{p_workspace_id:st.workspace.id,p_email:email});if(!codeRes.error&&codeRes.data){st.lastCreatedInvite.swe_code=codeRes.data.code;st.lastCreatedInvite.public_player_id=codeRes.data.public_player_id||null;try{await navigator.clipboard.writeText(codeRes.data.code)}catch(_){}}}}catch(_){}
  input.value='';
  if(typeof loadAll==='function')await loadAll();else if(typeof renderAccess==='function')renderAccess();
  report(st.lastCreatedInvite?.swe_code?'Co-gestionnaire ajouté ✅ Code SWÉ '+st.lastCreatedInvite.swe_code+' copié.':'Invitation créée ✅ Elle apparaît ci-dessous : utilise Copier le lien ou WhatsApp.');
 }catch(error){report(error?.message||'Impossible de créer cette invitation.',true)}
 finally{busy=false;button.disabled=false;button.textContent='Inviter le co-organisateur'}
}
document.addEventListener('click',createOrganizerPaidInvite,true);
})();

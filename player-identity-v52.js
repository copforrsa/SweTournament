/* Complete a player identity after Google / Apple or password sign-in. */
(()=>{
'use strict';
let busy=false,checked='',state=null;
const E=id=>document.getElementById(id);
const css='swe-identity-v52';
async function inspect(){
 let session;try{session=S?.session}catch(_){return}
 if(!session?.user||busy||document.getElementById('publicView')&&!document.getElementById('publicView').classList.contains('hidden'))return;
 if(checked===session.user.id)return;
 busy=true;
 try{
  let {data,error}=await sb.rpc('my_player_identity_form_v52');
  if(error){console.warn('Player identity check:',error.message);return}
  if(!data?.exists){const created=await sb.rpc('ensure_my_global_player_profile',{p_display_name:null});if(created.error){console.warn('Player profile:',created.error.message);return}const current=await sb.rpc('my_player_identity_form_v52');if(current.error)return;data=current.data;}
  checked=session.user.id;
  if(data.complete){E('sweIdentity52')?.remove();return}
  state=data;open();
 }finally{busy=false}
}
function open(){
 if(E('sweIdentity52'))return;
 const shade=document.createElement('div');shade.id='sweIdentity52';
 shade.innerHTML='<section role="dialog" aria-modal="true" aria-label="Compléter mon identité joueur" class="swe-identity-card"><h2>⚽ Complète ta fiche joueur</h2><p>Pour t’identifier auprès des organisateurs et participer aux SWÉs, indique tes informations personnelles.</p><form id="sweIdentityForm"><label>Prénom<input name="first" maxlength="80" required autocomplete="given-name"></label><label>Nom<input name="last" maxlength="80" required autocomplete="family-name"></label><label>Surnom<input name="nickname" maxlength="80" required></label><label>Date de naissance<input name="birth" type="date" required></label><label>Niveau de football (auto-évaluation)<select name="skill" required><option value="">Choisir…</option><option value="1">1 — Débutant</option><option value="2">2 — Occasionnel</option><option value="3">3 — Intermédiaire</option><option value="4">4 — Confirmé</option><option value="5">5 — Excellent</option></select></label><label>Photo de profil<input name="photo" type="file" accept="image/png,image/jpeg,image/webp"></label><div class="swe-identity-status" role="status"></div><button type="submit" class="primary">Enregistrer ma fiche</button></form></section>';
 document.body.append(shade);
 const f=E('sweIdentityForm');for(const [key,value] of [['first',state.first_name],['last',state.last_name],['nickname',state.nickname],['birth',state.birth_date],['skill',state.skill_level]])if(value!=null)f.elements[key].value=value;
 f.onsubmit=async ev=>{
  ev.preventDefault();const btn=f.querySelector('button');btn.disabled=true;const message=f.querySelector('[role="status"]');message.textContent='Enregistrement en cours…';
  try{
   let avatar=state.avatar_url;
   const file=f.elements.photo.files[0];
   if(file){
     if(file.size>3*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Photo JPG, PNG ou WebP, 3 Mo maximum.');
     const uid=S.session.user.id,path=uid+'/profile-'+Date.now()+'.'+(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg');
     const up=await sb.storage.from('player-avatars').upload(path,file,{contentType:file.type,upsert:false});
     if(up.error)throw up.error;
     avatar=sb.storage.from('player-avatars').getPublicUrl(path).data.publicUrl;
   }
   const {error}=await sb.rpc('save_my_player_identity_v52',{p_first:f.elements.first.value,p_last:f.elements.last.value,p_nickname:f.elements.nickname.value,p_birth:f.elements.birth.value,p_skill:Number(f.elements.skill.value),p_avatar_url:avatar||null});
   if(error)throw error;
   shade.remove();if(typeof toast==='function')toast('Fiche joueur enregistrée ✅');
  }catch(e){message.textContent=e.message||'Enregistrement impossible'}finally{btn.disabled=false}
 };
}
document.addEventListener('swe:rendered',inspect);
document.addEventListener('swe:page-view',inspect);
window.addEventListener('pageshow',()=>{checked='';inspect()});
setInterval(()=>{if(document.visibilityState==='visible')inspect()},5000);
})();

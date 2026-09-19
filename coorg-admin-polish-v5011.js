(()=>{
'use strict';
if(window.__SWE_COORG_ADMIN_POLISH_5011)return;
window.__SWE_COORG_ADMIN_POLISH_5011=true;
const E=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isCoorgUser=()=>{try{return typeof isCoorg==='function'&&isCoorg()}catch(_){return false}};
const isAdminUser=()=>{try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}};
function styles(){
 if(E('sweCoorgAdminPolishStyle'))return;
 const s=document.createElement('style');s.id='sweCoorgAdminPolishStyle';
 s.textContent='.swe-avatar-edit{position:absolute;left:-4px;bottom:-4px;width:30px!important;min-height:30px!important;padding:0!important;border:2px solid #fff!important;border-radius:50%!important;background:#1268db!important;color:#fff!important;font-size:15px!important;z-index:2}.swe-coorg-avatar{position:relative;overflow:visible!important}.swe-coorg-avatar img{border-radius:50%}.swe-coorg-collapsible{margin-top:10px;border:1px solid #dbe7f2;border-radius:12px;background:#fbfdff;padding:0 11px}.swe-coorg-collapsible summary{padding:11px 0;cursor:pointer;font-weight:800;color:#123d73}.swe-coorg-collapsible .player{margin:0 0 9px}.swe-eval-extra{margin-top:2px}@media(max-width:650px){.swe-avatar-edit{left:4px}}';
 document.head.appendChild(s);
}
async function saveAvatar(file){
 const s=typeof S!=='undefined'?S:null,c=typeof sb!=='undefined'?sb:null;
 if(!s?.session?.user||!c)throw new Error('Session indisponible.');
 if(!file)return;
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('Choisis une photo JPG, PNG ou WEBP.');
 if(file.size>5*1024*1024)throw new Error('Photo trop lourde (5 Mo maximum).');
 const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
 const path=s.session.user.id+'/avatar-'+Date.now()+'.'+ext;
 const upload=await c.storage.from('player-avatars').upload(path,file,{upsert:true,cacheControl:'3600'});
 if(upload.error)throw upload.error;
 const avatar=c.storage.from('player-avatars').getPublicUrl(path).data.publicUrl;
 const age=s.playerDashboard?.profile?.age??null;
 const result=await c.rpc('update_my_player_profile_details',{p_age:age,p_avatar_url:avatar});
 if(result.error)throw result.error;
 if(s.playerDashboard?.profile)s.playerDashboard.profile.avatar_url=avatar;
 document.querySelectorAll('.swe-coorg-avatar').forEach(node=>{node.innerHTML='<img src="'+esc(avatar)+'" alt="Photo de profil">';addAvatarButton(node);});
 if(typeof toast==='function')toast('Photo de profil mise à jour ✅');
}
function addAvatarButton(avatar){
 if(!isCoorgUser()||avatar.querySelector('.swe-avatar-edit'))return;
 const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.hidden=true;
 const button=document.createElement('button');button.type='button';button.className='swe-avatar-edit';button.title='Modifier ma photo de profil';button.setAttribute('aria-label','Modifier ma photo de profil');button.textContent='✎';
 button.onclick=()=>input.click();
 input.onchange=async()=>{const file=input.files?.[0];if(!file)return;button.disabled=true;try{await saveAvatar(file)}catch(error){typeof toast==='function'?toast(error.message||String(error)):alert(error.message||String(error))}finally{button.disabled=false;input.value=''}};
 avatar.append(input,button);
}
function profilePhoto(){
 if(!isCoorgUser())return;
 document.querySelectorAll('#sweCoorgDashboard4399 .swe-coorg-avatar').forEach(addAvatarButton);
}
function collapseInvites(){
 if(!isAdminUser())return;
 const box=E('memberList');if(!box||box.querySelector(':scope > details.swe-coorg-collapsible'))return;
 const nodes=[...box.children];
 const list=nodes.slice(2);
 if(!list.length)return;
 const active=list.filter(n=>n.textContent.includes('Actif')).length,pending=list.filter(n=>n.textContent.includes('En attente')).length;
 const details=document.createElement('details');details.className='swe-coorg-collapsible';
 const summary=document.createElement('summary');summary.textContent='Voir les co-gestionnaires et invitations ('+list.length+' • '+active+' actif'+(active>1?'s':'')+(pending?' • '+pending+' en attente':'')+')';
 details.appendChild(summary);list.forEach(n=>details.appendChild(n));box.appendChild(details);
}
function collapseEvaluators(){
 if(!isAdminUser())return;
 const box=E('homeCoorgVotes');if(!box)return;
 const rows=[...box.querySelectorAll(':scope > .swe-eval-row4393')];
 if(rows.length<=5||box.querySelector(':scope > details.swe-eval-extra'))return;
 const extra=document.createElement('details');extra.className='swe-coorg-collapsible swe-eval-extra';
 const summary=document.createElement('summary');summary.textContent='Voir les '+(rows.length-5)+' autre'+(rows.length-5>1?'s':'')+' évaluateur'+(rows.length-5>1?'s':'');
 extra.appendChild(summary);rows.slice(5).forEach(row=>extra.appendChild(row));box.appendChild(extra);
}
function orderFollowUp(){
 if(!isAdminUser())return;
 const invite=E('adminAccessCard'),follow=E('homeCoorgVotesCard');
 if(invite&&follow&&invite.nextElementSibling!==follow)invite.insertAdjacentElement('afterend',follow);
}
let queued=false;
function tick(){
 if(queued)return;queued=true;
 requestAnimationFrame(()=>{queued=false;styles();profilePhoto();collapseInvites();collapseEvaluators();orderFollowUp();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
document.addEventListener('swe:rendered',tick);
setInterval(tick,1200);
})();
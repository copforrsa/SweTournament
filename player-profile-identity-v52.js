(()=>{'use strict';
const E=id=>document.getElementById(id);let waiting=false,stamp=0;
async function render(){
 let s;try{s=S}catch(_){return}
 const view=E('view-myplayer');if(!view||!s?.session||waiting||Date.now()-stamp<15000)return;
 waiting=true;
 try{
 const {data,error}=await sb.rpc('my_player_identity_form_v52');
 if(error||!data?.exists)return;
 stamp=Date.now();
 let section=E('sweProfileIdentity52');if(!section){section=document.createElement('section');section.id='sweProfileIdentity52';section.className='card';view.append(section)}
 section.dataset.playerSections='profile';section.style.setProperty('--player-order','2');
 section.classList.toggle('swe-player-filtered',view.dataset.playerPanel!=='profile');
 section.replaceChildren();
 const title=document.createElement('h2');title.textContent='👤 Mes informations personnelles';section.append(title);
 const row=document.createElement('div');row.className='swe-profile-id-row';
 if(data.avatar_url){const img=document.createElement('img');img.src=data.avatar_url;img.alt='Ma photo de profil';img.width=112;img.height=112;row.append(img)}
 const text=document.createElement('div');for(const [label,val] of [['Prénom',data.first_name],['Nom',data.last_name],['Surnom',data.nickname],['Date de naissance',data.birth_date],['Niveau déclaré',data.skill_level?data.skill_level+'/5':null]]){const p=document.createElement('p');p.textContent=label+' : '+(val||'Non renseigné');text.append(p)}row.append(text);section.append(row);
 const prefs=document.createElement('div');prefs.className='swe-profile-preferences';
 prefs.innerHTML='<h3>Mes préférences de visibilité</h3><p>Ton profil est privé par défaut. Tu peux décider d’apparaître dans le catalogue des joueurs disponibles.</p><label><input id="sweProfileCatalog52" type="checkbox"> Rendre mon profil public et visible dans le catalogue</label><label><input id="sweProfileNotifications52" type="checkbox"> Recevoir les informations sur les SWÉs</label><button type="button" class="primary" id="sweProfilePrefsSave52">Enregistrer mes préférences</button><span id="sweProfilePrefsFeedback52" role="status"></span>';
 section.append(prefs);
 const profile=s.playerDashboard?.profile||{};E('sweProfileCatalog52').checked=!!profile.is_public&&!!profile.discoverable;E('sweProfileNotifications52').checked=!!profile.notify_upcoming_swes;
 E('sweProfilePrefsSave52').onclick=async()=>{const btn=E('sweProfilePrefsSave52');btn.disabled=true;const show=E('sweProfilePrefsFeedback52');const visible=E('sweProfileCatalog52').checked;const {error}=await sb.rpc('update_my_global_player_profile',{p_display_name:data.nickname||profile.display_name||'',p_is_public:visible,p_discoverable:visible,p_notify_upcoming_swes:E('sweProfileNotifications52').checked,p_home_area:profile.home_area||null});show.textContent=error?'Erreur : '+error.message:'✓ Préférences enregistrées';btn.disabled=false};
 }finally{waiting=false}
}
document.addEventListener('swe:rendered',render);document.addEventListener('swe:page-view',render);window.addEventListener('pageshow',()=>{stamp=0;render()});setInterval(()=>{if(document.visibilityState==='visible')render()},16000);
})();
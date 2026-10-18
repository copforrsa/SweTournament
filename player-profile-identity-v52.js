(()=>{'use strict';
const E=id=>document.getElementById(id);let waiting=false,stamp=0;
async function render(){
 let s;try{s=S}catch(_){return}
 const view=E('view-myplayer');if(!view||!s?.session||waiting||Date.now()-stamp<15000)return;
 waiting=true;
 try{
 const {data,error}=await sb.rpc('my_player_identity_form_v52');
 if(error||!data?.exists)return;
 E('swePlayerPreferencesTab52')?.remove();
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
 prefs.innerHTML='<div class="swe-pref-heading"><span class="swe-pref-badge">⚙️</span><div><h2>Mes préférences</h2><p>Personnalise ton expérience SWÉ Tournament selon tes envies.</p></div></div><div class="swe-pref-panel"><h3>👤 Visibilité et communications</h3><p>Ton profil est privé par défaut. Choisis les informations que tu souhaites partager.</p><label class="swe-pref-setting"><input id="sweProfileCatalog52" type="checkbox"><span><strong>Rendre mon profil public et visible dans le catalogue</strong><small>Les autres joueurs pourront découvrir ton profil.</small></span></label><label class="swe-pref-setting"><input id="sweProfileNotifications52" type="checkbox"><span><strong>Recevoir les informations sur les SWÉs</strong><small>Actualités et communications de la communauté.</small></span></label></div><div class="swe-pref-panel"><h3>🔔 Notifications sur cet appareil</h3><p>Sois prévenu des matchs, équipes et tournois même lorsque ton téléphone est verrouillé.</p><div class="swe-pref-setting"><span class="swe-pref-push-status" id="sweProfilePushStatus52">Vérification des notifications…</span><button type="button" id="sweProfilePushEnable52" class="swe-pref-push-button">Activer les notifications</button></div></div><button type="button" class="primary" id="sweProfilePrefsSave52">💾 Enregistrer mes préférences</button><span id="sweProfilePrefsFeedback52" role="status"></span>';
 section.append(prefs);
 const preferencesSection=document.createElement('section');preferencesSection.id='swePlayerPreferencesTab52';preferencesSection.className='card';preferencesSection.dataset.playerSections='preferences';preferencesSection.style.setProperty('--player-order','3');preferencesSection.classList.toggle('swe-player-filtered',view.dataset.playerPanel!=='preferences');preferencesSection.append(prefs);section.after(preferencesSection);
 const theme=document.createElement('fieldset');theme.className='swe-profile-theme-choices';theme.innerHTML='<legend>🎨 Préférence d’affichage</legend><label><input type="radio" name="sweProfileTheme52" value="light"><span>☀️ <strong>Mode clair</strong><small>Thème lumineux et moderne</small></span></label><label><input type="radio" name="sweProfileTheme52" value="dark"><span>🌙 <strong>Mode sombre</strong><small>Pour plus de confort visuel</small></span></label>';prefs.insertBefore(theme,E('sweProfilePrefsSave52'));
 theme.querySelector('input[value="'+(document.documentElement.dataset.sweTheme==='dark'?'dark':'light')+'"]').checked=true;
 theme.addEventListener('change',e=>{if(e.target.name!=='sweProfileTheme52')return;const mode=e.target.value;try{localStorage.setItem('swe-theme',mode)}catch(_){}if(document.documentElement.dataset.sweTheme!==mode){const toggle=document.getElementById('sweThemeToggle');if(toggle)toggle.click();else document.documentElement.dataset.sweTheme=mode;}});
 const pushButton=E('sweProfilePushEnable52'),pushStatus=E('sweProfilePushStatus52');
 async function refreshPushPreferences(){
  if(!pushButton||!pushStatus)return;
  if(!('Notification'in window)||!('PushManager'in window)||!('serviceWorker'in navigator)){pushStatus.textContent='Notifications push indisponibles sur ce navigateur';pushButton.disabled=true;return}
  const registered=await navigator.serviceWorker.getRegistration().catch(()=>null);
  const subscription=await registered?.pushManager.getSubscription().catch(()=>null);
  const enabled=Notification.permission==='granted'&&!!subscription;
  pushStatus.textContent=enabled?'✓ Notifications activées sur cet appareil':Notification.permission==='denied'?'Notifications bloquées dans les réglages du navigateur':'Notifications désactivées sur cet appareil';
  pushButton.textContent=enabled?'✓ Déjà activées':'Activer les notifications';
  pushButton.disabled=enabled||Notification.permission==='denied';
 }
 pushButton.onclick=async()=>{pushButton.disabled=true;pushButton.textContent='Activation…';try{
  if(typeof window.SWEEnablePushNotifications!=='function')throw Error('Module de notifications indisponible');
  await window.SWEEnablePushNotifications();
  localStorage.setItem('swe_push_enabled_device_v1','1');
  pushStatus.textContent='✓ Notifications push activées';
 }catch(e){pushStatus.textContent=e?.message||'Activation impossible'}finally{await refreshPushPreferences()}};
 refreshPushPreferences();
 const profile=s.playerDashboard?.profile||{};E('sweProfileCatalog52').checked=!!profile.is_public&&!!profile.discoverable;E('sweProfileNotifications52').checked=!!profile.notify_upcoming_swes;
 E('sweProfilePrefsSave52').onclick=async()=>{const btn=E('sweProfilePrefsSave52');btn.disabled=true;const show=E('sweProfilePrefsFeedback52');const visible=E('sweProfileCatalog52').checked;const {error}=await sb.rpc('update_my_global_player_profile',{p_display_name:data.nickname||profile.display_name||'',p_is_public:visible,p_discoverable:visible,p_notify_upcoming_swes:E('sweProfileNotifications52').checked,p_home_area:profile.home_area||null});show.textContent=error?'Erreur : '+error.message:'✓ Préférences enregistrées';btn.disabled=false};
 }finally{waiting=false}
}
document.addEventListener('swe:rendered',render);document.addEventListener('swe:page-view',render);window.addEventListener('pageshow',()=>{stamp=0;render()});setInterval(()=>{if(document.visibilityState==='visible')render()},16000);
})();
(()=>{'use strict';
const E=id=>document.getElementById(id);let busy=false,lastPoll=0;
function state(){try{return S}catch(_){return null}}

async function enablePush(){
 if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw Error('Push non disponible sur cet appareil');
 if(!state()?.session?.user?.id)throw Error('Connexion nécessaire');
 const response=await fetch('https://fbppesfxkvledwjemwsn.supabase.co/functions/v1/swe-push');
 if(!response.ok)throw Error('Service push indisponible');
 const config=await response.json();
 if(!config.enabled||!config.publicKey)throw Error('Clés push non configurées');
 const permission=await Notification.requestPermission();
 if(permission!=='granted')throw Error('Autorisation non accordée');
 const reg=await navigator.serviceWorker.ready;
 const base64=config.publicKey.replace(/-/g,'+').replace(/_/g,'/');
 const bytes=Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length/4)*4,'=')),char=>char.charCodeAt(0));
 let sub=await reg.pushManager.getSubscription();
 if(sub?.options?.applicationServerKey&&String(Array.from(new Uint8Array(sub.options.applicationServerKey)))!==String(Array.from(bytes))){
  await sub.unsubscribe();sub=null;
 }
 if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
 const json=sub.toJSON();
 const result=await sb.rpc('swe_save_push_subscription',{p_endpoint:json.endpoint,p_p256dh:json.keys.p256dh,p_auth:json.keys.auth});
 if(result.error)throw Error(result.error.message);
}


let promptShowing=false;
async function offerPushOnLogin(){
 const s=state(),uid=s?.session?.user?.id;
 if(!uid||s.publicMode||!s.workspace?.id||promptShowing||E('swePushFirstLoginDialog'))return;
 if(!('Notification'in window)||!('PushManager'in window)||!('serviceWorker'in navigator))return;
 const key='swe_push_first_login_offer_20261018:'+uid;
 if(localStorage.getItem(key))return;
 if(Notification.permission==='denied'){localStorage.setItem(key,'blocked');return}
 if(Notification.permission==='granted'){
  const reg=await navigator.serviceWorker.ready.catch(()=>null);
  const sub=await reg?.pushManager.getSubscription().catch(()=>null);
  if(sub){localStorage.setItem(key,'already_enabled');return}
 }
 promptShowing=true;
 const overlay=document.createElement('div');
 overlay.id='swePushFirstLoginDialog';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-label','Activer les notifications SWÉ');
 overlay.style.cssText='position:fixed;inset:0;z-index:2147483600;background:rgba(4,15,29,.68);display:flex;align-items:center;justify-content:center;padding:20px';
 const panel=document.createElement('div');
 panel.style.cssText='background:#fff;color:#102f49;border-radius:20px;padding:24px;max-width:390px;width:100%;box-shadow:0 18px 60px #0005;font:inherit';
 const title=document.createElement('h2');title.textContent='🔔 Activer les notifications SWÉ ?';
 const info=document.createElement('p');info.textContent='Reçois les informations de ton équipe, tes matchs et les annonces importantes, même lorsque ton téléphone est verrouillé.';
 const actions=document.createElement('div');actions.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin-top:20px';
 const yes=document.createElement('button');yes.type='button';yes.textContent='Activer les notifications';yes.className='primary';
 const later=document.createElement('button');later.type='button';later.textContent='Plus tard';
 const feedback=document.createElement('p');feedback.style.cssText='font-size:13px;margin-top:10px';
 const close=()=>{overlay.remove();promptShowing=false};
 later.onclick=()=>{localStorage.setItem(key,'later');close()};
 yes.onclick=async()=>{
  yes.disabled=true;yes.textContent='Activation…';
  try{
   await enablePush();
   localStorage.setItem('swe_push_enabled_device_v1','1');
   localStorage.setItem(key,'enabled');
   close();check();
  }catch(err){
   feedback.textContent=err?.message||'Activation impossible, réessaie depuis l’accueil.';
   yes.disabled=false;yes.textContent='Réessayer';
   if(Notification.permission==='denied'){localStorage.setItem(key,'blocked');yes.disabled=true}
  }
 };
 actions.append(yes,later);panel.append(title,info,actions,feedback);overlay.append(panel);document.body.append(overlay);
 yes.focus();
}
function schedulePushOffer(){offerPushOnLogin().catch(e=>console.warn('SWÉ push opt-in',e))}

window.SWEEnablePushNotifications=enablePush;

async function check(force=false){
const s=state();if(!s?.session?.user?.id||s.publicMode||busy)return;
if(!force&&Date.now()-lastPoll<20000)return;busy=true;lastPoll=Date.now();
try{
 const uid=s.session.user.id,key='swe_org_notification_seen_v54:'+uid,stored=localStorage.getItem(key),after=Number(stored)||0;
 const {data,error}=await sb.rpc('my_swe_organizer_notifications_v54',{p_after_id:0});if(error)throw error;
 const allItems=Array.isArray(data)?data:[];
 const items=allItems.filter(n=>Number(n.id)>after);
 const manager=['admin','coorganizer'].includes(s.workspace?.role);
 const playerHome=E('view-myplayer');
 const usePlayerHome=!!playerHome?.classList.contains('active')&&!E('main')?.classList.contains('hidden');
 const root=manager?E('sweNotificationsContainer'):(usePlayerHome?playerHome:null);
 const dedicated=manager&&!!E('view-notifications')?.classList.contains('active');
 const badge=E('sweNotificationsUnreadBadge');
 if(badge){
   const unseen=Math.max(0,items.length);
   badge.textContent=unseen>99?'99+':String(unseen);
   badge.classList.toggle('hidden',unseen===0||dedicated);
 }
 if(root){let card=E('sweOrganizerNotificationsV54');if(!card){card=document.createElement('section');card.id='sweOrganizerNotificationsV54';card.className=manager?'swe-notifications-content':'card swe-notifications-home-card';root.append(card)}else if(card.parentElement!==root){root.append(card)}
 // Player notifications are a separate dashboard section, never nested inside Mes SWÉs.
 if(!manager){card.dataset.playerSections='home mine';card.style.setProperty('--player-order','24');card.classList.toggle('swe-player-filtered',playerHome?.dataset.playerPanel!=='home'&&playerHome?.dataset.playerPanel!=='mine');}
 else{delete card.dataset.playerSections;card.style.removeProperty('--player-order');card.classList.remove('swe-player-filtered');}
 let heading=card.querySelector('h2');if(!heading&&!manager){heading=document.createElement('h2');heading.textContent='🔔 Mes notifications SWÉ';card.prepend(heading)}
 if(heading&&manager)heading.remove();
 let button=E('sweEnableNotificationsV54');if(!button){button=document.createElement('button');button.type='button';button.id='sweEnableNotificationsV54';card.append(button);button.onclick=async()=>{button.disabled=true;button.textContent='Activation…';try{await enablePush();button.textContent='✓ Notifications push activées';localStorage.setItem('swe_push_enabled_device_v1','1')}catch(e){button.textContent=e.message||'Activation impossible'}finally{button.disabled=false}};}
 button.textContent=!('PushManager'in window)?'Notifications push non prises en charge':(Notification.permission==='granted'&&localStorage.getItem('swe_push_enabled_device_v1')==='1')?'✓ Notifications push activées':Notification.permission==='granted'?'Activer les notifications push':'Autoriser les notifications sur cet appareil';
 let box=E('sweOrganizerNotificationsListV54');if(!box){box=document.createElement('div');box.id='sweOrganizerNotificationsListV54';card.append(box)}
 box.replaceChildren();
 for(const n of allItems.slice(-12).reverse()){const p=document.createElement('p');p.className='swe-notification-entry';const title=document.createElement('strong');title.textContent=n.title||'Notification SWÉ';const body=document.createElement('span');body.textContent=n.body||'';p.append(title,body);box.append(p)}
 // Recent withdrawals are private player-management information, not homepage content.
 E('sweHomeLateWithdrawalsV1')?.remove();

 if(!allItems.length)box.textContent='Aucune notification pour le moment. Les prochaines inscriptions et informations de matchs apparaîtront ici.';
 }
 if(dedicated&&items.length){
   localStorage.setItem(key,String(Math.max(...items.map(n=>Number(n.id)||0))));
   if(badge)badge.classList.add('hidden');
 }
 // Browser notifications are exclusively sent by swe-push and received by sw.js.
 // Replaying history here caused duplicate/late alerts when revisiting the app.
}catch(e){console.warn('SWÉ notifications',e)}finally{busy=false}
}
window.addEventListener('pageshow',()=>{check(true);schedulePushOffer()});document.addEventListener('swe:rendered',()=>{check();schedulePushOffer()});document.addEventListener('swe:page-view',()=>{if(E('view-notifications')?.classList.contains('active'))check(true)});setInterval(()=>{if(document.visibilityState==='visible')check()},30000);
})();
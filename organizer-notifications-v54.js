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

async function check(){
const s=state();if(!s?.session?.user?.id||s.publicMode||busy)return;
if(Date.now()-lastPoll<20000)return;busy=true;lastPoll=Date.now();
try{
 const uid=s.session.user.id,key='swe_org_notification_seen_v54:'+uid,stored=localStorage.getItem(key),after=Number(stored)||0;
 const {data,error}=await sb.rpc('my_swe_organizer_notifications_v54',{p_after_id:after});if(error)throw error;
 const items=Array.isArray(data)?data:[];
 const playerHome=E('view-myplayer');const usePlayerHome=!!playerHome?.classList.contains('active')&&!E('main')?.classList.contains('hidden');const root=usePlayerHome?(E('swePlayerMine')||playerHome):E('view-home');if(root){let card=E('sweOrganizerNotificationsV54');if(!card){card=document.createElement('section');card.id='sweOrganizerNotificationsV54';card.className='card swe-notifications-home-card';root.prepend(card)}else if(card.parentElement!==root){root.prepend(card)}
 let heading=card.querySelector('h2');if(!heading){heading=document.createElement('h2');heading.textContent='🔔 Mes notifications SWÉ';card.append(heading)}
 let button=E('sweEnableNotificationsV54');if(!button){button=document.createElement('button');button.type='button';button.id='sweEnableNotificationsV54';card.append(button);button.onclick=async()=>{button.disabled=true;button.textContent='Activation…';try{await enablePush();button.textContent='✓ Notifications push activées';localStorage.setItem('swe_push_enabled_device_v1','1')}catch(e){button.textContent=e.message||'Activation impossible'}finally{button.disabled=false}};}
 button.textContent=!('PushManager'in window)?'Notifications push non prises en charge':(Notification.permission==='granted'&&localStorage.getItem('swe_push_enabled_device_v1')==='1')?'✓ Notifications push activées':Notification.permission==='granted'?'Activer les notifications push':'Autoriser les notifications sur cet appareil';
 let box=E('sweOrganizerNotificationsListV54');if(!box){box=document.createElement('div');box.id='sweOrganizerNotificationsListV54';card.append(box)}
 if(items.length)for(const n of [...items].reverse()){const p=document.createElement('p');p.textContent=n.title+' — '+n.body;box.prepend(p)}
 if(!items.length&&!box.childElementCount)box.textContent='Ici, tu retrouveras les inscriptions, les informations de tes matchs et les alertes de ton SWÉ.';
 }
 if(items.length){const high=Math.max(...items.map(n=>Number(n.id)||0));if(high>after)localStorage.setItem(key,String(high));
 if(stored&&Notification.permission==='granted'){
 const reg=await navigator.serviceWorker?.ready.catch(()=>null);
 for(const item of items.slice(0,5).reverse())if(reg)await reg.showNotification(item.title,{body:item.body,tag:'swe-'+item.id,icon:'/icon-192.png',badge:'/icon-192.png',data:{url:'/?start=home'}});
 }}
}catch(e){console.warn('SWÉ notifications',e)}finally{busy=false}
}
window.addEventListener('pageshow',()=>{check();schedulePushOffer()});document.addEventListener('swe:rendered',()=>{check();schedulePushOffer()});setInterval(()=>{if(document.visibilityState==='visible')check()},30000);
})();
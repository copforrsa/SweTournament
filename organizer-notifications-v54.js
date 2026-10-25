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


function ensureNotificationsCenter(){
 let panel=E('sweNotificationsCenterV54');
 if(panel){const bell=E('sweNotificationsBellV54');const nav=document.querySelector('.tabs');if(nav&&bell&&bell.parentElement!==nav)nav.append(bell);return panel;}
 const style=document.createElement('style');
 style.textContent=`
 #sweNotificationsBellV54{border:0;border-radius:10px;background:#123855;color:#fff;padding:12px 14px;font-weight:700;cursor:pointer;width:100%;text-align:left}
 #sweNotificationsBellV54 .swe-count{display:inline-block;background:#df3352;color:#fff;border-radius:14px;padding:2px 7px;margin-left:6px}
 #sweNotificationsCenterV54{position:fixed;inset:0;z-index:2050;background:rgba(5,22,36,.72);padding:16px;display:none;align-items:center;justify-content:center}
 #sweNotificationsCenterV54.swe-open{display:flex}
 #sweNotificationsCenterV54 .swe-notif-sheet{position:relative;background:#fff;color:#102d46;width:min(750px,100%);max-height:88dvh;overflow-y:auto;border-radius:18px;padding:24px;box-shadow:0 20px 70px #0005}
 #sweNotificationsCenterV54 .swe-notif-close{float:right;border:0;border-radius:10px;padding:9px 13px;cursor:pointer;background:#edf2f5}
 #sweOrganizerNotificationsListV54{display:grid;gap:9px;margin-top:14px}
 #sweOrganizerNotificationsListV54 p{margin:0;padding:10px 12px;border-radius:9px;background:#f2f6f8;border-left:3px solid #0b6693;line-height:1.45}
 `;
 document.head.append(style);
 const bell=document.createElement('button');bell.type='button';bell.id='sweNotificationsBellV54';bell.textContent='🔔 Profil pro · Notifications';bell.setAttribute('aria-label','Ouvrir les notifications du profil organisateur');
 panel=document.createElement('div');panel.id='sweNotificationsCenterV54';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Mes notifications SWÉ');
 const sheet=document.createElement('div');sheet.className='swe-notif-sheet';
 const close=document.createElement('button');close.type='button';close.className='swe-notif-close';close.textContent='✕ Fermer';
 const card=document.createElement('section');card.id='sweOrganizerNotificationsV54';card.className='card';
 sheet.append(close,card);panel.append(sheet);const nav=document.querySelector('.tabs');if(nav)nav.append(bell);else document.body.append(bell);document.body.append(panel);
 const shut=()=>{panel.classList.remove('swe-open');bell.focus()};
 bell.onclick=()=>{panel.classList.add('swe-open');bell.querySelector('.swe-count')?.remove();close.focus()};
 close.onclick=shut;panel.onclick=e=>{if(e.target===panel)shut()};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('swe-open'))shut()});
 return panel;
}

window.SWEEnablePushNotifications=enablePush;

async function check(){
const s=state();if(!s?.session?.user?.id||s.publicMode||!s.workspace?.id||busy)return;
if(Date.now()-lastPoll<20000)return;busy=true;lastPoll=Date.now();
try{
 const uid=s.session.user.id,key='swe_org_notification_seen_v54:'+uid,stored=localStorage.getItem(key),after=Number(stored)||0;
 const {data,error}=await sb.rpc('my_swe_organizer_notifications_v54',{p_after_id:after});if(error)throw error;
 const items=Array.isArray(data)?data:[];
 ensureNotificationsCenter();
 const card=E('sweOrganizerNotificationsV54');
 if(card){
  let heading=card.querySelector('h2');if(!heading){heading=document.createElement('h2');heading.textContent='🔔 Mes notifications SWÉ';card.append(heading)}
  let button=E('sweEnableNotificationsV54');
  if(!button){button=document.createElement('button');button.type='button';button.id='sweEnableNotificationsV54';card.append(button);button.onclick=async()=>{button.disabled=true;button.textContent='Activation…';try{await enablePush();button.textContent='✓ Notifications push activées';localStorage.setItem('swe_push_enabled_device_v1','1')}catch(e){button.textContent=e.message||'Activation impossible'}finally{button.disabled=false}}}
  button.textContent=!('PushManager'in window)?'Notifications push non prises en charge':(Notification.permission==='granted'&&localStorage.getItem('swe_push_enabled_device_v1')==='1')?'✓ Notifications push activées':Notification.permission==='granted'?'Activer les notifications push':'Autoriser les notifications sur cet appareil';
  let box=E('sweOrganizerNotificationsListV54');if(!box){box=document.createElement('div');box.id='sweOrganizerNotificationsListV54';card.append(box)}
  const historyKey='swe_org_notification_history_v54:'+uid+':'+s.workspace.id;
  let history=[];try{const saved=JSON.parse(localStorage.getItem(historyKey)||'[]');if(Array.isArray(saved))history=saved}catch(_){}
  const known=new Map(history.map(n=>[String(n.id),n]));
  for(const n of items)known.set(String(n.id),{id:n.id,title:String(n.title||''),body:String(n.body||'')});
  history=[...known.values()].sort((a,b)=>Number(b.id)-Number(a.id)).slice(0,150);
  try{localStorage.setItem(historyKey,JSON.stringify(history))}catch(_){}
  box.replaceChildren();
  if(history.length)for(const n of history){const p=document.createElement('p');p.textContent=n.title+' — '+n.body;box.append(p)}
  else box.textContent='Les nouvelles inscriptions et ouvertures du salon apparaîtront ici.';
  const bell=E('sweNotificationsBellV54');
  if(bell&&items.length&&!E('sweNotificationsCenterV54')?.classList.contains('swe-open')){
   let count=bell.querySelector('.swe-count');if(!count){count=document.createElement('span');count.className='swe-count';bell.append(count)}
   count.textContent=String(Math.min(items.length,99));
  }
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
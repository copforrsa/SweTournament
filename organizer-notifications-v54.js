(()=>{'use strict';
const E=id=>document.getElementById(id);let busy=false,lastPoll=0;
function state(){try{return S}catch(_){return null}}
async function check(){
const s=state();if(!s?.session?.user?.id||s.publicMode||!['admin','coorganizer'].includes(s.workspace?.role)||busy)return;
if(Date.now()-lastPoll<20000)return;busy=true;lastPoll=Date.now();
try{
 const uid=s.session.user.id,key='swe_org_notification_seen_v54:'+uid,stored=localStorage.getItem(key),after=Number(stored)||0;
 const {data,error}=await sb.rpc('my_swe_organizer_notifications_v54',{p_after_id:after});if(error)throw error;
 const items=Array.isArray(data)?data:[];
 const root=E('view-home');if(root){let card=E('sweOrganizerNotificationsV54');if(!card){card=document.createElement('section');card.id='sweOrganizerNotificationsV54';card.className='card';root.prepend(card)}
 let heading=card.querySelector('h2');if(!heading){heading=document.createElement('h2');heading.textContent='🔔 Notifications de mon SWÉ';card.append(heading)}
 let button=E('sweEnableNotificationsV54');if(!button){button=document.createElement('button');button.type='button';button.id='sweEnableNotificationsV54';card.append(button);button.onclick=async()=>{if(!('Notification'in window)){button.textContent='Notifications non prises en charge';return}const result=await Notification.requestPermission();button.textContent=result==='granted'?'✓ Notifications autorisées':'Notifications refusées';}}
 button.textContent=!('Notification'in window)?'Notifications non prises en charge':Notification.permission==='granted'?'✓ Notifications autorisées':'Autoriser les notifications sur cet appareil';
 let box=E('sweOrganizerNotificationsListV54');if(!box){box=document.createElement('div');box.id='sweOrganizerNotificationsListV54';card.append(box)}
 if(items.length)for(const n of [...items].reverse()){const p=document.createElement('p');p.textContent=n.title+' — '+n.body;box.prepend(p)}
 if(!items.length&&!box.childElementCount)box.textContent='Les nouvelles inscriptions et ouvertures du salon apparaîtront ici.';
 }
 if(items.length){const high=Math.max(...items.map(n=>Number(n.id)||0));if(high>after)localStorage.setItem(key,String(high));
 if(stored&&Notification.permission==='granted'){
 const reg=await navigator.serviceWorker?.ready.catch(()=>null);
 for(const item of items.slice(0,5).reverse())if(reg)await reg.showNotification(item.title,{body:item.body,tag:'swe-'+item.id,icon:'/icon-192.png',badge:'/icon-192.png',data:{url:'/?start=home'}});
 }}
}catch(e){console.warn('SWÉ notifications',e)}finally{busy=false}
}
window.addEventListener('pageshow',check);document.addEventListener('swe:rendered',check);setInterval(()=>{if(document.visibilityState==='visible')check()},30000);
})();
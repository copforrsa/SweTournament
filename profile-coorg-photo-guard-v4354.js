(()=>{
'use strict';
if(window.__SWE_PROFILE_COORG_PHOTO_GUARD_4354)return;window.__SWE_PROFILE_COORG_PHOTO_GUARD_4354=true;
const E=id=>document.getElementById(id);
function st(){try{return typeof S!=='undefined'?S:null}catch(_){return null}}
function isCoorg(){return String(st()?.workspace?.role||'').toLowerCase()==='coorganizer'}
function css(){if(E('sweProfileGuard4354Css'))return;const s=document.createElement('style');s.id='sweProfileGuard4354Css';s.textContent=`
#swe4338PhotoBtn.swe-photo-hidden{display:none!important}
#swe4354CoorgStop{display:none!important}
`;document.head.appendChild(s)}
function applyCoorgCreateGuard(){
 const bar=E('swe4348ProfileActions');if(!bar)return;
 const btn=E('swe4348SimpleBtn');let stop=E('swe4354CoorgStop');
 if(isCoorg()){
   if(btn)btn.style.setProperty('display','none','important');
   stop?.remove();
 }else{
   if(btn)btn.style.removeProperty('display');
   stop?.remove();
 }
}
function applyPhotoVisibility(){
 const btn=E('swe4338PhotoBtn');if(!btn)return;
 const editing=!!E('swe4321Cancel');
 // The commercial pilot group lets co-managers manage their own SWÉ photo
 // directly from their workspace; the RPC still only updates their own profile.
 const pilotCoorg=isCoorg()&&String(st()?.workspace?.id||'')==='3a7b90b2-46a1-4125-9e6b-f580455b5cdb';
 const visible=editing||pilotCoorg;
 btn.classList.toggle('swe-photo-hidden',!visible);
 btn.setAttribute('aria-hidden',visible?'false':'true');
 if(visible)btn.textContent=(st()?.playerDashboard?.profile?.avatar_url?'Modifier ma photo':'Ajouter ma photo');
}
function apply(){css();applyCoorgCreateGuard();applyPhotoVisibility()}
document.addEventListener('click',e=>{
 if(e.target.closest?.('#swe4321Edit,#swe4321Cancel,#swe4321Save'))setTimeout(apply,40);
},true);
let timer;const soon=()=>{clearTimeout(timer);timer=setTimeout(apply,80)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',soon,{once:true});else soon();
document.addEventListener('swe:rendered',soon);document.addEventListener('swe:player-profile-updated',soon);window.addEventListener('pageshow',soon);
const obs=new MutationObserver(()=>soon());
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>obs.observe(document.body,{subtree:true,childList:true}),{once:true});else obs.observe(document.body,{subtree:true,childList:true});
setTimeout(apply,1400);setTimeout(apply,2200);
})();

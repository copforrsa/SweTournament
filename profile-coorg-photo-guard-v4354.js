(()=>{
'use strict';
if(window.__SWE_PROFILE_COORG_PHOTO_GUARD_4354)return;window.__SWE_PROFILE_COORG_PHOTO_GUARD_4354=true;
const E=id=>document.getElementById(id);
function st(){try{return typeof S!=='undefined'?S:null}catch(_){return null}}
function isCoorg(){return String(st()?.workspace?.role||'').toLowerCase()==='coorganizer'}
function css(){if(E('sweProfileGuard4354Css'))return;const s=document.createElement('style');s.id='sweProfileGuard4354Css';s.textContent=`
#swe4338PhotoBtn.swe-photo-hidden{display:none!important}
#swe4348ProfileActions .swe4354-coorg-stop{display:flex;align-items:flex-start;gap:9px;max-width:430px;padding:10px 12px;border-radius:12px;background:#fff3f2;border:1px solid #efb5b0;color:#8b2e28;font-size:12px;font-weight:800;line-height:1.4}
#swe4348ProfileActions .swe4354-coorg-stop strong{display:block;color:#7d211d;margin-bottom:2px}
#swe4348ProfileActions .swe4354-stop-ico{font-size:18px;line-height:1.1;flex:0 0 auto}
@media(max-width:720px){#swe4348ProfileActions .swe4354-coorg-stop{width:100%;max-width:none}}
`;document.head.appendChild(s)}
function applyCoorgCreateGuard(){
 const bar=E('swe4348ProfileActions');if(!bar)return;
 const btn=E('swe4348SimpleBtn');let stop=E('swe4354CoorgStop');
 if(isCoorg()){
   if(btn)btn.style.setProperty('display','none','important');
   if(!stop){stop=document.createElement('div');stop.id='swe4354CoorgStop';stop.className='swe4354-coorg-stop';stop.innerHTML='<span class="swe4354-stop-ico">🛑</span><span><strong>Création de SWÉ indisponible en mode co-gestionnaire</strong>Cette fonction est disponible depuis ton profil joueur personnel ou ton espace organisateur, mais pas depuis un accès co-gestionnaire.</span>';bar.prepend(stop)}
 }else{
   if(btn)btn.style.removeProperty('display');
   stop?.remove();
 }
}
function applyPhotoVisibility(){
 const btn=E('swe4338PhotoBtn');if(!btn)return;
 const editing=!!E('swe4321Cancel');
 btn.classList.toggle('swe-photo-hidden',!editing);
 btn.setAttribute('aria-hidden',editing?'false':'true');
 if(editing)btn.textContent=(st()?.playerDashboard?.profile?.avatar_url?'Modifier ma photo':'Ajouter ma photo');
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

(()=>{
'use strict';
if(window.__SWE_MOBILE_COORG_RIGHTS_4362)return;window.__SWE_MOBILE_COORG_RIGHTS_4362=true;
const MOBILE='(max-width: 760px)';
const isMobile=()=>matchMedia(MOBILE).matches;
const profileViews=new Set(['profile','player-profile','playerprofile','myplayer','my-profile','my_profile']);
const createViews=new Set(['simple-swe','simple-swe-page','simple_swe','create-swe']);
function css(){
 if(document.getElementById('sweMobileCoorgRights4362Css'))return;
 const s=document.createElement('style');s.id='sweMobileCoorgRights4362Css';s.textContent=`
@media(max-width:760px){
 .tabs button.swe-mobile-right-denied{position:relative!important;opacity:.38!important;filter:grayscale(.85)!important;background:#edf2f7!important;color:#7c8998!important;box-shadow:none!important;cursor:not-allowed!important}
 .tabs button.swe-mobile-right-denied:after{content:'🔒'!important;position:absolute!important;right:5px!important;top:4px!important;font-size:8px!important;margin:0!important}
 .tabs button.swe-mobile-right-denied.active{background:#edf2f7!important;color:#7c8998!important;box-shadow:none!important}
}
`;
 document.head.appendChild(s);
}
function coorg(){try{return typeof isCoorg==='function'?!!isCoorg():S?.workspace?.role==='coorganizer'}catch(_){return false}}
function tempAdmin(){try{return typeof hasTemporaryAdmin==='function'?!!hasTemporaryAdmin():false}catch(_){return false}}
function perms(){try{return S?.myPermissions||{}}catch(_){return {}}}
function viewKey(btn){return String(btn?.dataset?.view||'').trim().toLowerCase()}
function allowed(view){
 if(view==='home'||profileViews.has(view))return true;
 if(tempAdmin())return view!=='permissions';
 const p=perms();
 if(createViews.has(view))return !!p.can_create_tournaments;
 if(view==='players')return !!(p.can_view_players||p.can_add_members||p.can_delete_members||p.can_edit_player_personal_info||p.can_generate_team_codes);
 if(view==='matches')return !!p.can_enter_scores;
 if(view==='tournaments')return !!p.can_create_tournaments;
 if(view==='teams')return !!p.can_generate_teams;
 if(view==='permissions')return false;
 if(view==='league'||view==='cooler'||view==='third-half'||view==='glaciere'||view==='ranking'||view==='rankings')return false;
 return false;
}
function deny(btn){
 btn.classList.add('swe-mobile-right-denied');
 btn.setAttribute('aria-disabled','true');
 btn.title='Non autorisé par l’administrateur';
 if(!btn.disabled){btn.dataset.sweMobileRightsOwnDisabled='1';btn.disabled=true}
}
function permit(btn){
 btn.classList.remove('swe-mobile-right-denied');
 if(btn.dataset.sweMobileRightsOwnDisabled==='1'){
   delete btn.dataset.sweMobileRightsOwnDisabled;
   if(!btn.classList.contains('disabled-tab'))btn.disabled=false;
 }
 if(!btn.classList.contains('swe-right-disabled')&&!btn.classList.contains('disabled-tab')){
   btn.setAttribute('aria-disabled','false');
   if(btn.title==='Non autorisé par l’administrateur')btn.removeAttribute('title');
 }
}
function apply(){
 css();
 if(!isMobile())return cleanup();
 if(!coorg())return cleanup();
 document.querySelectorAll('.tabs button[data-view],.tabs .tab[data-view]').forEach(btn=>{
   const view=viewKey(btn);allowed(view)?permit(btn):deny(btn);
 });
 const active=document.querySelector('.tabs button.active[data-view],.tabs .tab.active[data-view]');
 if(active&&!allowed(viewKey(active))){
   const home=document.querySelector('.tabs button[data-view="home"],.tabs .tab[data-view="home"]');
   if(home&&!home.disabled)home.click();
 }
}
function cleanup(){
 document.querySelectorAll('.tabs .swe-mobile-right-denied').forEach(btn=>permit(btn));
}
function toastDenied(){
 let t=document.getElementById('sweMobileRightsToast4362');
 if(!t){
   t=document.createElement('div');t.id='sweMobileRightsToast4362';
   t.style.cssText='position:fixed;z-index:12000;left:50%;top:max(14px,env(safe-area-inset-top));transform:translateX(-50%);padding:10px 14px;border-radius:12px;background:#10213f;color:#fff;font-weight:850;box-shadow:0 10px 28px rgba(0,0,0,.22);display:none;max-width:92vw;text-align:center';
   t.textContent='Cet onglet n’est pas autorisé pour ton profil co-gestionnaire.';document.body.appendChild(t);
 }
 t.style.display='block';clearTimeout(t._timer);t._timer=setTimeout(()=>t.style.display='none',2100);
}
function guard(e){
 if(!isMobile()||!coorg())return;
 const btn=e.target?.closest?.('.tabs button[data-view],.tabs .tab[data-view]');
 if(!btn)return;
 const denied=btn.classList.contains('swe-mobile-right-denied')||!allowed(viewKey(btn));
 if(!denied)return;
 if(e.cancelable)e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();deny(btn);
 if(e.type==='click')toastDenied();
}
['pointerdown','touchstart','click'].forEach(type=>document.addEventListener(type,guard,{capture:true,passive:false}));
let resizeTimer=null;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(apply,90)});
window.addEventListener('pageshow',()=>setTimeout(apply,120));
document.addEventListener('swe:rendered',()=>setTimeout(apply,60));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(apply,120)});
[0,180,450,900,1600,2800,4500].forEach(ms=>setTimeout(apply,ms));
})();

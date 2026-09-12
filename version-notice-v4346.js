(()=>{
'use strict';
if(window.__SWE_VERSION_NOTICE_4379)return;window.__SWE_VERSION_NOTICE_4379=true;
const BUILD=window.SWE_BUILD_VERSION,KEY='swe-version-seen';
function css(){if(document.getElementById('sweVersionNoticeCss'))return;const s=document.createElement('style');s.id='sweVersionNoticeCss';s.textContent=`
#sweVersionNotice{position:fixed;right:18px;bottom:18px;z-index:10050;display:flex;align-items:center;gap:10px;background:#0b2b54;color:#fff;border:2px solid #f3c544;border-radius:16px;padding:12px 14px;box-shadow:0 14px 34px rgba(0,0,0,.24);font-weight:900;max-width:min(360px,calc(100vw - 24px));transition:.25s ease}#sweVersionNotice .dot{width:10px;height:10px;border-radius:50%;background:#25d366;box-shadow:0 0 0 5px rgba(37,211,102,.15)}#sweVersionNotice small{display:block;color:#d7e8f7;font-weight:700;margin-top:2px}#sweVersionNotice button{margin-left:auto;border:0;background:transparent;color:#fff;font-size:18px;cursor:pointer;padding:2px 4px}#sweVersionNotice.hide{opacity:0;transform:translateY(10px);pointer-events:none}.build-badge{position:relative}.build-badge.swe-new-build{background:#f3c544!important;color:#071a35!important;font-weight:950!important;box-shadow:0 0 0 4px rgba(243,197,68,.18)}@media(max-width:640px){#sweVersionNotice{right:12px;left:12px;bottom:94px}}
`;document.head.appendChild(s)}
function markBadge(isNew){window.SWEApplyBuild?.();document.querySelectorAll('.build-badge').forEach(b=>b.classList.toggle('swe-new-build',isNew));}
function show(){css();const previous=localStorage.getItem(KEY),isNew=previous!==BUILD;markBadge(isNew);if(!isNew)return;let n=document.getElementById('sweVersionNotice');if(!n){n=document.createElement('div');n.id='sweVersionNotice';document.body.appendChild(n)}n.innerHTML='<span class="dot"></span><div>Nouvelle version SWÉ <b>V'+BUILD+'</b><small>Droits des co-gestionnaires visibles et protégés sur mobile.</small></div><button type="button" aria-label="Fermer">×</button>';const close=()=>{localStorage.setItem(KEY,BUILD);markBadge(false);n.classList.add('hide');setTimeout(()=>n.remove(),300)};n.querySelector('button').onclick=close;setTimeout(close,9000)}
let checkedAt=0,checking=false;
async function checkLatest(){
 if(document.hidden||checking||Date.now()-checkedAt<60000)return;checkedAt=Date.now();checking=true;
 try{
  const response=await fetch('/build-version.js?check='+Date.now(),{cache:'no-store'});if(!response.ok)return;
  const source=await response.text(),latest=source.match(/SWE_BUILD_VERSION\s*=\s*['"](\d+\.\d+)['"]/)?.[1];
  if(!latest||latest===BUILD||document.getElementById('sweBuildRefresh'))return;
  const [major,minor]=latest.split('.').map(Number),[loadedMajor,loadedMinor]=BUILD.split('.').map(Number);if(major<loadedMajor||(major===loadedMajor&&minor<=loadedMinor))return;
  const panel=document.createElement('div');panel.id='sweBuildRefresh';panel.setAttribute('role','status');panel.style.cssText='position:fixed;bottom:18px;left:12px;right:12px;max-width:520px;margin:auto;padding:14px;background:#0b2b54;color:#fff;border:2px solid #f3c544;border-radius:14px;z-index:10060;display:flex;align-items:center;gap:12px';
  const label=document.createElement('span');label.textContent='Version '+latest+' disponible. Termine ta saisie, puis actualise.';
  const button=document.createElement('button');button.type='button';button.textContent='Actualiser';button.onclick=()=>{const u=new URL(location.href);u.searchParams.set('refresh',Date.now());location.replace(u.href);};panel.append(label,button);document.body.append(panel);
 }catch(_){}finally{checking=false;}
}
window.addEventListener('focus',checkLatest);window.addEventListener('pageshow',checkLatest);document.addEventListener('visibilitychange',checkLatest);setInterval(checkLatest,60000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{show();checkLatest();},{once:true});else{show();checkLatest();}window.addEventListener('pageshow',()=>setTimeout(show,100));
})();

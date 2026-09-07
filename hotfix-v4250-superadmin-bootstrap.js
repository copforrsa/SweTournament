(()=>{
'use strict';
let done=false;
function isSA(){try{if(typeof S!=='undefined'&&S.isSuperAdmin===true)return true}catch(_){}const p=document.getElementById('superAdminPanel');return !!p&&!p.classList.contains('hidden')}
function load(src,key){return new Promise(resolve=>{const old=document.querySelector(`script[data-swe-bootstrap="${key}"]`);if(old)return resolve();const s=document.createElement('script');s.src=src;s.async=false;s.dataset.sweBootstrap=key;s.onload=resolve;s.onerror=resolve;document.body.appendChild(s)})}
async function activate(){
  if(done||!isSA())return;
  done=true;
  // Le premier chargement peut avoir eu lieu avant que le statut Super Admin soit connu.
  // On rejoue une seule fois les modules une fois le rôle effectivement disponible.
  if(!document.getElementById('sweSa4250Side'))await load('./hotfix-v4250-superadmin.js?v=4250h','shell');
  await new Promise(r=>setTimeout(r,120));
  await load('./hotfix-v4250-superadmin-stable.js?v=4250d','router');
}
function probe(){if(!done)activate()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(probe,300),{once:true});else setTimeout(probe,300);
let n=0;const timer=setInterval(()=>{probe();if(done||++n>=40)clearInterval(timer)},250);
document.addEventListener('swe:rendered',probe);
window.addEventListener('pageshow',probe);
})();

(()=>{
'use strict';
const q=new URLSearchParams(location.search);
const invite=(q.get('invite')||'').trim();
const email=(q.get('email')||'').trim().toLowerCase();
if(!invite||!email)return;
let reloading=false;
const key='swe-invite-resume-'+invite;
function resumeOnce(){
  if(reloading)return;
  try{
    if(sessionStorage.getItem(key)==='1')return;
    sessionStorage.setItem(key,'1');
  }catch(_){}
  reloading=true;
  const u=new URL(location.href);
  u.searchParams.set('resume_invite','1');
  location.replace(u.toString());
}
async function verifyAndResume(){
  if(typeof sb==='undefined'||!sb?.auth?.getSession)return;
  try{
    const {data}=await sb.auth.getSession();
    const current=(data?.session?.user?.email||'').trim().toLowerCase();
    if(current!==email)return;
    const main=document.getElementById('main');
    const auth=document.getElementById('auth');
    if(main&&!main.classList.contains('hidden')){
      try{sessionStorage.removeItem(key)}catch(_){}
      return;
    }
    if(auth&&!auth.classList.contains('hidden'))setTimeout(resumeOnce,180);
  }catch(_){}
}
function wire(){
  if(typeof sb==='undefined'||!sb?.auth?.onAuthStateChange){setTimeout(wire,100);return;}
  sb.auth.onAuthStateChange((event,session)=>{
    const current=(session?.user?.email||'').trim().toLowerCase();
    if(event==='SIGNED_IN'&&current===email)setTimeout(resumeOnce,120);
  });
  setTimeout(verifyAndResume,900);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();

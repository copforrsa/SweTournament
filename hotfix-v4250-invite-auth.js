(()=>{
'use strict';
const P=new URLSearchParams(location.search);
const invite=(P.get('invite')||'').trim();
const invitedEmail=(P.get('email')||'').trim().toLowerCase();
if(!invite||!invitedEmail)return;
const E=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let sessionChecked=false;
function style(){if(E('sweInviteAuthStyle'))return;const s=document.createElement('style');s.id='sweInviteAuthStyle';s.textContent=`body.swe-invite-lock .auth-social-sep,body.swe-invite-lock .auth-social-grid{display:none!important}body.swe-invite-lock #email{background:#f3f6f4!important;color:#32443b!important;font-weight:750}#sweInviteAuthNotice{margin:10px 0;padding:11px 12px;border:1px solid #b9dec9;background:#f1faf5;border-radius:12px;color:#244b37;font-size:13px;line-height:1.45}#sweInviteAuthNotice b{color:#0e633b}`;document.head.appendChild(s)}
function paint(){
  style();document.body.classList.add('swe-invite-lock');
  const email=E('email');if(email){email.value=invitedEmail;email.readOnly=true;email.setAttribute('aria-readonly','true');email.title='Adresse imposée par l’invitation';}
  const social=[E('authGoogle'),E('authApple')];social.forEach(b=>{if(b){b.disabled=true;b.setAttribute('aria-disabled','true');}});
  const signup=E('signup');if(signup)signup.textContent='Définir mon mot de passe';
  const login=E('login');if(login)login.textContent='Se connecter avec cet e-mail';
  const landing=E('inviteLandingCard');if(landing)landing.classList.remove('hidden');
  const txt=E('inviteLandingText');if(txt)txt.innerHTML='Tu as été invité comme <b>co-organisateur</b>. Cette invitation est réservée à <b>'+esc(invitedEmail)+'</b>.';
  const card=E('loginCard');if(card&&!E('sweInviteAuthNotice')){const n=document.createElement('div');n.id='sweInviteAuthNotice';n.innerHTML='<b>Invitation sécurisée</b><br>Utilise uniquement <b>'+esc(invitedEmail)+'</b>. Si tu n’as pas encore de mot de passe SWÉ, saisis-en un puis clique sur <b>Définir mon mot de passe</b>. Tu recevras un e-mail de validation. Google et Apple sont désactivés pour cette invitation afin d’éviter de créer un autre compte.';const email=E('email');if(email)email.insertAdjacentElement('beforebegin',n);else card.prepend(n);}
}
function blockSocial(e){const b=e.target.closest?.('#authGoogle,#authApple');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(typeof toast==='function')toast('Cette invitation est liée à '+invitedEmail+'. Utilise cet e-mail et un mot de passe.');}
async function checkWrongSession(){
  if(sessionChecked||typeof sb==='undefined'||!sb?.auth?.getSession)return;sessionChecked=true;
  try{const {data}=await sb.auth.getSession();const current=(data?.session?.user?.email||'').trim().toLowerCase();if(current&&current!==invitedEmail){await sb.auth.signOut();document.body.classList.remove('swe-sa4250','swe-super48');E('main')?.classList.add('hidden');E('auth')?.classList.remove('hidden');paint();if(typeof toast==='function')toast('Invitation liée à '+invitedEmail+' : l’autre compte a été déconnecté.');}}
  catch(_){sessionChecked=false}
}
function wire(){if(window.__SWE_INVITE_AUTH_WIRED)return;window.__SWE_INVITE_AUTH_WIRED=true;document.addEventListener('click',blockSocial,true);document.addEventListener('input',e=>{if(e.target?.id==='email'&&e.target.value.trim().toLowerCase()!==invitedEmail)e.target.value=invitedEmail;},true);}
function boot(){paint();wire();checkWrongSession();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>setTimeout(boot,40));document.addEventListener('swe:rendered',()=>setTimeout(paint,0));
})();

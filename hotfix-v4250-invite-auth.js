(()=>{
'use strict';
const P=new URLSearchParams(location.search);
const invite=(P.get('invite')||'').trim();
const invitedEmail=(P.get('email')||'').trim().toLowerCase();
if(!invite||!invitedEmail)return;
const E=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let sessionChecked=false;
let authMode='checking';
function style(){if(E('sweInviteAuthStyle'))return;const s=document.createElement('style');s.id='sweInviteAuthStyle';s.textContent=`body.swe-invite-lock .auth-social-sep,body.swe-invite-lock .auth-social-grid{display:none!important}body.swe-invite-lock #email{background:#f3f6f4!important;color:#32443b!important;font-weight:750}body.swe-invite-lock #forgotPassword{display:none!important}body.swe-invite-lock [data-swe-invite-hide="1"]{display:none!important}#sweInviteAuthNotice{margin:10px 0;padding:11px 12px;border:1px solid #b9dec9;background:#f1faf5;border-radius:12px;color:#244b37;font-size:13px;line-height:1.45}#sweInviteAuthNotice b{color:#0e633b}`;document.head.appendChild(s)}
function hideOrganizerOffers(){
  const nodes=[...document.querySelectorAll('section,div,article')].filter(el=>{
    const t=(el.textContent||'').replace(/\s+/g,' ').trim();
    return /Commence gratuitement/i.test(t)&&/Pour démarrer/i.test(t)&&(/Besoin ponctuel/i.test(t)||/À L.?UNITÉ/i.test(t));
  });
  if(!nodes.length)return;
  nodes.sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length);
  const target=nodes[0];if(target){target.dataset.sweInviteHide='1';target.style.display='none';}
}
function paint(){
  style();document.body.classList.add('swe-invite-lock');hideOrganizerOffers();
  const email=E('email');if(email){email.value=invitedEmail;email.readOnly=true;email.setAttribute('aria-readonly','true');email.title='Adresse imposée par l’invitation';}
  const social=[E('authGoogle'),E('authApple')];social.forEach(b=>{if(b){b.disabled=true;b.setAttribute('aria-disabled','true');}});
  const signup=E('signup');
  const password=E('password');
  if(signup){
    if(authMode==='checking'){signup.textContent='Vérification de l’invitation…';signup.disabled=true;}
    else if(authMode==='existing'){signup.textContent='Recevoir un lien pour créer mon mot de passe';signup.disabled=false;}
    else if(authMode==='new'){signup.textContent='Créer mon accès co-gestionnaire';signup.disabled=false;}
  }
  if(password&&authMode==='new')password.placeholder='Choisis ton mot de passe';
  const login=E('login');if(login)login.textContent='Se connecter avec cet e-mail';
  const landing=E('inviteLandingCard');if(landing)landing.classList.remove('hidden');
  const txt=E('inviteLandingText');if(txt)txt.innerHTML='Tu as été invité comme <b>co-organisateur</b>. Cette invitation est réservée à <b>'+esc(invitedEmail)+'</b>.';
  const card=E('loginCard');if(card){let n=E('sweInviteAuthNotice');if(!n){n=document.createElement('div');n.id='sweInviteAuthNotice';const emailEl=E('email');if(emailEl)emailEl.insertAdjacentElement('beforebegin',n);else card.prepend(n);}if(authMode==='existing')n.innerHTML='<b>Invitation sécurisée</b><br>Un compte SWÉ existe déjà pour <b>'+esc(invitedEmail)+'</b>. Connecte-toi avec cette adresse. Si tu n’as pas ou plus ton mot de passe, demande un lien pour en créer un nouveau. Google et Apple sont désactivés pour éviter d’utiliser un autre compte.';else if(authMode==='new')n.innerHTML='<b>Invitation sécurisée</b><br>Aucun compte SWÉ n’existe encore pour <b>'+esc(invitedEmail)+'</b>. Choisis un mot de passe puis clique sur <b>Créer mon accès co-gestionnaire</b>. Tu recevras ensuite l’e-mail de confirmation à cette adresse. Google et Apple sont désactivés pour éviter de créer un compte différent.';else n.innerHTML='<b>Invitation sécurisée</b><br>Vérification de l’adresse invitée…';}
}
function blockSocial(e){const b=e.target.closest?.('#authGoogle,#authApple');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(typeof toast==='function')toast('Cette invitation est liée à '+invitedEmail+'. Utilise cet e-mail.');}
async function sendPasswordLink(e){const b=e.target.closest?.('#signup');if(!b)return;if(authMode==='new')return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(authMode==='checking'){if(typeof toast==='function')toast('Vérification de l’invitation en cours.');return;}if(typeof sb==='undefined'||!sb?.auth?.resetPasswordForEmail){if(typeof toast==='function')toast('Service de mot de passe indisponible. Réessaie dans un instant.');return;}b.disabled=true;const redirectTo=location.origin+location.pathname+'?invite='+encodeURIComponent(invite)+'&email='+encodeURIComponent(invitedEmail);try{const {error}=await sb.auth.resetPasswordForEmail(invitedEmail,{redirectTo});if(error)throw error;if(typeof toast==='function')toast('Lien envoyé à '+invitedEmail+'. Ouvre-le pour créer ou réinitialiser ton mot de passe.');}catch(err){if(typeof toast==='function')toast(err?.message||'Impossible d’envoyer le lien pour le moment.');}finally{b.disabled=false;}}
async function loadInviteState(){
  if(typeof sb==='undefined'||!sb?.rpc){setTimeout(loadInviteState,120);return;}
  try{
    const {data,error}=await sb.rpc('get_coorganizer_invite_auth_state',{p_invite:invite,p_email:invitedEmail});
    if(error)throw error;
    if(!data?.valid){authMode='invalid';const b=E('signup');if(b)b.disabled=true;if(typeof toast==='function')toast('Invitation invalide ou déjà utilisée.');}
    else authMode=data.account_exists?'existing':'new';
  }catch(_){authMode='checking';setTimeout(loadInviteState,800);}
  paint();
}
async function checkWrongSession(){
  if(sessionChecked||typeof sb==='undefined'||!sb?.auth?.getSession)return;sessionChecked=true;
  try{const {data}=await sb.auth.getSession();const current=(data?.session?.user?.email||'').trim().toLowerCase();if(current&&current!==invitedEmail){await sb.auth.signOut();document.body.classList.remove('swe-sa4250','swe-super48');E('main')?.classList.add('hidden');E('auth')?.classList.remove('hidden');paint();if(typeof toast==='function')toast('Invitation liée à '+invitedEmail+' : l’autre compte a été déconnecté.');}}
  catch(_){sessionChecked=false}
}
function wire(){if(window.__SWE_INVITE_AUTH_WIRED)return;window.__SWE_INVITE_AUTH_WIRED=true;document.addEventListener('click',blockSocial,true);document.addEventListener('click',sendPasswordLink,true);document.addEventListener('input',e=>{if(e.target?.id==='email'&&e.target.value.trim().toLowerCase()!==invitedEmail)e.target.value=invitedEmail;},true);}
function boot(){paint();wire();checkWrongSession();loadInviteState();setTimeout(hideOrganizerOffers,150);setTimeout(hideOrganizerOffers,700);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>setTimeout(boot,40));document.addEventListener('swe:rendered',()=>setTimeout(paint,0));
})();
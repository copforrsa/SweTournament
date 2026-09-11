(()=>{
'use strict';
const P=new URLSearchParams(location.search);
const invite=(P.get('invite')||'').trim();
const invitedEmail=(P.get('email')||'').trim().toLowerCase();
if(!invite||!invitedEmail)return;
const E=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let authMode='checking',consentRequired=true,landedPlayer=false,generatedPassword='',busy=false,sessionChecked=false;

function style(){if(E('sweInviteAuthStyle'))return;const s=document.createElement('style');s.id='sweInviteAuthStyle';s.textContent=`
body.swe-invite-lock .auth-social-sep,body.swe-invite-lock .auth-social-grid,body.swe-invite-lock #forgotPassword,body.swe-invite-lock #inviteLandingCard{display:none!important}
body.swe-invite-lock #auth>*:not(.top):not(#loginCard):not(#resetPasswordCard){display:none!important}
body.swe-invite-lock #email{background:#f3f6f4!important;color:#32443b!important;font-weight:800}
body.swe-invite-lock #password{font-weight:900!important;letter-spacing:.06em}
body.swe-invite-lock #signupConsentRow{display:none!important}
#sweInviteAuthNotice{margin:10px 0;padding:12px 13px;border:1px solid #b9dec9;background:#f1faf5;border-radius:12px;color:#244b37;font-size:13px;line-height:1.5}
#sweInviteAuthNotice b{color:#0e633b}
body.swe-invite-lock #login,body.swe-invite-lock #signup{font-weight:900!important}
#sweGeneratedHint{margin-top:8px;font-size:12px;color:#5a6b61;line-height:1.4}
#swePasswordActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
#swePasswordActions button{flex:1;min-width:220px}
body.swe-invite-lock #inviteBox{border:2px solid #b9d8ff;background:#f5f9ff}
body.swe-invite-lock #inviteBox .sectiontitle{color:#0b2b54}
body.swe-invite-lock #inviteBox button.primary{background:linear-gradient(135deg,#176ee8,#11b8d5)!important;color:#fff!important;font-weight:900!important}
`;document.head.appendChild(s)}

function hideCommercial(){
 const byId=E('sweComplexHome4281');if(byId){byId.dataset.sweInviteHide='1';byId.style.display='none'}
 [...document.querySelectorAll('section,div,article')].forEach(el=>{const t=(el.textContent||'').replace(/\s+/g,' ').trim();if((/Commence gratuitement/i.test(t)&&/Pour démarrer/i.test(t))||(/POUR LES COMPLEXES DE FOOT/i.test(t)&&/Développez la fréquentation/i.test(t))){el.dataset.sweInviteHide='1';el.style.display='none'}})
}

function authCard(){return E('loginCard')}
function ensureNotice(){const card=authCard();if(!card)return null;let n=E('sweInviteAuthNotice');if(!n){n=document.createElement('div');n.id='sweInviteAuthNotice';const email=E('email');if(email)email.insertAdjacentElement('beforebegin',n);else card.prepend(n)}return n}
function ensureHint(){const p=E('password');if(!p)return null;let h=E('sweGeneratedHint');if(!h){h=document.createElement('div');h.id='sweGeneratedHint';p.insertAdjacentElement('afterend',h)}return h}

function paint(){
 style();document.body.classList.add('swe-invite-lock');hideCommercial();
 const email=E('email'),password=E('password'),login=E('login'),signup=E('signup'),notice=ensureNotice(),hint=ensureHint();
 if(email){email.value=invitedEmail;email.readOnly=true;email.setAttribute('aria-readonly','true')}
 if(E('signupConsent'))E('signupConsent').checked=true;
 [E('authGoogle'),E('authApple')].forEach(b=>{if(b){b.disabled=true;b.setAttribute('aria-disabled','true')}});
 if(authMode==='checking'){
   if(notice)notice.innerHTML='<b>Invitation sécurisée</b><br>Vérification de ton accès…';
   if(password){password.value='';password.style.display='none'}
   if(hint)hint.textContent='';
   if(login){login.textContent='Vérification…';login.disabled=true;login.style.display=''}
   if(signup)signup.style.display='none';
   return;
 }
 if(authMode==='invalid'){
   if(notice)notice.innerHTML='<b>Invitation indisponible</b><br>Cette invitation n’est plus valide ou a déjà été utilisée.';
   if(password)password.style.display='none';if(login)login.style.display='none';if(signup)signup.style.display='none';return;
 }
 if(!generatedPassword){
   if(notice)notice.innerHTML='<b>Invitation sécurisée</b><br>SWÉ va créer un <b>mot de passe sécurisé temporaire</b> pour <b>'+esc(invitedEmail)+'</b>. Tu pourras soit le garder, soit le remplacer immédiatement par le mot de passe de ton choix.';
   if(password){password.value='';password.style.display='none'}
   if(hint)hint.innerHTML='Aucun e-mail de réinitialisation n’est nécessaire : le changement se fait directement dans SWÉ.';
   if(login){login.style.display='';login.disabled=false;login.textContent='🔐 Préparer mon accès sécurisé'}
   if(signup)signup.style.display='none';
   return;
 }
 if(notice)notice.innerHTML='<b>Ton accès est prêt</b><br>Un mot de passe sécurisé a été généré pour ton compte. Tu peux le conserver ou le remplacer maintenant.';
 if(password){password.style.display='';password.type='text';password.readOnly=true;password.value=generatedPassword;password.autocomplete='off';password.title='Mot de passe temporaire généré par SWÉ'}
 if(hint)hint.innerHTML='Conserve-le dans un gestionnaire de mots de passe si tu choisis de le garder.';
 if(login){login.style.display='';login.disabled=false;login.textContent='Continuer avec ce mot de passe'}
 if(signup){signup.style.display='';signup.disabled=false;signup.textContent='Me connecter et changer mon mot de passe'}
}

async function prepareAccess(e){
 const b=e.target.closest?.('#login');if(!b||generatedPassword||authMode==='checking'||authMode==='invalid')return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(busy)return;busy=true;b.disabled=true;const old=b.textContent;b.textContent='Préparation…';
 try{
   const res=await fetch('https://fbppesfxkvledwjemwsn.supabase.co/functions/v1/prepare-coorganizer-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({invite,email:invitedEmail})});
   const out=await res.json().catch(()=>({}));if(!res.ok||!out?.password)throw new Error(out?.error||'Impossible de préparer cet accès');
   generatedPassword=String(out.password);paint();toast?.('Accès sécurisé prêt. Choisis si tu veux garder ou modifier ce mot de passe.');
 }catch(err){toast?.(err?.message||'Impossible de préparer l’accès.')}finally{busy=false;if(!generatedPassword){b.disabled=false;b.textContent=old}}
}

async function signInGenerated(){
 if(!generatedPassword)throw new Error('Prépare d’abord ton accès sécurisé.');
 const {error}=await sb.auth.signInWithPassword({email:invitedEmail,password:generatedPassword});if(error)throw error;
}
function connectedUrl(){return location.pathname+'?invite='+encodeURIComponent(invite)+'&email='+encodeURIComponent(invitedEmail)+'&invite_connected=1'}

async function keepGenerated(e){
 const b=e.target.closest?.('#login');if(!b||!generatedPassword)return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(busy)return;busy=true;b.disabled=true;b.textContent='Connexion…';
 try{await signInGenerated();toast?.('Connexion réussie.');setTimeout(()=>location.replace(connectedUrl()),180)}catch(err){toast?.('Connexion impossible. Prépare à nouveau ton accès.');generatedPassword='';paint()}finally{busy=false}
}

async function changeNow(e){
 const b=e.target.closest?.('#signup');if(!b||!generatedPassword)return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(busy)return;busy=true;b.disabled=true;b.textContent='Connexion…';
 try{await signInGenerated();const loginCard=E('loginCard'),reset=E('resetPasswordCard');if(loginCard)loginCard.classList.add('hidden');if(reset){reset.classList.remove('hidden');const p=reset.querySelector('p.muted');if(p)p.textContent='Choisis ton nouveau mot de passe et confirme-le une seconde fois.';E('newPassword')?.focus()}document.body.classList.add('swe-invite-lock');toast?.('Tu es connecté. Choisis maintenant ton nouveau mot de passe.')}catch(_){toast?.('Connexion impossible. Prépare à nouveau ton accès.');generatedPassword='';paint()}finally{busy=false;b.disabled=false}
}

async function saveNewPassword(e){
 const b=e.target.closest?.('#updatePassword');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 const p1=E('newPassword')?.value||'',p2=E('confirmNewPassword')?.value||'';if(p1.length<8)return toast?.('Le mot de passe doit contenir au moins 8 caractères.');if(p1!==p2)return toast?.('Les deux mots de passe ne correspondent pas.');
 b.disabled=true;b.textContent='Enregistrement…';try{const {error}=await sb.auth.updateUser({password:p1});if(error)throw error;toast?.('Nouveau mot de passe enregistré.');setTimeout(()=>location.replace(connectedUrl()),180)}catch(err){toast?.(err?.message||'Impossible d’enregistrer le mot de passe.');b.disabled=false;b.textContent='Enregistrer le nouveau mot de passe'}
}

function blockSocial(e){const b=e.target.closest?.('#authGoogle,#authApple,#forgotPassword');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();toast?.('Utilise l’accès sécurisé de cette invitation.');}
async function loadInviteState(){if(typeof sb==='undefined'||!sb?.rpc){setTimeout(loadInviteState,120);return}try{const {data,error}=await sb.rpc('get_coorganizer_invite_auth_state',{p_invite:invite,p_email:invitedEmail});if(error)throw error;authMode=!data?.valid?'invalid':'valid'}catch(_){authMode='checking';setTimeout(loadInviteState,800)}paint()}

async function checkSession(){
 if(sessionChecked||typeof sb==='undefined'||!sb?.auth?.getSession)return;sessionChecked=true;
 try{const {data}=await sb.auth.getSession();const current=(data?.session?.user?.email||'').trim().toLowerCase();if(current&&current!==invitedEmail){await sb.auth.signOut();E('main')?.classList.add('hidden');E('auth')?.classList.remove('hidden');toast?.('Cette invitation est réservée à '+invitedEmail+'.')}else if(current===invitedEmail&&P.get('invite_connected')==='1'){document.body.classList.remove('swe-invite-lock');setTimeout(placeInvitationInPlayerSpace,220)}}catch(_){sessionChecked=false}
}

function placeInvitationInPlayerSpace(){
 hideCommercial();const main=E('main'),view=E('view-myplayer'),box=E('inviteBox');if(!main||main.classList.contains('hidden')||!view||!box)return false;
 document.body.classList.remove('swe-invite-lock');if(box.parentElement!==view)view.insertBefore(box,view.firstChild);box.querySelectorAll('button').forEach(b=>{if(/Accepter l.?invitation/i.test(b.textContent||''))b.textContent='✅ Accepter et accéder au groupe'});
 if(!landedPlayer){const tab=document.querySelector('.tabs button[data-view="myplayer"]');if(tab){landedPlayer=true;tab.click();setTimeout(()=>{if(!box.classList.contains('hidden'))box.scrollIntoView({block:'start',behavior:'smooth'})},160)}}return true
}

function wire(){if(window.__SWE_INVITE_AUTH_WIRED)return;window.__SWE_INVITE_AUTH_WIRED=true;document.addEventListener('click',blockSocial,true);document.addEventListener('click',prepareAccess,true);document.addEventListener('click',keepGenerated,true);document.addEventListener('click',changeNow,true);document.addEventListener('click',saveNewPassword,true);document.addEventListener('input',e=>{if(e.target?.id==='email'&&e.target.value.trim().toLowerCase()!==invitedEmail)e.target.value=invitedEmail},true)}
function boot(){style();wire();hideCommercial();checkSession();loadInviteState();setTimeout(hideCommercial,300);setTimeout(()=>{hideCommercial();placeInvitationInPlayerSpace()},900)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.addEventListener('pageshow',()=>setTimeout(boot,40));document.addEventListener('swe:rendered',()=>setTimeout(()=>{hideCommercial();placeInvitationInPlayerSpace()},0));
})();

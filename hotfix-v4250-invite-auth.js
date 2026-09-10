(()=>{
'use strict';
const P=new URLSearchParams(location.search);
const invite=(P.get('invite')||'').trim();
const invitedEmail=(P.get('email')||'').trim().toLowerCase();
if(!invite||!invitedEmail)return;
const E=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let authMode='checking',consentRequired=true,loginBusy=false,landedPlayer=false,sessionChecked=false;

function style(){if(E('sweInviteAuthStyle'))return;const s=document.createElement('style');s.id='sweInviteAuthStyle';s.textContent=`
body.swe-invite-lock .auth-social-sep,body.swe-invite-lock .auth-social-grid{display:none!important}
body.swe-invite-lock #email{background:#f3f6f4!important;color:#32443b!important;font-weight:800}
body.swe-invite-lock #forgotPassword{display:none!important}
body.swe-invite-lock #inviteLandingCard{display:none!important}
body.swe-invite-lock [data-swe-invite-hide="1"],body.swe-invite-lock #sweComplexHome4281{display:none!important}
body.swe-invite-lock.swe-consent-off #signupConsentRow{display:none!important}
#sweInviteAuthNotice{margin:10px 0;padding:12px 13px;border:1px solid #b9dec9;background:#f1faf5;border-radius:12px;color:#244b37;font-size:13px;line-height:1.5}
#sweInviteAuthNotice b{color:#0e633b}
body.swe-invite-lock #login,body.swe-invite-lock #signup{font-weight:900!important}
body.swe-invite-lock #inviteBox{border:2px solid #b9d8ff;background:#f5f9ff}
body.swe-invite-lock #inviteBox .sectiontitle{color:#0b2b54}
body.swe-invite-lock #inviteBox button.primary{background:linear-gradient(135deg,#176ee8,#11b8d5)!important;color:#fff!important;font-weight:900!important}
`;document.head.appendChild(s)}

function hideCommercial(){const byId=E('sweComplexHome4281');if(byId){byId.dataset.sweInviteHide='1';byId.style.display='none'};const nodes=[...document.querySelectorAll('section,div,article')].filter(el=>{const t=(el.textContent||'').replace(/\s+/g,' ').trim();return (/Commence gratuitement/i.test(t)&&/Pour démarrer/i.test(t))||(/POUR LES COMPLEXES DE FOOT/i.test(t)&&/Développez la fréquentation/i.test(t));});nodes.sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length);nodes.slice(0,2).forEach(el=>{el.dataset.sweInviteHide='1';el.style.display='none'});}

function syncConsent(){const row=E('signupConsentRow'),cb=E('signupConsent');document.body.classList.toggle('swe-consent-off',!consentRequired);if(row)row.style.display=consentRequired?'':'none';if(cb&&!consentRequired)cb.checked=true;const card=E('loginCard');if(card)[...card.querySelectorAll('p.muted')].forEach(p=>{if(/case d.acceptation est obligatoire/i.test(p.textContent||''))p.style.display=consentRequired?'':'none'});}

function paint(){style();document.body.classList.add('swe-invite-lock');hideCommercial();syncConsent();const email=E('email'),password=E('password'),login=E('login'),signup=E('signup');if(email){email.value=invitedEmail;email.readOnly=true;email.setAttribute('aria-readonly','true');email.title='Adresse liée à cette invitation';}
[E('authGoogle'),E('authApple')].forEach(b=>{if(b){b.disabled=true;b.setAttribute('aria-disabled','true')}});
if(password){password.placeholder=authMode==='new'?'Choisis ton mot de passe':'Ton mot de passe actuel';password.autocomplete=authMode==='new'?'new-password':'current-password'}
if(login){login.style.display=authMode==='new'?'none':'';login.disabled=authMode==='checking'||authMode==='invalid';login.textContent=authMode==='existing'?'Garder mon mot de passe et me connecter':'Se connecter'}
if(signup){signup.style.display='';signup.disabled=authMode==='checking'||authMode==='invalid';signup.textContent=authMode==='checking'?'Vérification de l’invitation…':authMode==='existing'?'Choisir un nouveau mot de passe':'Créer mon compte avec ce mot de passe'}
const card=E('loginCard');if(card){let n=E('sweInviteAuthNotice');if(!n){n=document.createElement('div');n.id='sweInviteAuthNotice';(email||card.firstChild).insertAdjacentElement?.('beforebegin',n);if(!n.parentNode)card.prepend(n)}if(authMode==='existing')n.innerHTML='<b>Invitation sécurisée</b><br>Un compte SWÉ existe déjà pour <b>'+esc(invitedEmail)+'</b>.<br><b>Deux choix :</b> saisis ton mot de passe actuel puis clique sur <b>Garder mon mot de passe et me connecter</b>, ou clique sur <b>Choisir un nouveau mot de passe</b>. Dans ce second cas, SWÉ t’envoie un lien sécurisé puis te demande le nouveau mot de passe deux fois pour le vérifier.';else if(authMode==='new')n.innerHTML='<b>Invitation sécurisée</b><br>Choisis un mot de passe pour <b>'+esc(invitedEmail)+'</b>, confirme les conditions si elles sont demandées, puis crée ton compte.';else if(authMode==='invalid')n.innerHTML='<b>Invitation indisponible</b><br>Cette invitation n’est plus valide ou a déjà été utilisée.';else n.innerHTML='<b>Invitation sécurisée</b><br>Vérification de l’adresse invitée…';}}

function requirePassword(){const p=E('password');if(p?.value.trim())return p.value;if(typeof toast==='function')toast('Saisis ton mot de passe actuel pour continuer.');p?.focus();return ''}
function blockSocial(e){const b=e.target.closest?.('#authGoogle,#authApple');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(typeof toast==='function')toast('Cette invitation est liée à '+invitedEmail+'. Utilise cet e-mail.');}
function primeConsent(e){const b=e.target.closest?.('#signup');if(!b||authMode!=='new'||consentRequired)return;const cb=E('signupConsent');if(cb)cb.checked=true;}

async function existingLogin(e){const b=e.target.closest?.('#login');if(!b||authMode!=='existing')return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(loginBusy)return;const password=requirePassword();if(!password)return;if(typeof sb==='undefined'||!sb?.auth?.signInWithPassword)return toast?.('Connexion indisponible. Réessaie dans un instant.');loginBusy=true;b.disabled=true;const old=b.textContent;b.textContent='Connexion…';try{const {error}=await sb.auth.signInWithPassword({email:invitedEmail,password});if(error)throw error;toast?.('Connexion réussie. Ton invitation est prête.');setTimeout(placeInvitationInPlayerSpace,220)}catch(_){toast?.('Mot de passe incorrect. Réessaie ou choisis un nouveau mot de passe.')}finally{loginBusy=false;b.disabled=false;b.textContent=old}}

async function chooseNewPassword(e){const b=e.target.closest?.('#signup');if(!b||authMode==='new')return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(authMode==='checking')return toast?.('Vérification de l’invitation en cours.');if(typeof sb==='undefined'||!sb?.auth?.resetPasswordForEmail)return toast?.('Service de mot de passe indisponible.');b.disabled=true;const redirectTo=location.origin+location.pathname+'?invite='+encodeURIComponent(invite)+'&email='+encodeURIComponent(invitedEmail)+'&password_change=1';try{const {error}=await sb.auth.resetPasswordForEmail(invitedEmail,{redirectTo});if(error)throw error;toast?.('Lien sécurisé envoyé. Ouvre l’e-mail pour choisir puis confirmer ton nouveau mot de passe.')}catch(err){toast?.(err?.message||'Impossible d’envoyer le lien pour le moment.')}finally{b.disabled=false}}

async function updateRecoveryPassword(e){const b=e.target.closest?.('#updatePassword');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const p1=E('newPassword')?.value||'',p2=E('confirmNewPassword')?.value||'';if(p1.length<8)return toast?.('Le mot de passe doit contenir au moins 8 caractères.');if(p1!==p2)return toast?.('Les deux mots de passe ne correspondent pas.');if(typeof sb==='undefined'||!sb?.auth?.updateUser)return toast?.('Service de mot de passe indisponible.');b.disabled=true;try{const {error}=await sb.auth.updateUser({password:p1});if(error)throw error;toast?.('Nouveau mot de passe enregistré et vérifié.');const back=location.pathname+'?invite='+encodeURIComponent(invite)+'&email='+encodeURIComponent(invitedEmail);setTimeout(()=>location.replace(back),350)}catch(err){toast?.(err?.message||'Impossible d’enregistrer le mot de passe.');b.disabled=false}}

async function loadInviteState(){if(typeof sb==='undefined'||!sb?.rpc){setTimeout(loadInviteState,120);return}try{const [{data,error},{data:settings,error:settingsError}]=await Promise.all([sb.rpc('get_coorganizer_invite_auth_state',{p_invite:invite,p_email:invitedEmail}),sb.rpc('get_platform_public_settings')]);if(error)throw error;if(!settingsError)consentRequired=settings?.consent_gate_enabled===true;authMode=!data?.valid?'invalid':data.account_exists?'existing':'new'}catch(_){authMode='checking';setTimeout(loadInviteState,800)}paint()}

async function checkWrongSession(){if(sessionChecked||typeof sb==='undefined'||!sb?.auth?.getSession)return;sessionChecked=true;try{const {data}=await sb.auth.getSession();const current=(data?.session?.user?.email||'').trim().toLowerCase();if(current&&current!==invitedEmail){await sb.auth.signOut();E('main')?.classList.add('hidden');E('auth')?.classList.remove('hidden');toast?.('Cette invitation est réservée à '+invitedEmail+'.');paint()}}catch(_){sessionChecked=false}}

function placeInvitationInPlayerSpace(){hideCommercial();const main=E('main'),view=E('view-myplayer'),box=E('inviteBox');if(!main||main.classList.contains('hidden')||!view||!box)return false;if(box.parentElement!==view)view.insertBefore(box,view.firstChild);box.querySelectorAll('button').forEach(b=>{if(/Accepter l.?invitation/i.test(b.textContent||''))b.textContent='✅ Accepter et accéder au groupe'});if(!landedPlayer){const tab=document.querySelector('.tabs button[data-view="myplayer"]');if(tab){landedPlayer=true;tab.click();setTimeout(()=>{if(!box.classList.contains('hidden'))box.scrollIntoView({block:'start',behavior:'smooth'})},160)}}return true}

function wire(){if(window.__SWE_INVITE_AUTH_WIRED)return;window.__SWE_INVITE_AUTH_WIRED=true;document.addEventListener('click',blockSocial,true);document.addEventListener('click',existingLogin,true);document.addEventListener('click',primeConsent,true);document.addEventListener('click',chooseNewPassword,true);document.addEventListener('click',updateRecoveryPassword,true);document.addEventListener('input',e=>{if(e.target?.id==='email'&&e.target.value.trim().toLowerCase()!==invitedEmail)e.target.value=invitedEmail},true)}
function boot(){paint();wire();checkWrongSession();loadInviteState();setTimeout(()=>{hideCommercial();placeInvitationInPlayerSpace()},180);setTimeout(()=>{hideCommercial();placeInvitationInPlayerSpace()},700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.addEventListener('pageshow',()=>setTimeout(boot,40));document.addEventListener('swe:rendered',()=>setTimeout(()=>{paint();placeInvitationInPlayerSpace()},0));
})();

(()=>{
'use strict';
if(window.__SWE_AUTH_PLAYER_CLEAN_4316)return;window.__SWE_AUTH_PLAYER_CLEAN_4316=true;
const params=new URLSearchParams(location.search);
if((params.get('start')||'').toLowerCase()!=='player')return;
document.documentElement.dataset.sweAuthPlayerClean='1';

function injectCss(){
 if(document.getElementById('sweAuthPlayerClean4316Style'))return;
 const s=document.createElement('style');s.id='sweAuthPlayerClean4316Style';s.textContent=`
html[data-swe-auth-player-clean="1"] body{background:radial-gradient(circle at 50% -10%,#fff7dc 0,#f7f9fc 34%,#eef4fb 100%);color:#0b2345}
html[data-swe-auth-player-clean="1"] .app{max-width:560px!important;padding:28px 18px 70px!important;margin:auto!important}
html[data-swe-auth-player-clean="1"] #auth{max-width:470px!important;margin:2vh auto 0!important}
html[data-swe-auth-player-clean="1"] #auth>.top{background:linear-gradient(135deg,#071a35 0%,#0d2b52 72%,#12385f 100%)!important;border:1px solid rgba(243,189,57,.35)!important;border-radius:24px!important;box-shadow:0 16px 38px rgba(7,26,53,.18)!important;padding:20px 22px!important;margin:0 0 14px!important;overflow:hidden!important}
html[data-swe-auth-player-clean="1"] #auth>.top:after{content:""!important;position:absolute;right:-38px;top:-52px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(243,189,57,.16),rgba(243,189,57,0) 68%);opacity:1!important}
html[data-swe-auth-player-clean="1"] #auth>.top h1{display:flex!important;align-items:center!important;gap:12px!important;font-size:20px!important;letter-spacing:-.02em!important;font-weight:950!important;color:#fff!important}
html[data-swe-auth-player-clean="1"] #auth>.top .muted{color:#c9d6e7!important;margin:7px 0 0 58px!important;font-size:12px!important}
html[data-swe-auth-player-clean="1"] .swe-auth-logo{width:46px;height:46px;object-fit:contain;border-radius:50%;flex:0 0 auto;filter:drop-shadow(0 6px 12px rgba(0,0,0,.2))}
html[data-swe-auth-player-clean="1"] .swe-brand-copy{display:grid;line-height:1.03}html[data-swe-auth-player-clean="1"] .swe-brand-copy strong{font-size:20px}html[data-swe-auth-player-clean="1"] .swe-brand-copy small{margin-top:4px;color:#f3bd39;font-size:9px;letter-spacing:.16em;font-weight:950}
html[data-swe-auth-player-clean="1"] #loginCard{border:1px solid #d7e3f1!important;background:rgba(255,255,255,.98)!important;border-radius:24px!important;box-shadow:0 18px 42px rgba(7,26,53,.11)!important;padding:22px!important}
html[data-swe-auth-player-clean="1"] #loginCard .auth-login-brand{border-bottom:1px solid #e4ebf4!important;padding-bottom:17px!important;margin-bottom:16px!important;display:flex!important;align-items:center!important}
html[data-swe-auth-player-clean="1"] #loginCard .auth-login-brand>img{display:block!important;width:50px!important;height:50px!important;object-fit:contain!important;border-radius:50%!important;margin-right:12px!important;flex:0 0 auto!important}
html[data-swe-auth-player-clean="1"] #loginCard .auth-login-brand span{color:#c48700!important;letter-spacing:.13em!important;font-weight:950!important;font-size:10px!important}
html[data-swe-auth-player-clean="1"] #loginCard .auth-login-brand h2{color:#071a35!important;font-size:24px!important;margin:3px 0 4px!important}
html[data-swe-auth-player-clean="1"] #loginCard .auth-login-brand p{color:#61728b!important;line-height:1.45!important}
html[data-swe-auth-player-clean="1"] #loginCard input{border:1px solid #ccd9e8!important;background:#fff!important;color:#0b2345!important;box-shadow:none!important}
html[data-swe-auth-player-clean="1"] #loginCard input:focus{border-color:#d9a31d!important;box-shadow:0 0 0 3px rgba(243,189,57,.15)!important}
html[data-swe-auth-player-clean="1"] #login{background:linear-gradient(135deg,#f8d66a,#f3bd39)!important;color:#071a35!important;border:0!important;box-shadow:0 8px 20px rgba(243,189,57,.26)!important}
html[data-swe-auth-player-clean="1"] #signup,html[data-swe-auth-player-clean="1"] #signupConsentRow{display:none!important}
html[data-swe-auth-player-clean="1"] #forgotPassword{background:#eef3f8!important;color:#17375d!important}
html[data-swe-auth-player-clean="1"] .auth-social-btn{border-color:#d7e1ed!important;background:#fff!important;color:#162a45!important}
html[data-swe-auth-player-clean="1"] #sweLoginOffers4252,html[data-swe-auth-player-clean="1"] #sweComplexHome4281,html[data-swe-auth-player-clean="1"] #swePublicTabs4310{display:none!important}
html[data-swe-auth-player-clean="1"] #loginCard>p.muted:last-child{display:none!important}
html[data-swe-auth-player-clean="1"] .swe-auth-back{position:fixed;left:18px;top:18px;z-index:200;display:inline-flex;align-items:center;gap:7px;padding:10px 14px;border-radius:999px;background:#071a35;color:#fff!important;text-decoration:none!important;font-weight:900;font-size:13px;box-shadow:0 9px 24px rgba(7,26,53,.18);border:1px solid rgba(243,189,57,.4)}
html[data-swe-auth-player-clean="1"] .swe-auth-back:hover{background:#0d2b52;color:#f8d66a!important}
@media(max-width:650px){html[data-swe-auth-player-clean="1"] .app{padding:54px 10px 40px!important}html[data-swe-auth-player-clean="1"] #auth{margin:0 auto!important}html[data-swe-auth-player-clean="1"] #auth>.top{border-radius:20px!important}html[data-swe-auth-player-clean="1"] .swe-auth-back{left:10px;top:10px;padding:8px 11px}html[data-swe-auth-player-clean="1"] #auth>.top .muted{margin-left:0!important}}
 `;document.head.appendChild(s)
}
function clean(){
 injectCss();
 document.querySelectorAll('#sweLoginOffers4252,#sweComplexHome4281,#swePublicTabs4310').forEach(el=>el.remove());
 const auth=document.getElementById('auth');if(!auth)return false;
 if(!document.querySelector('.swe-auth-back')){const a=document.createElement('a');a.className='swe-auth-back';a.href='https://swetournament.fr/';a.textContent='← Retour';a.setAttribute('aria-label','Retour au site SWÉ Tournament');document.body.appendChild(a)}
 const top=auth.querySelector(':scope>.top');
 if(top){
   const h=top.querySelector('h1');
   if(h&&!h.dataset.swe4316){
     h.dataset.swe4316='1';h.innerHTML='';
     const img=document.createElement('img');img.src='./favicon.png?v=4316';img.alt='SWÉ';img.className='swe-auth-logo';h.appendChild(img);
     const copy=document.createElement('span');copy.className='swe-brand-copy';copy.innerHTML='<strong>SWÉ TOURNAMENT</strong><small>LE FOOT ENTRE AMIS, VERSION TOURNOI</small>';h.appendChild(copy)
   }
   const p=top.querySelector('.muted');if(p)p.textContent='Retrouve tes SWÉ, tes équipes et toutes tes stats.'
 }
 const brand=document.querySelector('#loginCard .auth-login-brand');
 if(brand){const img=brand.querySelector(':scope>img');if(img){img.src='./favicon.png?v=4316';img.alt='SWÉ'}}
 const signup=document.getElementById('signup');if(signup)signup.remove();
 const consent=document.getElementById('signupConsentRow');if(consent)consent.remove();
 return true;
}
function boot(){
 clean();
 let tries=0;
 const timer=setInterval(()=>{tries++;if(clean()||tries>=8)clearInterval(timer)},250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>setTimeout(clean,50),{once:true});
})();
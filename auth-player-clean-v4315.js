(()=>{
'use strict';
if(window.__SWE_AUTH_PLAYER_CLEAN_4315)return;window.__SWE_AUTH_PLAYER_CLEAN_4315=true;
const params=new URLSearchParams(location.search);
if((params.get('start')||'').toLowerCase()!=='player')return;
document.documentElement.dataset.sweAuthPlayerClean='1';

function injectCss(){
 if(document.getElementById('sweAuthPlayerClean4315Style'))return;
 const s=document.createElement('style');s.id='sweAuthPlayerClean4315Style';s.textContent=`
html[data-swe-auth-player-clean="1"] body{background:radial-gradient(circle at 50% -10%,#fff7dc 0,#f7f9fc 34%,#eef4fb 100%);color:#0b2345}
html[data-swe-auth-player-clean="1"] .app{max-width:560px!important;padding:28px 18px 70px!important;margin:auto!important}
html[data-swe-auth-player-clean="1"] #auth{max-width:470px!important;margin:2vh auto 0!important}
html[data-swe-auth-player-clean="1"] #auth>.top{background:linear-gradient(135deg,#071a35 0%,#0d2b52 72%,#12385f 100%)!important;border:1px solid rgba(243,189,57,.35)!important;border-radius:24px!important;box-shadow:0 16px 38px rgba(7,26,53,.18)!important;padding:20px 22px!important;margin:0 0 14px!important;overflow:hidden!important}
html[data-swe-auth-player-clean="1"] #auth>.top:after{content:""!important;position:absolute;right:-38px;top:-52px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(243,189,57,.16),rgba(243,189,57,0) 68%);opacity:1!important}
html[data-swe-auth-player-clean="1"] #auth>.top h1{display:flex!important;align-items:center!important;gap:12px!important;font-size:20px!important;letter-spacing:-.02em!important;font-weight:950!important;color:#fff!important}
html[data-swe-auth-player-clean="1"] #auth>.top .muted{color:#c9d6e7!important;margin:7px 0 0 58px!important;font-size:12px!important}
html[data-swe-auth-player-clean="1"] .swe-logo-badge{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(145deg,#0b2345,#061325);border:1px solid rgba(243,189,57,.58);box-shadow:inset 0 0 0 2px rgba(255,255,255,.03),0 8px 18px rgba(0,0,0,.18);position:relative;flex:0 0 auto}
html[data-swe-auth-player-clean="1"] .swe-logo-badge:before{content:"♛";position:absolute;top:3px;color:#f3bd39;font-size:13px;line-height:1}
html[data-swe-auth-player-clean="1"] .swe-logo-badge b{color:#fff;font-size:17px;letter-spacing:-.06em;margin-top:8px}
html[data-swe-auth-player-clean="1"] .swe-brand-copy{display:grid;line-height:1.03}html[data-swe-auth-player-clean="1"] .swe-brand-copy strong{font-size:20px}html[data-swe-auth-player-clean="1"] .swe-brand-copy small{margin-top:4px;color:#f3bd39;font-size:9px;letter-spacing:.16em;font-weight:950}
html[data-swe-auth-player-clean="1"] #loginCard{border:1px solid #d7e3f1!important;background:rgba(255,255,255,.98)!important;border-radius:24px!important;box-shadow:0 18px 42px rgba(7,26,53,.11)!important;padding:22px!important}
html[data-swe-auth-player-clean="1"] #loginCard .auth-login-brand{border-bottom:1px solid #e4ebf4!important;padding-bottom:17px!important;margin-bottom:16px!important}
html[data-swe-auth-player-clean="1"] #loginCard .auth-login-brand>img{display:none!important}
html[data-swe-auth-player-clean="1"] .swe-welcome-logo{width:50px;height:50px;margin-right:12px;flex:0 0 auto}
html[data-swe-auth-player-clean="1"] #loginCard .auth-login-brand span{color:#c48700!important;letter-spacing:.13em!important;font-weight:950!important;font-size:10px!important}
html[data-swe-auth-player-clean="1"] #loginCard .auth-login-brand h2{color:#071a35!important;font-size:24px!important;margin:3px 0 4px!important}
html[data-swe-auth-player-clean="1"] #loginCard .auth-login-brand p{color:#61728b!important;line-height:1.45!important}
html[data-swe-auth-player-clean="1"] #loginCard input{border:1px solid #ccd9e8!important;background:#fff!important;color:#0b2345!important;box-shadow:none!important}
html[data-swe-auth-player-clean="1"] #loginCard input:focus{border-color:#d9a31d!important;box-shadow:0 0 0 3px rgba(243,189,57,.15)!important}
html[data-swe-auth-player-clean="1"] #login{background:linear-gradient(135deg,#f8d66a,#f3bd39)!important;color:#071a35!important;border:0!important;box-shadow:0 8px 20px rgba(243,189,57,.26)!important}
html[data-swe-auth-player-clean="1"] #signup{background:#0b2b54!important;color:#fff!important;border-color:#0b2b54!important}
html[data-swe-auth-player-clean="1"] #forgotPassword{background:#eef3f8!important;color:#17375d!important}
html[data-swe-auth-player-clean="1"] .auth-social-btn{border-color:#d7e1ed!important;background:#fff!important;color:#162a45!important}
html[data-swe-auth-player-clean="1"] #sweLoginOffers4252,html[data-swe-auth-player-clean="1"] #sweComplexHome4281,html[data-swe-auth-player-clean="1"] #swePublicTabs4310{display:none!important}
html[data-swe-auth-player-clean="1"] #loginCard>p.muted:last-child{display:none!important}
html[data-swe-auth-player-clean="1"] .swe-auth-back{position:fixed;left:18px;top:18px;z-index:200;display:inline-flex;align-items:center;gap:7px;padding:10px 14px;border-radius:999px;background:#071a35;color:#fff!important;text-decoration:none!important;font-weight:900;font-size:13px;box-shadow:0 9px 24px rgba(7,26,53,.18);border:1px solid rgba(243,189,57,.4)}
html[data-swe-auth-player-clean="1"] .swe-auth-back:hover{background:#0d2b52;color:#f8d66a!important}
@media(max-width:650px){html[data-swe-auth-player-clean="1"] .app{padding:54px 10px 40px!important}html[data-swe-auth-player-clean="1"] #auth{margin:0 auto!important}html[data-swe-auth-player-clean="1"] #auth>.top{border-radius:20px!important}html[data-swe-auth-player-clean="1"] .swe-auth-back{left:10px;top:10px;padding:8px 11px}html[data-swe-auth-player-clean="1"] #auth>.top .muted{margin-left:0!important}}
 `;document.head.appendChild(s)
}
function logoBadge(extra=''){const el=document.createElement('span');el.className='swe-logo-badge '+extra;el.innerHTML='<b>SWÉ</b>';return el}
function clean(){
 injectCss();
 document.querySelectorAll('#sweLoginOffers4252,#sweComplexHome4281,#swePublicTabs4310').forEach(el=>el.remove());
 const auth=document.getElementById('auth');if(!auth)return false;
 if(!document.querySelector('.swe-auth-back')){const a=document.createElement('a');a.className='swe-auth-back';a.href='https://swetournament.fr/';a.textContent='← Retour';a.setAttribute('aria-label','Retour au site SWÉ Tournament');document.body.appendChild(a)}
 const top=auth.querySelector(':scope>.top');if(top){const h=top.querySelector('h1');if(h&&!h.dataset.swe4315){h.dataset.swe4315='1';h.innerHTML='';h.appendChild(logoBadge());const copy=document.createElement('span');copy.className='swe-brand-copy';copy.innerHTML='<strong>SWÉ TOURNAMENT</strong><small>LE FOOT ENTRE AMIS, VERSION TOURNOI</small>';h.appendChild(copy)}const p=top.querySelector('.muted');if(p)p.textContent='Retrouve tes SWÉ, tes équipes et toutes tes stats.'}
 const brand=document.querySelector('#loginCard .auth-login-brand');if(brand&&!brand.querySelector('.swe-welcome-logo')){const badge=logoBadge('swe-welcome-logo');brand.insertBefore(badge,brand.firstChild)}
 return true;
}
function boot(){clean();let tries=0;const timer=setInterval(()=>{tries++;clean();if(tries>40)clearInterval(timer)},200);const obs=new MutationObserver(()=>clean());obs.observe(document.body,{childList:true,subtree:true});setTimeout(()=>obs.disconnect(),15000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.addEventListener('pageshow',()=>setTimeout(clean,50));document.addEventListener('swe:rendered',()=>setTimeout(clean,0));
})();
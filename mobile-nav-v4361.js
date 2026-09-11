(()=>{
'use strict';
if(window.__SWE_MOBILE_NAV_4361)return;window.__SWE_MOBILE_NAV_4361=true;
const labels={home:['⌂','Accueil'],profile:['👤','Profil'],'player-profile':['👤','Profil'],myplayer:['👤','Profil'],'simple-swe':['⚽','Créer'],players:['👥','Joueurs'],permissions:['🔐','Droits'],tournaments:['🏆','Tournois'],teams:['👕','Équipes'],matches:['⚽','Matchs'],league:['🏁','Ligue'],cooler:['🧊','3e mi-temps'],ranking:['★','Classement'],rankings:['★','Classement']};
function css(){if(document.getElementById('sweMobileNav4361Css'))return;const s=document.createElement('style');s.id='sweMobileNav4361Css';s.textContent=`
@media(max-width:760px){
 body{padding-bottom:84px!important}
 .tabs{left:8px!important;right:8px!important;bottom:max(8px,env(safe-area-inset-bottom))!important;transform:none!important;width:auto!important;min-height:68px!important;display:flex!important;align-items:stretch!important;gap:5px!important;padding:6px!important;background:rgba(248,251,255,.97)!important;border:1px solid #d6e7f7!important;border-top:3px solid #28c7df!important;border-radius:18px!important;box-shadow:0 12px 32px rgba(16,33,63,.20)!important;backdrop-filter:blur(16px)!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important;white-space:nowrap!important}
 .tabs::-webkit-scrollbar{display:none!important}
 .tabs:before{content:none!important;display:none!important;background:none!important}
 .tabs button{position:relative!important;flex:0 0 72px!important;min-width:72px!important;min-height:54px!important;margin:0!important;padding:5px 4px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;border:0!important;border-radius:13px!important;background:transparent!important;color:#36516f!important;box-shadow:none!important;font-size:11px!important;line-height:1.05!important;white-space:normal!important}
 .tabs button img,.tabs button svg{display:none!important}
 .tabs button .swe4361-nav-icon{font-size:18px!important;line-height:1!important;height:20px!important;display:flex!important;align-items:center!important;justify-content:center!important}
 .tabs button .swe4361-nav-label{display:block!important;max-width:68px!important;overflow:hidden!important;text-overflow:ellipsis!important;font-size:10px!important;font-weight:850!important;line-height:1.05!important;text-align:center!important;color:inherit!important}
 .tabs button:before{content:none!important;display:none!important}
 .tabs button.active{background:linear-gradient(135deg,#1f5ed8,#20b9df)!important;color:#fff!important;box-shadow:0 5px 14px rgba(31,94,216,.24)!important}
 .tabs button.swe-right-disabled,.tabs button.disabled-tab{opacity:.38!important;filter:grayscale(.85)!important;background:#edf2f7!important;color:#7c8998!important}
 .tabs button.swe-right-disabled:after{content:'🔒'!important;position:absolute!important;right:5px!important;top:4px!important;font-size:8px!important;margin:0!important}
}
`;document.head.appendChild(s)}
function key(btn){let v=String(btn.dataset.view||'').toLowerCase();if(v==='simple-swe-page'||v==='simple_swe'||v==='create-swe')v='simple-swe';return v}
function decorate(){css();if(!matchMedia('(max-width:760px)').matches)return;document.querySelectorAll('.tabs button[data-view]').forEach(btn=>{if(btn.dataset.swe4361Nav==='1')return;const k=key(btn);const def=labels[k]||['•',(btn.textContent||'Menu').replace(/[\p{Extended_Pictographic}\u2600-\u27BF]/gu,'').trim()||'Menu'];btn.dataset.swe4361Nav='1';btn.dataset.swe4361Original=btn.innerHTML;btn.innerHTML='<span class="swe4361-nav-icon" aria-hidden="true">'+def[0]+'</span><span class="swe4361-nav-label">'+def[1]+'</span>';btn.setAttribute('aria-label',def[1])});}
function restore(){if(matchMedia('(max-width:760px)').matches)return;document.querySelectorAll('.tabs button[data-swe4361-nav="1"]').forEach(btn=>{if(btn.dataset.swe4361Original!=null)btn.innerHTML=btn.dataset.swe4361Original;delete btn.dataset.swe4361Nav;delete btn.dataset.swe4361Original})}
let tm;const resize=()=>{clearTimeout(tm);tm=setTimeout(()=>{if(matchMedia('(max-width:760px)').matches)decorate();else restore()},80)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();window.addEventListener('resize',resize);document.addEventListener('swe:rendered',()=>setTimeout(decorate,40));window.addEventListener('pageshow',()=>setTimeout(decorate,80));
})();
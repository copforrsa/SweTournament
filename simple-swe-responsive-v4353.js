(()=>{
'use strict';
if(window.__SWE_SIMPLE_RESPONSIVE_4353)return;window.__SWE_SIMPLE_RESPONSIVE_4353=true;
const E=id=>document.getElementById(id);
function appState(){try{return typeof S!=='undefined'?S:null}catch(_){return null}}
function isCoorg(){return String(appState()?.workspace?.role||'').toLowerCase()==='coorganizer'}
function css(){
 if(E('sweSimpleResponsive4353Css'))return;
 const s=document.createElement('style');s.id='sweSimpleResponsive4353Css';s.textContent=`
/* V43.53 — page SWÉ simple : exploiter réellement l'écran et rester fluide partout */
html[data-simple-swe-premium="1"],html[data-simple-swe-premium="1"] body{width:100%!important;max-width:none!important;overflow-x:hidden!important}
html[data-simple-swe-premium="1"] .app,html[data-simple-swe-premium="1"] #main,html[data-simple-swe-premium="1"] #view-simple-swe{width:100%!important;max-width:none!important;margin:0!important;padding-left:0!important;padding-right:0!important}
html[data-simple-swe-premium="1"] #main{display:block!important}
html[data-simple-swe-premium="1"] .swe4351-sitebar{padding-left:max(24px,calc((100vw - 1500px)/2))!important;padding-right:max(24px,calc((100vw - 1500px)/2))!important}
html[data-simple-swe-premium="1"] .swe4351-hero{padding-left:max(24px,calc((100vw - 1500px)/2))!important;padding-right:max(24px,calc((100vw - 1500px)/2))!important}
html[data-simple-swe-premium="1"] .swe4351-wrap{width:min(1500px,calc(100vw - 40px))!important;max-width:1500px!important;margin:-14px auto 0!important;padding-left:0!important;padding-right:0!important}
html[data-simple-swe-premium="1"] .swe4351-history{width:min(1500px,calc(100vw - 40px))!important;max-width:1500px!important;margin:0 auto!important;padding-left:0!important;padding-right:0!important}
html[data-simple-swe-premium="1"] .swe4351-columns{grid-template-columns:minmax(0,2.25fr) minmax(330px,.75fr)!important;gap:20px!important}
html[data-simple-swe-premium="1"] .swe4351-card{border-radius:22px!important;box-shadow:0 12px 34px rgba(11,43,84,.09)!important}
html[data-simple-swe-premium="1"] .swe4351-summary{top:84px!important}
html[data-simple-swe-premium="1"] .swe4351-visibility{max-width:900px!important}
html[data-simple-swe-premium="1"] .swe4351-publicgrid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
html[data-simple-swe-premium="1"] .swe4351-groupgrid{grid-template-columns:repeat(4,minmax(0,1fr))!important}

/* Co-gestionnaire : la création simple se fait depuis le compte personnel, pas depuis l'espace géré. */
#swe4350LaunchCard.swe4353-coorg-locked{background:linear-gradient(125deg,#e8edf3 0%,#dce4ec 100%)!important;color:#637083!important;box-shadow:none!important;border:1px solid #cbd5df!important}
#swe4350LaunchCard.swe4353-coorg-locked:after{opacity:.035!important}
#swe4350LaunchCard.swe4353-coorg-locked .swe4350-launch-kicker{background:#f2f4f7!important;color:#6b7280!important;border:1px solid #d7dde5!important}
#swe4350LaunchCard.swe4353-coorg-locked .swe4350-launch-title{color:#536171!important}
#swe4350LaunchCard.swe4353-coorg-locked .swe4350-launch-copy,#swe4350LaunchCard.swe4353-coorg-locked .swe4350-launch-pills span{color:#788493!important}
#swe4350LaunchCard.swe4353-coorg-locked .swe4350-launch-pills span{background:#eef1f4!important;border-color:#d9dfe6!important}
#swe4350LaunchCard.swe4353-coorg-locked .swe4350-launch-btn{background:#d6dde5!important;color:#7a8794!important;cursor:not-allowed!important;box-shadow:none!important;pointer-events:none!important}
.swe4353-coorg-note{grid-column:1/-1;margin-top:-4px;padding:10px 12px;border-radius:12px;background:#fff8df;border:1px solid #ead390;color:#755b13;font-size:12px;font-weight:800;line-height:1.45}
#simpleSweTab.swe4353-coorg-tab{opacity:.34!important;filter:grayscale(1)!important;cursor:not-allowed!important;color:#8d9aaa!important;position:relative!important}
#simpleSweTab.swe4353-coorg-tab:after{content:'🔒';margin-left:auto;font-size:11px}
.swe4353-page-lock{margin:18px auto;width:min(900px,calc(100% - 28px));padding:18px;border-radius:16px;background:#fff8df;border:1px solid #ead390;color:#6f5611;font-weight:800;box-shadow:0 10px 28px rgba(90,69,14,.08)}

@media(max-width:1180px){
 html[data-simple-swe-premium="1"] .swe4351-wrap,html[data-simple-swe-premium="1"] .swe4351-history{width:min(1120px,calc(100vw - 32px))!important}
 html[data-simple-swe-premium="1"] .swe4351-columns{grid-template-columns:minmax(0,1.65fr) minmax(300px,.85fr)!important;gap:16px!important}
 html[data-simple-swe-premium="1"] .swe4351-grid4{grid-template-columns:1.2fr 1fr 1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-grid4 label:last-child{grid-column:1/-1!important}
 html[data-simple-swe-premium="1"] .swe4351-publicgrid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 html[data-simple-swe-premium="1"] .swe4351-groupgrid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
}
@media(max-width:900px){
 html[data-simple-swe-premium="1"] .swe4351-sitebar{height:auto!important;min-height:60px!important;padding:10px 16px!important;gap:12px!important}
 html[data-simple-swe-premium="1"] .swe4351-nav{display:none!important}
 html[data-simple-swe-premium="1"] .swe4351-account{margin-left:auto!important}
 html[data-simple-swe-premium="1"] .swe4351-hero{padding:24px 16px 28px!important;min-height:auto!important}
 html[data-simple-swe-premium="1"] .swe4351-hero h1{font-size:36px!important}
 html[data-simple-swe-premium="1"] .swe4351-wrap,html[data-simple-swe-premium="1"] .swe4351-history{width:calc(100vw - 24px)!important;margin-left:auto!important;margin-right:auto!important}
 html[data-simple-swe-premium="1"] .swe4351-columns{grid-template-columns:1fr!important;gap:0!important}
 html[data-simple-swe-premium="1"] .swe4351-summary{position:static!important;top:auto!important}
 html[data-simple-swe-premium="1"] .swe4351-summary-col{display:grid!important;grid-template-columns:1fr 1fr!important;gap:14px!important;align-items:start!important}
 html[data-simple-swe-premium="1"] .swe4351-summary-col>.swe4351-card{margin-bottom:0!important;height:100%!important}
 html[data-simple-swe-premium="1"] .swe4351-grid3{grid-template-columns:1.35fr 1fr 1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-grid4{grid-template-columns:1fr 1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-grid4 label:last-child{grid-column:auto!important}
}
@media(max-width:680px){
 html[data-simple-swe-premium="1"] .swe4351-brand span{font-size:12px!important}
 html[data-simple-swe-premium="1"] .swe4351-account{font-size:0!important}
 html[data-simple-swe-premium="1"] .swe4351-hero h1{font-size:31px!important}
 html[data-simple-swe-premium="1"] .swe4351-hero p{font-size:14px!important}
 html[data-simple-swe-premium="1"] .swe4351-visibility{grid-template-columns:1fr!important;gap:9px!important}
 html[data-simple-swe-premium="1"] .swe4351-choice{min-height:76px!important}
 html[data-simple-swe-premium="1"] .swe4351-card{padding:15px!important;border-radius:17px!important}
 html[data-simple-swe-premium="1"] .swe4351-section-head{align-items:flex-start!important;flex-direction:column!important;gap:5px!important}
 html[data-simple-swe-premium="1"] .swe4351-grid3,html[data-simple-swe-premium="1"] .swe4351-grid4,html[data-simple-swe-premium="1"] .swe4351-info-grid{grid-template-columns:1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-invitebar,html[data-simple-swe-premium="1"] .swe4351-search{grid-template-columns:1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-invitebar button,html[data-simple-swe-premium="1"] .swe4351-search button{width:100%!important}
 html[data-simple-swe-premium="1"] .swe4351-publicgrid,html[data-simple-swe-premium="1"] .swe4351-groupgrid,html[data-simple-swe-premium="1"] .swe4351-matches{grid-template-columns:1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-summary-col{grid-template-columns:1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-summary-row{grid-template-columns:1fr 1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-caprow{display:grid!important;grid-template-columns:repeat(3,1fr)!important}
 html[data-simple-swe-premium="1"] .swe4351-cap{min-width:0!important;width:100%!important}
 .swe4353-coorg-note{font-size:11px!important}
}
`;
 document.head.appendChild(s);
}
function lockLauncherForCoorg(){
 const card=E('swe4350LaunchCard');if(!card)return;
 const btn=card.querySelector('.swe4350-launch-btn,button');
 let note=card.querySelector('.swe4353-coorg-note');
 if(isCoorg()){
   card.classList.add('swe4353-coorg-locked');
   if(btn){btn.disabled=true;btn.setAttribute('aria-disabled','true');btn.title='Fonction disponible sur les comptes personnels uniquement';}
   if(!note){note=document.createElement('div');note.className='swe4353-coorg-note';note.innerHTML='<b>🔒 Fonction disponible sur les comptes personnels uniquement.</b><br>Les co-gestionnaires ne peuvent pas créer de SWÉ depuis cet espace. Utilise ton compte personnel joueur pour organiser ton match.';card.appendChild(note);}
 }else{
   card.classList.remove('swe4353-coorg-locked');
   if(btn){btn.disabled=false;btn.removeAttribute('aria-disabled');if(btn.title==='Fonction disponible sur les comptes personnels uniquement')btn.removeAttribute('title');}
   note?.remove();
 }
}
function lockSimpleTabForCoorg(){
 const tab=E('simpleSweTab');if(!tab)return;
 tab.classList.toggle('swe4353-coorg-tab',isCoorg());
 tab.setAttribute('aria-disabled',isCoorg()?'true':'false');
 if(isCoorg())tab.title='Créer un SWÉ est disponible depuis le compte personnel joueur';
 else if(tab.title==='Créer un SWÉ est disponible depuis le compte personnel joueur')tab.removeAttribute('title');
}
function lockPageForCoorg(){
 if(!isCoorg())return;
 const view=E('view-simple-swe');if(!view||!view.classList.contains('active'))return;
 let n=E('swe4353PageLock');if(!n){n=document.createElement('div');n.id='swe4353PageLock';n.className='swe4353-page-lock';n.innerHTML='<b>🔒 Création indisponible en mode co-gestionnaire.</b><br><span style="font-weight:650">Passe sur ton compte personnel joueur pour créer un SWÉ simple.</span>';view.prepend(n);}
 view.querySelectorAll('.swe4351-create').forEach(b=>{b.disabled=true;b.setAttribute('aria-disabled','true');b.style.opacity='.45';b.style.cursor='not-allowed'});
}
function apply(){css();lockLauncherForCoorg();lockSimpleTabForCoorg();lockPageForCoorg()}
document.addEventListener('click',e=>{const t=e.target.closest?.('#simpleSweTab.swe4353-coorg-tab,#swe4350LaunchCard.swe4353-coorg-locked button');if(!t)return;e.preventDefault();e.stopImmediatePropagation();try{typeof toast==='function'&&toast('Crée ton SWÉ depuis ton compte personnel joueur.')}catch(_){}},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
document.addEventListener('swe:rendered',()=>setTimeout(apply,40));document.addEventListener('swe:player-profile-updated',()=>setTimeout(apply,40));window.addEventListener('pageshow',()=>setTimeout(apply,80));setTimeout(apply,500);setTimeout(apply,1400);
})();

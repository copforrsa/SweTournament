(()=>{
'use strict';
if(window.__SWE_DESKTOP_LAYOUT_4326)return;window.__SWE_DESKTOP_LAYOUT_4326=true;
const STYLE_ID='sweDesktopLayout4326';
const CSS=`
@media (min-width:900px){
  .app{
    width:min(1280px,calc(100% - 32px))!important;
    max-width:1280px!important;
    margin:0 auto!important;
    padding-left:220px!important;
    padding-right:18px!important;
    padding-bottom:30px!important;
  }
  #main{
    display:block!important;
    width:auto!important;
    max-width:none!important;
    min-width:0!important;
    margin:0!important;
    padding:0!important;
  }
  #main>.top,
  #main>.card,
  #main>.view,
  #main>div:not(.hidden),
  .view.active,
  #view-home,
  #view-myplayer,
  #view-players,
  #view-permissions,
  #view-tournaments,
  #view-teams,
  #view-matches,
  #view-league,
  #view-ranking{
    width:100%!important;
    max-width:none!important;
    margin-left:0!important;
    margin-right:0!important;
  }
  .tabs{
    left:max(18px,calc(50% - 624px))!important;
    width:190px!important;
  }
  #view-myplayer .card,
  #view-home .card,
  #view-tournaments .card,
  #view-matches .card,
  #view-players .card,
  #swePlayerIdentity4321{
    width:100%!important;
    max-width:none!important;
  }
  #swePlayerIdentity4321 .swe4321-grid{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    column-gap:20px!important;
    row-gap:14px!important;
  }
  #swePlayerIdentity4321 .swe4321-wide{grid-column:1/-1!important}
}
@media (min-width:1200px){
  .app{width:min(1280px,calc(100% - 40px))!important;max-width:1280px!important;padding-left:220px!important;padding-right:20px!important}
  .top{padding:21px 24px!important}
  .card{padding:20px 22px!important}
}
@media (min-width:900px) and (max-width:1199px){
  .app{width:calc(100% - 20px)!important;max-width:1180px!important;padding-left:208px!important;padding-right:12px!important}
  .tabs{left:10px!important;width:184px!important}
}
`;
function apply(){
 let s=document.getElementById(STYLE_ID);
 if(!s){s=document.createElement('style');s.id=STYLE_ID;s.textContent=CSS;}
 else if(s.textContent!==CSS)s.textContent=CSS;
 if(s.parentNode)s.parentNode.removeChild(s);
 document.head.appendChild(s);
}
function boot(){apply();[250,800,1800,3500].forEach(ms=>setTimeout(apply,ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>setTimeout(apply,60));
document.addEventListener('swe:rendered',()=>setTimeout(apply,0));
})();
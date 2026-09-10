(()=>{
'use strict';
if(window.__SWE_DESKTOP_LAYOUT_4325)return;window.__SWE_DESKTOP_LAYOUT_4325=true;
function install(){
 if(document.getElementById('sweDesktopLayout4325'))return;
 const s=document.createElement('style');
 s.id='sweDesktopLayout4325';
 s.textContent=`
@media (min-width:900px){
  .app{
    width:min(1360px,calc(100% - 32px))!important;
    max-width:1360px!important;
    margin:0 auto!important;
    padding-left:222px!important;
    padding-right:18px!important;
    padding-bottom:30px!important;
  }
  #main{
    width:100%!important;
    max-width:none!important;
    min-width:0!important;
  }
  #main>.top,
  #main>.card,
  #main>.view,
  #main>div,
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
  }
  .tabs{
    left:max(18px,calc(50% - 664px))!important;
    width:192px!important;
  }
  #view-myplayer .card,
  #view-home .card,
  #view-tournaments .card,
  #view-matches .card,
  #view-players .card{
    width:100%!important;
    max-width:none!important;
  }
  #swePlayerIdentity4321 .swe4321-grid{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    column-gap:20px!important;
    row-gap:14px!important;
  }
  #swePlayerIdentity4321 .swe4321-wide{
    grid-column:1/-1!important;
  }
}
@media (min-width:1200px){
  .app{width:min(1380px,calc(100% - 40px))!important;max-width:1380px!important;padding-left:228px!important;padding-right:22px!important}
  .top{padding:22px 26px!important}
  .card{padding:20px 22px!important}
}
@media (min-width:900px) and (max-width:1199px){
  .app{width:calc(100% - 20px)!important;max-width:none!important;padding-left:212px!important;padding-right:12px!important}
  .tabs{left:12px!important;width:188px!important}
}
`;
 document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.addEventListener('pageshow',install);
})();
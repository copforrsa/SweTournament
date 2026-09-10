(()=>{
'use strict';
if(window.__SWE_DESKTOP_LAYOUT_4324)return;window.__SWE_DESKTOP_LAYOUT_4324=true;
function install(){
 if(document.getElementById('sweDesktopLayout4324'))return;
 const s=document.createElement('style');
 s.id='sweDesktopLayout4324';
 s.textContent=`
@media (min-width:900px){
  .app{
    width:calc(100vw - 24px)!important;
    max-width:1900px!important;
    margin:0 auto!important;
    padding-left:226px!important;
    padding-right:14px!important;
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
    left:18px!important;
    width:194px!important;
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
    column-gap:22px!important;
    row-gap:14px!important;
  }
  #swePlayerIdentity4321 .swe4321-wide{
    grid-column:1/-1!important;
  }
}
@media (min-width:1200px){
  .app{
    width:calc(100vw - 28px)!important;
    max-width:1900px!important;
    padding-left:230px!important;
    padding-right:18px!important;
  }
  .top{padding:22px 28px!important}
  .card{padding:21px 24px!important}
}
@media (min-width:1500px){
  .app{
    width:calc(100vw - 32px)!important;
    max-width:1920px!important;
    padding-left:236px!important;
    padding-right:20px!important;
  }
  .tabs{width:200px!important}
}
@media (min-width:900px) and (max-width:1199px){
  .app{width:calc(100vw - 16px)!important;padding-left:212px!important;padding-right:10px!important}
  .tabs{left:10px!important;width:188px!important}
}
`;
 document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.addEventListener('pageshow',install);
})();
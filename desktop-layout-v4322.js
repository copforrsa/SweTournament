(()=>{
'use strict';
if(window.__SWE_DESKTOP_LAYOUT_4322)return;window.__SWE_DESKTOP_LAYOUT_4322=true;
function install(){
 if(document.getElementById('sweDesktopLayout4322'))return;
 const s=document.createElement('style');
 s.id='sweDesktopLayout4322';
 s.textContent=`
@media (min-width:900px){
  .app{
    width:min(1480px,calc(100% - 32px))!important;
    max-width:none!important;
    margin:0 auto!important;
    padding-left:238px!important;
    padding-right:18px!important;
    padding-bottom:30px!important;
  }
  .tabs{
    left:max(18px,calc(50% - 724px))!important;
    width:194px!important;
  }
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
  #view-myplayer .card,
  #view-home .card{
    width:100%!important;
    max-width:none!important;
  }
  #swePlayerIdentity4321 .swe4321-grid{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    column-gap:18px!important;
    row-gap:14px!important;
  }
  #swePlayerIdentity4321 .swe4321-wide{
    grid-column:1/-1!important;
  }
}
@media (min-width:1200px){
  .app{width:min(1520px,calc(100% - 40px))!important;padding-left:244px!important;padding-right:24px!important}
  .top{padding:22px 26px!important}
  .card{padding:20px 22px!important}
}
@media (min-width:900px) and (max-width:1199px){
  .app{width:calc(100% - 20px)!important;padding-left:218px!important}
  .tabs{left:14px!important;width:188px!important}
}
`;
 document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.addEventListener('pageshow',install);
})();
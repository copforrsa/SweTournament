(()=>{
'use strict';
const VERSION='42.29';
function setVersion(){document.title=document.title.replace(/V42\.\d+/,'V'+VERSION);document.querySelectorAll('h1 span').forEach(x=>{if(/^V42\./.test(x.textContent.trim()))x.textContent='V'+VERSION});document.querySelectorAll('.build-badge').forEach(x=>x.textContent='MAJ '+VERSION)}
function liveUrl(){try{const t=typeof currentTour==='function'?currentTour():null;if(!t)return '';const u=new URL('./live.html',location.href);if(t.short_code)u.searchParams.set('s',String(t.short_code).toUpperCase());else{if(!S?.workspace?.public_token)return '';u.searchParams.set('public',S.workspace.public_token);u.searchParams.set('tournament',t.id)}return u.toString()}catch(_){return ''}}
function ensureLiveCard(){
  if(typeof S==='undefined'||!S?.workspace||typeof currentTour!=='function')return;
  const t=currentTour(),view=document.getElementById('view-tournaments');
  if(!view||!t)return;
  let card=document.getElementById('sweLiveShareCard');
  if(!card){card=document.createElement('div');card.id='sweLiveShareCard';card.className='card';card.style.border='2px solid #79b7ff';card.style.background='#f4f9ff';card.style.marginBottom='12px';view.insertAdjacentElement('afterbegin',card)}
  const url=liveUrl();
  card.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap"><div style="min-width:240px;flex:1"><div style="font-size:17px;font-weight:900">📡 Suivi Live du tournoi</div><div class="muted" style="margin-top:4px"><b>'+String(t.name||'Tournoi SWÉ').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</b>'+(t.tournament_date?' • '+t.tournament_date:'')+'</div><div class="muted" style="margin-top:5px">Lien séparé de l’inscription : équipes, remplaçants, classement et résultats de ce tournoi uniquement.</div><input id="sweLiveLinkField" readonly value="'+String(url).replace(/"/g,'&quot;')+'" style="margin-top:9px;width:100%;font-size:12px"></div><div class="row" style="flex-wrap:wrap"><button id="sweCopyLiveLink" class="primary">📋 Copier le lien Live</button><button id="sweOpenLiveLink">👁️ Ouvrir le Live</button></div></div>';
  const copy=card.querySelector('#sweCopyLiveLink'),open=card.querySelector('#sweOpenLiveLink'),field=card.querySelector('#sweLiveLinkField');
  copy.disabled=!url;open.disabled=!url;
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(url);toast('Lien Live copié ✅')}catch(_){field?.select();document.execCommand?.('copy');toast('Lien Live copié ✅')}};
  open.onclick=()=>{if(url)window.open(url,'_blank','noopener,noreferrer')};
}
function relabelAcademy(){document.querySelectorAll('#publicView *').forEach(el=>{if(el.children.length)return;const txt=el.textContent||'';if(txt.includes('Chien Boul Academy :')&&!txt.includes('Note équipe évaluée par Chien Boul Academy :'))el.textContent=txt.replace('Chien Boul Academy :','Note équipe évaluée par Chien Boul Academy :')})}
let scheduled=false;function apply(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;setVersion();ensureLiveCard();relabelAcademy()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();

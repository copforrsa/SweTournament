(()=>{
'use strict';
if(window.__SWE_TOURNAMENT_LINKS_WHATSAPP_4357)return;
window.__SWE_TOURNAMENT_LINKS_WHATSAPP_4357=true;

const norm=s=>String(s||'').replace(/\s+/g,' ').trim();

function currentTournamentName(){
  try{
    if(typeof currentTour==='function'){
      const t=currentTour();
      if(t?.name)return norm(t.name);
      if(t?.tournament_date)return 'SWÉ du '+new Date(t.tournament_date+'T12:00:00').toLocaleDateString('fr-FR');
    }
  }catch(_){}
  const selectors=[
    '#workspaceSwitcher option:checked',
    '#tournamentSelect option:checked',
    '#teamCompetitionSelect option:checked',
    '#matchCompetitionSelect option:checked'
  ];
  for(const sel of selectors){
    const el=document.querySelector(sel);
    const txt=norm(el?.textContent);
    if(txt&& !/choisir|co-gestionnaire|administrateur/i.test(txt))return txt;
  }
  return 'ton SWÉ';
}

function messageFor(kind,url){
  const name=currentTournamentName();
  if(kind==='registration'){
    return `⚽🔥 ${name} arrive !\nLes inscriptions sont ouvertes 😎 Tu viens jouer avec nous ? 👇\n${url}`;
  }
  if(kind==='live'){
    return `📣⚽ ${name} est lancé !\nSuis les matchs, les scores et le classement en direct 👀🔥👇\n${url}`;
  }
  return `💳🔒 ${name} • suivi des paiements\nLien privé à partager uniquement avec les personnes concernées 👇\n${url}`;
}

function detectKind(card){
  const txt=norm(card?.textContent).toLowerCase();
  if(txt.includes('suivi live'))return 'live';
  if(txt.includes('suivi des paiements'))return 'payment';
  if(txt.includes('inscription'))return 'registration';
  return null;
}

function getUrl(card){
  const input=[...card.querySelectorAll('input')].find(i=>/^https?:\/\//i.test(String(i.value||'').trim()));
  if(input?.value)return input.value.trim();
  const a=[...card.querySelectorAll('a[href]')].find(x=>/^https?:\/\//i.test(x.href));
  return a?.href||'';
}

function makeButton(card,kind,url){
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='swe4357-whatsapp-share';
  btn.innerHTML='<span aria-hidden="true">💬</span> WhatsApp';
  btn.title=kind==='payment'?'Partager ce lien privé sur WhatsApp':'Partager ce lien sur WhatsApp';
  btn.addEventListener('click',()=>{
    const fresh=getUrl(card)||url;
    if(!fresh)return;
    const msg=messageFor(kind,fresh);
    const wa='https://wa.me/?text='+encodeURIComponent(msg);
    window.open(wa,'_blank','noopener,noreferrer');
  });
  return btn;
}

function installCss(){
  if(document.getElementById('swe4357WhatsappCss'))return;
  const s=document.createElement('style');
  s.id='swe4357WhatsappCss';
  s.textContent=`
  .swe4357-whatsapp-share{border:0!important;background:#25D366!important;color:#073b19!important;font-weight:900!important;border-radius:14px!important;padding:12px 16px!important;min-height:44px!important;box-shadow:0 6px 16px rgba(37,211,102,.18)!important;white-space:nowrap!important;cursor:pointer!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important}
  .swe4357-whatsapp-share:hover{filter:brightness(.97);transform:translateY(-1px)}
  .swe4357-whatsapp-share:active{transform:translateY(0)}
  @media(max-width:720px){.swe4357-whatsapp-share{width:100%!important;margin-top:8px!important}}
  `;
  document.head.appendChild(s);
}

function enhance(){
  installCss();
  const candidates=[...document.querySelectorAll('#main .card, #main .player, #main section, #main div')];
  const seen=new Set();
  for(const card of candidates){
    const kind=detectKind(card);
    if(!kind)continue;
    const url=getUrl(card);
    if(!url)continue;
    const key=kind+'|'+url;
    if(seen.has(key))continue;
    seen.add(key);
    if(card.querySelector('.swe4357-whatsapp-share'))continue;
    const openBtn=[...card.querySelectorAll('button,a')].find(x=>/ouvrir/i.test(norm(x.textContent)));
    const copyBtn=[...card.querySelectorAll('button,a')].find(x=>/copier/i.test(norm(x.textContent)));
    const target=openBtn?.parentElement||copyBtn?.parentElement||card;
    if(!target)continue;
    target.appendChild(makeButton(card,kind,url));
  }
}

let timer;
const schedule=()=>{clearTimeout(timer);timer=setTimeout(enhance,80)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
document.addEventListener('swe:rendered',schedule);
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view="tournaments"],#tournamentList,#newTournamentToggle'))setTimeout(schedule,120);
},true);
window.addEventListener('pageshow',schedule);
new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});
setTimeout(enhance,800);setTimeout(enhance,1800);
})();

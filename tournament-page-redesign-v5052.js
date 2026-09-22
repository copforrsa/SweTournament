(()=>{'use strict';
if(window.__SWE_TOURNAMENT_PAGE_REDESIGN_5052)return;
window.__SWE_TOURNAMENT_PAGE_REDESIGN_5052=true;
const E=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function canManage(){return typeof hasAdminOps==='function'?hasAdminOps():S?.workspace?.role==='admin';}
function base(){return typeof APP_URL==='string'?APP_URL:location.origin+'/';}
function current(){return typeof currentTour==='function'?currentTour():(S?.tournaments||[]).find(t=>String(t.id)===String(S?.activeTour));}
function registration(t){try{return typeof registrationLink==='function'?registrationLink(t):''}catch(_){return '';}}
function live(t){
 if(!t||!S?.workspace?.public_token)return '';
 if(t.short_code)return base()+'live.html?s='+encodeURIComponent(String(t.short_code).toUpperCase());
 return base()+'live.html?public='+encodeURIComponent(S.workspace.public_token)+'&tournament='+encodeURIComponent(t.id);
}
function style(){
 if(E('sweTournamentVisualRedesignCss'))return;
 const s=document.createElement('style');s.id='sweTournamentVisualRedesignCss';s.textContent=`
 #sweTournamentVisualHeader5052{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:4px 0 18px;padding:4px 2px}
 .swe-tour-page-kicker{font-size:11px;font-weight:900;letter-spacing:1.1px;text-transform:uppercase;color:#5c7895}
 .swe-tour-page-title{margin:5px 0 5px;font-size:29px;line-height:1.05;color:#0c315d}
 .swe-tour-page-copy{margin:0;color:#66829d;font-size:13px;line-height:1.45}
 .swe-tour-create-cta{border:0;border-radius:11px;padding:12px 16px;background:linear-gradient(135deg,#1475d6,#0eb8cf);color:#fff;font-weight:900;box-shadow:0 9px 20px rgba(17,111,206,.22);white-space:nowrap}
 #tournamentList{display:grid;gap:16px}
 .tournament-current-card.swe-tour-visual-current{padding:0!important;overflow:hidden;border:1px solid #d6e5f2!important;border-radius:18px!important;background:#fff!important;box-shadow:0 14px 32px rgba(13,59,106,.1)}
 .swe-tour-visual-current>.tournament-current-head{position:relative;padding:22px!important;background:linear-gradient(118deg,#09254e,#14549c 58%,#16b9cc)!important;color:#fff;border:0!important}
 .swe-tour-visual-current .tournament-current-name{color:#fff!important;font-size:26px!important;line-height:1.08}
 .swe-tour-visual-current .tournament-badges{margin-top:10px}.swe-tour-visual-current .tournament-badge{background:rgba(255,255,255,.14)!important;border-color:rgba(255,255,255,.25)!important;color:#eff9ff!important}
 .swe-tour-visual-current .tournament-info-grid{margin-top:17px!important;gap:9px!important}
 .swe-tour-visual-current .tournament-info-item{padding:10px!important;border:1px solid rgba(255,255,255,.17)!important;border-radius:11px!important;background:rgba(5,23,54,.2)!important}
 .swe-tour-visual-current .tournament-info-label,.swe-tour-visual-current .tournament-info-value{color:#e4f2ff!important}
 .swe-tour-visual-current>.tournament-current-head>button{border-color:rgba(255,255,255,.3)!important;background:rgba(5,23,54,.22)!important;color:#fff!important}
 .swe-tour-share5052{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:14px 20px;border-bottom:1px solid #dce8f2;background:#f7fbff}
 .swe-tour-share5052>b{font-size:12px;color:#305777;margin-right:3px}.swe-tour-share5052 button{border:1px solid #cbddeb;border-radius:9px;background:#fff;color:#155083;padding:8px 10px;font-size:12px;font-weight:800}
 .swe-tour-share5052 .live{border-color:#efc64e;background:#fff8df;color:#79570a}
 .swe-tour-actions5052{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:17px 20px;background:#fff}
 .swe-tour-actions5052 button{min-height:88px;padding:13px;border:1px solid #dce8f2;border-radius:13px;background:#fbfdff;color:#173f69;text-align:left;font-weight:900}
 .swe-tour-actions5052 button span{display:block;margin-top:5px;color:#7189a1;font-size:11px;font-weight:500;line-height:1.35}
 .swe-tour-visual-current>.tournament-admin-block{margin:0 20px 18px!important;border-radius:14px!important;box-shadow:none!important}
 #tournamentList>h2.sectiontitle{margin:22px 0 0!important;color:#123b67}
 #tournamentList>.player:not(.tournament-current-card){border:1px solid #dae7f1!important;border-radius:14px!important;padding:15px!important;background:#fff!important}
 @media(max-width:700px){#sweTournamentVisualHeader5052{align-items:stretch;flex-direction:column}.swe-tour-create-cta{width:100%}.swe-tour-page-title{font-size:26px}.swe-tour-visual-current>.tournament-current-head{padding:17px!important}.swe-tour-visual-current .tournament-current-name{font-size:22px!important}.swe-tour-share5052{padding:13px 16px}.swe-tour-actions5052{grid-template-columns:repeat(2,minmax(0,1fr));padding:14px 16px}.swe-tour-visual-current>.tournament-admin-block{margin:0 16px 16px!important}}
 `;document.head.appendChild(s);
}
async function copy(url,label){
 if(!url){if(typeof toast==='function')toast('Lien indisponible pour ce tournoi.');return;}
 try{await navigator.clipboard.writeText(url);if(typeof toast==='function')toast(label+' copié ✅');}
 catch(_){prompt('Copie ce lien :',url);}
}
function navigate(view){document.querySelector('[data-view="'+view+'"]')?.click();}
function focusAdmin(card){card.querySelector('.tournament-admin-block')?.scrollIntoView({behavior:'smooth',block:'start'});}
function build(){
 const list=E('tournamentList');if(!list)return;
 style();
 let header=E('sweTournamentVisualHeader5052');
 if(!header){header=document.createElement('header');header.id='sweTournamentVisualHeader5052';list.parentElement?.insertBefore(header,list);}
 header.innerHTML='<div><div class="swe-tour-page-kicker">Organisation SWÉ</div><h1 class="swe-tour-page-title">Tournois</h1><p class="swe-tour-page-copy">Prépare, partage et pilote chaque SWÉ depuis un espace plus lisible.</p></div>'+(canManage()?'<button type="button" class="swe-tour-create-cta">＋ Créer un tournoi</button>':'');
 header.querySelector('.swe-tour-create-cta')?.addEventListener('click',()=>E('newTournamentToggle')?.click());
 const card=list.querySelector('.tournament-current-card');if(!card||card.dataset.sweVisual5052==='1')return;
 const t=current();if(!t)return;
 card.dataset.sweVisual5052='1';card.classList.add('swe-tour-visual-current');
 const share=document.createElement('div');share.className='swe-tour-share5052';share.innerHTML='<b>À partager</b><button type="button" data-share-register>🔗 Lien d’inscription</button><button type="button" class="live" data-share-live>⚡ SWÉ Live</button><button type="button" data-share-whatsapp>🟢 WhatsApp</button>';
 const actions=document.createElement('nav');actions.className='swe-tour-actions5052';actions.setAttribute('aria-label','Actions du tournoi');actions.innerHTML='<button type="button" data-tour-action="registration">Inscriptions<span>Ouvrir, suivre et partager.</span></button><button type="button" data-tour-action="teams">Équipes<span>Préparer les compositions.</span></button><button type="button" data-tour-action="matches">Matches<span>Lancer et saisir les résultats.</span></button><button type="button" data-tour-action="services">Services<span>Glacière, paiements et liens.</span></button>';
 const head=card.querySelector('.tournament-current-head');if(head)head.insertAdjacentElement('afterend',share);share.insertAdjacentElement('afterend',actions);
 const reg=registration(t),liveUrl=live(t);
 share.querySelector('[data-share-register]').addEventListener('click',()=>copy(reg,'Lien d’inscription'));
 share.querySelector('[data-share-live]').addEventListener('click',()=>copy(liveUrl,'Lien SWÉ Live'));
 share.querySelector('[data-share-whatsapp]').addEventListener('click',()=>{if(!reg)return typeof toast==='function'&&toast('Lien d’inscription indisponible.');const msg='⚽ '+(t.name||'Nouveau SWÉ')+' • '+(t.tournament_date||'')+'\n👉 '+reg;window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank','noopener');});
 actions.querySelectorAll('[data-tour-action]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.tourAction;if(a==='teams'||a==='matches')navigate(a);else focusAdmin(card);}));
}
function schedule(){setTimeout(build,80);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
document.addEventListener('swe:rendered',schedule);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="tournaments"],#newTournamentToggle'))schedule();},true);
})();
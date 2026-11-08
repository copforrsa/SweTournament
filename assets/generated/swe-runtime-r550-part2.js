/* SWÉ consolidated runtime R550 — segment 2/3. Original files retained for rollback. */

;
/* SOURCE hotfix-v4237.js */
(()=>{
'use strict';
let busy=false;
const esc37=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
function activeMatches(){return document.getElementById('view-matches')?.classList.contains('active');}
function teamName(id){try{return (S.teams||[]).find(t=>String(t.id)===String(id))?.name||'Équipe';}catch(_){return 'Équipe';}}
async function createRematch(match,button){
  if(busy)return;
  const t=typeof currentTour==='function'?currentTour():null;
  if(!t||t.status==='finished')return toast('Le tournoi est terminé.');
  if(typeof canEditCurrentMatches==='function'&&!canEditCurrentMatches())return toast('Tu n’es pas autorisé à créer un match.');
  busy=true;button.disabled=true;
  try{
    const order=(S.matches||[]).length+1;
    const {error}=await sb.from('matches').insert({
      tournament_id:t.id,
      home_team_id:match.home_team_id,
      away_team_id:match.away_team_id,
      match_order:order,
      pitch:match.pitch||null,
      round_label:'Rematch '+teamName(match.home_team_id)+' / '+teamName(match.away_team_id)
    });
    if(error)throw error;
    await loadTournament();
    renderMatches();
    toast('Rematch créé ✅');
  }catch(e){toast(e?.message||'Impossible de recréer ce match.');}
  finally{busy=false;button.disabled=false;}
}
function decorateScoreGrid(card,match){
  if(card.dataset.scoreReadable37==='1')return;
  const buttons=[...card.querySelectorAll('button')];
  const scoreBtn=buttons.find(b=>/score/i.test(b.textContent||''));
  if(!scoreBtn)return;
  const grid=scoreBtn.parentElement;
  if(!grid||grid.querySelector('[data-swe-score-title]'))return;
  const inputs=[...grid.querySelectorAll('input[type="number"]')];
  if(inputs.length<2)return;
  card.dataset.scoreReadable37='1';
  const home=teamName(match.home_team_id),away=teamName(match.away_team_id);
  const title=document.createElement('div');
  title.dataset.sweScoreTitle='1';
  title.style.cssText='margin:10px 0 6px;font-weight:900;font-size:13px';
  title.textContent='⚡ Score manuel • '+home+' vs '+away;
  grid.insertAdjacentElement('beforebegin',title);
  [[inputs[0],home],[inputs[1],away]].forEach(([input,name])=>{
    if(input.parentElement?.dataset?.sweScoreLabel)return;
    const label=document.createElement('label');label.dataset.sweScoreLabel='1';label.style.cssText='display:block;min-width:0';
    const span=document.createElement('span');span.textContent=name;span.style.cssText='display:block;font-size:11px;font-weight:800;margin:0 0 4px;color:#52645a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    input.insertAdjacentElement('beforebegin',label);label.append(span,input);
  });
  scoreBtn.textContent='💾 Enregistrer';
}
function collapsePlayerPanel(card){
  if(card.dataset.compactPlayers37==='1')return;
  const marker=[...card.querySelectorAll('b,strong,h3')].find(x=>/Joueurs de ce match/i.test(x.textContent||''));
  if(!marker)return;
  let panel=marker.closest('.player');
  if(!panel){panel=marker.parentElement?.parentElement;}
  if(!panel||panel===card||panel.closest('details[data-swe-compact-players]'))return;
  const details=document.createElement('details');details.dataset.sweCompactPlayers='1';details.style.cssText='margin-top:9px;border:1px solid #e4ebe7;border-radius:12px;padding:8px 10px;background:#fbfdfc';
  const summary=document.createElement('summary');summary.style.cssText='cursor:pointer;font-weight:900';summary.textContent='🔄 Remplacements & joueurs du match';
  panel.insertAdjacentElement('beforebegin',details);details.append(summary,panel);panel.style.marginTop='8px';
  card.dataset.compactPlayers37='1';
}
function addRematchButton(card,match){
  if(card.querySelector('[data-swe-rematch37]'))return;
  const row=document.createElement('div');row.style.cssText='display:flex;justify-content:flex-end;margin-top:8px';
  const b=document.createElement('button');b.type='button';b.dataset.sweRematch37='1';b.textContent='🔁 Recréer ce match';b.style.cssText='font-weight:800';
  b.onclick=()=>createRematch(match,b);row.appendChild(b);card.appendChild(row);
}
function enhanceMatches37(){
  if(typeof S==='undefined'||!activeMatches())return;
  const cards=[...document.querySelectorAll('#matchesList .match')];
  cards.forEach((card,i)=>{
    const match=(S.matches||[])[i];if(!match)return;
    decorateScoreGrid(card,match);
    collapsePlayerPanel(card);
    addRematchButton(card,match);
  });
}
function tick37(){enhanceMatches37();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick37,{once:true});else tick37();
document.addEventListener('swe:rendered',tick37);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="matches"],.tab'))setTimeout(tick37,250)},true);
})();

;

;
/* SOURCE hotfix-v4240.js */
(()=>{
'use strict';
const VERSION='42.40';
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
function setVersion(){window.SWEApplyBuild?.();}
function decoratePlayers(){
  if(typeof S==='undefined'||!document.getElementById('view-players')?.classList.contains('active'))return;
  const box=document.getElementById('playersList');if(!box)return;
  let legend=document.getElementById('sweGuestLegend40');
  if(!legend){legend=document.createElement('div');legend.id='sweGuestLegend40';legend.className='readonly-note';legend.style.marginBottom='10px';legend.innerHTML='👥 <b>Lecture de la liste :</b> les fiches grisées sont des <b>invités</b> et ne font pas partie du groupe. Les membres du groupe restent affichés normalement.';box.insertAdjacentElement('beforebegin',legend)}
  const cards=[...box.children].filter(c=>c.classList?.contains('player'));
  (S.players||[]).forEach(pl=>{const card=cards.find(c=>c.querySelector(':scope > .row > span:first-child > b')?.textContent.trim()===String(pl.name||'').trim());if(!card)return;card.style.opacity=pl.is_group_member===false?'.58':'1';card.style.background=pl.is_group_member===false?'#f1f3f2':'';let badge=card.querySelector('[data-group-state40]');if(!badge){badge=document.createElement('div');badge.dataset.groupState40='1';badge.style.cssText='margin-top:4px;font-size:11px;font-weight:800';card.querySelector(':scope > .row > span:first-child')?.appendChild(badge)}badge.textContent=pl.is_group_member===false?'Invité • ne fait pas partie du groupe':'Membre du groupe';badge.style.color=pl.is_group_member===false?'#6b7280':'#15803d';});
}
function joinedNewcomers(){
  if(typeof S==='undefined')return;
  const ids=new Set((S.players||[]).filter(p=>p.is_group_member!==false).map(p=>String(p.id)));
  document.querySelectorAll('[id*="new" i],[class*="new" i]').forEach(root=>{if(!/nouve/i.test(root.textContent||''))return;root.querySelectorAll('.player,.rank,li').forEach(row=>{const pl=(S.players||[]).find(p=>ids.has(String(p.id))&&row.textContent?.includes(p.name));if(!pl||row.querySelector('[data-joined40]'))return;row.style.opacity='.58';const tag=document.createElement('span');tag.dataset.joined40='1';tag.textContent=' • A rejoint le groupe';tag.style.cssText='font-size:11px;font-weight:800;color:#15803d';row.appendChild(tag)});});
}
function apply(){setVersion();decoratePlayers();joinedNewcomers()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();document.addEventListener('swe:rendered',apply);document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="players"],.tab'))setTimeout(apply,150)},true);
})();
;

;
/* SOURCE hotfix-v4239.js */
(()=>{
'use strict';
const VERSION='42.39';
const activeMatches=()=>document.getElementById('view-matches')?.classList.contains('active');
const editingMain=()=>{const a=document.activeElement;return !!(a&&a.closest?.('#main')&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable));};
function setVersion(){window.SWEApplyBuild?.();}
function protectedReload(){
  if(document.getElementById('sweDrawRoom4453')||activeMatches()||editingMain())return;
  clearTimeout(window.__sweRealtimeGuardTimer39);
  window.__sweRealtimeGuardTimer39=setTimeout(async()=>{
    if(document.getElementById('sweDrawRoom4453')||activeMatches()||editingMain())return;
    try{await loadAll();}catch(e){console.warn('realtime guarded reload',e);}
  },450);
}
function guardedSubscribe(){
  try{
    if(typeof S==='undefined'||typeof sb==='undefined')return;
    if(S.channel)sb.removeChannel(S.channel);
    let ch=sb.channel('tournoi-manager-v4239');
    ['players','seasons','tournaments','tournament_players','teams','team_players','matches','goals','match_player_assignments'].forEach(table=>{
      ch=ch.on('postgres_changes',{event:'*',schema:'public',table},protectedReload);
    });
    S.channel=ch.subscribe();
  }catch(e){console.warn('guardedSubscribe',e);}
}
try{subscribeRealtime=guardedSubscribe;}catch(_){}
function install(){setVersion();guardedSubscribe();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
document.addEventListener('swe:rendered',()=>{setVersion();});
// Pendant l'écran Matchs, les synchros de sécurité existantes voient l'utilisateur comme actif.
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view="matches"],#view-matches,.tab')){
    try{if(activeMatches()&&typeof lastUserInteractionAt!=='undefined')lastUserInteractionAt=Date.now()+21600000;}catch(_){}
  }
},true);
// Dès qu'on saisit un score, verrouillage de 6 h maximum; quitter Matchs libère naturellement le garde realtime.
document.addEventListener('focusin',e=>{
  if(activeMatches()&&e.target.closest?.('#view-matches')){
    try{if(typeof lastUserInteractionAt!=='undefined')lastUserInteractionAt=Date.now()+21600000;}catch(_){}
  }
},true);
})();

;

;
/* SOURCE hotfix-v4244.js */
(()=>{
'use strict';
const BUILD=window.SWE_BUILD_VERSION;
window.__SWE_PAYMENT_AUTHORITY_ACTIVE=true;
function applyBuild(){window.SWEApplyBuild?.();}
async function purgeLegacyClient(){
  // Migration V50.15 : conserve la PWA et son cache réseau-d'abord.
  try{localStorage.setItem('swe-pwa-runtime-v5015','1')}catch(_){}
}
function loadCss(href,key){if(document.querySelector('link[data-swe-style="'+key+'"]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset.sweStyle=key;document.head.appendChild(l)}
function load(src,key){return new Promise(resolve=>{if(document.querySelector('script[data-swe-loader="'+key+'"]'))return resolve();const s=document.createElement('script');let done=false;const finish=()=>{if(done)return;done=true;resolve()};s.src=src;s.async=false;s.dataset.sweLoader=key;s.onload=finish;s.onerror=()=>{console.warn('SWÉ: module non chargé',key);finish()};document.body.appendChild(s);setTimeout(finish,6000)})}
function mobileClient(){return matchMedia('(max-width: 760px)').matches||navigator.maxTouchPoints>1}
async function boot(){
 const pending=[];
 // Appendre tous les scripts sans attendre chaque réponse réseau. async=false
 // garantit leur exécution dans l'ordre d'insertion (dépendances préservées).
 const queue=(src,key)=>{pending.push(load(src,key));};
 // Chargements redondants retirés : les modules du bundle et les scripts déjà demandés
 // ne doivent pas être relancés avec une autre URL de version.
 applyBuild();purgeLegacyClient();loadCss('/desktop-layout-v4328.css?v=4377','desktop-layout-v4328');document.documentElement.dataset.sweMatchClient=mobileClient()?'mobile':'desktop';
 queue('/hotfix-v4269-rating-update.js?v=4400','v4269-rating-update-v4400');
 queue('/player-experience-v4349.js?v=4424-cooler-health-scope','player-experience-v4349-v4400');
 queue('/hotfix-v4278-rating-cooler-president.js?v=4463-no-self-rating','v4278-rating-cooler-president-v4401');
 queue('/brand-refresh-v4347.js?v=4377','brand-refresh-v4347');
 queue('/version-notice-v4346.js?v=5000','version-notice-v4346');
 queue('/admin-access-gate-v4258.js?v=4377','admin-access-gate');
 queue('/hotfix-v4250-invite-auth.js?v=4377','invite-auth');
 queue('/legacy-hotfix-v4244.js?v=5112-player-label','legacy4244');queue('/hotfix-v4246.js?v=4377','v4246');queue('/hotfix-v4248.js?v=4377','v4248');queue('/hotfix-v4250.js?v=4377','v4250');queue('/hotfix-v4254-auth-stability.js?v=4377','v4254-auth-stability');
 queue('/hotfix-v4263-public-registration-guard.js?v=4377','v4263-public-registration-guard');queue('/hotfix-v4266-public-payment-maps.js?v=4377-invitation1','v4266-public-payment-maps');queue('/hotfix-v4268-flex-format-payment.js?v=4377-invitation1','v4268-flex-format-payment');
 queue('/hotfix-v4270-coorg-fun.js?v=4377','v4270-coorg-fun');queue('/hotfix-v4271-whatsapp-avatar.js?v=4377','v4271-whatsapp-avatar');queue('/hotfix-v4272-profile-registration.js?v=4377','v4272-profile-registration');
 queue('/player-contact-profile-v4321.js?v=4405','player-contact-profile-v4405');queue('/player-id-display-v4313.js?v=4377','player-id-display-v4313');queue('/player-profile-organizer-v4337.js?v=4399-player-r3','player-profile-organizer-v4337');queue('/player-health-badge-fix-v4358.js?v=4424-cooler-health-scope','player-health-badge-fix-v4358');queue('/player-experience-v4340.js?v=4424-cooler-health-scope','player-experience-v4340');queue('/player-card-v4344.js?v=4399-player-r4','player-card-v4344');queue('/account-password-v4343.js?v=4377','account-password-v4343');queue('/player-profile-actions-v4348.js?v=4377','player-profile-actions-v4348');queue('/profile-coorg-photo-guard-v4354.js?v=4406-pilot-photo','profile-coorg-photo-guard-v4354');// Ancien lanceur retiré : doublon de #swePlayerCreateQuick et ouverture privée obsolète.queue('/tournament-compact-v4349.js?v=4377','tournament-compact-v4349');queue('/tournament-links-share-v4359.js?v=5061-external-payment-links','tournament-links-share-v4359');
 queue('/hotfix-v4273-payment-ratings-ui.js?v=4377-invitation1','v4273-payment-ratings-ui');queue('/hotfix-v4274-payment-rating-admin.js?v=4377-invitation1','hotfix-v4274-payment-rating-admin');queue('/coorganizer-selfpay-v4308.js?v=4399-player-r7','coorganizer-selfpay-v4308');queue('/hotfix-v4276-evaluation-reports.js?v=5069-all-rating-voters','v4276-evaluation-reports');queue('/hotfix-v4277-evaluation-progress.js?v=4398-edge-stable','v4277-evaluation-progress');queue('/hotfix-v4279-payment-authority.js?v=4377-invitation1','v4279-payment-authority');queue('/hotfix-v4280-registration-status.js?v=4377','v4280-registration-status');if((new URLSearchParams(location.search).get('start')||'').toLowerCase()!=='player')queue('/hotfix-v4281-complex-home.js?v=4377','v4281-complex-home');queue('/hotfix-v4282-partner-booking.js?v=4377','v4282-partner-booking');queue('/hotfix-v4283-stability-security.js?v=4377','v4283-stability-security');
 queue('/auth-player-clean-v4315.js?v=4412','auth-player-clean-v4318');loadCss('/player-entry-layout-v4330.css?v=4413','player-entry-layout-v4330');queue('/coorg-tab-rights-v4319.js?v=4399-player-r9','coorg-tab-rights-v4321-r9');queue('/match-rating-rules-v4323.js?v=4377','match-rating-rules-v4323');
 queue('/quick-match-v4460.js?v=5091-fast-conquest','quick-match-v4460');queue('/match-team-select-v4309.js?v=4377','match-team-select-v4309');queue('/ui-stability-v4331.js?v=4377','ui-stability-v4331');queue('/match-numbering-v4311.js?v=4377','match-numbering-v4311');queue('/match-actions-v4303.js?v=4377','match-actions-v4303');queue('/match-rotation-v4306.js?v=5603-king-opening-penalties','match-rotation-v4306');queue('/match-tiebreak-persist-v4313.js?v=4377','match-tiebreak-persist-v4313');
 queue('/coorganizer-dashboard-v4399.js?v=5101-pending-room','coorganizer-dashboard-v4401');
 queue('/match-extras-v4306.js?v=5603-king-opening-penalties','match-extras-v4306');queue('/tournament-king-config-v4306.js?v=4377','tournament-king-config-v4306');queue('/live-enhance-v4306.js?v=4377','live-enhance-v4306');queue('/match-realtime-v4304.js?v=5035-conquest-live','match-realtime-v4361');queue('/match-tab-recovery-v4355.js?v=4377','match-tab-recovery-v4363');queue('/match-refresh-guard-v4361.js?v=4377','match-refresh-guard-v4361');queue('/public-registration-lock-v4307.js?v=4377','public-registration-lock-v4307');
 queue('/auth-access-clean-v4352.js?v=4399-player-r9','auth-access-clean-v4352-r9');queue('/mobile-nav-v4361.js?v=4469','mobile-nav-v4361-4469');queue('/coorganizer-invite-reliability-v4392.js?v=4392','coorganizer-invite-reliability-v4392');queue('/player-activity-attendance-v4393.js?v=4398-edge-stable','player-activity-attendance-v4393');queue('/coorg-admin-polish-v5011.js?v=5012','coorg-admin-polish-v5011');queue('/rating-report-reliability-v4394.js?v=5064-rating-counts','rating-report-reliability-v4394');
 queue('/player-profile-compact.js?v=4399-player-r1','player-profile-compact');
 
 queue('/coorganizer-insights-v4400.js?v=4401','coorganizer-insights-v4401');
 
 queue('/football-avatar-picker-v4404.js?v=4405','football-avatar-picker-v4405');
 queue('/player-profile-fixes-v4404.js?v=4404b','player-profile-fixes-v4404');
 queue('/superadmin-rating-correction-v4400.js?v=4400','superadmin-rating-correction-v4400');
 queue('/navigation-ranking-r9.js?v=4405','navigation-ranking-r12');
 queue('/ranking-premium-visuals-v4405.js?v=4405','ranking-premium-visuals-v4405');
 queue('/substitute-fair-play-rules-v4406.js?v=4406','substitute-fair-play-rules-v4406');
 queue('/player-rating-progress-v4462.js?v=4462','player-rating-progress-v4462');
 queue('/players-directory-nav-v4477.js?v=5090-player-readability','players-directory-nav-v4477');
 await Promise.all(pending);
 applyBuild();setTimeout(applyBuild,250);setTimeout(applyBuild,1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.addEventListener('pageshow',()=>setTimeout(applyBuild,50));document.addEventListener('swe:rendered',()=>setTimeout(applyBuild,0));
})();

;

;
/* SOURCE match-refresh-coorg-v4458.js */
/* SWÉ v4458 — rafraîchissement ciblé des matchs et notifications co-gestionnaires. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const state=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
  const client=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};
  const admin=()=>{try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}};
  const activeTournament=()=>{try{return typeof currentTour==='function'?currentTour():null}catch(_){return null}};
  const notify=message=>{try{if(typeof toast==='function')toast(message)}catch(_){}};
  const key=()=>`swe-coorg-accepted:${state()?.workspace?.id||''}`;
  let initializedWorkspace='';

  function acceptedInvites(){
    return (state()?.invites||[]).filter(i=>i.role==='coorganizer'&&i.accepted_at&&i.id);
  }
  function updateCoorgNotification(){
    const S=state();
    if(!admin()||!S?.workspace?.id)return;
    const workspace=String(S.workspace.id);
    const ids=acceptedInvites().map(i=>String(i.id));
    if(initializedWorkspace!==workspace){
      initializedWorkspace=workspace;
      const stored=localStorage.getItem(key());
      if(stored===null)localStorage.setItem(key(),JSON.stringify(ids));
    }
    let seen=[];
    try{seen=JSON.parse(localStorage.getItem(key())||'[]')}catch(e){}
    const fresh=ids.filter(id=>!seen.includes(id));
    const badge=$('coorgAcceptedBadge');
    if(badge){
      badge.classList.toggle('hidden',!fresh.length);
      badge.textContent=fresh.length>9?'9+':String(fresh.length);
      badge.style.cssText='margin-left:5px;display:inline-flex;min-width:18px;height:18px;padding:0 5px;align-items:center;justify-content:center;border-radius:999px;background:#e11d48;color:#fff;font-size:11px;font-weight:900;vertical-align:middle';
    }
    if(fresh.length)document.querySelector('.tab[data-view="coorganizers"]')?.setAttribute('title',fresh.length+' nouvelle'+(fresh.length>1?'s':'')+' invitation'+(fresh.length>1?'s':'')+' acceptée'+(fresh.length>1?'s':''));
  }
  function markCoorgNotificationRead(){
    if(!state()?.workspace?.id)return;
    localStorage.setItem(key(),JSON.stringify(acceptedInvites().map(i=>String(i.id))));
    updateCoorgNotification();
  }
  async function refreshMatches(btn){
    const S=state(), database=client(), tournament=activeTournament();
    if(!S||!tournament||!database)return notify('Choisis d’abord une compétition.');
    const label=btn.textContent;
    btn.disabled=true;btn.textContent='Actualisation…';
    try{
      const tId=tournament.id;
      const [matchesRes,teamsRes,playersRes]=await Promise.all([
        database.from('matches').select('*').eq('tournament_id',tId).order('match_order'),
        database.from('teams').select('*').eq('tournament_id',tId).order('created_at'),
        database.from('tournament_players').select('*').eq('tournament_id',tId)
      ]);
      if(matchesRes.error)throw matchesRes.error;
      if(teamsRes.error)throw teamsRes.error;
      if(playersRes.error)throw playersRes.error;
      S.matches=matchesRes.data||[];S.teams=teamsRes.data||[];S.tPlayers=playersRes.data||[];
      const teamIds=S.teams.map(t=>t.id),matchIds=S.matches.map(m=>m.id);
      const [teamPlayersRes,goalsRes,assignmentsRes]=await Promise.all([
        teamIds.length?database.from('team_players').select('*').in('team_id',teamIds):Promise.resolve({data:[],error:null}),
        matchIds.length?database.from('goals').select('*').in('match_id',matchIds).order('created_at'):Promise.resolve({data:[],error:null}),
        matchIds.length?database.from('match_player_assignments').select('*').in('match_id',matchIds):Promise.resolve({data:[],error:null})
      ]);
      if(teamPlayersRes.error||goalsRes.error||assignmentsRes.error)throw(teamPlayersRes.error||goalsRes.error||assignmentsRes.error);
      S.teamPlayers=teamPlayersRes.data||[];S.goals=goalsRes.data||[];S.matchAssignments=assignmentsRes.data||[];
      if(typeof renderMatches==='function')renderMatches();
      if(typeof renderTeams==='function')renderTeams();
      window.SWE_MOUNT_MATCH_EXTRAS_4306?.(true);
      notify('Matchs actualisés ✅');
    }catch(error){
      console.warn('targeted match refresh',error);
      notify('Actualisation impossible. Réessaie dans un instant.');
    }finally{btn.disabled=false;btn.textContent=label;}
  }
  function installMatchRefresh(){
    const host=$('matchCompetitionSelectorCard');
    if(!host||$('refreshCurrentMatches'))return;
    const row=document.createElement('div');row.style.cssText='display:flex;justify-content:flex-end;margin-top:8px';
    row.innerHTML='<button id="refreshCurrentMatches" type="button" class="secondary" style="padding:6px 10px;font-size:12px" title="Actualiser uniquement les matchs de cette compétition">↻ Actualiser les matchs</button>';
    row.querySelector('button').addEventListener('click',e=>refreshMatches(e.currentTarget));
    host.appendChild(row);
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('.tab[data-view="coorganizers"]'))markCoorgNotificationRead();
  });
  document.addEventListener('swe:rendered',()=>{installMatchRefresh();updateCoorgNotification();});
  const wait=()=>{
    installMatchRefresh();updateCoorgNotification();
    if(!state()||!client())return setTimeout(wait,250);
  };
  wait();
})();

;

;
/* SOURCE public-history-views-v4363.js */
(()=>{
'use strict';
// Page views only. Public history is rendered once by app.js from its snapshot.
if(window.SWEPageViews)return;
const counts=new Map(),pending=new Map();let currentKey='';
function footer(text){
 let el=document.getElementById('swePageViewCount');
 if(!el){el=document.createElement('footer');el.id='swePageViewCount';el.style.cssText='display:block;width:100%;box-sizing:border-box;text-align:center;padding:12px 8px;font-size:11px;color:#64748b;margin-top:16px';document.body.appendChild(el)}
 if(el.textContent!==text)el.textContent=text;
}
function show(n){footer('👁 '+Number(n).toLocaleString('fr-FR')+' vue'+(Number(n)>1?'s':'')+' de cette page')}
async function track(page,token=null,id=null){
 const key=[page,token||'',id||''].join('|');currentKey=key;
 if(counts.has(key)){show(counts.get(key));return counts.get(key)}
 footer('Chargement des vues…');
 if(!pending.has(key))pending.set(key,(async()=>{
   const response=await fetch('https://fbppesfxkvledwjemwsn.supabase.co/rest/v1/rpc/record_swe_page_view',{method:'POST',cache:'no-store',headers:{apikey:'sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp','Content-Type':'application/json'},body:JSON.stringify({p_page:page,p_public_token:token,p_entity_id:id})});
   if(!response.ok)throw new Error('Compteur indisponible');const n=Number(await response.json());if(!Number.isFinite(n))throw new Error('Compteur indisponible');counts.set(key,n);return n;
 })());
 try{const n=await pending.get(key);if(currentKey===key)show(n);return n}catch(e){if(currentKey===key)footer('Compteur temporairement indisponible');console.warn('SWÉ vues',e.message)}finally{pending.delete(key)}
}
window.SWEPageViews={track};
function boot(){
 if(window.swePageViewContext){const c=window.swePageViewContext;track(c.page,c.token,c.id);return}
 const path=location.pathname.replace(/\/$/,'/index.html'),q=new URLSearchParams(location.search);
 if(/\/(live|season)\.html$/.test(path))return;
 if((path==='/index.html'||path==='/')&&(q.has('public')||q.has('s')))return;
 const page=/\/forssadmin\//.test(path)?'super_admin':/\/complexe\//.test(path)?'complex_portal':/complexes-partenaires/.test(path)?'complexes':/complexes-reservation/.test(path)?'reservation':/\/(c|carte-joueur)\.html$/.test(path)?'player_card':/reset-/.test(path)?'reset':'home';
 track(page);
}
document.addEventListener('swe:page-view',()=>{const c=window.swePageViewContext;if(c)track(c.page,c.token,c.id)});
document.addEventListener('swe:rendered',()=>{
 try{if(typeof S==='undefined'||S.publicMode)return;const view=S.lastView||'home';const known=['home','myplayer','players','permissions','tournaments','teams','matches','league','cooler','ranking','simple-swe'];if(known.includes(view))track('app:'+view)}catch(_){}
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

;

;
/* SOURCE team-invitation-visibility-v4435.js */
/* Public, stable summary of preformed teams and their proposal states. */
(()=>{
  'use strict';
  const URL='https://fbppesfxkvledwjemwsn.supabase.co';
  const KEY='sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp';
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const query=new URLSearchParams(location.search);
  const token=query.get('public'),tournamentId=query.get('tournament');
  if(!token||!tournamentId||!window.supabase?.createClient)return;
  const client=window.supabase.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  let groups=[],renderedKey='';

  function badge(text,style){return '<span class="guest-badge" style="margin:2px;'+(style||'')+'">'+text+'</span>';}
  function decorateList(){
    const list=$('#publicRegisteredList'); if(!list)return;
    list.querySelectorAll('.player.row').forEach(row=>{
      const text=row.textContent||'';
      const captain=groups.find(group=>group.creatorName&&text.includes(group.creatorName));
      const invitation=groups.flatMap(group=>group.invitations.map(item=>({...item,teamName:group.name}))).find(item=>item.status==='pending'&&text.includes(item.name));
      if((!captain&&!invitation)||row.querySelector('[data-team-roster-badge]'))return;
      const target=row.querySelector('span[style*="flex"]')||row.querySelector('span'); if(!target)return;
      const item=document.createElement('span'); item.dataset.teamRosterBadge='1'; item.className='guest-badge';
      if(captain){
        const complete=captain.confirmed.length>=captain.teamSize;
        item.style.cssText='display:inline-block;margin:4px 0 0 4px;'+(complete?'background:#ecfdf5;border-color:#86efac;color:#166534':'background:#eff6ff;border-color:#93c5fd;color:#1d4ed8');
        item.textContent=complete?'⚽ Équipe complète : '+captain.name:'👥 Équipe en préparation : '+captain.confirmed.length+'/'+captain.teamSize;
      }else{
        item.style.cssText='display:inline-block;margin:4px 0 0 4px;background:#fff7ed;border-color:#fdba74;color:#9a3412';
        item.textContent='⏳ Proposition : '+invitation.teamName;
      }
      target.appendChild(item);
    });
  }

  // A refusal frees a slot, but the player is only selected during the final
  // draw.  Make that future slot visible in the actual team card as well as
  // in the proposal summary, without counting it as a confirmed player.
  function decorateTeamCards(){
    document.querySelectorAll('#registrationTeamGrid .sp-team').forEach(card=>{
      const name=card.querySelector('h3')?.textContent?.trim();
      const group=groups.find(item=>item.name===name);
      const refusals=group?.invitations.filter(item=>item.status==='declined'||item.status==='rejected').length||0;
      // The final draw may already have filled the freed slot.  In that case
      // the card must show only the real player, never an obsolete placeholder.
      const randomSlots=group?Math.min(refusals,Math.max(0,group.teamSize-group.confirmed.length)):0;
      if(!randomSlots)return;
      const roster=card.querySelector('ol'); if(!roster)return;
      if(!roster.querySelector('[data-random-team-slot]')){
        for(let index=0;index<randomSlots;index++){
          const slot=document.createElement('li');
          slot.dataset.randomTeamSlot='1';
          slot.style.cssText='border:1px dashed #a78bfa;background:#f5f3ff;color:#5b21b6';
          slot.textContent='🎲 Joueur aléatoire · attribué au tirage final';
          roster.appendChild(slot);
        }
      }
      const strength=card.querySelector('.sp-team-strength');
      if(strength){
        strength.textContent=group.confirmed.length+' / '+group.teamSize+' joueurs confirmés · '+randomSlots+' joueur'+(randomSlots>1?'s':'')+' aléatoire'+(randomSlots>1?'s':'')+' au tirage';
      }
    });
  }

  function decorate(){
    decorateList();
    decorateTeamCards();
  }

  function renderPanel(){
    const host=$('#registrationTeams')||$('#publicRegistrationCard')||$('#publicRegistration'); if(!host)return;
    const key=groups.map(group=>group.id+'|'+group.confirmed.join(',')+'|'+group.invitations.map(item=>item.id+'-'+item.status).join(',')).join(';');
    if(renderedKey===key){decorate();return;} renderedKey=key;
    $('#swePendingTeamProposals')?.remove(); if(!groups.length)return;
    const panel=document.createElement('section'); panel.id='swePendingTeamProposals'; panel.className='card';
    panel.style.cssText='border:1px solid #f6c76a;background:#fffaf0;margin:14px 0';
    panel.innerHTML='<h2 class="sectiontitle">👥 Compositions des équipes</h2><p class="muted" style="margin-top:0">Toutes les équipes du tournoi et leurs joueurs figurent ici.</p>'+groups.map(group=>{
      const complete=group.confirmed.length>=group.teamSize;
      const rejected=group.invitations.filter(item=>item.status==='rejected'||item.status==='declined');
      const pending=group.invitations.filter(item=>item.status==='pending');
      const randomSlots=Math.min(rejected.length,Math.max(0,group.teamSize-group.confirmed.length));
      return '<div class="player" style="margin-top:8px"><b>'+esc(group.name)+'</b> '+badge(complete?'✅ Équipe confirmée':'👥 Équipe en préparation · '+group.confirmed.length+'/'+group.teamSize,complete?'background:#ecfdf5;border-color:#86efac;color:#166534':'background:#eff6ff;border-color:#93c5fd;color:#1d4ed8')+
        '<div class="muted" style="margin-top:5px">Composition</div><div style="margin-top:6px">'+
        group.confirmed.map(name=>badge('✅ '+esc(name)+' · confirmé','background:#ecfdf5;border-color:#86efac;color:#166534')).join('')+
        pending.map(item=>badge('⏳ '+esc(item.name)+' · en attente')).join('')+
        rejected.map((item,index)=>badge('❌ '+esc(item.name)+' · a refusé','background:#fef2f2;border-color:#fecaca;color:#991b1b')+(index<randomSlots?badge('🎲 Joueur aléatoire attribué au tirage','background:#f5f3ff;border-color:#c4b5fd;color:#5b21b6'):'' )).join('')+
        '</div></div>';
    }).join('');
    host.before(panel); decorate(); setTimeout(decorate,350); setTimeout(decorate,1200); setTimeout(decorate,2600);
  }

  async function load(){
    const result=await client.rpc('get_public_workspace_snapshot',{p_token:token}); if(result.error)return;
    const snapshot=result.data||{},players=new Map((snapshot.players||[]).map(player=>[String(player.id),player]));
    const tour=(snapshot.tournaments||[]).find(item=>String(item.id)===String(tournamentId))||{};
    const teamSize=Math.max(2,Math.min(11,Number(tour.team_size)||5));
    const rosterByTeam=new Map();
    (snapshot.team_players||[]).forEach(row=>{const list=rosterByTeam.get(String(row.team_id))||[];list.push(String(row.player_id));rosterByTeam.set(String(row.team_id),list);});
    const invitationsByTeam=new Map();
    (snapshot.team_player_invitations||[]).filter(row=>String(row.tournament_id)===String(tournamentId)).forEach(row=>{const list=invitationsByTeam.get(String(row.team_id))||[];list.push(row);invitationsByTeam.set(String(row.team_id),list);});
    groups=(snapshot.teams||[]).filter(team=>String(team.tournament_id)===String(tournamentId)).map(team=>{
      const direct=rosterByTeam.get(String(team.id))||[];
      const invitations=invitationsByTeam.get(String(team.id))||[];
      const confirmedIds=new Set(direct);
      if(!direct.length)invitations.filter(item=>item.status==='accepted').forEach(item=>confirmedIds.add(String(item.player_id)));
      const creatorName=players.get(String(team.created_by_player_id))?.name||'';
      return {id:String(team.id),name:team.name||'Équipe',creatorName,teamSize,confirmed:[...confirmedIds].map(id=>players.get(id)?.name||'Joueur'),invitations:invitations.filter(item=>item.status!=='accepted').map(item=>({id:String(item.id||item.player_id),name:players.get(String(item.player_id))?.name||'Joueur',status:item.status||'pending'}))};
    });
    renderPanel();
  }
  document.addEventListener('swe:rendered',()=>{renderedKey='';renderPanel();});
  // The registered-player list can be expanded after its first render.  Decorate
  // those additional rows once, without observing or rebuilding the page.
  document.addEventListener('click',()=>setTimeout(decorate,80));
  document.addEventListener('DOMContentLoaded',()=>setTimeout(load,350),{once:true});
  if(document.readyState!=='loading')setTimeout(load,350);
})();

;

;
/* SOURCE team-captain-consent-v4438.js */
/* Adds a deliberate consent choice to the existing public team builder. */
(()=>{
  'use strict';
  const URL='https://fbppesfxkvledwjemwsn.supabase.co';
  const KEY='sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp';
  const $=s=>document.querySelector(s);
  const params=new URLSearchParams(location.search);
  const token=params.get('public'),tournamentId=params.get('tournament');
  if(!token||!tournamentId||!window.supabase?.createClient)return;
  const client=window.supabase.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});

  function status(text){const el=$('#publicTeamStatus');if(el)el.textContent=text;}
  function installChoices(){
    document.querySelectorAll('[data-team-mate]').forEach(mate=>{
      const id=mate.dataset.teamMate;
      const row=mate.closest('label');
      if(!row||document.querySelector('[data-team-consent="'+id+'"]'))return;
      const consent=document.createElement('div');
      consent.style.cssText='display:block;margin:5px 0 2px 28px;font-size:.88rem;color:#31506f';
      consent.innerHTML='<label style="display:block;margin:6px 0"><input type="radio" name="team-consent-'+id+'" data-team-consent="'+id+'" style="width:auto" disabled> ✅ J’ai son accord : l’ajouter directement</label><label style="display:block;margin:6px 0"><input type="radio" name="team-consent-'+id+'" data-team-pending="'+id+'" style="width:auto" checked disabled> ⏳ Je n’ai pas son accord : lui demander de confirmer</label>';
      row.after(consent);
      const sync=()=>{consent.querySelectorAll('input').forEach(input=>input.disabled=!mate.checked);if(!mate.checked)consent.querySelector('[data-team-pending]').checked=true;};mate.addEventListener('change',sync);sync();
    });
  }
  function scheduleChoices(){setTimeout(installChoices,350);setTimeout(installChoices,900);}
  document.addEventListener('click',event=>{
    if(event.target.closest('#publicValidateTeamCode'))scheduleChoices();
  });

  document.addEventListener('click',async event=>{
    const button=event.target.closest('#publicCreateTeam');
    if(!button||button.dataset.consentHandled==='1')return;
    event.preventDefault();event.stopImmediatePropagation();
    const creator=$('#publicTeamCreator')?.value||'';
    const code=$('#publicTeamCode')?.value.trim()||'';
    const name=$('#publicTeamName')?.value.trim()||'';
    const color=[...document.querySelectorAll('#publicTeamColorChoices [data-team-color]')].find(x=>x.style.outline)?.dataset.teamColor||'';
    const mates=[...document.querySelectorAll('[data-team-mate]:checked')].map(x=>x.dataset.teamMate);
    const confirmed=[...document.querySelectorAll('[data-team-consent]:checked')].map(x=>x.dataset.teamConsent).filter(id=>mates.includes(id));
    const guests=[...document.querySelectorAll('[data-team-guest]')].map(x=>x.value.trim()).filter(Boolean);
    if(!code)return status('Valide d’abord ton code secret équipe.');
    if(!creator)return status('Choisis ton nom.');
    if(!name)return status('Donne un nom à ton équipe.');
    if(!color)return status('Choisis la couleur des maillots de ton équipe.');
    if(mates.length+guests.length>4)return status('Ton équipe ne peut pas dépasser 5 places, créateur compris.');
    button.disabled=true;status('Enregistrement de la composition…');
    const {error}=await client.rpc('public_create_team_with_member_code_v3',{p_token:token,p_tournament_id:tournamentId,p_player_id:creator,p_code:code,p_team_name:name,p_team_color:color,p_player_ids:mates,p_confirmed_player_ids:confirmed,p_guest_names:guests});
    button.disabled=false;
    if(error){status(error.message||'Impossible d’enregistrer l’équipe.');return;}
    status('✅ Équipe enregistrée. Les membres cochés sont confirmés ; les autres doivent répondre à la proposition.');
    button.dataset.consentHandled='1';
    setTimeout(()=>location.reload(),650);
  },true);
  scheduleChoices();
})();

;

;
/* SOURCE team-proposal-action-v4441.js */
/* Keeps the registered-player team action aligned with the real invitation. */
(()=>{
  'use strict';
  const URL='https://fbppesfxkvledwjemwsn.supabase.co';
  const KEY='sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp';
  const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const token=params.get('public'),tournamentId=params.get('tournament');
  if(!token||!tournamentId||!window.supabase?.createClient)return;
  const client=window.supabase.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  let invitation=null,players=new Map(),teams=new Map(),loading=null;
  const teamButton=()=>document.querySelector('[data-registered-action="team"]');
  function paint(){
    const button=teamButton(); if(!button)return;
    const available=!!invitation;
    button.disabled=!available;
    button.title=available?'Ouvrir ta proposition d’équipe':'Aucune proposition d’équipe en attente.';
    button.setAttribute('aria-disabled',String(!available));
    button.style.opacity=available?'1':'.48'; button.style.cursor=available?'pointer':'not-allowed';
  }
  async function load(){
    const pid=$('#publicPlayerSelect')?.value||''; invitation=null; paint();
    if(!pid)return;
    const request=client.rpc('get_public_workspace_snapshot',{p_token:token});loading=request;
    const {data,error}=await request;if(loading!==request||error)return;
    const snapshot=data||{}; players=new Map((snapshot.players||[]).map(p=>[String(p.id),p]));teams=new Map((snapshot.teams||[]).map(t=>[String(t.id),t]));
    invitation=(snapshot.team_player_invitations||[]).find(item=>String(item.tournament_id)===String(tournamentId)&&String(item.player_id)===String(pid)&&item.status==='pending')||null;
    paint();
  }
  function renderProposal(){
    const box=$('#publicTeamInvitationDecision'); if(!box||!invitation)return;
    const team=teams.get(String(invitation.team_id)),captain=players.get(String(invitation.invited_by_player_id));
    box.hidden=false;box.className='player';box.style.display='block';box.style.background='#fff8e8';box.style.border='1px solid #f2d18a';
    box.innerHTML='<b>👥 Ta proposition d’équipe</b><div class="muted" style="margin-top:5px;line-height:1.6"><b>'+esc(captain?.name||'Le capitaine')+'</b> te propose de rejoindre <b>'+esc(team?.name||'cette équipe')+'</b>. Si tu refuses, tu restes inscrit et participeras au tirage en équipe aléatoire.</div><div class="row" style="margin-top:10px"><button type="button" data-proposal-accept class="primary">✅ Accepter l’équipe</button><button type="button" data-proposal-decline>🎲 Refuser / équipe aléatoire</button></div>';
    box.querySelector('[data-proposal-accept]').onclick=()=>respond(true);
    box.querySelector('[data-proposal-decline]').onclick=()=>respond(false);
  }
  async function respond(accept){
    const button=$('[data-proposal-'+(accept?'accept':'decline')+']');if(button)button.disabled=true;
    const pid=$('#publicPlayerSelect')?.value||'';
    const {error}=await client.rpc('public_respond_team_invitation',{p_token:token,p_tournament_id:tournamentId,p_player_id:pid,p_accept:accept});
    if(error){if(button)button.disabled=false;return;}
    location.reload();
  }
  document.addEventListener('change',event=>{if(event.target.id==='publicPlayerSelect')load();});
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-registered-action="team"]');if(!button)return;
    if(!invitation){event.preventDefault();event.stopImmediatePropagation();return;}
    setTimeout(renderProposal,0);
  },true);
  document.addEventListener('swe:rendered',()=>setTimeout(load,120));
  document.addEventListener('DOMContentLoaded',()=>setTimeout(load,500),{once:true});
  if(document.readyState!=='loading')setTimeout(load,500);
})();

;

;
/* SOURCE third-half-action-order-v4445.js */
/* Keep the participant decision before the group organisation, without polling. */
(()=>{
  'use strict';
  function placeActionsFirst(){
    const box=document.getElementById('publicThirdHalfRegistration');
    const answer=box?.querySelector('.third-half-response');
    const plan=box?.querySelector('.third-half-public-plan');
    if(answer&&plan&&answer.previousElementSibling===plan)plan.before(answer);
  }
  function schedule(){setTimeout(placeActionsFirst,60);setTimeout(placeActionsFirst,300);setTimeout(placeActionsFirst,900);}
  document.addEventListener('DOMContentLoaded',schedule,{once:true});
  document.addEventListener('swe:rendered',schedule);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-registered-action="cooler"],#publicThirdHalfYes,#publicThirdHalfNo'))schedule();
  });
  if(document.readyState!=='loading')schedule();
})();

;

;
/* SOURCE third-half-donor-summary-v4451.js */
/* Keep the third-half contribution summary visible when registration is closed. */
(()=>{
  'use strict';
  const url='https://fbppesfxkvledwjemwsn.supabase.co';
  const key='sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp';
  const query=new URLSearchParams(location.search);
  const token=query.get('public'),tournamentId=query.get('tournament');
  if(!token||!tournamentId)return;
  const labels={cooler:'Une glacière',ice:'Des glaçons',beers_3:'3 bières',beers_6:'6 bières',beers_12:'12 bières',ti_punch:'Du ti-punch',fruits:'Des fruits',cups:'Des gobelets',soft_drinks:'Des boissons sans alcool',snacks:'Des amuse-gueules',other:'Un autre apport'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money=value=>(Math.max(0,Number(value)||0)/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
  let client=null,lastKey='';

  function render(data){
    const card=document.getElementById('publicThirdHalfDonorCard');
    const host=document.getElementById('publicCoolerDonors');
    if(!card||!host)return false;
    const contributions=Array.isArray(data?.contributions)?data.contributions:[];
    const pool=Math.max(0,Number(data?.money_pool_cents)||0);
    const material=contributions.filter(item=>item.contribution_mode==='supplies').length;
    const signature=[pool,contributions.map(item=>[item.player_id,item.contribution_mode,item.contribution_amount_cents,item.contribution_item].join(':')).join('|')].join('~');
    if(signature===lastKey)return true;
    lastKey=signature;
    const row=item=>'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #e4edf4"><span><b>'+esc(item.player_name||'Joueur')+'</b></span><strong style="color:#0f766e">'+(item.contribution_mode==='money'?'💶 '+money(item.contribution_amount_cents)+' · annoncé (non confirmé)':'🎒 '+esc(labels[item.contribution_item]||'Apport matériel'))+'</strong></div>';
    const preview=contributions.slice(0,4).map(row).join('');
    const more=contributions.length>4?'<details style="margin-top:4px"><summary style="cursor:pointer;font-weight:700">Voir les '+(contributions.length-4)+' autres participations</summary><div style="margin-top:6px">'+contributions.slice(4).map(row).join('')+'</div></details>':'';
    const intro=card.querySelector('p.muted'); if(intro)intro.remove();
    host.innerHTML='<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0"><div style="padding:12px;border-radius:12px;background:#ecfdf5"><small style="display:block;color:#41736a;font-weight:700">CAGNOTTE ANNONCÉE</small><b style="font-size:1.25rem;color:#065f46">'+money(pool)+'</b><small style="display:block;color:#41736a">'+Number(data?.money_donor_count||0)+' participation'+(Number(data?.money_donor_count||0)>1?'s':'')+' financière'+(Number(data?.money_donor_count||0)>1?'s':'')+'</small></div><div style="padding:12px;border-radius:12px;background:#eff6ff"><small style="display:block;color:#486581;font-weight:700">APPORTS MATÉRIELS</small><b style="font-size:1.25rem;color:#1d4ed8">'+material+'</b><small style="display:block;color:#486581">déjà prévus par le groupe</small></div></div>'+(contributions.length?'<div><b>Participations annoncées (paiement non confirmé)</b>'+preview+more+'</div>':'<p class="muted">Aucune participation n’a encore été annoncée.</p>');
    return true;
  }

  async function load(){
    if(!document.getElementById('publicThirdHalfDonorCard')||!window.supabase?.createClient)return;
    client=client||window.supabase.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const result=await client.rpc('get_public_third_half_contributions_v1',{p_token:token,p_tournament_id:tournamentId});
    if(!result.error)render(result.data||{});
  }
  // The main application builds the card asynchronously.  These one-off
  // retries catch that render without using an observer or a polling loop.
  [250,900,2200,4500].forEach(delay=>setTimeout(load,delay));
  document.addEventListener('swe:rendered',()=>setTimeout(load,80));
})();

;

;
/* SOURCE team-draw-room-access-v4452.js */
/*
 * Compatibilité de chargement.
 * Les accès administrateur et co-gestionnaire sont rendus de façon stable par
 * team-draw-room-salon-v5037.js, chargé après ce fichier.
 */

;

;
/* SOURCE team-draw-room-v4455.js */
/*
 * Point d'entrée conservé pour la page actuellement publiée.
 * La page d'accueil existante charge déjà ce fichier : il charge donc la
 * version active du salon sans nécessiter de remplacer index.html.
 */
(()=>{
  'use strict';
  if(window.SWETeamDrawSalonV2||document.querySelector('script[data-swe-team-draw-v2]'))return;
  const script=document.createElement('script');
  script.src='./team-draw-room-salon-v5037.js?v=5601-io-fix';
  script.async=false;
  script.defer=true;
  script.dataset.sweTeamDrawV2='true';
  document.head.appendChild(script);
  const conquest=document.createElement('script');
  conquest.src='./conquest-rotation-v1.js?v=5083';
  conquest.defer=true;
  document.head.appendChild(conquest);
})();

;

;
/* SOURCE team-composition-visual-v4456.js */
/* Public team composition visual and administrator image upload. */
(()=>{
  'use strict';
  if(window.__SWE_TEAM_COMPOSITION_VISUAL_4456)return;
  window.__SWE_TEAM_COMPOSITION_VISUAL_4456=true;
  const E=id=>document.getElementById(id),cli=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}},state=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}},admin=()=>{try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let timer=0;
  function publicContext(){return window.__swePublicCompositionContext||null}
  function tournament(){const s=state(),pub=publicContext();if(pub?.tournament)return pub.tournament;if(!s)return null;const id=s.teamCompetitionId||s.activeTour||window.swePageViewContext?.id;return (s.tournaments||[]).find(t=>String(t.id)===String(id))||null}
  function css(){if(E('sweCompositionVisualStyle4456'))return;const x=document.createElement('style');x.id='sweCompositionVisualStyle4456';x.textContent=`.swecomp-admin{margin:12px 0;padding:16px;border-radius:18px;border:1px solid #b9d8ca;background:linear-gradient(135deg,#f1fff7,#eef7ff)}.swecomp-admin h3{margin:0 0 5px}.swecomp-current{display:flex;align-items:center;gap:9px;margin:12px 0;padding:11px 13px;border-radius:13px;background:#102a43;color:#fff}.swecomp-current b{color:#ffe082}.swecomp-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0}.swecomp-choice{min-height:58px;border:2px solid #b8c8d8;background:#fff;color:#14314c}.swecomp-choice.selected{border-color:#1382d3;background:linear-gradient(105deg,#1e65e3,#11bdd1);color:#fff;box-shadow:0 7px 18px #1d74cf38}.swecomp-upload{width:100%;margin-top:2px}.swecomp-preview{display:block;width:100%;max-height:760px;object-fit:contain;border-radius:18px;border:1px solid #d7e4dd;background:#071f2e;margin:12px auto}.swecomp-preview-label{font-weight:850;margin:13px 0 5px}.swecomp-public{margin:0 0 18px;padding:24px;border-radius:22px;background:radial-gradient(circle at top,#164d6a,#061f31 64%);border:1px solid #d8b84a;box-shadow:0 18px 38px rgba(4,35,49,.18);color:#fff}.swecomp-public h2{color:#fff;text-align:center;margin:5px 0 4px;font-size:clamp(26px,4vw,46px)}.swecomp-sub{text-align:center;color:#e8f4fc;margin:0 0 18px}.swecomp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.swecomp-team{border-top:4px solid #f5d66a;border-radius:14px;padding:13px;background:#fff;color:#0a2940;min-height:110px}.swecomp-team b{display:block;font-size:18px;margin-bottom:7px}.swecomp-team span{display:block;color:#3f5870;line-height:1.45}.swecomp-image{display:block;width:100%;max-height:1100px;object-fit:contain;border-radius:14px;background:#fff}.swecomp-feedback{min-height:22px;margin:7px 0;color:#36516a}.swecomp-feedback.error{color:#b4233d;font-weight:700}@media(max-width:620px){.swecomp-options{grid-template-columns:1fr}}.swecomp-image-only #registrationTeams,.swecomp-image-only #publicTeams,.swecomp-image-only .swecomp-duplicate-roster{display:none!important}`;document.head.append(x)}
  async function saveChoice(t,mode,url,feedback){const c=cli();if(!c)throw new Error('Connexion indisponible. Recharge la page.');const r=await c.rpc('admin_set_tournament_composition_visual_v1',{p_tournament_id:t.id,p_mode:mode,p_image_url:url||null});if(r.error)throw r.error;t.composition_display_mode=r.data?.mode||t.composition_display_mode||'site';t.composition_image_url=r.data?.image_url||t.composition_image_url||null;feedback.textContent=mode==='upload'?'Image enregistrée. Choisis maintenant ce que tu veux publier.':t.composition_display_mode==='site'?'Le visuel du site est maintenant publié sur le lien d’inscription ✅':'Ton image est maintenant publiée sur le lien d’inscription ✅';feedback.className='swecomp-feedback';renderAdmin()}
  function renderAdmin(){const host=E('teamsAdminCard'),t=tournament();if(!host||!admin()||!t)return;let box=E('sweCompositionVisualAdmin');if(!box){box=document.createElement('section');box.id='sweCompositionVisualAdmin';box.className='swecomp-admin';host.querySelector('#teamList')?.before(box)}const mode=t.composition_display_mode||'site',hasImage=!!t.composition_image_url,current=mode==='image'&&hasImage?'Mon image JPG/PNG':'Visuel du site';box.innerHTML='<h3>🖼️ Affichage public des compositions</h3><p class="muted">Sélectionne ce que les joueurs verront sur le lien d’inscription.</p><div class="swecomp-current"><span>👁️</span><span>Actuellement publié : <b>'+current+'</b></span></div><div class="swecomp-options"><button type="button" data-site class="swecomp-choice '+(mode==='site'?'selected':'')+'" aria-pressed="'+(mode==='site')+'">👑 Afficher le visuel du site'+(mode==='site'?'<br><small>✓ Sélectionné</small>':'')+'</button><button type="button" data-image class="swecomp-choice '+(mode==='image'?'selected':'')+'" aria-pressed="'+(mode==='image')+'" '+(!hasImage?'disabled title="Importe d’abord une image"':'')+'>🖼️ Afficher mon image'+(mode==='image'?'<br><small>✓ Sélectionnée</small>':'')+'</button></div><button type="button" data-upload class="swecomp-upload">📸 '+(hasImage?'Remplacer mon image JPG / PNG':'Importer mon image JPG / PNG')+'</button><input data-file type="file" accept="image/jpeg,image/png" hidden><p data-feedback class="swecomp-feedback"></p>'+(hasImage?'<div class="swecomp-preview-label">Aperçu de mon image enregistrée'+(mode==='image'?' et publiée':'')+'</div><img class="swecomp-preview" src="'+esc(t.composition_image_url)+'" alt="Aperçu de mon affiche">':'');const feedback=box.querySelector('[data-feedback]'),file=box.querySelector('[data-file]');box.querySelector('[data-site]').onclick=async()=>{try{await saveChoice(t,'site',null,feedback)}catch(e){feedback.textContent=e.message||'Impossible d’activer le visuel.';feedback.className='swecomp-feedback error'}};box.querySelector('[data-image]').onclick=async()=>{try{await saveChoice(t,'image',null,feedback)}catch(e){feedback.textContent=e.message||'Impossible de publier ton image.';feedback.className='swecomp-feedback error'}};box.querySelector('[data-upload]').onclick=()=>file.click();file.onchange=async()=>{const f=file.files?.[0];if(!f)return;if(!['image/jpeg','image/png'].includes(f.type)||f.size>8388608){feedback.textContent='Choisis un JPG ou PNG de 8 Mo maximum.';feedback.className='swecomp-feedback error';return}const c=cli();if(!c){feedback.textContent='Connexion indisponible. Recharge la page.';feedback.className='swecomp-feedback error';return}feedback.textContent='Envoi de l’image…';feedback.className='swecomp-feedback';try{const ext=f.type==='image/png'?'png':'jpg',path=t.workspace_id+'/'+t.id+'/'+crypto.randomUUID()+'.'+ext;const up=await c.storage.from('team-composition-images').upload(path,f,{contentType:f.type,upsert:false});if(up.error)throw up.error;const url=c.storage.from('team-composition-images').getPublicUrl(path).data.publicUrl;if(!url)throw new Error('Lien public indisponible.');await saveChoice(t,'upload',url,feedback)}catch(e){feedback.textContent=e.message||'Import impossible.';feedback.className='swecomp-feedback error'}finally{file.value=''}}}
  function teamCards(){const s=state(),pub=publicContext(),t=tournament(),source=pub||s;if(!source||!t)return'';const ids=new Map();(source.teamPlayers||[]).forEach(x=>{if(!ids.has(String(x.team_id)))ids.set(String(x.team_id),[]);ids.get(String(x.team_id)).push(String(x.player_id))});const players=new Map((source.players||[]).map(p=>[String(p.id),p.name||p.display_name||'Joueur']));return (source.teams||[]).filter(x=>String(x.tournament_id)===String(t.id)).map(team=>'<article class="swecomp-team"><b>'+esc(team.name||'Équipe')+'</b><span>'+esc((ids.get(String(team.id))||[]).map(id=>players.get(id)||'Joueur').join(' · ')||'Composition à venir')+'</span></article>').join('')}
  function renderPublic(){
    // Le visuel JPG/PNG sélectionné remplace le tableau de composition public.
    // Ne pas afficher de second tableau quand le visuel du site est choisi.
    const pub=publicContext(),t=pub?.tournament;
    const old=E('swePublicCompositionVisual');
    const showingImage=!!(t&&t.composition_display_mode==='image'&&t.composition_image_url);
    const publicView=E('publicView');
    if(publicView){
      publicView.classList.toggle('swecomp-image-only',showingImage);
      // Other presentation modules may render a second list headed
      // "Compositions des équipes"; hide only that standalone card.
      publicView.querySelectorAll('h2,h3').forEach(heading=>{
        if(!heading.textContent.includes('Compositions des équipes'))return;
        const card=heading.closest('.card,.sp-card,section,article');
        if(card&&card.id!=='swePublicCompositionVisual'){
          card.classList.toggle('swecomp-duplicate-roster',showingImage);
        }
      });
    }
    if(!showingImage){
      old?.remove();
      return;
    }
    // The solo registration form is hidden until the visitor chooses a mode.
    // Keep the image in the public entry view, before the registration choices.
    const host=E('publicEntryChoiceCard')||E('publicView');
    if(!host)return;
    let box=old;
    if(!box){
      box=document.createElement('section');
      box.id='swePublicCompositionVisual';
      box.className='swecomp-public';
    }
    box.innerHTML='<h2>⚽ Composition des équipes</h2><img class="swecomp-image" src="'+esc(t.composition_image_url)+'" alt="Affiche des équipes publiée par l’organisateur" loading="eager">';
    if(!box.isConnected)host.insertAdjacentElement('beforebegin',box);
  }
  function apply(){clearTimeout(timer);timer=setTimeout(()=>{css();renderAdmin();renderPublic()},80)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();['swe:rendered','swe:page-view','swe:dashboard-ready','swe:public-composition-ready'].forEach(e=>document.addEventListener(e,apply));document.addEventListener('change',e=>{if(e.target?.id==='teamCompetitionSelect')setTimeout(apply,100)});window.addEventListener('pageshow',apply);
})();

;

;
/* SOURCE team-draw-room-home-access-v5070.js */
/* SWÉ v50.72 — accès salon intégré aux actions co-gestionnaire et au lien public. */
(()=>{
  'use strict';
  if(window.__SWEDrawRoomAccess5072)return;
  window.__SWEDrawRoomAccess5072=true;

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const state=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
  const client=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};
  const isCoorg=()=>{try{return typeof isCoorganizer==='function'&&isCoorganizer()}catch(_){return false}};
  const isAdmin=()=>{try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}};
  let refreshTimer=0, refreshBusy=false, lastRefreshAt=0;

  function activeTournament(){
    const s=state();
    const list=s?.tournaments||[];
    const id=s?.teamCompetitionId||s?.activeTour;
    // Un salon ouvert a toujours priorité sur le dernier tournoi mémorisé par la PWA.
    // Cela évite qu’un ancien tournoi de test masque le vote Conquête en cours.
    return list.find(t=>t.draw_room_first_enabled&&['pending','redraw_requested'].includes(t.team_review_status))
      || list.find(t=>String(t.id)===String(id))
      || list.find(t=>t.draw_room_first_enabled)
      || null;
  }
  function roomCountdown(deadline){
    const remaining=new Date(deadline||0).getTime()-Date.now();
    if(!Number.isFinite(remaining)||remaining<=0)return 'Vote terminé';
    const seconds=Math.floor(remaining/1000), h=Math.floor(seconds/3600), m=Math.floor((seconds%3600)/60), s=seconds%60;
    return h>0 ? h+' h '+String(m).padStart(2,'0')+' min' : String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  }
  function style(){
    if(document.getElementById('sweDrawRoomAccessStyle5072'))return;
    const node=document.createElement('style'); node.id='sweDrawRoomAccessStyle5072';
    node.textContent=`
      .swe-draw-inline{border:1px solid #cbd5e1;background:#f8fafc}.swe-draw-inline.active{border-color:#34d399;background:linear-gradient(135deg,#ecfdf5,#eff6ff)}
      .swe-draw-inline.locked,.swe-draw-inline.waiting{background:#f1f5f9;color:#64748b;filter:none}.swe-draw-inline .swe-draw-status{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;margin-top:4px}
      .swe-draw-inline.active .swe-draw-status{color:#047857}.swe-draw-inline .swe-draw-countdown{font-variant-numeric:tabular-nums;font-weight:950}.swe-draw-inline button{margin-top:8px;width:100%}
      .swe-draw-public-access{margin-top:12px;padding:12px;border-radius:14px;border:1px solid rgba(30,64,175,.2);background:linear-gradient(135deg,#eff6ff,#f8fafc);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.swe-draw-public-access b{display:block;color:#173b67}.swe-draw-public-access small{display:block;margin-top:3px;color:#52677f;line-height:1.4}.swe-draw-public-access a{white-space:nowrap;text-decoration:none}
    `; document.head.append(node);
  }
  function getActionContainer(){
    const root=document.getElementById('sweCoorgDashboard4399');
    if(!root)return null;
    const section=[...root.querySelectorAll('.swe-coorg-section')].find(node=>/Actions à réaliser/i.test(node.textContent||''));
    if(!section)return null;
    let actions=section.querySelector('.swe-coorg-actions');
    if(!actions){
      actions=document.createElement('div'); actions.className='swe-coorg-actions';
      const empty=[...section.querySelectorAll('.muted')].find(node=>/Aucune action/i.test(node.textContent||''));
      if(empty)empty.remove();
      section.append(actions);
    }
    return actions;
  }
  function card(t,data){
    const open=Boolean(data?.can_vote&&!data?.expired);
    const copy=open
      ? 'Ton accès est ouvert. Entre dans le salon pour voter parmi les compositions proposées.'
      : 'Le salon apparaîtra ici dès que l’administrateur ouvrira la fenêtre de vote.';
    const time=open?'<span class="swe-draw-countdown" data-swe-room-countdown="'+esc(data.deadline)+'">'+roomCountdown(data.deadline)+'</span> restantes':'';
    const signature=String(t.id)+'|'+(open?'open':'waiting')+'|'+String(data?.deadline||'');
    return '<article class="swe-coorg-action swe-draw-inline '+(open?'active':'waiting')+'" data-swe-draw-inline="'+esc(t.id)+'" data-swe-draw-state="'+esc(signature)+'"><div class="swe-coorg-action-icon">🗳️</div><div class="swe-coorg-action-body"><b>Salon des équipes</b><div class="swe-coorg-action-copy">'+esc(copy)+'</div><div class="swe-draw-status">'+(open?'● '+time:'○ Accès verrouillé')+'</div><button type="button" '+(open?'data-swe-v2-open="'+esc(t.id)+'"':'disabled')+'>'+ (open?'Accéder au salon →':'Vote indisponible')+'</button></div></article>';
  }
  async function rpcState(t){
    const api=client(); if(!api||!t)return null;
    const {data,error}=await api.rpc('team_draw_room_state_v2',{p_tournament_id:t.id});
    return error?null:data;
  }
  async function serverOpenRoom(){
    const api=client(); if(!api)return null;
    const {data,error}=await api.rpc('team_draw_room_my_open_rooms_v2');
    return error||!Array.isArray(data)?null:(data[0]||null);
  }
  async function refreshDashboard(){
    if(refreshBusy||document.visibilityState==='hidden'||!navigator.onLine)return;
    if(Date.now()-lastRefreshAt<60000)return;
    // Le tableau n’existe que pour les co-gestionnaires. Ne pas dépendre ici
    // d’un helper global qui peut être chargé après le tableau PWA.
    const actions=getActionContainer();
    if(!actions)return; // Le volet permanent du tableau remplace cette carte.
    refreshBusy=true;
    lastRefreshAt=Date.now();
    try{
    const t=(await serverOpenRoom())||activeTournament();
    if(!actions||!t)return;
    style();
    const data=await rpcState(t);
    const node=actions.querySelector('[data-swe-draw-inline]');
    const html=card(t,data);
    const signature=String(t.id)+'|'+(data?.can_vote&&!data?.expired?'open':'waiting')+'|'+String(data?.deadline||'');
    if(node?.dataset.sweDrawState!==signature){
      if(node)node.outerHTML=html; else actions.insertAdjacentHTML('afterbegin',html);
    }
    updateCountdowns();
    }finally{refreshBusy=false;}
  }
  function updateCountdowns(){document.querySelectorAll('[data-swe-room-countdown]').forEach(node=>node.textContent=roomCountdown(node.dataset.sweRoomCountdown));}
  async function openRoom(id){
    for(let attempt=0;attempt<25;attempt+=1){
      if(window.SWETeamDrawSalonV2?.open){window.SWETeamDrawSalonV2.open(id);return;}
      await new Promise(resolve=>setTimeout(resolve,120));
    }
    if(typeof toast==='function')toast('Le salon se charge encore. Actualise la page puis réessaie.');
  }
  function publicAccess(){
    style();
    const box=document.querySelector('.sp-team-callout, .sp-next');
    const t=activeTournament();
    if(!box||!t||t.format!=='conquest'||box.querySelector('[data-swe-draw-public-access]'))return;
    const url=new URL('./',window.location.href); url.searchParams.set('draw_room',t.id);
    const access=document.createElement('div'); access.className='swe-draw-public-access'; access.dataset.sweDrawPublicAccess='1';
    access.innerHTML='<div><b>🔒 Accès co-gestionnaires</b><small>Connexion obligatoire. Le salon est réservé aux co-gestionnaires sélectionnés pour le vote.</small></div><a class="primary" href="'+esc(url.toString())+'">Ouvrir le salon</a>';
    box.append(access);
  }
  function schedule(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{refreshDashboard().catch(()=>{});publicAccess();},180);}
  document.addEventListener('click',event=>{const button=event.target.closest?.('[data-swe-v2-open]');if(!button)return;event.preventDefault();openRoom(button.dataset.sweV2Open);},true);
  ['DOMContentLoaded','swe:rendered','swe:page-view','swe:dashboard-ready'].forEach(name=>document.addEventListener(name,schedule));
  window.addEventListener('pageshow',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  [250,900,2200,4200].forEach(delay=>setTimeout(schedule,delay));
  // Countdowns stay local. Recheck permissions at most once per minute, only when visible.
  setInterval(()=>{updateCountdowns();if(document.visibilityState==='visible')refreshDashboard().catch(()=>{});},60000);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')refreshDashboard().catch(()=>{});
  });
})();

;

;
/* SOURCE team-draw-room-presence-ui-v5072.js */
/* SWÉ v50.72 — décompte et suivi des présences/votes dans le salon. */
(()=>{
  'use strict';
  if(window.__SWEDrawRoomPresence5072)return;
  window.__SWEDrawRoomPresence5072=true;
  let tournamentId=null, lastSignature='';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const api=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};
  const room=()=>document.getElementById('sweDrawRoomV2');
  const formatTime=value=>{
    const left=new Date(value||0).getTime()-Date.now();
    if(!Number.isFinite(left)||left<=0)return 'Vote terminé';
    const sec=Math.floor(left/1000),hours=Math.floor(sec/3600),min=Math.floor((sec%3600)/60),seconds=sec%60;
    return hours>0?hours+' h '+String(min).padStart(2,'0')+' min':String(min).padStart(2,'0')+':'+String(seconds).padStart(2,'0');
  };
  function addStyle(){
    if(document.getElementById('sweDrawPresenceStyle5072'))return;
    const style=document.createElement('style');style.id='sweDrawPresenceStyle5072';
    style.textContent='.swe-v2-live-clock{font-variant-numeric:tabular-nums;font-weight:950;color:#b45309}.swe-v2-presence{display:flex!important;align-items:flex-start;justify-content:space-between;gap:8px}.swe-v2-presence small{display:block;margin-top:3px;color:#64748b;font-weight:650}.swe-v2-presence b{font-size:12px;text-align:right}.swe-v2-online{color:#047857}.swe-v2-offline{color:#64748b}.swe-v2-proposal.leader{box-shadow:0 0 0 2px #34d399,0 12px 24px rgba(5,150,105,.12)}';document.head.append(style);
  }
  function updateClock(data){
    room()?.querySelectorAll('.swe-v2-countdown').forEach(node=>{
      node.classList.add('swe-v2-live-clock');node.dataset.sweDeadline=data.deadline||'';node.textContent=formatTime(data.deadline);
    });
  }
  function renderAdmin(data){
    if(!data.can_admin)return;
    const side=room()?.querySelector('.swe-v2-side');if(!side)return;
    const proposal=data.proposals||[];
    const number=id=>proposal.find(item=>String(item.id)===String(id))?.sequence||'—';
    const voters=(data.voters||[]).map(voter=>{
      const status=voter.online?'🟢 Connecté':voter.connected?'⚪ Déconnecté':'⚪ Pas encore connecté';
      const detail=voter.final_choice?'Vote : proposition '+number(voter.final_choice):voter.feedback==='redraw'?'Avis : nouveau tirage demandé':voter.feedback==='keep'?'Avis : garder le tirage':'Vote : en attente';
      return '<div class="swe-v2-voter swe-v2-presence"><span>'+esc(voter.name)+'</span><b class="'+(voter.online?'swe-v2-online':'swe-v2-offline')+'">'+status+'<small>'+esc(detail)+'</small></b></div>';
    }).join('')||'<p class="muted">Mode solo : aucun votant sélectionné.</p>';
    const signature=JSON.stringify(data.voters||[]);
    if(lastSignature===signature)return;
    lastSignature=signature;
    side.innerHTML='<b>Présence et votes</b><p class="muted">Visible uniquement par l’administrateur.</p>'+voters;
  }
  function hideCountsForVoter(data){
    if(data.can_admin)return;
    room()?.querySelectorAll('.swe-v2-proposal-head span').forEach(node=>{
      node.textContent=node.closest('.leader')?'✓ Proposition en tête du vote':'Proposition disponible';
    });
  }
  // The room already loads this server state. Reuse it instead of an extra RPC every second.
  document.addEventListener('swe:draw-room-state',event=>{
    const data=event.detail;
    if(!data||!room())return;
    if(String(tournamentId)!==String(data.tournament_id)){
      tournamentId=data.tournament_id;
      lastSignature='';
    }
    addStyle();
    updateClock(data);
    renderAdmin(data);
    hideCountsForVoter(data);
  });
  // The countdown is a local clock and never touches Supabase.
  setInterval(()=>{
    if(document.visibilityState!=='visible'||!room())return;
    room().querySelectorAll('[data-swe-deadline]').forEach(node=>{
      node.textContent=formatTime(node.dataset.sweDeadline);
    });
  },1000);
})();

;

;
/* SOURCE player-creation-source.js */
/* Administrator attribution, read from the immutable creation journal. */
(()=>{'use strict';
let key='',rows=[],busy=false,timer;
const admin=()=>{try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}};
function apply(){if(!admin()||key!==S.workspace?.id+'|'+S.players.map(p=>p.id).join(','))return;const byId=new Map(rows.map(r=>[r.player_id,r]));
 document.querySelectorAll('#playersList > .player').forEach(card=>{const name=card.querySelector('.row > span > b')?.textContent;const player=S.players.find(p=>p.name===name);const source=byId.get(player?.id);if(!source)return;let label=card.querySelector('[data-player-creation-source]');if(!label){label=document.createElement('div');label.dataset.playerCreationSource='';label.className='muted';label.style.cssText='margin:6px 0;font-size:12px';card.querySelector('.row')?.after(label)}const text='Ajouté par '+source.added_by+' · '+new Date(source.added_at).toLocaleString('fr-FR',{timeZone:'America/Martinique',dateStyle:'short',timeStyle:'short'});if(label.textContent!==text)label.textContent=text;});}
async function load(){if(!admin()||!S.workspace?.id||busy)return;const next=S.workspace.id+'|'+S.players.map(p=>p.id).join(',');if(key===next){apply();return}busy=true;try{const r=await sb.rpc('admin_get_player_creation_sources_v1',{p_workspace_id:S.workspace.id});if(r.error)throw r.error;if(next!==S.workspace?.id+'|'+S.players.map(p=>p.id).join(','))return;key=next;rows=r.data||[];apply()}catch(e){console.warn('Attribution des membres',e)}finally{busy=false}}
function schedule(){clearTimeout(timer);timer=setTimeout(load,80)}
function boot(){const list=document.getElementById('playersList');if(list)new MutationObserver(schedule).observe(list,{childList:true});schedule()}
document.addEventListener('swe:rendered',schedule);document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="players"]'))schedule()});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

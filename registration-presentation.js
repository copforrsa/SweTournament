/* One presentation layer, called by app.js after loading the existing public snapshot. */
(()=>{
'use strict';
document.addEventListener('click',event=>{if(!event.target.closest('#publicSaveThirdHalfPreference'))return;const box=document.getElementById('publicThirdHalfRegistration');if(!box)return;const done=new MutationObserver(()=>{const save=document.getElementById('publicSaveThirdHalfPreference');if(!save||!/^Mettre à jour/.test(save.textContent||''))return;done.disconnect();const flow=document.getElementById('registrationFlow');if(!flow||document.getElementById('registrationComplete'))return;const complete=document.createElement('section');complete.id='registrationComplete';complete.className='sp-registration-complete';complete.innerHTML='<b>✓ Merci, ton inscription est complète.</b><span>Ta réponse pour la 3e mi-temps est bien enregistrée.</span><button type="button">Modifier mes choix</button>';complete.querySelector('button').onclick=()=>{complete.remove();flow.hidden=false;};flow.before(complete);flow.hidden=true;});done.observe(box,{childList:true,subtree:true});setTimeout(()=>done.disconnect(),10000);});
const E=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const date=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))return '';if(v===dayKey(new Date()))return 'Aujourd’hui';const d=new Date(v+'T12:00:00Z');return Number.isFinite(d.getTime())?d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}):''};
const dateTime=v=>{const d=new Date(v);if(!v||!Number.isFinite(d.getTime()))return '';return dayKey(d)===dayKey(new Date())?'Aujourd’hui à '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});};
const closed=t=>t.status==='finished'||t.registration_open===false||!!(t.registration_deadline&&Date.parse(t.registration_deadline)<=Date.now());
const started=m=>['live','playing','finished'].includes(m.status)||!!m.started_at||Number(m.home_score)>0||Number(m.away_score)>0;
function setHtml(el,html){if(el&&el.innerHTML!==html)el.innerHTML=html;}
function mount(ctx){
 const root=E('publicView'),initial=ctx.data();if(!root||!initial.tournament||initial.tournament.format==='league')return null;
 if(root.__registrationPresentation&&E('registrationProgress')&&E('registrationFlow')){root.__registrationPresentation.setContext(ctx);return root.__registrationPresentation;}
 root.classList.add('swe-premium');document.body.classList.add('swe-premium-page');
 const header=root.querySelector(':scope > header');header.className='sp-hero';header.id='registrationHero';
 header.innerHTML='<div class="sp-brand">SWÉ <small>TOURNAMENT</small></div><div class="sp-pitch" aria-hidden="true"></div><div id="registrationState"></div><div id="registrationFormat" class="sp-eyebrow"></div><h1 id="publicWorkspaceName"></h1><p>Un terrain. Des équipes. Un moment à partager.</p><div id="registrationMeta" class="sp-meta"></div>';
 const progress=document.createElement('nav');progress.id='registrationProgress';progress.className='sp-progress';progress.setAttribute('aria-label','Progression du tournoi');header.after(progress);
 const body=document.createElement('div');body.className='sp-body';body.innerHTML='<main class="sp-main"><div id="registrationPhaseCard"></div><section id="registrationFormArea" class="sp-form-area"></section><section id="registrationTeams"></section><section id="registrationPeople" class="sp-card sp-people-card"><div class="sp-eyebrow">LE GROUPE PREND FORME</div><h2>Les inscrits</h2></section><section id="registrationSeasonRankings" class="sp-season-rankings"></section></main><aside class="sp-aside"><section id="registrationSummary" class="sp-card"></section><section id="registrationGeneral"></section><details id="registrationParticipationRules" class="sp-card sp-participation-rules"><summary>Règles d’inscription</summary><div></div></details><details id="registrationRules" class="sp-card sp-rules"><summary>Règles du tournoi</summary><div></div></details><div id="registrationHistoryArea"></div></aside>';
 progress.after(body);
 const form=E('registrationFormArea');['publicEntryChoiceCard','publicRegistrationCard','publicTeamBuilderCard'].forEach(id=>{const el=E(id);if(el)form.append(el)});
 const entry=E('publicEntryChoiceCard');entry.className='sp-tabs';
 const soloButton=E('chooseSoloMode'),teamButton=E('chooseTeamMode');
 soloButton.textContent='Moi & mes invités';teamButton.textContent='Je viens en équipe';
 soloButton.removeAttribute('style');teamButton.removeAttribute('style');entry.replaceChildren(soloButton,teamButton);
 ['publicRegistrationCard','publicTeamBuilderCard'].forEach(id=>{const card=E(id);card?.classList.add('sp-card');const title=card?.querySelector('h2');if(title)title.textContent=id==='publicRegistrationCard'?'À toi de jouer.':'Ton équipe, ton groupe.';});
 const select=E('publicPlayerSelect');
 if(select){let node=E('publicRegistration').firstElementChild;while(node&&node!==select){node.classList.add('sp-legacy-intro');node=node.nextElementSibling}const label=document.createElement('label');label.htmlFor=select.id;label.className='sp-name-label';label.textContent='Ton nom';select.before(label);const lock=document.createElement('div');lock.id='registrationSelectionLock';lock.className='sp-selection-lock';lock.hidden=true;select.after(lock);select.addEventListener('change',()=>{E('registrationIdentityStep')?.classList.remove('is-editing');updateMissions();loadSelectedRating();queueMicrotask(updateFlow);});}
 const guest=E('publicGuestFields');if(guest){const preceding=guest.previousElementSibling;if(preceding?.textContent.includes('Tu ne participes pas mais'))guest.append(preceding);}
 const status=E('publicRegStatus');if(status){status.textContent='';status.setAttribute('role','status');status.classList.add('sp-feedback');}
 const people=E('registrationPeople'),list=E('publicRegisteredList');if(list){if(list.previousElementSibling?.tagName==='H3')list.previousElementSibling.remove();people.append(list)}if(E('publicWaitWrap'))people.append(E('publicWaitWrap'));
 const historyArea=E('registrationHistoryArea'),last=E('publicLastTournamentDetails')?.parentElement,history=E('publicHistory')?.closest('.card');
 if(last){last.classList.add('sp-history');historyArea.append(last)}
 if(history){const disclosure=document.createElement('details');disclosure.className='sp-card sp-history';disclosure.innerHTML='<summary>Historique des tournois</summary>';history.querySelector('h2')?.remove();disclosure.append(history);historyArea.append(disclosure);}
 ['publicSeasonScorers','publicSeasonAssists','publicTournamentTopFive'].forEach(id=>{const card=E(id)?.closest('.card');if(card){card.classList.add('sp-card');E('registrationSeasonRankings').append(card)}});
 body.append(E('registrationSeasonRankings'));
 const competitionTeams=E('registrationTeams');if(competitionTeams)body.insertBefore(competitionTeams,E('registrationSeasonRankings'));
 // La présentation premium possède son propre grand tableau des équipes.
 // On retire l’ancien petit encart pour ne jamais afficher les compositions deux fois.
 E('publicTeams')?.closest('.card')?.remove();
 E('publicSeasonTopPlayers')?.closest('.card')?.classList.add('hidden');
 root.querySelectorAll(':scope > .grid').forEach(el=>{if(!el.querySelector('.card:not(.hidden)'))el.classList.add('hidden')});
 const donor=E('publicThirdHalfDonorCard');if(donor)body.querySelector('.sp-main').append(donor);
 const registration=E('publicRegistration'),mission=document.createElement('section');mission.id='registrationMissions';mission.className='sp-missions';mission.hidden=true;
 const playerPanel=document.createElement('section');playerPanel.id='registrationPlayerStats';playerPanel.className='sp-player-stats';playerPanel.hidden=true;
 const flow=document.createElement('div');flow.id='registrationFlow';flow.className='sp-registration-flow';
 const makeStep=(id,number,title,description)=>{const section=document.createElement('section');section.id=id;section.className='sp-flow-step';section.innerHTML='<header><span>'+number+'</span><div><h3>'+title+'</h3><p>'+description+'</p></div><button class="sp-step-edit" type="button" hidden>Modifier</button></header><div class="sp-flow-content"></div>';return section;};
 const identityStep=makeStep('registrationIdentityStep','1','Qui es-tu ?','Sélectionne ton nom dans la liste du groupe.');
 const attendanceStep=makeStep('registrationAttendanceStep','2','Participes-tu au tournoi ?','Confirme ta présence en un geste.');
 const guestsStep=makeStep('registrationGuestsStep','3','Viens-tu avec des invités ?','Ajoute-les maintenant pour réserver leur place.');
 const thirdHalfStep=makeStep('registrationThirdHalfStep','4','La 3e mi-temps','Dis si tu restes et choisis ta participation.');
 const identityContent=identityStep.querySelector('.sp-flow-content'),selectedStatus=E('publicSelectedStatus'),selectionHint=selectedStatus?.nextElementSibling;
 [registration?.querySelector('.sp-name-label'),select,E('registrationSelectionLock'),selectedStatus,selectionHint?.classList.contains('muted')?selectionHint:null,E('publicTeamInvitationDecision')].filter(Boolean).forEach(el=>identityContent.append(el));
 [E('publicParticipationActions'),E('publicPaymentBox'),E('publicRegStatus')].filter(Boolean).forEach(el=>attendanceStep.querySelector('.sp-flow-content').append(el));
 const guestChoice=document.createElement('div');guestChoice.id='registrationGuestChoice';guestChoice.className='sp-binary-choice';guestChoice.innerHTML='<button type="button" data-guest-choice="yes">Oui, j’ai des invités</button><button type="button" data-guest-choice="no">Non, je viens seul</button>';
 const registeredActions=document.createElement('div');registeredActions.id='registrationRegisteredActions';registeredActions.className='sp-registered-actions';registeredActions.innerHTML='<p><b>Tu es déjà inscrit.</b> Que veux-tu faire ?</p><div><button type="button" data-registered-action="cooler">🧊 Ma 3e mi-temps</button><button type="button" data-registered-action="guests">👤 J’ai des invités</button><button type="button" data-registered-action="team">⚽ Voir ma proposition d’équipe</button><button type="button" data-registered-action="leave" class="danger">Je me désinscris</button></div><section data-leave-reason hidden><label>Motif de désinscription<select><option value="">Choisir un motif…</option><option>Empêchement personnel</option><option>Blessure ou problème de santé</option><option>Changement professionnel</option><option>Transport / disponibilité</option><option>Autre motif</option></select></label><button type="button" data-confirm-leave>Confirmer ma désinscription</button></section>';
 guestsStep.querySelector('.sp-flow-content').append(registeredActions);
 guestsStep.querySelector('.sp-flow-content').append(guestChoice);if(guest)guestsStep.querySelector('.sp-flow-content').append(guest);
 const guestContinue=document.createElement('button');guestContinue.id='registrationGuestContinue';guestContinue.className='sp-guest-continue';guestContinue.type='button';guestContinue.textContent='J’ai terminé d’ajouter mes invités →';guestContinue.hidden=true;guestsStep.querySelector('.sp-flow-content').append(guestContinue);
 if(E('publicThirdHalfRegistration'))thirdHalfStep.querySelector('.sp-flow-content').append(E('publicThirdHalfRegistration'));
 flow.append(identityStep,attendanceStep,guestsStep,thirdHalfStep);registration?.append(playerPanel,flow,mission);
 const guestChoices=new Map(),guestCompleted=new Map(),registeredAction=new Map();
 registeredActions.addEventListener('click',event=>{const action=event.target.closest('[data-registered-action]')?.dataset.registeredAction,pid=select?.value;if(!action||!pid)return;registeredAction.set(pid,action);registeredActions.querySelector('[data-leave-reason]').hidden=action!=='leave';if(action==='leave')return;updateFlow();});
 registeredActions.querySelector('[data-confirm-leave]').addEventListener('click',()=>{const reason=registeredActions.querySelector('select').value;if(!reason)return;E('publicRegStatus').textContent='Désinscription : '+reason+'.';E('publicLeave')?.click();});
 guestChoice.addEventListener('click',event=>{const button=event.target.closest('[data-guest-choice]'),pid=select?.value;if(!button||!pid)return;event.stopPropagation();const yes=button.dataset.guestChoice==='yes';guestChoices.set(pid,yes);guestCompleted.set(pid,!yes);guestsStep.classList.remove('is-editing');if(guest){guest.open=yes;if(yes)queueMicrotask(()=>E('publicGuestName')?.focus());}updateFlow();},true);
 guestContinue.addEventListener('click',()=>{const pid=select?.value;if(!pid)return;guestCompleted.set(pid,true);guestsStep.classList.remove('is-editing');updateFlow();});
 [identityStep,attendanceStep,guestsStep].forEach(step=>step.querySelector('.sp-step-edit').addEventListener('click',()=>{const pid=select?.value;if(!pid)return;if(step===guestsStep)guestCompleted.set(pid,false);step.classList.add('is-editing');updateFlow();}));
 function updateFlow(){
  const d=ctx.data(),pid=select?.value||'',reg=d.registrations.find(r=>r.tournament_id===d.tournament.id&&String(r.player_id)===String(pid)&&r.present&&r.registration_status!=='cancelled');
  const usedGuests=pid?d.registrations.some(r=>r.tournament_id===d.tournament.id&&String(r.registered_by_player_id||'')===String(pid)):false;
  if(usedGuests&&!guestChoices.has(pid))guestChoices.set(pid,true);
  const guestAnswer=guestChoices.get(pid);
  const action=registeredAction.get(pid)||'';
  const actionTitle=guestsStep.querySelector('header h3'),actionDescription=guestsStep.querySelector('header p');
  if(reg){actionTitle.textContent=action==='guests'?'Ajouter des invités':action==='cooler'?'Ta participation à la 3e mi-temps':action==='team'?'Ta proposition d’équipe':action==='leave'?'Te désinscrire':'Que veux-tu modifier ?';actionDescription.textContent=action?'Tu peux revenir à tes autres choix en sélectionnant à nouveau ton nom.':'Gère tes invités, la glacière, ton équipe ou ton inscription.';}else{actionTitle.textContent='Viens-tu avec des invités ?';actionDescription.textContent='Ajoute-les maintenant pour réserver leur place.';}
  identityStep.classList.toggle('is-complete',!!pid&&!identityStep.classList.contains('is-editing'));identityStep.classList.toggle('is-current',!pid||identityStep.classList.contains('is-editing'));
  attendanceStep.hidden=!pid;attendanceStep.classList.toggle('is-complete',!!reg&&!attendanceStep.classList.contains('is-editing'));attendanceStep.classList.toggle('is-current',!!pid&&(!reg||attendanceStep.classList.contains('is-editing')));
  const guestsDone=guestAnswer===false||(guestAnswer===true&&guestCompleted.get(pid)===true);
  guestsStep.hidden=!reg||action==='cooler';guestsStep.classList.toggle('is-complete',false);guestsStep.classList.toggle('is-current',!!reg&&!guestsStep.hidden);
  guestChoice.querySelectorAll('button').forEach(button=>{const selected=guestAnswer!==undefined&&((button.dataset.guestChoice==='yes')===guestAnswer);button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
  registeredActions.hidden=!!action;guestChoice.hidden=action!=='guests';
  if(guest){guest.hidden=action!=='guests'||guestAnswer!==true;if(action!=='guests'||guestAnswer!==true)guest.open=false;}
  guestContinue.hidden=action!=='guests'||guestAnswer!==true;
  const teamDecision=E('publicTeamInvitationDecision');if(teamDecision){teamDecision.hidden=action!=='team';if(action==='team')guestsStep.querySelector('.sp-flow-content').append(teamDecision);}
  const thirdBox=E('publicThirdHalfRegistration'),thirdEnabled=!!reg&&action==='cooler'&&thirdBox&&!thirdBox.classList.contains('hidden');thirdHalfStep.hidden=!thirdEnabled;
  thirdHalfStep.classList.toggle('is-current',thirdEnabled&&guestsDone);playerPanel.hidden=!pid;
  [identityStep,attendanceStep,guestsStep].forEach(step=>{const edit=step.querySelector('.sp-step-edit');edit.hidden=!step.classList.contains('is-complete');});
 }
 let ratingResult=null,ratingPlayer=null,ratingState='',ratingSequence=0;
 async function loadSelectedRating(){
  const pid=select?.value,sequence=++ratingSequence;ratingResult=null;ratingPlayer=pid;ratingState=pid?'loading':'';updatePlayerStats();
  if(!pid||!ctx.loadRating){ratingState='';return updatePlayerStats()}
  try{const value=await ctx.loadRating(pid);if(sequence!==ratingSequence)return;ratingResult=value;ratingState=value?'ready':'unavailable';}
  catch(_){if(sequence!==ratingSequence)return;ratingState='unavailable';}
  updatePlayerStats();
 }
 function updatePlayerStats(pid=select?.value,panel=playerPanel,loadedRating=undefined,loadState=ratingState){
  const d=ctx.data();panel.hidden=!pid;if(!pid){panel.replaceChildren();return;}
  const season=(d.seasons||[]).find(x=>x.id===d.tournament.season_id)||(d.seasons||[]).find(x=>x.is_active);
  const tours=d.tournaments.filter(t=>t.format!=='league'&&season&&(t.season_id===season.id||(!t.season_id&&(!season.starts_on||t.tournament_date>=season.starts_on)&&(!season.ends_on||t.tournament_date<=season.ends_on))));
  const seasonIds=new Set(tours.map(t=>t.id));
  const stats={matches:0,wins:0,goals:0,assists:0,tournamentsWon:0},ratings=[],playedTeams=new Map();
  const seasonMatches=(d.matches||[]).filter(m=>seasonIds.has(m.tournament_id));
  const matchIds=new Set(seasonMatches.map(m=>m.id));
  for(const g of (d.goals||[]).filter(g=>matchIds.has(g.match_id)&&!g.is_own_goal)){if(g.scorer_player_id===pid)stats.goals++;if(g.assister_player_id===pid)stats.assists++;}

  for(const m of seasonMatches){
   const tour=d.tournaments.find(t=>t.id===m.tournament_id);
   const archived=tour?.status==='finished'&&m.status==='scheduled'&&!m.started_at&&!m.finished_at;
   if(!started(m)&&!archived)continue;
   const assignments=(d.matchAssignments||[]).filter(a=>a.match_id===m.id),own=assignments.find(a=>a.player_id===pid);
   const team=own?own.team_id:(!assignments.length||archived)?d.teamPlayers.find(tp=>tp.player_id===pid&&[m.home_team_id,m.away_team_id].includes(tp.team_id))?.team_id:null;
   if(!team||![m.home_team_id,m.away_team_id].includes(team))continue;
   const final=m.status==='finished'||archived;
   if(final){const r=ctx.rateMatch?.(m,pid,team,d.goals||[]);if(r&&Number.isFinite(r.rating))ratings.push(r.rating);}
   if(!playedTeams.has(m.tournament_id))playedTeams.set(m.tournament_id,new Set());playedTeams.get(m.tournament_id).add(team);
   stats.matches++;
   if(final&&((team===m.home_team_id&&Number(m.home_score)>Number(m.away_score))||(team===m.away_team_id&&Number(m.away_score)>Number(m.home_score))))stats.wins++;
  }
  for(const tour of tours.filter(t=>t.status==='finished')){
   const champion=ctx.standings?.(tour.id)?.[0];
   if(champion&&playedTeams.get(tour.id)?.has(champion.id))stats.tournamentsWon++;
  }
  const format=(n,scale)=>Number(n).toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})+' / '+scale;
  const academy=loadedRating!==undefined?loadedRating:(ratingPlayer===pid?ratingResult:null),group=academy?.rating_group_name||d.ratingGroupName||'Groupe de notation';
  const delta=academy?.rating_delta==null?'':(Number(academy.rating_delta)>0?'+':'')+Number(academy.rating_delta).toLocaleString('fr-FR',{maximumFractionDigits:2})+' d’évolution cumulée';
  const ratingCaption=academy?.rating_frozen?'Note figée pour cette équipe':delta||'Évaluation du groupe · sur 5';
  const note=loadState=== 'loading'?'Chargement…':loadState=== 'unavailable'?'Note indisponible':academy?.avg_rating!=null?format(academy.avg_rating,5):'Non noté';
  const player=d.players.find(p=>p.id===pid),matchAverage=ratings.length?ratings.reduce((sum,n)=>sum+n,0)/ratings.length:null;
  const scoreCard=(label,value,scale,caption,tone,challenge)=>{
   const valid=value!==null&&value!==undefined&&Number.isFinite(Number(value)),percentage=valid?Math.max(0,Math.min(100,Number(value)/scale*100)):0;
   return '<div class="sp-score-card '+tone+'"><span class="sp-score-label">'+esc(label)+'</span><div class="sp-score-value'+(valid?'':' sp-score-empty')+'">'+(valid?esc(Number(value).toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1}))+' <small>/ '+scale+'</small>':esc(caption))+'</div><div class="sp-score-track" aria-hidden="true"><i style="width:'+percentage+'%"></i></div><p>'+esc(valid?caption:label==='Note Match'?'Les notes apparaîtront après tes matchs.':'Ta note apparaîtra une fois disponible.')+'</p>'+(challenge?'<div class="sp-rating-challenge">'+esc(challenge)+'</div>':'')+'</div>';
  };
  setHtml(panel,'<div class="sp-player-heading"><div><div class="sp-eyebrow">MON PROFIL JOUEUR</div><h3>'+esc(player?.name||'Mon profil')+'</h3></div><span class="sp-season-tag">'+esc(season?.name||'Aucune saison active')+'</span></div><div class="sp-rating-grid">'+scoreCard(academy?.rating_is_estimate?'Estimation invité':'Note '+group,academy?.rating_is_estimate?academy.balancing_estimate:loadState=== 'ready'?academy?.avg_rating:null,5,academy?.rating_is_estimate?'Pour équilibrer les équipes · aucune note membre':note==='Chargement…'||note==='Note indisponible'||note==='Non noté'?note:ratingCaption,'sp-academy','Tu penses qu’ils ont raison ?')+scoreCard('Note Match',matchAverage,10,ratings.length?'Moyenne de '+ratings.length+' match'+(ratings.length>1?'s':'')+' noté'+(ratings.length>1?'s':''):'Non noté','sp-match-rating','Prouve-le sur le terrain !')+'</div><div class="sp-season-heading">Mes résultats de la saison</div><div class="sp-player-numbers">'+[['Matchs',stats.matches],['Victoires',stats.wins],['Buts',stats.goals],['Passes',stats.assists],['Tournois remportés',stats.tournamentsWon]].map(([label,value])=>'<div><strong>'+value+'</strong><span>'+label+'</span></div>').join('')+'</div>');
 }
 function updateMissions(){
  const d=ctx.data(),t=d.tournament,b=t.registration_briefing||{},pid=select?.value;
  const co=d.isCoorganizer===true||(d.coorganizers||[]).includes(pid);const items=[];
  const organizerUrl=(()=>{try{const u=new URL(ctx.appUrl,location.href);if(t.workspace_id)u.searchParams.set('workspace',t.workspace_id);u.searchParams.set('start','home');return u.toString()}catch(_){return ctx.appUrl}})();
  const drawRoomUrl=(()=>{try{const u=new URL(organizerUrl,location.href);u.searchParams.set('draw_room',t.id);return u.toString()}catch(_){return organizerUrl}})();
  // Les consignes n'apparaissent que pour le co-gestionnaire concerné.
  if(!co){mission.hidden=true;mission.replaceChildren();return;}
  if(co){
   if(String(d.personalInstruction||'').trim())items.push('Consigne personnalisée : '+String(d.personalInstruction).trim());
   if(b.observe===true&&t.status!=='finished')items.push('Surveillez les nouveaux joueurs pour leur donner une note.');
   if(b.evening===true)items.push(t.team_review_status==='approved'?'La composition des équipes est validée.':t.team_review_status==='pending'?'Ton avis est demandé sur la composition proposée. Connecte-toi à ton espace pour participer à la validation.':'Ton avis sera demandé dans la soirée pour valider la composition des équipes.');
   if(b.rating===true){const w=d.ratingWindows?.find(w=>w.tournament_id===t.id),expired=w&&(w.status==='closed'||Date.parse(w.closes_at)<=Date.now());items.push(expired?'La période de notation de 48 h est terminée.':t.status==='finished'&&w?'Pense à te connecter pour noter les joueurs. La notation est ouverte jusqu’au '+dateTime(w.closes_at)+'.':'Pense à te connecter pour noter les joueurs à la fin du tournoi. Le lien sera valable 48 h après sa clôture officielle.');}
  }
  if(!items.length){mission.hidden=true;mission.replaceChildren();return;}
  mission.hidden=false;
  const storageKey='swe-coorg-instructions-'+t.id;let open=true;try{open=localStorage.getItem(storageKey)!=='closed'}catch(_){}
  setHtml(mission,'<details class="sp-coorg-instructions" '+(open?'open':'')+'><summary>📣 Tes consignes de co-gestionnaire</summary><div class="sp-coorg-instructions-body"><ul>'+items.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>'+(t.draw_room_first_enabled&&t.team_review_status==='pending'?'<a class="sp-button" style="margin-right:8px" href="'+esc(drawRoomUrl)+'">🗳️ Ouvrir le salon de validation →</a>':'')+'<a class="sp-button sp-secondary" href="'+esc(organizerUrl)+'">Ouvrir mon espace organisateur →</a></div></details>');
  const details=mission.querySelector('.sp-coorg-instructions');if(details&&!details.dataset.wired){details.dataset.wired='1';details.addEventListener('toggle',()=>{try{localStorage.setItem(storageKey,details.open?'open':'closed')}catch(_){}});}
 }
 let kingRules=null,ruleKey='',ruleAt=0,ruleSequence=0;
 function refreshRules(d){
  if(!ctx.loadRules)return;
  const t=d.tournament,n=d.registrations.filter(r=>r.tournament_id===t.id&&r.present&&r.registration_status!=='waitlist').length,key=t.id+'|'+n;
  if(ruleKey===key&&Date.now()-ruleAt<30000)return;
  if(ruleKey!==key)kingRules=null;ruleKey=key;ruleAt=Date.now();const sequence=++ruleSequence;
  ctx.loadRules().then(value=>{if(sequence!==ruleSequence)return;kingRules=value;update();}).catch(()=>{});
 }
 const paragraphs=text=>String(text||'').split('\n').filter(Boolean).map(line=>'<p>'+esc(line)+'</p>').join('');
 const isConquest=t=>{
  const value=[t?.format,t?.name,t?.reservation_reference,t?.registration_briefing?.general].filter(Boolean).join(' ');
  return /conqu[êe]te(?:\s+du\s+terrain)?/i.test(value);
 };
 function conquestRules(t,confirmed){
  const size=Math.max(1,Number(t.team_size)||5),playing=confirmed.filter(r=>!r.is_substitute).length,teams=Math.floor(playing/size);
  const intro='<p><b>'+playing+' inscrit'+(playing>1?'s':'')+' pris en compte · '+teams+' équipe'+(teams>1?'s':'')+' complète'+(teams>1?'s':'')+' possible'+(teams>1?'s':'')+'</b></p><h3>Phase 1 · Championnat</h3><p>Toutes les équipes se rencontrent pour établir le classement : <b>3 points</b> pour une victoire, <b>1 point</b> pour un nul, <b>0 point</b> pour une défaite.</p><h3>Phase 2 · Conquête</h3>';
  const scenarios={
   4:'<p><b>Tableau adapté : 4 équipes.</b></p><ol><li><b>Demi-finales :</b> 1er contre 3e, puis 2e contre 4e.</li><li><b>Finale :</b> les deux vainqueurs des demi-finales se rencontrent.</li></ol>',
   5:'<p><b>Tableau adapté : 5 équipes.</b></p><ol><li><b>Barrage :</b> 4e contre 5e.</li><li><b>Demi-finales :</b> 1er contre le vainqueur du barrage, puis 2e contre 3e.</li><li><b>Finale :</b> les deux vainqueurs des demi-finales se rencontrent.</li></ol>',
   6:'<p><b>Tableau adapté : 6 équipes.</b></p><ol><li><b>Barrages :</b> 3e contre 6e et 4e contre 5e.</li><li><b>Demi-finales :</b> 1er contre le vainqueur de 4e/5e, puis 2e contre le vainqueur de 3e/6e.</li><li><b>Finale :</b> les deux vainqueurs des demi-finales se rencontrent.</li></ol>'
  };
  const active=scenarios[teams],notice=active?'':teams<4?'<p>Le tableau Conquête sera affiché dès que l’effectif permettra de former au moins <b>4 équipes complètes</b>.</p>':'<p>La configuration actuelle permet '+teams+' équipes complètes. Le tableau Conquête est prévu pour 4, 5 ou 6 équipes ; l’organisation annoncera l’adaptation avant le début des matchs.</p>';
  return intro+(active||notice)+'<p><b>Élimination :</b> en phase Conquête, une défaite met fin au parcours. À <b>3 buts d’écart</b>, l’équipe perdante est éliminée de la Conquête.</p><p>Les équipes éliminées peuvent encourager les finalistes ou continuer à jouer sur les autres terrains.</p>';
 }
 function update(){
  const d=ctx.data(),t=d.tournament;if(!t)return;
  const tm=d.matches.filter(m=>m.tournament_id===t.id),begun=tm.some(started),finished=t.status==='finished';
  // Once teams exist, keep them visible: the public link remains the reference
  // for the group, including while co-managers discuss the composition.
  const visibleTeams=d.teams.filter(x=>x.tournament_id===t.id);
  const regs=d.registrations.filter(r=>r.tournament_id===t.id&&r.present),confirmed=regs.filter(r=>r.registration_status!=='waitlist'),substitutesEnabled=confirmed.length>10,subs=substitutesEnabled?confirmed.filter(r=>r.is_substitute).length:0,waiting=regs.length-confirmed.length,max=Number(t.max_players||35),isFull=max>0&&regs.length>=max,isClosed=closed(t)||isFull;
  const stage=finished?3:begun?2:isClosed||t.team_review_status==='pending'||t.team_review_status==='approved'?1:0;
  const label=finished?'Tournoi terminé':begun?'Matchs en direct':t.team_review_status==='pending'?'Équipes en validation':t.team_review_status==='approved'?'Équipes validées':isFull?'Effectif complet':isClosed?'Inscriptions closes':'Inscriptions ouvertes';
  const tone=['green','blue','orange','purple'][stage];root.dataset.stage=tone;
  setHtml(E('registrationState'),'<span class="sp-state '+tone+'">● '+label+'</span>');E('publicWorkspaceName').textContent=t.name||'Tournoi SWÉ';
  const king=t.format==='king_of_pitch'||t.rotation_mode==='king_of_pitch',conquest=!king&&isConquest(t),format=king?'Roi du terrain':conquest?'Conquête du terrain':'Tournoi classique',formatEl=E('registrationFormat');
  root.classList.toggle('sp-conquest',conquest);
  formatEl.textContent=format+(king?' · Terres du Roi : Carrefour':'')+' · '+(t.team_size||5)+' contre '+(t.team_size||5);formatEl.classList.toggle('sp-king-format',king);
  const pitches=(t.reserved_pitch_ids||[]).map(id=>d.pitches?.find(p=>p.id===id)?.name).filter(Boolean).join(', ');
  const venueRaw=t.venue||'';
  const venueLabel=king?'Arena':(venueRaw.split(/\\s*[—-]\\s*/)[0]||venueRaw||'');
  const terrainLabel=king?'Carrefour, Mercedes, Boulogne':(pitches||venueRaw.split(/\\s*[—-]\\s*/).slice(1).join(', ')||'');
  const fee=Number(t.entry_fee_cents||0)/100,fields=[['Date',date(t.tournament_date)],['Heure',t.start_time?String(t.start_time).slice(0,5):''],['Lieu',venueLabel],['Terrains',terrainLabel],['Participation',fee.toLocaleString('fr-FR',{style:'currency',currency:'EUR'})]];
  setHtml(E('registrationMeta'),fields.filter(x=>x[1]).map(([label,value])=>'<span><b>'+label+'</b>'+esc(value)+'</span>').join(''));
  setHtml(progress,['Inscriptions','Équipes','Matchs en direct','Résultats'].map((s,i)=>'<span class="'+(i<stage?'done':i===stage?'current':'')+'"'+(i===stage?' aria-current="step"':'')+'><i>'+(i<stage?'✓':i+1)+'</i>'+s+'</span>').join(''));
  const remaining=Math.max(0,max-regs.length);
  const rows=[['Format',format],['Durée des matchs',t.match_duration_minutes?t.match_duration_minutes+' min':''],['Terrains',terrainLabel],['Réservation',t.reservation_reference]];
  const level=d.groupLevels?.find(g=>g.tournament_id===t.id)?.avg_rating;if(level!==null&&level!==undefined)rows.push(['Niveau du groupe',Number(level).toFixed(1).replace('.',',')+' / 5']);
  setHtml(E('registrationSummary'),'<div class="sp-eyebrow">'+(isClosed?'LES PARTICIPANTS':'REJOINS LE GROUPE')+'</div><div class="sp-count"><strong>'+regs.length+' <small>/ '+max+'</small></strong><span>'+(!isClosed?remaining+' places restantes':'inscrits')+'</span></div><div class="sp-meter"><i style="width:'+Math.min(100,100*confirmed.length/max)+'%"></i></div><p class="sp-subtext">'+confirmed.length+' confirmé'+(confirmed.length>1?'s':'')+(subs?' · '+subs+' remplaçant'+(subs>1?'s':''):'')+(waiting?' · '+waiting+' en attente':'')+'</p>'+(!isClosed&&t.registration_deadline?'<div class="sp-split"><span>Fin des inscriptions</span><b>'+esc(dateTime(t.registration_deadline))+'</b></div><div class="sp-countdown" data-registration-deadline="'+esc(t.registration_deadline)+'"></div>':'')+rows.filter(x=>x[1]).map(([label,value])=>'<div class="sp-split"><span>'+label+'</span><b>'+esc(value)+'</b></div>').join(''));
  const general=String(t.registration_briefing?.general||'').trim(),note=E('registrationGeneral');note.hidden=!general;note.className='sp-card sp-general';setHtml(note,general?'<div class="sp-eyebrow">UN MOT DE L’ADMINISTRATEUR</div><h2>Les consignes du tournoi.</h2><p>'+esc(general)+'</p>':'');
  const size=Number(t.team_size||5);
  setHtml(E('registrationParticipationRules').querySelector('div'),'<h3>Les remplaçants</h3><p>Les remplaçants ne sont pris en compte qu’à partir du 11e joueur inscrit. Jusqu’à 10 joueurs, le tournoi peut encore être annulé ou réorganisé par l’organisation.</p><h3>Les invitations</h3><p>Un membre du groupe peut inviter jusqu’à 5 personnes, même s’il ne participe pas. Choisis ton nom, puis retrouve un ancien invité ou ajoute une nouvelle personne dans « Mes invités ». Une personne déjà inscrite n’a pas besoin d’être ajoutée à nouveau.</p><h3>Le désistement de dernière minute</h3><p>Préviens le groupe et utilise « Je ne participe pas » pour signaler ton absence. En cas de désistement de dernière minute, tu paies ta tournée au groupe à la prochaine édition.</p>');
  const rules=E('registrationRules');rules.querySelector('summary').textContent='Règles · '+format;
  if(king){
   refreshRules(d);
   setHtml(rules.querySelector('div'),kingRules?'<p><b>'+Number(kingRules.player_count)+' inscrits confirmés · '+Number(kingRules.team_count)+' équipes complètes'+(kingRules.substitutes?' · '+Number(kingRules.substitutes)+' remplaçant(s)':'')+'</b></p>'+(kingRules.body?'<h3>'+esc(kingRules.title)+'</h3>'+paragraphs(kingRules.body):'<p>Le règlement spécifique sera affiché lorsque l’effectif permettra de constituer entre 3 et 7 équipes de 5. L’organisateur précisera l’organisation si le format est différent.</p>')+'<p>Les compositions seront disponibles lorsque les équipes auront été composées par l’organisation.</p><h3>'+esc(kingRules.common_title)+'</h3>'+paragraphs(kingRules.common_body):'<p>Chargement des règles adaptées aux inscriptions…</p>');
  }else if(conquest){
   setHtml(rules.querySelector('div'),conquestRules(t,confirmed));
  }else{
  setHtml(rules.querySelector('div'),'<p>'+ (king?'Le vainqueur reste sur le terrain du Roi ; les équipes tournent selon l’ordre organisé.':'Les équipes se rencontrent selon le calendrier du tournoi. Le classement est calculé aux points : 3 pour une victoire, 1 pour un nul, 0 pour une défaite.')+'</p>'+(t.match_duration_minutes?'<p>Durée prévue : <b>'+Number(t.match_duration_minutes)+' min</b> par match.</p>':'')+(t.odd_team_rotation_rule?'<p>Avec une équipe en attente : rotation à 2 buts d’écart, ou au terme de la durée du match.</p>':'')+'<p>Les compositions seront disponibles lorsque les équipes auront été composées par l’organisation.</p><p>Respectez les horaires, les décisions de l’organisation et les autres joueurs.</p>');
  }
  const live=ctx.appUrl+'live.html?'+new URLSearchParams({public:ctx.token,tournament:t.id}).toString();
  const now=tm.find(m=>['live','playing'].includes(m.status))||tm.filter(started).slice(-1)[0];
  const score=now?esc(d.teams.find(x=>x.id===now.home_team_id)?.name||'Équipe A')+' '+Number(now.home_score||0)+' – '+Number(now.away_score||0)+' '+esc(d.teams.find(x=>x.id===now.away_team_id)?.name||'Équipe B'):'';
  const proSalon=d.isAdmin&&t.draw_room_first_enabled&&t.team_review_status!=='approved'?'<a class="sp-team-jump" style="display:inline-block;margin-top:10px" href="'+esc(ctx.appUrl+'?draw_room='+encodeURIComponent(t.id))+'">🗳️ Pro : choisir et publier une composition →</a>':'';
  setHtml(E('registrationPhaseCard'),begun||finished?'<section class="sp-live sp-'+tone+'"><div><div class="sp-eyebrow">'+(finished?'LE BILAN DU TOURNOI':'LE TERRAIN EN DIRECT')+'</div><h2>'+(finished?'Tous les résultats.':'Ne manque aucun but.')+'</h2><p>'+score+'</p></div><a id="registrationLiveLink" href="'+esc(live)+'" target="_blank" rel="noopener">'+(finished?'Voir les résultats ↗':'Suivre le direct ↗')+'</a></section>':isClosed?'<section class="sp-card sp-next sp-team-callout"><div class="sp-team-callout-icon" aria-hidden="true">⚔️</div><div class="sp-eyebrow">LE TIRAGE EST LANCÉ</div><h2>Place aux équipes</h2><p>'+ (t.team_review_status==='pending'?'Les co-gestionnaires autorisés peuvent donner leur avis depuis leur espace.':'Les inscriptions sont closes. Il est temps de découvrir les forces en présence.')+'</p>'+(visibleTeams.length?'<a class="sp-team-jump" href="#registrationTeamGrid">Voir les compositions ↓</a>':'<span class="sp-team-pending">Compositions en préparation…</span>')+proSalon+'</section>':proSalon);
  const teamsBox=E('registrationTeams');teamsBox.hidden=!visibleTeams.length;teamsBox.className='sp-card sp-teams';
  const startValue=t.tournament_date?(t.tournament_date+'T'+(t.start_time?String(t.start_time).slice(0,5):'00:00')+':00'):'';
  const assignedIds=new Set(d.teamPlayers.filter(tp=>visibleTeams.some(team=>team.id===tp.team_id)).map(tp=>String(tp.player_id)));
  const unassignedConfirmed=confirmed.filter(r=>!assignedIds.has(String(r.player_id)));
  const publicSubs=substitutesEnabled?unassignedConfirmed.filter(r=>r.is_substitute):[];
  const buildingPlayers=!substitutesEnabled&&unassignedConfirmed.length&&unassignedConfirmed.length<size?unassignedConfirmed:[];
  const hasBuildingTeam=buildingPlayers.length>0;
  const displayedTeamCount=visibleTeams.length+(hasBuildingTeam?1:0);
  const teamPlayerCount=assignedIds.size;
  const completeLabel=visibleTeams.length+' complète'+(visibleTeams.length>1?'s':'');
  const buildingLabel=hasBuildingTeam?' · 1 en création ('+buildingPlayers.length+' / '+size+')':'';
  const substitutePanel=publicSubs.length?'<aside class="sp-royal-subs"><div><span class="sp-royal-subs-kicker">🟠 LES JOKERS DU TOURNOI</span><h3>Remplaçants de la cour</h3><p>Prêts à entrer dans n’importe quelle équipe.</p></div><ul>'+publicSubs.map(r=>'<li>'+esc(d.players.find(p=>p.id===r.player_id)?.name||'Joueur')+'</li>').join('')+'</ul></aside>':'';
  const buildingCard=hasBuildingTeam?'<article class="sp-team sp-team-building" style="--shirt:#f59e0b"><div class="sp-team-top"><span class="sp-team-seed">Équipe '+String(displayedTeamCount).padStart(2,'0')+' · En création</span><span class="sp-team-shirt" aria-hidden="true">◇</span></div><h3>Prochaine équipe</h3><ol>'+buildingPlayers.map(r=>'<li><span>'+esc(d.players.find(p=>p.id===r.player_id)?.name||'Joueur')+'</span></li>').join('')+'</ol><strong class="sp-team-strength">'+buildingPlayers.length+' / '+size+' joueurs · encore '+(size-buildingPlayers.length)+' joueur'+(size-buildingPlayers.length>1?'s':'')+'</strong></article>':'';
  setHtml(teamsBox,visibleTeams.length?'<div class="sp-royal-head">'+(startValue?'<div class="sp-royal-countdown" data-tournament-start="'+esc(startValue)+'">⏱️ Calcul du coup d’envoi…</div>':'')+'<div class="sp-royal-format">'+(king?'👑 Roi du Terrain <small>(Format Royal)</small>':'⚽ Tournoi SWÉ')+'</div><h2>'+(king?'Les prétendants à la couronne':'Les équipes en lice')+'</h2><p>'+displayedTeamCount+' équipe'+(displayedTeamCount>1?'s':'')+' · '+completeLabel+buildingLabel+(publicSubs.length?' · '+publicSubs.length+' remplaçant'+(publicSubs.length>1?'s':''):'')+'</p></div><div id="registrationTeamGrid" class="sp-team-grid">'+visibleTeams.map((team,index)=>{const roster=d.teamPlayers.filter(tp=>tp.team_id===team.id);return '<article class="sp-team" style="--shirt:'+(/^#[0-9a-f]{6}$/i.test(team.color||'')?team.color:'#2563eb')+'"><div class="sp-team-top"><span class="sp-team-seed">Équipe '+String(index+1).padStart(2,'0')+'</span><span class="sp-team-shirt" aria-hidden="true">◆</span></div><h3>'+esc(team.name)+'</h3><ol>'+roster.map(tp=>'<li><span>'+esc(d.players.find(p=>p.id===tp.player_id)?.name||'Joueur')+'</span></li>').join('')+'</ol><strong class="sp-team-strength">'+roster.length+' / '+Number(t.team_size||5)+' joueurs</strong></article>'}).join('')+buildingCard+'</div>'+substitutePanel:'');
  E('registrationPeople').hidden=!regs.length;
  // Reuse the real form and callbacks. Only presentation and closure states change.
  ['publicJoin','publicAddGuest','publicCreateTeam','publicValidateTeamCode'].forEach(id=>{const el=E(id);if(el)el.disabled=isClosed});
  if(select)select.disabled=isClosed;
  const selectionLock=E('registrationSelectionLock');if(selectionLock){selectionLock.hidden=!isClosed;selectionLock.textContent=isFull?'🔒 Effectif complet : la sélection des joueurs est fermée.':'🔒 Inscriptions clôturées : la sélection des joueurs est fermée.';}
  if(isClosed&&!E('publicTeamBuilderCard').classList.contains('hidden'))ctx.setEntryMode('solo');
  if(isClosed){E('publicGuestFields')?.classList.add('hidden');if(E('publicJoin'))E('publicJoin').hidden=true;E('chooseTeamMode').disabled=true;}else{E('publicGuestFields')?.classList.remove('hidden');if(E('publicJoin'))E('publicJoin').hidden=false;E('chooseTeamMode').disabled=false;}
  if(E('publicLeave'))E('publicLeave').hidden=finished;
  if(finished)E('publicPaymentBox')?.classList.add('hidden');
  const hasHistory=d.tournaments.some(x=>x.format!=='league'&&x.status==='finished'&&d.matches.some(m=>m.tournament_id===x.id));historyArea.hidden=!hasHistory;
  updateMissions();updatePlayerStats();updateFlow();
 }
 let teamRatingKey='',teamRatingSequence=0;
 async function updateTeamIdentity(){
  const creator=E('publicTeamCreator');if(!creator)return;
  if(!creator.dataset.ratingBound){creator.dataset.ratingBound='1';creator.addEventListener('change',updateTeamIdentity)}
  let panel=E('registrationTeamPlayerStats');
  if(!panel){panel=document.createElement('section');panel.id='registrationTeamPlayerStats';panel.className='sp-player-stats';panel.hidden=true;creator.after(panel);teamRatingKey=''}
  const pid=creator.value,key=ctx.data().tournament.id+':'+pid;
  if(key===teamRatingKey)return;teamRatingKey=key;const seq=++teamRatingSequence;
  updatePlayerStats(pid,panel,null,pid?'loading':'');if(!pid||!ctx.loadRating)return;
  try{const rating=await ctx.loadRating(pid);if(seq!==teamRatingSequence||creator.value!==pid)return;updatePlayerStats(pid,panel,rating,rating?'ready':'unavailable')}
  catch(_){if(seq===teamRatingSequence)updatePlayerStats(pid,panel,null,'unavailable')}
 }
 const teamHost=E('publicTeamBuilderCard');
 if(teamHost)new MutationObserver(updateTeamIdentity).observe(teamHost,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 updateTeamIdentity();
 const controller={update,updateFlow,updateMissions,setContext:next=>{ctx=next;update();updateTeamIdentity();}};root.__registrationPresentation=controller;
 ctx.setEntryMode('solo');update();if(select?.value)loadSelectedRating();return controller;
}
function briefingEditor(container,t,context){
 const b=t.registration_briefing||{},details=document.createElement('details');details.className='sp-admin-briefing';
 details.innerHTML='<summary>📣 Consignes et groupe de notation</summary><label>Nom du groupe de notation<input data-rating-group maxlength="120" placeholder="Ex. Chien Boul Academy" value="'+esc(context.ratingGroupName||'')+'"></label><button type="button" data-save-rating-group>Enregistrer le nom du groupe</button><p data-rating-feedback role="status"></p><p>Les encarts sans consigne restent masqués sur le lien d’inscription.</p><label>Message pour tous les inscrits<textarea data-general maxlength="2000" rows="4" placeholder="Rendez-vous, équipement, organisation…">'+esc(b.general||'')+'</textarea></label><details><summary>Consignes des co-gestionnaires</summary>'+[['observe','Surveillez les nouveaux joueurs pour leur donner une note.'],['evening','Ton avis sera demandé dans la soirée pour valider la composition des équipes.'],['rating','Pense à te connecter pour noter les joueurs à la fin du tournoi — lien valable 48 h.']].map(([k,label])=>'<label class="sp-admin-check"><input type="checkbox" data-briefing="'+k+'" '+(b[k]===true?'checked':'')+'>'+label+'</label>').join('')+'</details><button type="button" data-save-briefing class="primary">Enregistrer les consignes</button><p role="status" data-feedback></p>';
 let dirty=false,groupDirty=false;details.addEventListener('input',e=>{if(e.target.matches('[data-rating-group]'))groupDirty=true;else dirty=true;context.editing(true)});details.addEventListener('toggle',()=>{if(!details.open&&!dirty&&!groupDirty)context.editing(false)});
 details.querySelector('[data-save-briefing]').onclick=async()=>{const button=details.querySelector('[data-save-briefing]'),feedback=details.querySelector('[data-feedback]');button.disabled=true;feedback.textContent='Enregistrement…';const briefing={general:details.querySelector('[data-general]').value.trim()};details.querySelectorAll('[data-briefing]').forEach(cb=>briefing[cb.dataset.briefing]=cb.checked);try{await context.save(briefing);t.registration_briefing=briefing;dirty=false;context.editing(groupDirty);feedback.textContent='Consignes enregistrées sur le lien d’inscription.'}catch(e){feedback.textContent=e.message||'Enregistrement impossible.'}finally{button.disabled=false}};
 details.querySelector('[data-save-rating-group]').onclick=async e=>{const button=e.currentTarget,feedback=details.querySelector('[data-rating-feedback]');button.disabled=true;try{await context.saveRatingGroupName(details.querySelector('[data-rating-group]').value.trim());feedback.textContent='Nom du groupe enregistré.';groupDirty=false;context.editing(dirty);}catch(error){feedback.textContent=error.message||'Enregistrement impossible.';}finally{button.disabled=false;}};
 container.append(details);
}
window.SWERegistrationPresentation={mount,briefingEditor};
})();

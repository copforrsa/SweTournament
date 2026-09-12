/* One presentation layer, called by app.js after loading the existing public snapshot. */
(()=>{
'use strict';
const E=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>{const d=new Date(v);return v&&Number.isFinite(d.getTime())?d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}):''};
const dateTime=v=>{const d=new Date(v);return v&&Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):''};
const closed=t=>t.status==='finished'||t.registration_open===false||!!(t.registration_deadline&&Date.parse(t.registration_deadline)<=Date.now());
const started=m=>['live','playing','finished'].includes(m.status)||!!m.started_at||Number(m.home_score)>0||Number(m.away_score)>0;
function setHtml(el,html){if(el&&el.innerHTML!==html)el.innerHTML=html;}
function mount(ctx){
 const root=E('publicView'),initial=ctx.data();if(!root||!initial.tournament||initial.tournament.format==='league')return null;
 root.classList.add('swe-premium');document.body.classList.add('swe-premium-page');
 const header=root.querySelector(':scope > header');header.className='sp-hero';header.id='registrationHero';
 header.innerHTML='<div class="sp-brand">SWÉ <small>TOURNAMENT</small></div><div class="sp-pitch" aria-hidden="true"></div><div id="registrationState"></div><div id="registrationFormat" class="sp-eyebrow"></div><h1 id="publicWorkspaceName"></h1><p>Un terrain. Des équipes. Un moment à partager.</p><div id="registrationMeta" class="sp-meta"></div>';
 const progress=document.createElement('nav');progress.id='registrationProgress';progress.className='sp-progress';progress.setAttribute('aria-label','Progression du tournoi');header.after(progress);
 const body=document.createElement('div');body.className='sp-body';body.innerHTML='<main class="sp-main"><div id="registrationPhaseCard"></div><section id="registrationFormArea" class="sp-form-area"></section><section id="registrationTeams"></section><section id="registrationPeople" class="sp-card sp-people-card"><div class="sp-eyebrow">LE GROUPE PREND FORME</div><h2>Les inscrits</h2></section></main><aside class="sp-aside"><section id="registrationSummary" class="sp-card"></section><section id="registrationGeneral"></section><details id="registrationParticipationRules" class="sp-card sp-participation-rules"><summary>Règles d’inscription</summary><div></div></details><details id="registrationRules" class="sp-card sp-rules"><summary>Règles du tournoi</summary><div></div></details><div id="registrationHistoryArea"></div></aside>';
 progress.after(body);
 const form=E('registrationFormArea');['publicEntryChoiceCard','publicRegistrationCard','publicTeamBuilderCard'].forEach(id=>{const el=E(id);if(el)form.append(el)});
 const entry=E('publicEntryChoiceCard');entry.className='sp-tabs';
 const soloButton=E('chooseSoloMode'),teamButton=E('chooseTeamMode');
 soloButton.textContent='Moi & mes invités';teamButton.textContent='Je viens en équipe';
 soloButton.removeAttribute('style');teamButton.removeAttribute('style');entry.replaceChildren(soloButton,teamButton);
 ['publicRegistrationCard','publicTeamBuilderCard'].forEach(id=>{const card=E(id);card?.classList.add('sp-card');const title=card?.querySelector('h2');if(title)title.textContent=id==='publicRegistrationCard'?'À toi de jouer.':'Ton équipe, ton groupe.';});
 const select=E('publicPlayerSelect');
 if(select){let node=E('publicRegistration').firstElementChild;while(node&&node!==select){node.classList.add('sp-legacy-intro');node=node.nextElementSibling}const label=document.createElement('label');label.htmlFor=select.id;label.className='sp-name-label';label.textContent='Ton nom';select.before(label);select.addEventListener('change',updateMissions);}
 const guest=E('publicGuestFields');if(guest){const preceding=guest.previousElementSibling;if(preceding?.textContent.includes('Tu ne participes pas mais'))guest.append(preceding);}
 const status=E('publicRegStatus');if(status){status.textContent='';status.setAttribute('role','status');status.classList.add('sp-feedback');}
 const people=E('registrationPeople'),list=E('publicRegisteredList');if(list){if(list.previousElementSibling?.tagName==='H3')list.previousElementSibling.remove();people.append(list)}if(E('publicWaitWrap'))people.append(E('publicWaitWrap'));
 const historyArea=E('registrationHistoryArea'),last=E('publicLastTournamentDetails')?.parentElement,history=E('publicHistory')?.closest('.card');
 if(last){last.classList.add('sp-history');historyArea.append(last)}
 if(history){const disclosure=document.createElement('details');disclosure.className='sp-card sp-history';disclosure.innerHTML='<summary>Historique des tournois</summary>';history.querySelector('h2')?.remove();disclosure.append(history);historyArea.append(disclosure);}
 // Season ranking panels stay available in the workspace/history pages.
 ['publicSeasonScorers','publicSeasonAssists','publicSeasonTopPlayers'].forEach(id=>E(id)?.closest('.card')?.classList.add('hidden'));
 root.querySelectorAll(':scope > .grid').forEach(el=>{if(!el.querySelector('.card:not(.hidden)'))el.classList.add('hidden')});
 const donor=E('publicThirdHalfDonorCard');if(donor)body.querySelector('.sp-main').append(donor);
 const mission=document.createElement('section');mission.id='registrationMissions';mission.className='sp-missions';mission.hidden=true;E('publicSelectedStatus')?.after(mission);
 function updateMissions(){
  const d=ctx.data(),t=d.tournament,b=t.registration_briefing||{},pid=select?.value;
  const co=(d.coorganizers||[]).includes(pid);const items=[];
  if(co){
   if(b.observe===true&&t.status!=='finished')items.push('Surveillez les nouveaux joueurs pour leur donner une note.');
   if(b.evening===true)items.push(t.team_review_status==='approved'?'La composition des équipes est validée.':t.team_review_status==='pending'?'Ton avis est demandé sur la composition proposée. Connecte-toi à ton espace pour participer à la validation.':'Ton avis sera demandé dans la soirée pour valider la composition des équipes.');
   if(b.rating===true){const w=d.ratingWindows?.find(w=>w.tournament_id===t.id),expired=w&&(w.status==='closed'||Date.parse(w.closes_at)<=Date.now());items.push(expired?'La période de notation de 48 h est terminée.':t.status==='finished'&&w?'Pense à te connecter pour noter les joueurs. La notation est ouverte jusqu’au '+dateTime(w.closes_at)+'.':'Pense à te connecter pour noter les joueurs à la fin du tournoi. Le lien sera valable 48 h après sa clôture officielle.');}
  }
  mission.hidden=!items.length;if(!items.length){mission.replaceChildren();return}
  setHtml(mission,'<div class="sp-eyebrow">CO-GESTIONNAIRE</div><h3>'+esc(d.players.find(p=>p.id===pid)?.name||'Tes missions')+', tes missions</h3><ul>'+items.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul><a class="sp-button sp-secondary" href="'+esc(ctx.appUrl)+'" target="_blank" rel="noopener">Ouvrir mon espace organisateur ↗</a>');
 }
 function update(){
  const d=ctx.data(),t=d.tournament;if(!t)return;
  const tm=d.matches.filter(m=>m.tournament_id===t.id),begun=tm.some(started),finished=t.status==='finished',isClosed=closed(t),visibleTeams=d.teams.filter(x=>x.tournament_id===t.id);
  const stage=finished?3:begun?2:isClosed||t.team_review_status==='pending'||t.team_review_status==='approved'?1:0;
  const label=finished?'Tournoi terminé':begun?'Matchs en direct':t.team_review_status==='pending'?'Équipes en validation':t.team_review_status==='approved'?'Équipes validées':isClosed?'Inscriptions closes':'Inscriptions ouvertes';
  const tone=['green','blue','orange','purple'][stage];root.dataset.stage=tone;
  setHtml(E('registrationState'),'<span class="sp-state '+tone+'">● '+label+'</span>');E('publicWorkspaceName').textContent=t.name||'Tournoi SWÉ';
  const king=t.format==='king_of_pitch'||t.rotation_mode==='king_of_pitch',format=king?'Roi du terrain':'Tournoi classique';E('registrationFormat').textContent=format+' · '+(t.team_size||5)+' contre '+(t.team_size||5);
  const fee=Number(t.entry_fee_cents||0)/100,fields=[['Date',date(t.tournament_date)],['Rendez-vous',t.start_time?String(t.start_time).slice(0,5):''],['Lieu',t.venue],['Participation',fee.toLocaleString('fr-FR',{style:'currency',currency:'EUR'})]];
  setHtml(E('registrationMeta'),fields.filter(x=>x[1]).map(([label,value])=>'<span><b>'+label+'</b>'+esc(value)+'</span>').join(''));
  setHtml(progress,['Inscriptions','Équipes','Matchs en direct','Résultats'].map((s,i)=>'<span class="'+(i<stage?'done':i===stage?'current':'')+'"'+(i===stage?' aria-current="step"':'')+'><i>'+(i<stage?'✓':i+1)+'</i>'+s+'</span>').join(''));
  const regs=d.registrations.filter(r=>r.tournament_id===t.id&&r.present),confirmed=regs.filter(r=>r.registration_status!=='waitlist'),subs=confirmed.filter(r=>r.is_substitute).length,waiting=regs.length-confirmed.length,max=Number(t.max_players||35),remaining=Math.max(0,max-confirmed.length);
  const pitches=(t.reserved_pitch_ids||[]).map(id=>d.pitches?.find(p=>p.id===id)?.name).filter(Boolean).join(', ');
  const rows=[['Format',format],['Durée des matchs',t.match_duration_minutes?t.match_duration_minutes+' min':''],['Terrains',pitches],['Réservation',t.reservation_reference]];
  const level=d.groupLevels?.find(g=>g.tournament_id===t.id)?.avg_rating;if(level!==null&&level!==undefined)rows.push(['Niveau du groupe',Number(level).toFixed(1).replace('.',',')+' / 5']);
  setHtml(E('registrationSummary'),'<div class="sp-eyebrow">'+(isClosed?'LES PARTICIPANTS':'REJOINS LE GROUPE')+'</div><div class="sp-count"><strong>'+regs.length+' <small>/ '+max+'</small></strong><span>'+(!isClosed?remaining+' places restantes':'inscrits')+'</span></div><div class="sp-meter"><i style="width:'+Math.min(100,100*confirmed.length/max)+'%"></i></div><p class="sp-subtext">'+confirmed.length+' confirmé'+(confirmed.length>1?'s':'')+(subs?' · '+subs+' remplaçant'+(subs>1?'s':''):'')+(waiting?' · '+waiting+' en attente':'')+'</p>'+(!isClosed&&t.registration_deadline?'<div class="sp-split"><span>Fin des inscriptions</span><b>'+esc(dateTime(t.registration_deadline))+'</b></div><div class="sp-countdown" data-registration-deadline="'+esc(t.registration_deadline)+'"></div>':'')+rows.filter(x=>x[1]).map(([label,value])=>'<div class="sp-split"><span>'+label+'</span><b>'+esc(value)+'</b></div>').join(''));
  const general=String(t.registration_briefing?.general||'').trim(),note=E('registrationGeneral');note.hidden=!general;note.className='sp-card sp-general';setHtml(note,general?'<div class="sp-eyebrow">UN MOT DE L’ADMINISTRATEUR</div><h2>Les consignes du tournoi.</h2><p>'+esc(general)+'</p>':'');
  const size=Number(t.team_size||5);
  setHtml(E('registrationParticipationRules').querySelector('div'),'<h3>Les remplaçants</h3><p>Les dernières inscriptions qui ne complètent pas encore une équipe de '+size+' joueurs sont placées en remplacement, dans l’ordre de date et d’heure d’inscription. Dès qu’une équipe supplémentaire est complète, leur statut évolue automatiquement.</p><h3>Les invitations</h3><p>Un membre du groupe peut inviter jusqu’à 5 personnes, même s’il ne participe pas. Choisis ton nom, puis retrouve un ancien invité ou ajoute une nouvelle personne dans « Mes invités ». Une personne déjà inscrite n’a pas besoin d’être ajoutée à nouveau.</p><h3>Le désistement de dernière minute</h3><p>Préviens le groupe et utilise « Je ne participe pas » pour signaler ton absence. En cas de désistement de dernière minute, tu paies ta tournée au groupe à la prochaine édition.</p>');
  const rules=E('registrationRules');rules.querySelector('summary').textContent='Règles · '+format;
  setHtml(rules.querySelector('div'),'<p>'+ (king?'Le vainqueur reste sur le terrain du Roi ; les équipes tournent selon l’ordre organisé.':'Les équipes se rencontrent selon le calendrier du tournoi. Le classement est calculé aux points : 3 pour une victoire, 1 pour un nul, 0 pour une défaite.')+'</p>'+(t.match_duration_minutes?'<p>Durée prévue : <b>'+Number(t.match_duration_minutes)+' min</b> par match.</p>':'')+(t.odd_team_rotation_rule?'<p>Avec une équipe en attente : rotation à 2 buts d’écart, ou au terme de la durée du match.</p>':'')+'<p>Respectez les horaires, les décisions de l’organisation et les autres joueurs.</p>');
  const live=ctx.appUrl+'live.html?'+new URLSearchParams({public:ctx.token,tournament:t.id}).toString();
  const now=tm.find(m=>['live','playing'].includes(m.status))||tm.filter(started).slice(-1)[0];
  const score=now?esc(d.teams.find(x=>x.id===now.home_team_id)?.name||'Équipe A')+' '+Number(now.home_score||0)+' – '+Number(now.away_score||0)+' '+esc(d.teams.find(x=>x.id===now.away_team_id)?.name||'Équipe B'):'';
  setHtml(E('registrationPhaseCard'),begun||finished?'<section class="sp-live sp-'+tone+'"><div><div class="sp-eyebrow">'+(finished?'LE BILAN DU TOURNOI':'LE TERRAIN EN DIRECT')+'</div><h2>'+(finished?'Tous les résultats.':'Ne manque aucun but.')+'</h2><p>'+score+'</p></div><a id="registrationLiveLink" href="'+esc(live)+'" target="_blank" rel="noopener">'+(finished?'Voir les résultats ↗':'Suivre le direct ↗')+'</a></section>':isClosed?'<section class="sp-card sp-next"><h2>Place aux équipes.</h2><p>'+ (t.team_review_status==='pending'?'Les co-gestionnaires autorisés peuvent donner leur avis depuis leur espace.':'Les inscriptions sont closes. Les informations et la liste des inscrits restent consultables.')+'</p></section>':'');
  const teamsBox=E('registrationTeams');teamsBox.hidden=!visibleTeams.length;teamsBox.className='sp-card sp-teams';
  setHtml(teamsBox,visibleTeams.length?'<div class="sp-eyebrow">LA COMPOSITION</div><h2>Les équipes'+(t.team_review_status==='approved'?' validées':'')+'</h2><div class="sp-team-grid">'+visibleTeams.map(team=>'<div class="sp-team"><h3 style="--shirt:'+(/^#[0-9a-f]{6}$/i.test(team.color||'')?team.color:'#2563eb')+'">'+esc(team.name)+'</h3>'+d.teamPlayers.filter(tp=>tp.team_id===team.id).map(tp=>'<p>'+esc(d.players.find(p=>p.id===tp.player_id)?.name||'Joueur')+'</p>').join('')+'</div>').join('')+'</div>':'');
  E('registrationPeople').hidden=!regs.length;
  // Reuse the real form and callbacks. Only presentation and closure states change.
  ['publicJoin','publicAddGuest','publicCreateTeam','publicValidateTeamCode'].forEach(id=>{const el=E(id);if(isClosed&&el)el.disabled=true});
  if(isClosed&&!E('publicTeamBuilderCard').classList.contains('hidden'))ctx.setEntryMode('solo');
  if(isClosed){E('publicGuestFields')?.classList.add('hidden');if(E('publicJoin'))E('publicJoin').hidden=true;E('chooseTeamMode').disabled=true;}else{E('publicGuestFields')?.classList.remove('hidden');if(E('publicJoin'))E('publicJoin').hidden=false;E('chooseTeamMode').disabled=false;}
  if(E('publicLeave'))E('publicLeave').hidden=finished;
  if(finished)E('publicPaymentBox')?.classList.add('hidden');
  const hasHistory=d.tournaments.some(x=>x.format!=='league'&&x.status==='finished'&&d.matches.some(m=>m.tournament_id===x.id));historyArea.hidden=!hasHistory;
  updateMissions();
 }
 ctx.setEntryMode('solo');update();return {update,updateMissions};
}
function briefingEditor(container,t,context){
 const b=t.registration_briefing||{},details=document.createElement('details');details.className='sp-admin-briefing';
 details.innerHTML='<summary>📣 Consignes pour les inscrits et co-gestionnaires</summary><p>Les encarts sans consigne restent masqués sur le lien d’inscription.</p><label>Message pour tous les inscrits<textarea data-general maxlength="2000" rows="4" placeholder="Rendez-vous, équipement, organisation…">'+esc(b.general||'')+'</textarea></label><details><summary>Consignes des co-gestionnaires</summary>'+[['observe','Surveillez les nouveaux joueurs pour leur donner une note.'],['evening','Ton avis sera demandé dans la soirée pour valider la composition des équipes.'],['rating','Pense à te connecter pour noter les joueurs à la fin du tournoi — lien valable 48 h.']].map(([k,label])=>'<label class="sp-admin-check"><input type="checkbox" data-briefing="'+k+'" '+(b[k]===true?'checked':'')+'>'+label+'</label>').join('')+'</details><button type="button" class="primary">Enregistrer les consignes</button><p role="status" data-feedback></p>';
 let dirty=false;details.addEventListener('input',()=>{dirty=true;context.editing(true)});details.addEventListener('toggle',()=>{if(!details.open&&!dirty)context.editing(false)});
 details.querySelector('button').onclick=async()=>{const button=details.querySelector('button'),feedback=details.querySelector('[data-feedback]');button.disabled=true;feedback.textContent='Enregistrement…';const briefing={general:details.querySelector('[data-general]').value.trim()};details.querySelectorAll('[data-briefing]').forEach(cb=>briefing[cb.dataset.briefing]=cb.checked);try{await context.save(briefing);t.registration_briefing=briefing;dirty=false;context.editing(false);feedback.textContent='Consignes enregistrées sur le lien d’inscription.'}catch(e){feedback.textContent=e.message||'Enregistrement impossible.'}finally{button.disabled=false}};
 container.append(details);
}
window.SWERegistrationPresentation={mount,briefingEditor};
})();

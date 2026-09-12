(()=>{
'use strict';
// Visual sandbox only: no Supabase client, requests, credentials or production writes.
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const phases=['open','closed','review','ready','live','finished','expired'];
const labels={open:'Inscriptions ouvertes',closed:'Inscriptions closes',review:'Équipes en validation',ready:'Équipes validées',live:'Le tournoi a commencé',finished:'Tournoi terminé',expired:'Bilan terminé'};
const formats={king_of_pitch:'Roi du terrain',classic:'Tournoi classique',pools:'Poules + phases finales'};
const money=n=>Number(n).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
const dateLabel=s=>{const d=new Date(s+'T12:00:00');return Number.isNaN(d.getTime())?'Date à préciser':d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})};
let config={},phase='open',mode='solo',selected='',codeValid=false,score=0,dialogMode='',notice='',members=[],teamGuestCount=1;
let formValues={},openDetails=new Set();
const person=id=>members.find(p=>p.id===id),registered=()=>members.filter(p=>p.registered),liveStarted=()=>['live','finished','expired'].includes(phase);
function readConfig(){
 const f=$('previewConfig').elements,get=n=>f.namedItem(n).value.trim(),num=(n,min,max)=>Math.max(min,Math.min(max,Number(get(n))||0)),yes=n=>f.namedItem(n).checked;
 return {title:get('title')||'Tournoi SWÉ',venue:get('venue'),date:get('date'),time:get('time'),format:get('format'),teamSize:num('teamSize',2,6),count:num('count',0,60),capacity:num('capacity',2,60),fee:num('fee',0,999),duration:num('duration',1,120),deadline:get('deadline'),reservation:get('reservation'),general:get('general'),observe:yes('observe'),evening:yes('evening'),rating:yes('rating'),redraw:yes('redraw'),history:yes('history'),thirdHalf:yes('thirdHalf'),views:yes('views')};
}
function generate(){
 config=readConfig();config.count=Math.min(config.count,config.capacity);
 members=Array.from({length:Math.max(18,config.count+4)},(_,i)=>({id:'demo-'+(i+1),name:i===0?'Alex':i===1?'Sam':'Joueur test '+String(i+1).padStart(2,'0'),co:i<2,registered:i<config.count}));
 selected='';mode='solo';codeValid=false;score=0;notice='';formValues={};openDetails=new Set();teamGuestCount=1;
 render(false);$('configFeedback').textContent='Prévisualisation générée avec '+config.count+' inscrits fictifs. Le tournoi réel reste inchangé.';
}
function preserveForm(){
 $('previewPage').querySelectorAll('input[id],select[id]').forEach(e=>{if(e.id==='pvPlayer')return;formValues[e.id]=e.type==='checkbox'||e.type==='radio'?e.checked:e.value});
 $('previewPage').querySelectorAll('details[id]').forEach(d=>{if(d.open)openDetails.add(d.id);else openDetails.delete(d.id)});
}
function restoreForm(){
 for(const [id,value] of Object.entries(formValues)){const e=$(id);if(!e)continue;if(e.type==='checkbox'||e.type==='radio')e.checked=value;else e.value=value}
 $('previewPage').querySelectorAll('details[id]').forEach(d=>d.open=openDetails.has(d.id));
 if($('pvGuestPhoneWrap'))$('pvGuestPhoneWrap').hidden=!$('pvGuestMember')?.checked;
}
function details(id,title,body){return '<details class="pv-disclosure" id="'+id+'"><summary>'+title+'</summary><div class="pv-disclosure-content">'+body+'</div></details>'}
function button(action,text,cls=''){return '<button type="button" class="pv-button '+cls+'" data-action="'+action+'">'+text+'</button>'}
function options(value=''){return '<option value="">Choisis ton nom</option>'+members.map(p=>'<option value="'+p.id+'"'+(p.id===value?' selected':'')+'>'+esc(p.name)+(p.co?' · Co-gestionnaire':'')+'</option>').join('')}
function progress(){const active=phase==='open'?0:['closed','review','ready'].includes(phase)?1:phase==='live'?2:3;return '<nav class="pv-progress" aria-label="Progression du tournoi">'+['Inscriptions','Équipes','Matchs en direct','Résultats'].map((s,i)=>'<span class="'+(i<active?'done':i===active?'current':'')+'"'+(i===active?' aria-current="step"':'')+'><i>'+(i<active?'✓':i+1)+'</i>'+s+'</span>').join('')+'</nav>'}
function rules(){
 const common='<li>'+config.teamSize+' joueurs par équipe · matchs de '+config.duration+' minutes.</li><li>Les remplacements sont gérés par les organisateurs.</li>';
 let body=config.format==='king_of_pitch'?'<li>Objectif : conserver sa place sur le terrain du Roi.</li><li>Les équipes tournent selon les terrains et la file d’attente définis par l’organisateur.</li><li>Sur le terrain du Roi, une égalité conserve le Roi en place. Le départage des autres terrains suit le réglage du tournoi.</li>':config.format==='classic'?'<li>Rencontres programmées entre les équipes et classement aux points.</li><li>Exemple de barème : victoire 3 points, nul 1 point, défaite 0 point.</li><li>En cas d’égalité au classement : critères de départage fixés par l’organisateur.</li>':'<li>Première phase en poules, puis tableau final entre les équipes qualifiées.</li><li>Les places qualificatives et le départage seront fixés avant le tirage.</li><li>Format présenté comme concept : son moteur n’est pas activé en production.</li>';
 return details('pvRules','Règles · '+esc(formats[config.format]),'<ul>'+common+body+'</ul><p>Règles illustratives du test. La version publique devra reprendre les réglages effectifs du tournoi.</p>');
}
function missions(){
 if(!person(selected)?.co)return '';
 const items=[];if(config.observe)items.push('Surveillez les nouveaux joueurs pour leur donner une note.');
 if(config.evening)items.push(phase==='open'||phase==='closed'?'Ton avis sera demandé dans la soirée pour valider la composition des équipes.':phase==='review'?'Ton avis est demandé sur la composition proposée. La validation finale revient à l’administrateur.':'La composition a été validée par l’administrateur.');
 if(config.rating)items.push(phase==='expired'?'La période de notation de 48 h est terminée.':phase==='finished'?'Pense à te connecter pour noter les joueurs. Le lien est valable 48 h après la clôture officielle du tournoi.':'Pense à te connecter pour noter les joueurs à la fin du tournoi. Le lien sera valable 48 h après sa clôture officielle.');
 if(config.redraw&&['open','closed','review'].includes(phase))items.push('Tu disposeras d’une proposition de nouveau tirage. L’administrateur décidera de la composition finale.');
 if(!items.length)return '';
 let actions='';if(config.evening||config.redraw)actions+=button('draw','Suivre le tirage','light');if(config.rating&&phase==='finished')actions+=button('rate','Me connecter pour noter');
 return '<section class="pv-mission" id="pvMissions"><div class="pv-section-tag">CO-GESTIONNAIRE</div><h3>'+esc(person(selected).name)+', tes missions</h3><ul>'+items.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>'+(actions?'<div class="pv-form-actions">'+actions+'</div>':'')+'<p>En production, la connexion et les droits du compte seront vérifiés pour accéder au tirage et à la notation.</p></section>';
}
function peopleCard(){
 const list=registered();if(!list.length)return '';
 const starters=Math.floor(list.length/config.teamSize)*config.teamSize;
 return '<section class="pv-card" id="pvRegistrants"><div class="pv-section-tag">LE GROUPE PREND FORME</div><h2>Les inscrits <small class="pv-muted">'+list.length+'</small></h2><p>Les joueurs du scénario de test.</p><div class="pv-people">'+list.map((p,i)=>'<div class="pv-person"><span class="pv-avatar">'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(p.name)+'</b><small>'+(p.co?'Co-gestionnaire':i>=starters?'Remplaçant':'Inscription confirmée')+'</small></div></div>').join('')+'</div>'+((list.length%config.teamSize)?'<div class="pv-wait">'+(list.length%config.teamSize)+' remplaçant(s) pour compléter une prochaine équipe. Les statuts affichés ici sont simulés.</div>':'')+'</section>';
}
function guestForm(){return details('pvGuests','Mes invités','<p>Tu peux inviter un joueur même si tu ne participes pas. Sélectionne ton nom, puis ajoute ton invité.</p><label class="pv-field">Nom de l’invité<input id="pvGuestName" maxlength="60" placeholder="Prénom / nom"></label><label class="pv-check"><input id="pvGuestMember" type="checkbox">Ajouter cet invité comme membre du groupe</label><div id="pvGuestPhoneWrap" hidden><label class="pv-field">Numéro de mobile de l’invité<input id="pvGuestPhone" type="tel" inputmode="tel" maxlength="25" placeholder="Numéro de mobile"></label><p>Demandé uniquement pour sa fiche membre ; ce test ne transmet aucune donnée.</p></div>'+button('guest','＋ Ajouter mon invité'))}
function teamForm(){
 const colors=[['Noir','#111827'],['Bleu','#2563eb'],['Blanc','#f8fafc'],['Rouge','#dc2626'],['Vert','#16a34a'],['Jaune','#eab308'],['Orange','#f97316'],['Violet','#7c3aed'],['Rose','#ec4899'],['Marron','#78350f'],['Gris','#64748b']];
 return '<div class="pv-form"><label class="pv-field">Code équipe personnel (6 chiffres)<input id="pvTeamCode" inputmode="numeric" maxlength="6" placeholder="Code communiqué par l’administrateur"></label>'+button('code','Valider le code','secondary')+(codeValid?'<label class="pv-field">Créateur de l’équipe<select id="pvTeamCreator">'+options(formValues.pvTeamCreator)+'</select></label><label class="pv-field">Nom de l’équipe<input id="pvTeamName" maxlength="30" placeholder="Ex. Les Lions"></label><label class="pv-field">Couleur des maillots</label><div class="pv-colors">'+colors.map(([n,c],i)=>'<label><input type="radio" name="pvColor" id="pvColor'+i+'" value="'+c+'"><i style="--shirt:'+c+'"></i>'+n+'</label>').join('')+'</div>'+details('pvTeamMembers','Composer mon groupe','<p>'+config.teamSize+' joueurs maximum, créateur compris. Les membres pourront accepter ou refuser leur proposition d’équipe.</p><div class="pv-listcheck">'+registered().map(p=>'<label class="pv-check"><input type="checkbox" id="pvMate-'+p.id+'">'+esc(p.name)+'</label>').join('')+'</div><h3>Invités hors groupe</h3>'+Array.from({length:teamGuestCount},(_,i)=>'<label class="pv-field">Invité '+(i+1)+'<input id="pvTeamGuest'+i+'" maxlength="60" placeholder="Nom de l’invité"></label>').join('')+button('team-guest','＋ Ajouter un invité','secondary'))+button('team','Valider mon équipe'):'')+'</div>';
}
function registrationCard(){
 const open=phase==='open',p=person(selected);
 return '<section class="pv-card" id="pvRegistration"><div class="pv-section-tag">'+(open?'LE RENDEZ-VOUS EST PRIS':'TON ESPACE TOURNOI')+'</div><h2>'+(open?'À toi de jouer.':'Retrouve ton tournoi.')+'</h2><p>'+(open?'Seul, avec tes invités ou avec ton équipe.':'Les inscriptions sont closes. Les participants et leurs informations restent consultables.')+'</p><label class="pv-field">Ton nom<select id="pvPlayer">'+options(selected)+'</select></label>'+(p?'<p class="pv-status">'+(p.registered?'✓ Ton inscription est confirmée.':'Tu ne participes pas à ce scénario.')+'</p>':'')+'<div id="pvMissionHost">'+missions()+'</div>'+(open?'<div class="pv-switch" role="group" aria-label="Mode d’inscription"><button data-action="solo" class="'+(mode==='solo'?'selected':'')+'" aria-pressed="'+(mode==='solo')+'">Moi & mes invités</button><button data-action="team-mode" class="'+(mode==='team'?'selected':'')+'" aria-pressed="'+(mode==='team')+'">Je viens en équipe</button></div>'+(mode==='team'?teamForm():'<div class="pv-form"><div class="pv-form-actions">'+button('join','✓ Je participe')+button('leave','Je ne participe pas','secondary')+'</div>'+(p&&config.fee>0?'<div class="pv-status" id="pvPayment">Participation : '+money(config.fee)+' · règlement sur place</div>':'')+guestForm()+(config.thirdHalf?details('pvThirdHalf','La 3e mi-temps','<label class="pv-field">Participation à la glacière (€)<input id="pvPledge" type="number" min="0" step="0.50" value="0"></label>'):'')+'</div>'):'')+(notice?'<p class="pv-status" role="status">'+esc(notice)+'</p>':'')+'</section>';
}
function teamsCard(){
 const list=registered(),n=Math.floor(list.length/config.teamSize);if(!['ready','live','finished','expired'].includes(phase)||n<2)return '';
 return '<section class="pv-card" id="pvTeams"><div class="pv-section-tag">COMPOSITION OFFICIELLE · EXEMPLE</div><h2>Les équipes</h2><div class="pv-teams">'+Array.from({length:n},(_,i)=>'<article class="pv-team" style="--shirt:'+(['#274b78','#b18450','#4d836d','#8463a0'][i%4])+'"><h3>Équipe '+(i+1)+'</h3>'+list.slice(i*config.teamSize,(i+1)*config.teamSize).map(p=>'<p>'+esc(p.name)+'</p>').join('')+'</article>').join('')+'</div></section>';
}
function phaseCard(){
 if(phase==='open')return '';
 if(phase==='closed'||phase==='review')return '<section class="pv-card"><div class="pv-section-tag">PROCHAINE ÉTAPE</div><h2>'+(phase==='closed'?'Place à la préparation.':'Le tirage se prépare en équipe.')+'</h2><p>'+(phase==='closed'?'Les inscriptions sont terminées. Les organisateurs préparent les compositions.':'La composition proposée attend les avis des co-gestionnaires autorisés et la décision finale de l’administrateur.')+'</p><span class="pv-rights">Les équipes seront affichées après validation.</span></section>';
 if(phase==='ready')return '<section class="pv-card"><div class="pv-section-tag">TOUT EST PRÊT</div><h2>On se retrouve sur le terrain.</h2><p>Les équipes sont validées. Le lien du direct apparaîtra dès le début du premier match.</p></section>';
 return '<section class="pv-card pv-live" id="pvLiveLink"><div><div class="pv-section-tag"><span class="pv-live-dot"></span>'+(phase==='live'?'LE TERRAIN EN DIRECT':'LE BILAN DU TOURNOI')+'</div><h2>'+(phase==='live'?'Ne manque aucun but.':'Tous les résultats, au même endroit.')+'</h2><p>'+(phase==='live'?'Premier match commencé · Équipe 1 '+score+' – 0 Équipe 2':'Scores, classement et performances du tournoi.')+'</p></div><a href="#previewLive" data-action="live">'+(phase==='live'?'Suivre le direct ↗':'Voir les résultats ↗')+'</a></section>';
}
function render(preserve=true){
 if(preserve)preserveForm();const total=registered().length,remaining=Math.max(0,config.capacity-total),teamCount=Math.floor(total/config.teamSize);
 const fields=[['Date',dateLabel(config.date)],['Rendez-vous',config.time],['Lieu',config.venue],['Participation',config.fee>0?money(config.fee):'Gratuit']].filter(([,v])=>v);
 $('previewPage').innerHTML='<div class="pv-topline"><div class="pv-logo">SWÉ<span>TOURNAMENT</span></div><small>LE FOOT. LE GROUPE. LE RENDEZ-VOUS.</small></div><header class="pv-hero"><div class="pv-pitch" aria-hidden="true"></div><span class="pv-state '+(phase==='live'?'live':'')+'"><i></i>'+labels[phase]+'</span><div class="pv-eyebrow">'+esc(formats[config.format])+' · '+config.teamSize+' contre '+config.teamSize+'</div><h1>'+esc(config.title)+'</h1><p>Un terrain. Des équipes. Un moment à partager.</p><div class="pv-meta">'+fields.map(([k,v])=>'<span><b>'+k+'</b>'+esc(v)+'</span>').join('')+'</div></header>'+progress()+'<div class="pv-body"><div class="pv-main">'+phaseCard()+registrationCard()+teamsCard()+peopleCard()+'</div><aside class="pv-aside"><section class="pv-card"><div class="pv-section-tag">'+(phase==='open'?'REJOINS LE GROUPE':'LES PARTICIPANTS')+'</div><div class="pv-count"><strong>'+total+' <small>/ '+config.capacity+'</small></strong><span>'+(phase==='open'?remaining+' places restantes':'inscrits')+'</span></div><div class="pv-meter" aria-label="'+total+' inscrits sur '+config.capacity+'" style="--progress:'+Math.min(100,100*total/config.capacity)+'%"><i></i></div><p class="pv-muted">'+(teamCount>=2?teamCount+' équipes complètes'+(total%config.teamSize?' · '+(total%config.teamSize)+' remplaçants':''):'Les équipes se formeront au fil des inscriptions.')+'</p>'+(phase==='open'&&config.deadline?'<div class="pv-split"><span>Fin des inscriptions</span><b>'+esc(config.deadline.replace('T',' · '))+'</b></div>':'')+'<div class="pv-split"><span>Format</span><b>'+esc(formats[config.format])+'</b></div><div class="pv-split"><span>Durée des matchs</span><b>'+config.duration+' min</b></div>'+(config.reservation?'<div class="pv-split"><span>Réservation</span><b>'+esc(config.reservation)+'</b></div>':'')+'</section>'+(config.general.trim()?'<section class="pv-card pv-note" id="pvGeneralInstructions"><div class="pv-section-tag">UN MOT DE L’ADMINISTRATEUR</div><h2>Avant de venir.</h2><p>'+esc(config.general.trim())+'</p></section>':'')+rules()+(config.history?details('pvHistory','Le précédent tournoi','<p>Exemple de résultats précédents.</p><div class="pv-result"><b>Les Bleus</b><strong>2 – 1</strong><b>Les Blancs</b></div>'+button('history','Consulter l’historique','secondary')):'')+'</aside></div><footer class="pv-foot"><strong>SWÉ TOURNAMENT</strong><p>Le football se partage.</p>'+(config.views?'<span>42 vues · compteur de démonstration</span>':'')+'</footer>';
 restoreForm();
}
function showDialog(kind){
 dialogMode=kind;let body='';
 if(kind==='live')body='<div class="pv-eyebrow">'+(phase==='live'?'DIRECT SIMULÉ':'RÉSULTAT SIMULÉ')+'</div><h2>'+esc(config.title)+'</h2><div class="pv-result"><b>Équipe 1</b><strong>'+score+' – 0</strong><b>Équipe 2</b></div>'+(phase==='live'?button('goal','Simuler un but'):'<p>Le tournoi est terminé.</p>')+'<p class="pv-muted">Cette fenêtre illustre le lien du direct. Aucun match réel n’est modifié.</p>';
 else if(kind==='draw')body='<div class="pv-eyebrow">ESPACE CO-GESTIONNAIRE · DÉMONSTRATION</div><h2>Suivi du tirage</h2><p>'+(['open','closed'].includes(phase)?'Ton avis sera demandé dans la soirée pour valider la composition des équipes.':phase==='review'?'La proposition est en cours de validation.':'La composition a été validée.')+'</p>'+(phase==='review'?button('vote','Donner mon avis','secondary')+(config.redraw?button('redraw','Proposer un nouveau tirage','light'):''):'')+'<p>La décision finale revient à l’administrateur. Les actions affichées ici sont des simulations.</p>';
 else if(kind==='rate'){const end=new Date(config.date+'T12:00:00');end.setDate(end.getDate()+2);body='<h2>Notation après tournoi</h2><p>Pense à te connecter pour noter les joueurs.</p><p>Le lien est valable <b>48 h après la clôture officielle</b>. Exemple de fin de période : '+esc(end.toLocaleString('fr-FR'))+'.</p><p>La connexion et les autorisations seront celles du module de notation existant.</p>'}
 else if(kind==='history')body='<h2>Le précédent rendez-vous</h2><p>Données de démonstration.</p><table><thead><tr><th>Équipe</th><th>Points</th></tr></thead><tbody><tr><td>Les Bleus</td><td>6</td></tr><tr><td>Les Blancs</td><td>3</td></tr></tbody></table>';
 $('previewDialogBody').innerHTML=body;if(!$('previewDialog').open)$('previewDialog').showModal();
}
function act(action){
 notice='';const p=person(selected);
 if(action==='solo'||action==='team-mode'){mode=action==='solo'?'solo':'team';render();return}
 if(['live','draw','rate','history'].includes(action)){showDialog(action);return}
 if(action==='goal'){score++;render();showDialog('live');return}
 if(action==='vote'||action==='redraw'){if(action==='redraw'&&formValues['redraw:'+selected])return;formValues['redraw:'+selected]=action==='redraw';$('previewDialogBody').innerHTML='<h2>Proposition simulée</h2><p>Ton avis a été pris en compte dans cette prévisualisation. La décision finale reste à l’administrateur.</p>';return}
 if(phase!=='open')return;
 if(action==='code'){const v=$('pvTeamCode').value.trim();if(!/^\d{6}$/.test(v)){notice='Saisis les 6 chiffres du code de démonstration.'}else codeValid=true;render();return}
 if(action==='team-guest'){teamGuestCount=Math.min(config.teamSize-1,teamGuestCount+1);render();return}
 if(action==='team'){
  const creator=$('pvTeamCreator').value,name=$('pvTeamName').value.trim(),color=document.querySelector('input[name="pvColor"]:checked');
  const mates=[...$('previewPage').querySelectorAll('[id^="pvMate-"]:checked')].map(e=>e.id.slice(7)).filter(id=>id!==creator),guests=[...$('previewPage').querySelectorAll('[id^="pvTeamGuest"]')].filter(e=>e.value.trim());
  if(!creator||!name||!color)notice='Choisis le créateur, le nom et la couleur des maillots.';else if(1+mates.length+guests.length>config.teamSize)notice='Cette équipe dépasse '+config.teamSize+' joueurs.';else notice='Équipe validée dans le test uniquement. Aucune invitation envoyée.';render();return;
 }
 if(!p){notice='Choisis ton nom pour essayer cette action.';render();return}
 if(action==='join'){if(registered().length>=config.capacity&&!p.registered)notice='Le scénario est complet.';else{p.registered=true;notice='Inscription simulée. Aucun changement sur le tournoi réel.'}}
 if(action==='leave'){p.registered=false;notice='Retrait simulé. Aucun changement sur le tournoi réel.'}
 if(action==='guest')notice=$('pvGuestName').value.trim()?'Invité ajouté dans la démonstration uniquement. Aucune donnée transmise.':'Indique le nom de ton invité.';
 render();
}
$('previewConfig').addEventListener('submit',e=>{e.preventDefault();generate()});
$('emptyInstructions').onclick=()=>{const f=$('previewConfig').elements;f.general.value='';for(const n of ['observe','evening','rating','redraw'])f.namedItem(n).checked=false;config=readConfig();notice='';render();$('configFeedback').textContent='Tous les encarts de consignes sont masqués.'};
$('previewPhase').onchange=e=>{phase=phases.includes(e.target.value)?e.target.value:'open';notice='';render()};
document.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-size]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));$('previewStage').style.width=b.dataset.size==='full'?'100%':b.dataset.size+'px'});
$('previewPage').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b){e.preventDefault();act(b.dataset.action)}});
$('previewPage').addEventListener('change',e=>{if(e.target.id==='pvPlayer'){selected=e.target.value;render()}else if(e.target.id==='pvGuestMember')$('pvGuestPhoneWrap').hidden=!e.target.checked});
$('previewDialogBody').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b){e.preventDefault();act(b.dataset.action)}});
$('closePreviewDialog').onclick=()=>$('previewDialog').close();
generate();
})();

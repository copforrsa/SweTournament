/* Fast Conquête organizer integration. No private vote or rating enters public state. */
(()=>{
'use strict';
const phases={qualification:'Qualifications',conquest_1:'Conquête 1',conquest_2:'Conquête 2',finals:'Finales',finished:'Tournoi terminé'};
let cached=null,loading=false,pending=false,timer;const drafts=new Map();
const t=()=>{try{return currentTour()}catch(_){return null}};
const n=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x};
const team=id=>(S.teams||[]).find(x=>x.id===id)?.name||'Équipe';
const player=id=>(S.players||[]).find(x=>x.id===id)?.name||'Joueur';
const button=(label,fn,disabled=false)=>{const b=n('button',label);b.type='button';b.disabled=disabled||pending;b.onclick=fn;return b};
async function refresh(force=false){
 inbox().catch(()=>{});
 const tour=t();if(tour?.format!=='fast_conquest'){document.getElementById('fastConquestPanel')?.remove();cached=null;return}
 if(loading)return;if(!force&&cached?.id===tour.id&&Date.now()-cached.at<5000){mount();return}
 loading=true;try{const r=await sb.rpc('fast_conquest_context',{p_tournament_id:tour.id});if(r.error)throw r.error;if(t()?.id===tour.id){if(r.data.tournament)Object.assign(tour,r.data.tournament);const matchKey=data=>JSON.stringify((data?.matches||[]).map(m=>[m.id,m.status,m.pitch,m.scoring_digest]));if((r.data.matches?.length||(S.matches||[]).length)&&matchKey(r.data)!==matchKey(cached?.data))await loadTournament();cached={id:tour.id,at:Date.now(),data:r.data};mount();if(typeof renderMatches==='function'&&(S.matches||[]).length)renderMatches(false)}}catch(e){cached=null;window.SWE_FAST_CONQUEST_CONTEXT=null;document.getElementById('fastConquestPanel')?.remove();if(typeof renderMatches==='function'&&(S.matches||[]).length)renderMatches(false);if(force)toast(e.message||'Accès Fast Conquête refusé')}finally{loading=false}
}
async function act(action,payload={},engine=false){
 if(pending)return;const tour=t();if(tour?.format!=='fast_conquest')return;
 pending=true;mount();try{
  const r=engine?await sb.functions.invoke('fast-conquest',{body:{tournamentId:tour.id,action,...payload}}):await sb.rpc(action==='generate'?'fast_conquest_generate_teams':'fast_conquest_manage',action==='generate'?{p_tournament_id:tour.id}:{p_tournament_id:tour.id,p_action:action,p_payload:payload});
  if(r.error){let message=r.error.message;try{const body=await r.error.context?.json();if(body?.error)message=body.error}catch(_){}throw Error(message)}
  if(r.data?.error)throw Error(r.data.error);
  if(t()?.id!==tour.id)return;
  if(r.data?.tournament)Object.assign(tour,r.data.tournament);const completed=(S.matches||[]).find(x=>x.format_slot==='fast:'+payload.matchId);await loadTournament();if(action==='finish'&&completed)window.SWE_MATCH_COMMON_4302?.selectNextMatch?.(completed);cached=null;toast('Enregistré ✓');
 }catch(e){toast(e.message||'Action impossible')}finally{pending=false;await refresh(true);renderMatches(false)}
}
let inboxBusy=false;
async function inbox(){
 if(inboxBusy||!S.workspace?.id||!S.session?.user)return;
 inboxBusy=true;try{const {data,error}=await sb.rpc('fast_conquest_inbox',{p_workspace_id:S.workspace.id});if(error||!Array.isArray(data))return;
 let box=document.getElementById('fastConquestInbox');if(!data.length){box?.remove();return}const home=document.getElementById('view-home');if(!home)return;
 if(!box){box=n('section');box.id='fastConquestInbox';box.className='fast-conquest';box.setAttribute('aria-live','polite');home.prepend(box)}const sig=JSON.stringify(data);if(box.dataset.signature===sig)return;box.dataset.signature=sig;box.replaceChildren();box.append(n('h3','Salon de Vote et appréciations · Fast Conquête'));
 for(const item of data)box.append(button((item.vote_open?'🗳️ Vote ouvert':'⭐ Notes de fin de tournoi')+' · '+(item.name||'Fast Conquête'),async()=>{await loadAll();S.activeTour=item.id;await loadTournament();cached=null;setView('matches');renderMatches(false);await refresh(true)}));
 }finally{inboxBusy=false}
}
function picker(label,options,value){const l=n('label',label),s=n('select');for(const [id,name] of options){const o=n('option',name);o.value=id;s.append(o)}if(value!==undefined)s.value=value;s.dataset.fastDraft=label;l.append(s);return {l,s}}
function mount(){
 const tour=t(),host=document.getElementById('matchesList');if(!host||tour?.format!=='fast_conquest'||cached?.id!==tour.id)return;
 let box=document.getElementById('fastConquestPanel');if(!box){box=n('section');box.id='fastConquestPanel';box.className='fast-conquest';host.prepend(box)}
 const c=cached.data,signature=JSON.stringify([c,pending,S.teams,S.coorgs,S.players]);if(box.dataset.signature===signature)return;box.dataset.signature=signature;for(const el of box.querySelectorAll('[data-fast-draft]'))drafts.set(tour.id+':'+el.dataset.fastDraft,el.value);box.replaceChildren();
 box.append(n('h2','⚔️ Fast Conquête'),n('p','Deux matchs de qualification, puis la conquête des trois terrains.'));
 box.append(n('strong',c.state?phases[c.state.phase]:'Composition des équipes'));
 box.append(n('p','Carrefour · Terres du Roi | Mercedes · Terrain des Conquérants | Boulogne · Terres des Bannis'));
 if((S.teams||[]).length!==6)box.append(n('p','⚠️ Exactement six équipes sont requises.'));
 const controls=n('div');controls.className='fast-actions';
 controls.append(button('Actualiser',()=>refresh(true)));
 if(c.admin&&c.entitled&&!c.state){
  controls.append(button('Générer six équipes équilibrées',()=>{if(!S.teams.length||confirm('Remplacer les compositions actuelles par six équipes équilibrées ?'))act('generate')},c.locked||c.vote_open));
  controls.append(button(c.locked?'Déverrouiller les équipes':'Verrouiller les équipes',()=>act(c.locked?'unlock':'lock'),S.teams.length!==6));
  controls.append(button('Lancer les qualifications',()=>act('start',{},true),!c.locked||S.teams.length!==6));
  const details=n('details'),title=n('summary','Co-gestionnaires désignés');details.append(title);
  const checkboxes=[];for(const co of S.coorgs||[]){if(co.active===false)continue;const l=n('label'),chk=n('input');chk.type='checkbox';chk.value=co.user_id;chk.checked=(c.evaluators||[]).includes(co.user_id);l.append(chk,document.createTextNode(co.first_name||co.display_name||co.name||player(co.linked_player_id)));details.append(l);checkboxes.push(chk)}
  details.append(button('Enregistrer les co-gestionnaires',()=>act('designate',{users:checkboxes.filter(x=>x.checked).map(x=>x.value)}),c.locked));box.append(details);
 }
 if(c.admin&&c.entitled){
  const cap=n('details');cap.append(n('summary','Capitaines et remplaçants'));
  for(const tm of S.teams||[]){const options=[['','Choisir le capitaine'],...(c.captain_candidates||[]).filter(x=>x.team_id===tm.id).map(x=>[x.user_id,player(x.player_id)])];const pick=picker(tm.name,options,c.captains?.find(k=>k.team_id===tm.id)?.user_id||'');pick.s.onchange=()=>pick.s.value&&act('captain',{teamId:tm.id,userId:pick.s.value});cap.append(pick.l)}
  const subs=(S.tPlayers||[]).filter(x=>x.present&&x.is_substitute);if(subs.length){const tp=picker('Équipe',(S.teams||[]).map(x=>[x.id,x.name])),sp=picker('Remplaçant',subs.map(x=>[x.player_id,player(x.player_id)]));cap.append(tp.l,sp.l,button('Enregistrer le refus de cette équipe',()=>act('refuse_sub',{teamId:tp.s.value,playerId:sp.s.value,refused:true})),button('Autoriser ce remplaçant',()=>act('refuse_sub',{teamId:tp.s.value,playerId:sp.s.value,refused:false})));}box.append(cap);
 }
 if(c.mode==='collaborative'&&!c.state){const votes=n('section');votes.append(n('h3','Salon de vote des co-gestionnaires'),n('p','Confidentiel · '+c.votes.length+' / '+c.evaluators.length+' votants · '+c.votes.filter(v=>v.decision==='approve').length+' validations · '+c.votes.filter(v=>v.decision!=='approve').length+' modifications · '+(c.locked?'Composition verrouillée':c.vote_open?'Vote ouvert':'Vote fermé')));
  for(const tm of S.teams||[]){const list=n('p',tm.name+' · '+(S.teamPlayers||[]).filter(x=>x.team_id===tm.id).map(x=>player(x.player_id)).join(', '));votes.append(list);}
  if(c.admin&&c.entitled){votes.append(button('Ouvrir une nouvelle proposition',()=>act('open_vote'),c.locked||c.vote_open||S.teams.length!==6));if(c.vote_open)votes.append(button('Fermer le vote pour modifier',()=>act('close_vote')));}
  if(c.entitled&&c.vote_open&&c.evaluators.includes(S.session?.user?.id)){const comment=n('textarea');comment.dataset.fastDraft='vote-comment';comment.placeholder='Commentaire confidentiel';comment.maxLength=1000;comment.setAttribute('aria-label','Commentaire confidentiel');const opts=[['','Choisir un joueur'],...(S.teamPlayers||[]).map(x=>[x.player_id,player(x.player_id)+' · '+team(x.team_id)])],a=picker('Joueur à échanger',opts),b=picker('Avec ce joueur',opts);votes.append(comment,button('Valider la proposition',()=>act('vote',{decision:'approve',comment:comment.value})),button('Demander une modification',()=>act('vote',{decision:'modify',comment:comment.value})),a.l,b.l,button('Proposer cet échange',()=>act('vote',{decision:'swap',playerA:a.s.value,playerB:b.s.value,comment:comment.value})));}
  for(const v of c.votes){votes.append(n('p',(v.decision==='approve'?'✓ Validation':v.decision==='swap'?'Échange : '+player(v.player_a)+' ↔ '+player(v.player_b):'Modification demandée')+(v.comment?' · '+v.comment:'')));if(c.admin&&c.entitled&&v.decision==='swap')votes.append(button('Appliquer cet échange',()=>act('apply_swap',{playerA:v.player_a,playerB:v.player_b}),c.locked));}box.append(votes);
 }
 if(c.state){const state=c.state;if(state.matches.some(m=>m.deleted)){box.append(n('p','Un match a été supprimé. Régénère les rencontres manquantes pour poursuivre.'));if(c.admin&&c.entitled)controls.append(button('Régénérer les matchs supprimés',()=>act('repair',{},true)));}if(state.phase==='qualification'&&state.matches.filter(m=>m.phase==='qualification').every(m=>m.status==='finished')&&!state.ranking){box.append(n('p','Égalité parfaite : tirage au sort puis validation organisateur requis.'));if(c.admin&&c.entitled){controls.append(button('Effectuer le tirage au sort',()=>act('draw',{},true)));if(state.draw){box.append(n('p',state.draw.ranking.map(team).join(' → ')));controls.append(button('Valider ce départage',()=>act('validate_draw',{},true)))}}}
  for(const move of window.SWE_FAST_ENGINE.progression(state))box.append(n('p',team(move.team)+' · '+move.message));
  const rank=n('ol');for(const id of state.finalRanking||state.ranking||[])rank.append(n('li',team(id)));if(rank.childNodes.length)box.append(n('h3',state.finalRanking?'Classement final':'Classement des qualifications'),rank);
  if(state.champion)box.append(n('h2','🏆 Champion et 👑 Roi du terrain : '+team(state.champion)));
  if(c.notes_open||c.notes_closed){const notes=n('section');notes.append(n('h3','Votes / Notes de fin de tournoi'),n('p',c.notes_closed?'Votes clôturés':'Notes confidentielles et modifiables jusqu’à clôture.'));
   if(c.can_note&&c.notes_open){const participants=[...new Set((S.matchAssignments||[]).map(x=>x.player_id))];for(const id of participants){const prior=c.my_notes.find(x=>x.player_id===id),pick=picker(player(id),[['','Choisir'],['1','Blessé / non évaluable'],['2','Nettement en dessous'],['3','En dessous de son niveau'],['4','A tenu son rang'],['5','A créé la surprise'],['6','Maestro du jour']],prior?.appreciation_code||'');const obs=n('textarea');pick.s.dataset.fastDraft='note-code-'+id;obs.dataset.fastDraft='note-comment-'+id;obs.value=prior?.comment||'';obs.maxLength=1000;obs.setAttribute('aria-label','Observation confidentielle pour '+player(id));notes.append(pick.l,obs,button('Enregistrer la note',()=>act('note',{playerId:id,code:Number(pick.s.value),comment:obs.value})))}}
   if(c.admin&&c.entitled){notes.append(button('Clôturer les votes',()=>{if(confirm('Clôturer les notes et les intégrer à l’historique ?'))act('close_notes')},!c.notes_open));for(const row of c.note_summary||[])notes.append(n('p',player(row.player_id)+' · '+Number(row.average).toFixed(1)+'/6 · '+row.voters+' avis'+(row.observations?.length?' · '+row.observations.join(' ; '):'')))}box.append(notes);
  }
 }
 box.append(controls);for(const el of box.querySelectorAll('[data-fast-draft]')){const key=tour.id+':'+el.dataset.fastDraft;if(drafts.has(key))el.value=drafts.get(key)}window.SWE_FAST_CONQUEST_CONTEXT=c;
}
function finishControl(m,can,busy){
 const box=n('section');if(m.status==='finished'){box.append(button('✓ Match terminé',()=>{},true));if(cached?.data?.admin&&cached?.data?.entitled)box.append(button('Corriger le résultat',()=>{const home=prompt('Score '+team(m.home_team_id),m.home_score),away=home===null?null:prompt('Score '+team(m.away_team_id),m.away_score);if(away!==null&&confirm('Cette correction régénère les phases suivantes et efface leurs résultats. Continuer ?'))submitFinish(m,'correct',Number(home),Number(away))},busy));return box}
 const record=cached?.data?.matches?.find(x=>x.id===m.id);if(!m.pitch){box.append(n('p','Tour précédent à terminer avant ce match.'));return box}
 if(record?.can_confirm)box.append(button('Capitaine : valider les buteurs et passeurs',()=>act('confirm',{matchId:m.id}),busy));
 box.append(n('p',record?.captains_confirmed?'✓ Les deux capitaines ont validé les buteurs et passeurs.':'En attente des deux validations des capitaines.'));
 if(can)box.append(button('Terminer le match',()=>submitFinish(m,'finish',m.home_score,m.away_score),busy||!record?.captains_confirmed));return box;
}
function submitFinish(m,action,home,away){const payload={matchId:m.format_slot.replace(/^fast:/,''),homeScore:home,awayScore:away};if(m.format_stage!=='qualification'&&Number(home)===Number(away)){const h=prompt('Tirs au but '+team(m.home_team_id)+' : trois tireurs, puis mort subite. 1 = marqué, 0 = raté (ex. 1011)'),a=h===null?null:prompt('Tirs au but '+team(m.away_team_id)+' : même nombre de tirs');if(a===null)return;const parse=x=>/^[01]{3,}$/.test(x)?[...x].map(y=>y==='1'):null;payload.penalties={home:parse(h),away:parse(a)}}act(action,payload,true)}
function creation(){for(const id of ['view-matches','view-teams'])document.getElementById(id)?.classList.toggle('fast-format-view',t()?.format==='fast_conquest');const select=document.getElementById('tourFormat');if(!select)return;let option=select.querySelector('option[value="fast_conquest"]');if(!option){option=n('option','⚔️ Fast Conquête');option.value='fast_conquest';select.append(option)}option.disabled=!S.workspaceFeatures?.tournaments_enabled;const card=document.getElementById('tournamentAdminCard');card?.classList.toggle('fast-conquest',select.value==='fast_conquest');}
window.SWE_FAST_CONQUEST={refresh,act,finishControl};document.addEventListener('swe:rendered',()=>{creation();clearTimeout(timer);timer=setTimeout(()=>refresh(),50)});document.addEventListener('change',e=>{if(e.target.id==='tourFormat')creation()});
const host=document.getElementById('matchesList');if(host)new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>refresh(),100)}).observe(host,{childList:true});
creation();refresh();setInterval(()=>{if(document.visibilityState!=='hidden')refresh()},10000);
})();

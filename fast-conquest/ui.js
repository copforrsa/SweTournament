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
 for(const item of data)box.append(button((item.vote_open?'🗳️ Vote ouvert':item.notes_open?'⭐ Notes de fin de tournoi':'🗳️ Préparer le vote de composition')+' · '+(item.name||'Fast Conquête'),async()=>{if(item.notes_open){await openNotes(item.id);return}await loadAll();S.activeTour=item.id;await loadTournament();cached=null;if(!item.notes_open){window.SWETeamDrawSalonV2?.open(item.id);return}setView('matches');renderMatches(false);await refresh(true)}));
 }finally{inboxBusy=false}
}
async function openNotes(tournamentId){
 let dialog=document.getElementById('fastNotesDialog');dialog?.remove();dialog=n('dialog');dialog.id='fastNotesDialog';dialog.className='fast-conquest';dialog.style.cssText='position:fixed;margin:auto;width:min(760px,94vw);max-height:88vh;overflow:auto;z-index:100000;padding:20px';dialog.setAttribute('aria-label','Salon de notation confidentiel');document.body.append(dialog);
 const close=button('Fermer',()=>dialog.close());dialog.append(close,n('h2','Votes / Notes de fin de tournoi'),n('p','Chargement du salon…'));dialog.showModal();dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 try{
  const {data:c,error}=await sb.rpc('fast_conquest_context',{p_tournament_id:tournamentId});if(error)throw error;if(!c.can_note)throw Error('Seuls l’organisateur et les co-gestionnaires désignés présents peuvent noter.');if(!c.notes_open)throw Error(c.notes_closed?'Les votes sont clôturés.':'Le salon sera ouvert à la fin du tournoi.');
  if(!dialog.isConnected)return;dialog.replaceChildren(close,n('h2','Votes / Notes de fin de tournoi'),n('p','Confidentiel · notes sur 10 modifiables jusqu’à la clôture.'));
  const known=new Map((S.players||[]).map(p=>[p.id,p.name]));for(const p of c.participant_details||[])known.set(p.id,p.name);
  const roster=[...(c.participants||[])].sort((a,b)=>(known.get(a)||'').localeCompare(known.get(b)||'','fr'));
  const counter=n('p',roster.length+' joueurs du tournoi · '+(c.my_notes||[]).filter(n=>n.rating!=null).length+' notés');dialog.append(counter,n('p','Note sur 10 · à la clôture : 70 % de la note actuelle + 30 % de la moyenne du tournoi.'));
  const search=n('input');search.type='search';search.placeholder='Rechercher un joueur';search.setAttribute('aria-label','Rechercher un joueur du tournoi');dialog.append(search);if(c.admin)dialog.append(button('Clôturer les notes',async()=>{if(!confirm('Clôturer les notes et appliquer les moyennes une seule fois ?'))return;const r=await sb.rpc('fast_conquest_manage',{p_tournament_id:tournamentId,p_action:'close_notes',p_payload:{}});if(r.error){toast(r.error.message);return}dialog.close();await refresh(true);toast('Notes clôturées et moyennes appliquées ✓')}));search.oninput=()=>{for(const card of dialog.querySelectorAll('[data-note-player]'))card.hidden=!card.dataset.notePlayer.includes(search.value.trim().toLocaleLowerCase('fr'))};
  if((c.participants||[]).some(id=>!known.has(id))){const r=await sb.from('players').select('id,name').in('id',c.participants);if(r.error)throw r.error;for(const p of r.data||[])known.set(p.id,p.name)}
  for(const id of roster){
   const prior=(c.my_notes||[]).find(x=>x.player_id===id),name=known.get(id)||'Joueur',pick=picker(name,noteOptions(),prior?.rating??'');
   const card=n('section');card.dataset.notePlayer=name.toLocaleLowerCase('fr');card.style.cssText='padding:12px 0;border-top:1px solid #b7816b';const obs=n('textarea');obs.value=prior?.comment||'';obs.maxLength=1000;obs.setAttribute('aria-label','Observation confidentielle pour '+name);const status=n('p');status.setAttribute('role','status');const detail=(c.participant_details||[]).find(p=>p.id===id);if(detail)card.append(n('p','Note actuelle : '+Number(detail.current_rating).toFixed(1)+' / 10'));
   const save=button('Enregistrer',async()=>{if(pick.s.value===''){status.textContent='Choisis une note sur 10.';return}save.disabled=true;try{const r=await sb.rpc('fast_conquest_manage',{p_tournament_id:tournamentId,p_action:'note',p_payload:{playerId:id,rating:Number(pick.s.value),comment:obs.value}});if(r.error)throw r.error;status.textContent='Enregistré ✓';const existing=(c.my_notes||[]).find(n=>n.player_id===id);if(existing)existing.rating=Number(pick.s.value);else(c.my_notes||(c.my_notes=[])).push({player_id:id,rating:Number(pick.s.value)});counter.textContent=roster.length+' joueurs du tournoi · '+c.my_notes.filter(n=>n.rating!=null).length+' notés'}catch(e){status.textContent=e.message||'Enregistrement impossible'}finally{save.disabled=false}});
   card.append(pick.l,obs,save,status);dialog.append(card);
  }
 }catch(e){dialog.append(n('p',e.message||'Impossible d’ouvrir le salon.'))}
}
function noteOptions(){return [['','Choisir une note sur 10'],...Array.from({length:21},(_,i)=>[String(i/2),String(i/2)+' / 10'])]}
function picker(label,options,value){const l=n('label',label),s=n('select');for(const [id,name] of options){const o=n('option',name);o.value=id;s.append(o)}if(value!==undefined)s.value=value;s.dataset.fastDraft=label;l.append(s);return {l,s}}
function mount(){
 const tour=t(),host=document.getElementById('matchesList');if(!host||tour?.format!=='fast_conquest'||cached?.id!==tour.id)return;
 let box=document.getElementById('fastConquestPanel');if(!box){box=n('section');box.id='fastConquestPanel';box.className='fast-conquest';host.prepend(box)}
 const c=cached.data,signature=JSON.stringify([c,pending,S.teams,S.coorgs,S.players]);if(box.dataset.signature===signature)return;box.dataset.signature=signature;for(const el of box.querySelectorAll('[data-fast-draft]'))drafts.set(tour.id+':'+el.dataset.fastDraft,el.value);const overviewOpen=box.querySelector('[data-fast-overview]')?.open===true;box.replaceChildren();
 const panel=box;let overview=null;
 if(c.state){
  const heading=n('div');heading.className='fast-match-heading';heading.style.cssText='display:flex;align-items:center;gap:10px;flex-wrap:wrap';
  const title=n('h2','⚔️ Fast Conquête');title.style.margin='0';heading.append(title,n('strong',phases[c.state.phase]),button('Actualiser',()=>refresh(true)));panel.append(heading);
  overview=n('details');overview.dataset.fastOverview='';overview.open=overviewOpen;overview.append(n('summary','Progression et réglages du tournoi'));panel.append(overview);box=n('div');overview.append(box);
 }
 if(!c.state)box.append(n('h2','⚔️ Fast Conquête'),n('p','Deux matchs de qualification, puis la conquête des trois terrains.'));
 box.append(n('strong',c.state?phases[c.state.phase]:'Composition des équipes'));
 box.append(n('p','Carrefour · Terres du Roi | Mercedes · Terrain des Conquérants | Boulogne · Terres des Bannis'));
 if(!c.state||c.state.qualificationMethod==='balanced_levels')box.append(n('p','Qualifications : deux tours, deux adversaires différents et changement de terrain. Le calendrier minimise les écarts de niveau entre les équipes validées.'));
 if((S.teams||[]).length!==6)box.append(n('p','⚠️ Exactement six équipes sont requises.'));
 const controls=n('div');controls.className='fast-actions';
 if(!c.state)controls.append(button('Actualiser',()=>refresh(true)));
 if(c.mode==='collaborative'&&c.entitled&&!c.admin&&!c.state)controls.append(button('Ouvrir le salon · 5 tirages',()=>window.SWETeamDrawSalonV2?.open(tour.id)));
 if(c.admin&&c.entitled&&!c.state){
  if(c.mode==='collaborative')controls.append(button('Ouvrir le salon · 5 tirages',()=>window.SWETeamDrawSalonV2?.open(tour.id),c.locked));else controls.append(button('Générer six équipes équilibrées',()=>{if(!S.teams.length||confirm('Remplacer les compositions actuelles par six équipes équilibrées ?'))act('generate')},c.locked||c.vote_open));
  controls.append(button(c.locked?'Déverrouiller les équipes':'Verrouiller les équipes',()=>act(c.locked?'unlock':'lock'),S.teams.length!==6||(c.mode==='collaborative'&&!c.locked&&tour.team_review_status!=='approved')));
  controls.append(button('Lancer les qualifications',()=>act('start',{},true),!c.locked||S.teams.length!==6));
  if(c.mode!=='collaborative'){const details=n('details'),title=n('summary','Co-gestionnaires désignés');details.append(title);
  const checkboxes=[];for(const co of S.coorgs||[]){if(co.active===false)continue;const l=n('label'),chk=n('input');chk.type='checkbox';chk.value=co.user_id;chk.checked=(c.evaluators||[]).includes(co.user_id);l.append(chk,document.createTextNode(co.first_name||co.display_name||co.name||player(co.linked_player_id)));details.append(l);checkboxes.push(chk)}
  details.append(button('Enregistrer les co-gestionnaires',()=>act('designate',{users:checkboxes.filter(x=>x.checked).map(x=>x.value)}),c.locked));box.append(details);}
 }
 if(c.admin&&c.entitled){
  const cap=n('details');cap.append(n('summary','Capitaines et remplaçants'));
  for(const tm of S.teams||[]){const options=[['','Choisir le capitaine'],...(c.captain_candidates||[]).filter(x=>x.team_id===tm.id).map(x=>[x.user_id,player(x.player_id)])];const pick=picker(tm.name,options,c.captains?.find(k=>k.team_id===tm.id)?.user_id||'');pick.s.onchange=()=>pick.s.value&&act('captain',{teamId:tm.id,userId:pick.s.value});cap.append(pick.l)}
  const subs=(S.tPlayers||[]).filter(x=>x.present&&x.is_substitute);if(subs.length){const tp=picker('Équipe',(S.teams||[]).map(x=>[x.id,x.name])),sp=picker('Remplaçant',subs.map(x=>[x.player_id,player(x.player_id)]));cap.append(tp.l,sp.l,button('Enregistrer le refus de cette équipe',()=>act('refuse_sub',{teamId:tp.s.value,playerId:sp.s.value,refused:true})),button('Autoriser ce remplaçant',()=>act('refuse_sub',{teamId:tp.s.value,playerId:sp.s.value,refused:false})));}box.append(cap);
 }

 if(c.state){const state=c.state;if(state.matches.some(m=>m.deleted)){box.append(n('p','Un match a été supprimé. Régénère les rencontres manquantes pour poursuivre.'));if(c.admin&&c.entitled)controls.append(button('Régénérer les matchs supprimés',()=>act('repair',{},true)));}if(state.phase==='qualification'&&state.matches.filter(m=>m.phase==='qualification').every(m=>m.status==='finished')&&!state.ranking){
   const next=n('section');next.className='fast-next-phase';next.setAttribute('aria-label','Passage à Conquête 1');
   const groups=window.SWE_FAST_ENGINE.tiedGroups(window.SWE_FAST_ENGINE.standings(state));
   next.append(n('p','Qualifications terminées · Égalité parfaite : '+groups.map(g=>g.map(team).join(' / ')).join(' ; ')+'. Départage requis avant Conquête 1.'));
   if(c.admin&&c.entitled){
    if(!state.draw)next.append(button('Départager les équipes à égalité',()=>act('draw',{},true)));
    else{next.append(n('p','Classement proposé : '+state.draw.ranking.map((id,i)=>(i+1)+'. '+team(id)).join(' · ')));next.append(button('Valider et générer Conquête 1',()=>act('validate_draw',{},true)));}
   }else next.append(n('p','L’organisateur doit valider le départage.'));
   if(overview)panel.insertBefore(next,overview);else panel.append(next);
  }
  for(const move of window.SWE_FAST_ENGINE.progression(state))box.append(n('p',team(move.team)+' · '+move.message));
  const rank=n('ol');for(const id of state.finalRanking||state.ranking||[])rank.append(n('li',team(id)));if(rank.childNodes.length)box.append(n('h3',state.finalRanking?'Classement final':'Classement des qualifications'),rank);
  if(state.champion)box.append(n('h2','🏆 Champion et 👑 Roi du terrain : '+team(state.champion)));
  if(c.notes_open||c.notes_closed){const notes=n('section');notes.append(n('h3','Votes / Notes de fin de tournoi'),n('p',c.notes_closed?'Votes clôturés':'Notes confidentielles et modifiables jusqu’à clôture.'));
   if(c.can_note&&c.notes_open){const participants=c.participants||[];for(const id of participants){const prior=c.my_notes.find(x=>x.player_id===id),pick=picker(player(id),noteOptions(),prior?.rating??'');const obs=n('textarea');pick.s.dataset.fastDraft='note-code-'+id;obs.dataset.fastDraft='note-comment-'+id;obs.value=prior?.comment||'';obs.maxLength=1000;obs.setAttribute('aria-label','Observation confidentielle pour '+player(id));notes.append(pick.l,obs,button('Enregistrer la note',()=>{if(pick.s.value===''){toast('Choisis une note sur 10.');return}return act('note',{playerId:id,rating:Number(pick.s.value),comment:obs.value})}))}}
   if(c.admin&&c.entitled){notes.append(button('Clôturer les votes',()=>{if(confirm('Clôturer les notes et les intégrer à l’historique ?'))act('close_notes')},!c.notes_open));for(const row of c.note_summary||[])notes.append(n('p',player(row.player_id)+' · '+Number(row.average).toFixed(1)+'/10 · '+row.voters+' avis'+(row.observations?.length?' · '+row.observations.join(' ; '):'')))}if(overview)panel.insertBefore(notes,overview);else box.append(notes);
  }
 }
 box.append(controls);for(const el of box.querySelectorAll('[data-fast-draft]')){const key=tour.id+':'+el.dataset.fastDraft;if(drafts.has(key))el.value=drafts.get(key)}window.SWE_FAST_CONQUEST_CONTEXT=c;
}
function finishControl(m,can,busy){
 const box=n('section');if(m.status==='finished'){box.append(button('✓ Match terminé',()=>{},true));if(cached?.data?.admin&&cached?.data?.entitled)box.append(button('Corriger le résultat',()=>{const home=prompt('Score '+team(m.home_team_id),m.home_score),away=home===null?null:prompt('Score '+team(m.away_team_id),m.away_score);if(away!==null&&confirm('Cette correction régénère les phases suivantes et efface leurs résultats. Continuer ?'))submitFinish(m,'correct',Number(home),Number(away))},busy));return box}
 const record=cached?.data?.matches?.find(x=>x.id===m.id);if(!m.pitch){box.append(n('p','Tour précédent à terminer avant ce match.'));return box}
 if(can)box.append(button('Terminer le match',()=>submitFinish(m,'finish',m.home_score,m.away_score),busy));return box;
}
function submitFinish(m,action,home,away){
 const payload={matchId:m.format_slot.replace(/^fast:/,''),homeScore:home,awayScore:away};
 if(m.format_stage!=='qualification'&&Number(home)===Number(away)){
  document.getElementById('fastPenaltyWinner')?.remove();
  if(!document.getElementById('fastPenaltyStyle')){const css=n('style');css.id='fastPenaltyStyle';css.textContent=`
#fastPenaltyWinner{box-sizing:border-box;width:min(440px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;margin:auto;padding:24px;border:2px solid #e9a13d;border-radius:20px;background:#fff;color:#172638;box-shadow:0 20px 70px #0005}
#fastPenaltyWinner::backdrop{background:#07152db3}
#fastPenaltyWinner .fast-penalty-label{display:block;color:#8b4804;font-size:12px;font-weight:850;letter-spacing:.08em}
#fastPenaltyWinner h3{margin:8px 0 10px;font-size:21px;line-height:1.3;color:#172638}
#fastPenaltyWinner .fast-penalty-score{margin:0 0 20px;font-weight:700;color:#4b6072;line-height:1.5;overflow-wrap:anywhere}
#fastPenaltyWinner .fast-penalty-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
#fastPenaltyWinner .fast-penalty-team{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:100px;width:100%;margin:0;padding:14px 10px;background:#fff8ed;color:#172638;border:2px solid #d9e2e8;border-top:6px solid #e99a28;border-radius:14px;font-size:17px;font-weight:850;white-space:normal;overflow-wrap:anywhere;box-shadow:none}
#fastPenaltyWinner .fast-penalty-team span{font-size:26px}
#fastPenaltyWinner .fast-penalty-team:hover{background:#ffebc3;border-color:#b87113}
#fastPenaltyWinner button:focus-visible{outline:3px solid #176ac8;outline-offset:3px}
#fastPenaltyWinner .fast-penalty-cancel{display:block;width:100%;min-height:44px;margin:18px 0 0;padding:10px;background:#f1f4f6;color:#405465;border:1px solid #cad6df;border-radius:10px;box-shadow:none}
`;document.head.append(css);}
  const dialog=n('dialog');dialog.id='fastPenaltyWinner';dialog.setAttribute('aria-labelledby','fastPenaltyTitle');
  const label=n('span','TIRS AU BUT');label.className='fast-penalty-label';const title=n('h3','Choisis l’équipe gagnante');title.id='fastPenaltyTitle';
  const score=n('p',team(m.home_team_id)+' · '+home+' — '+away+' · '+team(m.away_team_id));score.className='fast-penalty-score';dialog.append(label,title,score);
  const choices=n('div');choices.className='fast-penalty-choices';
  for(const id of [m.home_team_id,m.away_team_id]){const choice=button('',()=>{payload.penalties={winnerTeamId:id};dialog.close();dialog.remove();act(action,payload,true)});choice.className='fast-penalty-team';choice.append(n('span','🏆'),n('b',team(id)));const tm=(S.teams||[]).find(x=>x.id===id);if(tm){const color=typeof sweTeamColor==='function'?sweTeamColor(tm):tm.color;if(color)choice.style.borderTopColor=color;}choices.append(choice);}
  const cancel=button('Annuler',()=>{dialog.close();dialog.remove()});cancel.className='fast-penalty-cancel';
  dialog.append(choices,cancel);dialog.addEventListener('cancel',()=>dialog.remove());document.body.append(dialog);dialog.showModal();return;
 }
 act(action,payload,true);
}
function creation(){for(const id of ['view-matches','view-teams'])document.getElementById(id)?.classList.toggle('fast-format-view',t()?.format==='fast_conquest');const select=document.getElementById('tourFormat');if(!select)return;let option=select.querySelector('option[value="fast_conquest"]');if(!option){option=n('option','⚔️ Fast Conquête');option.value='fast_conquest';select.append(option)}option.disabled=!S.workspaceFeatures?.tournaments_enabled;const card=document.getElementById('tournamentAdminCard');card?.classList.toggle('fast-conquest',select.value==='fast_conquest');}
window.SWE_FAST_CONQUEST={refresh,act,finishControl,openNotes};document.addEventListener('swe:rendered',()=>{creation();clearTimeout(timer);timer=setTimeout(()=>refresh(),50)});document.addEventListener('change',e=>{if(e.target.id==='tourFormat')creation()});
const host=document.getElementById('matchesList');if(host)new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>refresh(),100)}).observe(host,{childList:true});
creation();refresh();setInterval(()=>{if(document.visibilityState!=='hidden')refresh()},10000);
})();

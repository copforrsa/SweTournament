(()=>{
'use strict';
const labels={qualification:'Qualifications',conquest_1:'Conquête 1',conquest_2:'Conquête 2',finals:'Finales',finished:'Tournoi terminé'};
const n=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e};
function livePositions(s){
 const match=id=>(s.matches||[]).find(m=>m.id===id),done=id=>{const m=match(id);return m?.status==='finished'?m:null};
 if(s.finalRanking)return s.finalRanking.map((id,i)=>({id,place:String(i+1)+(i===0?'er':'e'),state:'Place définitive',fixed:true}));
 const seed=s.ranking||window.SWE_FAST_ENGINE.standings(s).map(r=>r.id),rows=[];
 const addPair=(id,places,state)=>{const m=match(id);if(!m)return;const complete=done(id);if(complete){rows.push({id:complete.winner,place:places[0],state:'Place définitive',fixed:true},{id:complete.loser,place:places[1],state:'Place définitive',fixed:true})}else for(const team of [m.home,m.away])rows.push({id:team,place:places[0]+'–'+places[1],state,fixed:false})};
 if(match('final')||match('bronze')){addPair('final',['1er','2e'],'Finale à jouer');addPair('bronze',['3e','4e'],'Petite finale à jouer');addPair('place_5',['5e','6e'],'Match de classement à jouer');return rows}
 if(match('semi_1')||match('semi_2')||match('place_5')){
  for(const id of ['semi_1','semi_2']){const m=match(id);if(m)for(const team of [m.home,m.away])rows.push({id:team,place:'1er–4e',state:'Demi-finales',fixed:false})}
  addPair('place_5',['5e','6e'],'Match de classement à jouer');return rows
 }
 return seed.map((id,i)=>({id,place:String(i+1)+(i===0?'er':'e'),state:s.ranking?'Classement qualificatif':'Position provisoire',fixed:false}));
}
window.SWE_FAST_LIVE=(tour,teams,client,players,teamPlayers=[])=>{
 if(client){window.SWE_FAST_LIVE_REFRESH=()=>privatePanel(tour,client,players).catch(()=>{});window.SWE_FAST_LIVE_REFRESH();}
 const rankingSection=document.getElementById('liveRanking')?.closest('section.card'),matchesSection=document.getElementById('liveMatches')?.closest('section.card');
 let panel=document.getElementById('fastConquestLive');if(tour.format!=='fast_conquest'){panel?.remove();if(rankingSection)rankingSection.hidden=false;if(matchesSection)matchesSection.hidden=false;return}
 if(rankingSection)rankingSection.hidden=true;if(matchesSection)matchesSection.hidden=true;
 const eventCards=new Map([...document.querySelectorAll('#liveMatches .live-match')].map(card=>[Number(card.querySelector('.muted')?.textContent.match(/^Match (\d+)/)?.[1]),card.querySelector('.live-match-events')]));
 const wasOpen=panel?.querySelector('[data-fast-fixtures]')?.open===true;
 if(!panel){panel=n('section');panel.id='fastConquestLive';panel.className='fast-conquest';document.getElementById('liveCoorgRating')?.before(panel)}panel.replaceChildren();
 const s=tour.rotation_state?.fast_conquest,name=id=>teams.find(t=>t.id===id)?.name||'Équipe';panel.append(n('h2','⚔️ Fast Conquête'),n('p','Deux matchs de qualification, puis la conquête des trois terrains.'));
 if(!s){panel.append(n('p','Préparation des six équipes.'));return}panel.append(n('h3','Phase en cours · '+labels[s.phase]));
 const liveRank=n('section');liveRank.className='fast-live-ranking';liveRank.style.cssText='margin:18px 0;padding:16px;border:1px solid rgba(255,205,74,.65);border-radius:14px;background:rgba(10,25,48,.38)';liveRank.append(n('h3',s.finalRanking?'Classement final':'Classement en direct'));
 const positions=livePositions(s),medals=positions.filter(row=>row.fixed&&['1er','2e','3e'].includes(row.place));
 if(medals.length){const podium=n('div');podium.className='fast-podium';podium.setAttribute('aria-label','Podium du tournoi');for(const row of medals){const rank=parseInt(row.place,10),card=n('article');card.className='fast-podium-card fast-podium-'+rank;card.append(n('div',['','🏆','🥈','🥉'][rank]),n('strong',row.place+' · '+name(row.id)),n('span',rank===1?'Champion conquérant':rank===2?'Vice-champion':'Troisième place'));podium.append(card)}liveRank.append(podium)}
 const rankGrid=n('div');rankGrid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px';
 for(const row of positions.filter(row=>!medals.some(medal=>medal.id===row.id))){const card=n('div');card.className='fast-rank-card '+(row.fixed?'is-fixed':'is-open');card.style.cssText='display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;padding:11px 13px;border-radius:11px;background:'+(row.fixed?'#fff4c7':'rgba(255,255,255,.1)');const place=n('strong',row.place);place.className='fast-rank-place';place.style.cssText='min-width:52px;font-size:1.08rem';const info=n('div');info.className='fast-rank-info';info.append(n('strong',name(row.id)),n('div',row.state));info.lastChild.style.cssText='font-size:.78rem;margin-top:2px';card.append(place,info);rankGrid.append(card)}
 liveRank.append(rankGrid);panel.append(liveRank);
 const group=m=>m.phase==='qualification'?m.label:m.phase==='conquest_1'?'Conquête 1':m.phase==='conquest_2'?(m.id==='place_5'?'Match pour la 5e place':'Demi-finales'):m.id==='bronze'?'Match pour la 3e place':'Finale';
 const groups=new Map();for(const m of s.matches||[]){if(m.deleted)continue;const key=group(m);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m)}
 const disclosure=n('details');disclosure.dataset.fastFixtures='1';disclosure.open=wasOpen;const summary=n('summary','Tableau des rencontres · Développer');disclosure.append(summary);disclosure.addEventListener('toggle',()=>{summary.textContent='Tableau des rencontres · '+(disclosure.open?'Masquer':'Développer')});const board=n('div');board.className='fast-live-fixtures';disclosure.append(board);panel.append(disclosure);
 for(const [label,matches] of groups){
  const section=n('section');section.setAttribute('aria-label',label);section.append(n('h4',label));
  const wrap=n('div');wrap.style.overflowX='auto';const table=n('table');table.className='live-table';table.style.cssText='width:100%;min-width:420px;background:#fff;color:#172033;border-radius:10px;overflow:hidden;text-align:left';
  const head=n('thead'),hr=n('tr');for(const text of ['Terrain','Rencontre','Score / État'])hr.append(n('th',text));head.append(hr);table.append(head);
  const body=n('tbody');for(const m of matches){
   const row=n('tr'),terrain=n('td'),encounter=n('td'),score=n('td');
   terrain.append(n('strong',m.pitch),n('div',m.pitchRole||''));terrain.style.cssText='min-width:120px;border-left:4px solid '+(m.pitch==='Carrefour'?'#d97706':m.pitch==='Mercedes'?'#0891b2':'#b45309');
   encounter.append(n('strong',name(m.home)+' — '+name(m.away)));
   const events=eventCards.get(Number(m.order));if(events){const eventDetails=n('details');const eventSummary=n('summary','Buteurs et passeurs');eventSummary.style.setProperty('color','#172033','important');eventDetails.append(eventSummary,events.cloneNode(true));encounter.append(eventDetails)}
   score.append(n('strong',String(m.homeScore??0)+' — '+String(m.awayScore??0)),n('div',m.status==='finished'?'Terminé':['live','started','in_progress'].includes(m.status)?'En cours':'À jouer'));
   score.style.whiteSpace='nowrap';if(m.penalties&&m.winner)score.append(n('div','TAB : '+name(m.winner)));
   for(const cell of [terrain,encounter,score]){cell.style.padding='10px';row.append(cell)}body.append(row);
  }table.append(body);wrap.append(table);section.append(wrap);board.append(section);
 }
 const moves=window.SWE_FAST_ENGINE.progression(s);if(moves.length){const details=n('details');details.append(n('summary','Montées et descentes de terrain'));for(const m of moves)details.append(n('p',name(m.team)+' · '+m.message));panel.append(details)}

 const titles=document.getElementById('liveTournamentTitles');if(titles)titles.textContent=s.champion?'🏆 Champion conquérant : '+name(s.champion):'Le Champion conquérant sera désigné après la finale.';
 if(s.champion){const winner=n('section');winner.className='fast-champion';winner.append(n('h2','🏆 Champion conquérant : '+name(s.champion)));const ids=[...new Set(teamPlayers.filter(tp=>String(tp.team_id)===String(s.champion)).map(tp=>String(tp.player_id)))];const names=ids.map(id=>players?.get?.(id)?.name).filter(Boolean);if(names.length)winner.append(n('p',names.join(' · ')));panel.append(winner)}

};
async function privatePanel(tour,client,players){
 if(tour.format!=='fast_conquest')return;
 const {data:session}=await client.auth.getSession();if(!session.session)return;
 const r=await client.rpc('fast_conquest_context',{p_tournament_id:tour.id});if(r.error)return;
 const c=r.data;let panel=document.getElementById('fastLivePrivate');
 if(!panel){panel=n('section');panel.id='fastLivePrivate';panel.className='fast-conquest';document.getElementById('liveCoorgRating')?.before(panel)}
 const saved=new Map([...panel.querySelectorAll('[data-fast-draft]')].map(el=>[el.dataset.fastDraft,el.value]));
 const sig=JSON.stringify(c);if(panel.dataset.signature===sig)return;panel.dataset.signature=sig;panel.replaceChildren();
 const name=id=>players.get(String(id))?.name||'Joueur';
 const act=async(action,payload)=>{const result=await client.rpc('fast_conquest_manage',{p_tournament_id:tour.id,p_action:action,p_payload:payload});if(result.error){alert(result.error.message);return}panel.dataset.signature='';await privatePanel(tour,client,players)};
 const button=(label,fn)=>{const b=n('button',label);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn()}finally{if(b.isConnected)b.disabled=false}};return b};
 for(const m of c.matches||[])if(m.can_confirm&&m.pitch&&m.status!=='finished'){panel.append(n('h3','Validation du capitaine · '+m.round_label),n('p','Vérifie les buteurs et passeurs sur la feuille de match avant de valider.'),button('Valider les buteurs et passeurs',()=>act('confirm',{matchId:m.id})))}
 if(c.notes_open&&c.can_note){panel.append(n('h2','Votes / Notes de fin de tournoi'),n('p','Confidentiel · tu peux modifier tes avis jusqu’à leur clôture.'));
  for(const id of c.participants||[]){const initialPrior=c.my_notes.find(x=>x.player_id===id);if(initialPrior?.initial_skills||(c.participant_details||[]).find(p=>p.id===id)?.requires_initial){const box=n('section');box.append(n('h3',name(id)),n('p','Première évaluation : quatre critères et rôle de prédilection'));const fields={};for(const [key,title] of [['cardio','Cardio'],['dribble','Dribble'],['collectif','Collectif'],['frappe','Frappe'],['preferred_role','Rôle de prédilection']]){const label=n('label',title),select=n('select');const options=key==='preferred_role'?[['','Choisir'],['defenseur','Défenseur'],['metronome','Métronome'],['ratisseur','Ratisseur'],['finisseur','Finisseur'],['dribbleur','Dribbleur'],['frappeur','Frappeur'],['top_player','Top player']]:[['','Choisir'],...Array.from({length:5},(_,i)=>[String(i+1),String(i+1)+' / 5'])];for(const [value,text] of options){const o=n('option',text);o.value=value;select.append(o)}select.value=initialPrior?.initial_skills?.[key]??'';select.dataset.fastDraft=key+'-'+id;fields[key]=select;label.append(select);box.append(label)}box.append(button('Enregistrer',()=>{if(Object.values(fields).some(s=>s.value==='')){alert('Complète les quatre critères et le rôle.');return}return act('note',{playerId:id,initialSkills:Object.fromEntries(Object.entries(fields).map(([key,s])=>[key,key==='preferred_role'?s.value:Number(s.value)]))})}));panel.append(box);continue}const prior=initialPrior,label=n('label',name(id)),select=n('select');for(const [code,text] of [['','Choisir une note sur 10'],...Array.from({length:21},(_,i)=>[String(i/2),String(i/2)+' / 10'])]){const opt=n('option',text);opt.value=code;select.append(opt)}select.dataset.fastDraft='code-'+id;select.value=prior?.rating??'';label.append(select);const obs={value:prior?.comment||''};panel.append(label,button('Enregistrer',()=>{if(select.value===''){alert('Choisis une note sur 10.');return}return act('note',{playerId:id,rating:Number(select.value),comment:obs.value})}))}
 }
 for(const el of panel.querySelectorAll('[data-fast-draft]'))if(saved.has(el.dataset.fastDraft))el.value=saved.get(el.dataset.fastDraft);
 if(!panel.childNodes.length)panel.remove();
}
})();

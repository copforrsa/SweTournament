(()=>{
'use strict';
const labels={qualification:'Qualifications',conquest_1:'Conquête 1',conquest_2:'Conquête 2',finals:'Finales',finished:'Tournoi terminé'};
const n=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e};
window.SWE_FAST_LIVE=(tour,teams,client,players)=>{
 if(client){window.SWE_FAST_LIVE_REFRESH=()=>privatePanel(tour,client,players).catch(()=>{});window.SWE_FAST_LIVE_REFRESH();}
 let panel=document.getElementById('fastConquestLive');if(tour.format!=='fast_conquest'){panel?.remove();return}
 if(!panel){panel=n('section');panel.id='fastConquestLive';panel.className='fast-conquest';document.getElementById('liveCoorgRating')?.before(panel)}panel.replaceChildren();
 const s=tour.rotation_state?.fast_conquest,name=id=>teams.find(t=>t.id===id)?.name||'Équipe';panel.append(n('h2','⚔️ Fast Conquête'),n('p','Deux matchs de qualification, puis la conquête des trois terrains.'));
 if(!s){panel.append(n('p','Préparation des six équipes.'));return}panel.append(n('h3',labels[s.phase]));for(const m of window.SWE_FAST_ENGINE.progression(s))panel.append(n('p',name(m.team)+' · '+m.message));
 const titles=document.getElementById('liveTournamentTitles');if(titles)titles.textContent=s.champion?'🏆 Champion du tournoi et 👑 Roi du terrain : '+name(s.champion):'Le Champion et le Roi du terrain seront désignés après la finale.';
 if(s.champion)panel.append(n('h2','🏆 Champion et 👑 Roi du terrain : '+name(s.champion)));
 const ranking=document.getElementById('liveRanking'),title=document.getElementById('liveRankingTitle');if(ranking){ranking.replaceChildren();title.textContent=s.finalRanking?'Classement final':'Classement des qualifications';const table=n('table');table.className='live-table';const head=n('tr');for(const label of ['#','Équipe',...(s.finalRanking?[]:['MJ','Diff','Buts','Pts'])])head.append(n('th',label));table.append(head);const rows=window.SWE_FAST_ENGINE.standings(s),ids=s.finalRanking||s.ranking||rows.map(x=>x.id);ids.forEach((id,i)=>{const row=n('tr');row.append(n('td',String(i+1)),n('td',name(id)));if(!s.finalRanking){const r=rows.find(x=>x.id===id);for(const val of [r.played,r.difference,r.for,r.points])row.append(n('td',String(val)))}table.append(row)});ranking.append(table)}
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
  for(const id of c.participants||[]){const prior=c.my_notes.find(x=>x.player_id===id),label=n('label',name(id)),select=n('select');for(const [code,text] of [['','Choisir'],['1','Très en dessous'],['2','En dessous'],['3','Habituel'],['4','Au-dessus'],['5','Très bon'],['6','Exceptionnel']]){const opt=n('option',text);opt.value=code;select.append(opt)}select.dataset.fastDraft='code-'+id;select.value=prior?.appreciation_code||'';label.append(select);const obs=n('textarea');obs.maxLength=1000;obs.dataset.fastDraft='comment-'+id;obs.value=prior?.comment||'';obs.setAttribute('aria-label','Observation confidentielle pour '+name(id));panel.append(label,obs,button('Enregistrer',()=>act('note',{playerId:id,code:Number(select.value),comment:obs.value})))}
 }
 for(const el of panel.querySelectorAll('[data-fast-draft]'))if(saved.has(el.dataset.fastDraft))el.value=saved.get(el.dataset.fastDraft);
 if(!panel.childNodes.length)panel.remove();
}
})();

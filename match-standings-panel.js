/* Consult standings without rebuilding the match editor. */
(()=>{
 'use strict';
 const E=id=>document.getElementById(id);
 let dialog,content,signature='',timer;
 const same=(a,b)=>String(a)===String(b);
 const state=()=>{try{return typeof S!=='undefined'?S:window.S}catch(_){return window.S||{}}};
 const label=(value,fallback)=>String(value||fallback||'Joueur').trim()||fallback||'Joueur';
 function tournamentMatches(t){return (state().matches||[]).filter(m=>same(m.tournament_id,t?.id))}
 function playerRankings(t){
  const s=state(),matchIds=new Set(tournamentMatches(t).map(m=>String(m.id))),players=new Map((s.players||[]).map(p=>[String(p.id),p]));
  const tally=field=>{
   const totals=new Map();
   for(const goal of s.goals||[]){
    if(!matchIds.has(String(goal.match_id))||goal.is_own_goal)continue;
    const id=goal[field];if(!id)continue;
    const key=String(id),player=players.get(key),entry=totals.get(key)||{id:key,name:label(player?.name||player?.display_name,'Joueur'),total:0};
    entry.total++;totals.set(key,entry);
   }
   return [...totals.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'fr'));
  };
  return {scorers:tally('scorer_player_id'),assisters:tally('assister_player_id')};
 }
 function liveUrl(t){
  const code=String(t?.short_code||'').trim().toUpperCase();
  if(code)return 'https://app.swetournament.fr/live.html?s='+encodeURIComponent(code);
  const token=state().workspace?.public_token;
  return token&&t?.id?'https://app.swetournament.fr/live.html?'+new URLSearchParams({public:token,tournament:t.id}).toString():'';
 }
 function appendRanking(title,icon,entries,singular,plural){
  const section=document.createElement('section');section.className='swe-standings-ranking';
  const heading=document.createElement('h4');heading.textContent=icon+' '+title;section.append(heading);
  if(!entries.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='Aucune statistique enregistrée pour le moment.';section.append(empty);return section}
  const list=document.createElement('ol');
  entries.forEach((entry,index)=>{const item=document.createElement('li'),name=document.createElement('span'),score=document.createElement('b');name.textContent=(index+1)+'. '+entry.name;score.textContent=entry.total+' '+(entry.total>1?plural:singular);item.append(name,score);list.append(item)});
  section.append(list);return section;
 }
 function standings(t){
  if(t.format==='fast_conquest'&&t.rotation_state?.fast_conquest&&window.SWE_FAST_ENGINE){const s=t.rotation_state.fast_conquest,rows=window.SWE_FAST_ENGINE.standings(s),order=s.finalRanking||s.ranking||rows.map(r=>r.id);return order.map(id=>{const r=rows.find(x=>x.id===id);return {...r,name:(S.teams||[]).find(x=>x.id===id)?.name||'Équipe',mj:r.played,pts:r.points,bp:r.for,bc:r.against}})}
  const rows=(S.teams||[]).filter(x=>String(x.tournament_id)===String(t.id)).map(x=>({id:String(x.id),name:x.name,mj:0,pts:0,bp:0,bc:0})),map=new Map(rows.map(x=>[x.id,x]));
  for(const m of S.matches||[]){
   if(String(m.tournament_id)!==String(t.id)||m.status!=='finished'||m.rotation_role==='conquest'||m.competition_type==='conquest_playoff')continue;
   const h=map.get(String(m.home_team_id)),a=map.get(String(m.away_team_id));if(!h||!a)continue;
   const hs=Number(m.home_score||0),as=Number(m.away_score||0);h.mj++;a.mj++;h.bp+=hs;h.bc+=as;a.bp+=as;a.bc+=hs;
   const kingFormat=t.format==='king_of_pitch'||t.rotation_mode==='king_of_pitch';
   // Application aux nouveaux tournois uniquement : l'historique conserve son barème.
   const newRules=kingFormat&&String(t.tournament_date||t.date||'')>='2026-10-24';
   const onKingPitch=m.rotation_role==='king'||(t.king_pitch_id&&String(m.pitch_id)===String(t.king_pitch_id))||String(m.pitch||'').trim().toLocaleLowerCase('fr').includes('carrefour');
   const winPoints=newRules&&onKingPitch?4:3;
   if(hs>as)h.pts+=winPoints;else if(as>hs)a.pts+=winPoints;else{h.pts++;a.pts++}
  }
  return rows.sort((a,b)=>b.pts-a.pts||(b.bp-b.bc)-(a.bp-a.bc)||b.bp-a.bp||String(a.name).localeCompare(String(b.name)));
 }
 function update(){
  if(!dialog?.open)return;
  const t=typeof currentTour==='function'?currentTour():null,rows=t?standings(t):[],tMatches=t?tournamentMatches(t):[],stats=t?playerRankings(t):{scorers:[],assisters:[]},next=JSON.stringify([t?.id,t?.name,rows,tMatches,state().goals||[]]);if(next===signature)return;signature=next;content.replaceChildren();
  const title=document.createElement('h3');title.textContent=t?.name||'Choisis un tournoi';content.append(title);
  const note=document.createElement('p');note.className='muted';note.textContent=(t?.format==='king_of_pitch'||t?.rotation_mode==='king_of_pitch')&&String(t.tournament_date||t.date||'')>='2026-10-24'?'👑 Victoire sur Carrefour (terre du Roi) : 4 pts · autres terrains : 3 pts · nul : 1 pt.':t?.format==='fast_conquest'&&t.rotation_state?.fast_conquest?.finalRanking?'Classement final du Fast Conquête. Les statistiques affichées concernent les deux qualifications.':'Matchs terminés uniquement · 3 points par victoire, 1 par nul. Les barrages, demi-finales et finale ne modifient pas le classement.';content.append(note);
  if(!rows.length){const empty=document.createElement('p');empty.textContent='Aucune équipe disponible.';content.append(empty)}else{
   const table=document.createElement('table');table.innerHTML='<thead><tr><th>Rang</th><th>Équipe</th><th>MJ</th><th>Diff.</th><th>Pts</th></tr></thead>';const body=document.createElement('tbody');
   rows.forEach((r,i)=>{const tr=document.createElement('tr');for(const value of [i+1,r.name,r.mj,(r.bp-r.bc>0?'+':'')+(r.bp-r.bc),r.pts]){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}body.append(tr)});table.append(body);content.append(table);
  }
  const live=liveUrl(t);if(live){const link=document.createElement('a');link.className='swe-standings-live';link.href=live;link.target='_blank';link.rel='noopener noreferrer';link.textContent='🔴 Suivre le Live du tournoi ↗';content.append(link)}
  const rankings=document.createElement('div');rankings.className='swe-standings-rankings';rankings.append(appendRanking('Buteurs du tournoi','⚽',stats.scorers,'but','buts'),appendRanking('Passeurs du tournoi','🎯',stats.assisters,'passe décisive','passes décisives'));content.append(rankings);
 }
 function mount(){
  const select=E('matchCompetitionSelect');if(!select)return;
  if(!dialog){
   const style=document.createElement('style');style.textContent='#sweStandingsDialog{box-sizing:border-box;position:fixed;inset:0 0 0 auto;margin:0;width:min(480px,100vw);height:100dvh;max-height:100dvh;max-width:100vw;border:0;border-radius:16px 0 0 16px;padding:22px;background:#fff;color:#17324d;overflow:auto;box-shadow:-8px 0 35px #0003}#sweStandingsDialog::backdrop{background:#071d3166}#sweStandingsDialog header{display:flex;align-items:center;justify-content:space-between;gap:12px}#sweStandingsDialog h2{font-size:21px;margin:0}#sweStandingsDialog h3{margin:20px 0 8px;font-size:18px}#sweStandingsDialog h4{margin:0 0 8px;font-size:16px;color:#092d53}#sweStandingsDialog table{width:100%;border-collapse:collapse;font-size:14px}#sweStandingsDialog th,#sweStandingsDialog td{padding:12px 5px;border-bottom:1px solid #dfe7ef;text-align:center}#sweStandingsDialog th:nth-child(2),#sweStandingsDialog td:nth-child(2){text-align:left}#sweStandingsDialog td:last-child{font-weight:900}#sweStandingsDialog .muted{font-size:13px;line-height:1.5}.swe-standings-live{display:flex;align-items:center;justify-content:center;margin:16px 0;padding:12px 14px;border-radius:12px;background:linear-gradient(115deg,#063970,#00b9d3);color:#fff!important;font-weight:900;text-decoration:none;box-shadow:0 8px 18px #00a9c426}.swe-standings-rankings{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.swe-standings-ranking{border:1px solid #d6e6f1;border-radius:14px;padding:12px;background:linear-gradient(145deg,#f5fbff,#fff)}.swe-standings-ranking ol{list-style:none;margin:0;padding:0}.swe-standings-ranking li{display:flex;justify-content:space-between;gap:7px;padding:7px 0;border-top:1px solid #e3edf4;font-size:13px}.swe-standings-ranking li b{color:#087f9d;white-space:nowrap}.swe-standings-ranking .muted{margin:0}#sweMatchStandingsButton{margin:8px 0;min-height:44px}#sweStandingsDialog button{min-height:44px}@media(max-width:650px){#sweStandingsDialog{inset:auto 0 0;margin:0;width:100%;height:auto;max-height:82dvh;border-radius:18px 18px 0 0;padding:18px}.swe-standings-rankings{grid-template-columns:1fr}}';document.head.append(style);
   dialog=document.createElement('dialog');dialog.id='sweStandingsDialog';dialog.setAttribute('aria-labelledby','sweStandingsTitle');dialog.innerHTML='<header><h2 id="sweStandingsTitle">📊 Classement</h2><button type="button" aria-label="Fermer le classement">✕ Fermer</button></header>';dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}};content=document.createElement('div');dialog.append(content);document.body.append(dialog);
  }
  if(!E('sweMatchStandingsButton')){const button=document.createElement('button');button.id='sweMatchStandingsButton';button.type='button';button.textContent='📊 Classement';button.onclick=()=>{signature='';dialog.showModal();update()};select.insertAdjacentElement('afterend',button)}
  update();
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(mount,80)}
 document.addEventListener('swe:rendered',schedule);document.addEventListener('swe:match-remote-final',schedule);document.addEventListener('DOMContentLoaded',mount);
 const observe=()=>{const box=E('matchesList');if(box)new MutationObserver(schedule).observe(box,{subtree:true,childList:true})};observe();mount();
 window.SWE_MATCH_STANDINGS={standings,update};
})();

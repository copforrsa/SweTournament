/* SWÉ consolidated runtime R550 — segment 3/3. Original files retained for rollback. */

;
/* SOURCE match-standings-panel.js */
/* Consult standings without rebuilding the match editor. */
(()=>{
 'use strict';
 const E=id=>document.getElementById(id);
 let dialog,content,signature='',timer;
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
  const t=typeof currentTour==='function'?currentTour():null,rows=t?standings(t):[],next=JSON.stringify([t?.id,t?.name,rows]);if(next===signature)return;signature=next;content.replaceChildren();
  const title=document.createElement('h3');title.textContent=t?.name||'Choisis un tournoi';content.append(title);
  const note=document.createElement('p');note.className='muted';note.textContent=(t?.format==='king_of_pitch'||t?.rotation_mode==='king_of_pitch')&&String(t.tournament_date||t.date||'')>='2026-10-24'?'👑 Victoire sur Carrefour (terre du Roi) : 4 pts · autres terrains : 3 pts · nul : 1 pt.':t?.format==='fast_conquest'&&t.rotation_state?.fast_conquest?.finalRanking?'Classement final du Fast Conquête. Les statistiques affichées concernent les deux qualifications.':'Matchs terminés uniquement · 3 points par victoire, 1 par nul. Les barrages, demi-finales et finale ne modifient pas le classement.';content.append(note);
  if(!rows.length){const empty=document.createElement('p');empty.textContent='Aucune équipe disponible.';content.append(empty);return}
  const table=document.createElement('table');table.innerHTML='<thead><tr><th>Rang</th><th>Équipe</th><th>MJ</th><th>Diff.</th><th>Pts</th></tr></thead>';const body=document.createElement('tbody');
  rows.forEach((r,i)=>{const tr=document.createElement('tr');for(const value of [i+1,r.name,r.mj,(r.bp-r.bc>0?'+':'')+(r.bp-r.bc),r.pts]){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}body.append(tr)});table.append(body);content.append(table);
 }
 function mount(){
  const select=E('matchCompetitionSelect');if(!select)return;
  if(!dialog){
   const style=document.createElement('style');style.textContent='#sweStandingsDialog{box-sizing:border-box;position:fixed;inset:0 0 0 auto;margin:0;width:min(480px,100vw);height:100dvh;max-height:100dvh;max-width:100vw;border:0;border-radius:16px 0 0 16px;padding:22px;background:#fff;color:#17324d;overflow:auto;box-shadow:-8px 0 35px #0003}#sweStandingsDialog::backdrop{background:#071d3166}#sweStandingsDialog header{display:flex;align-items:center;justify-content:space-between;gap:12px}#sweStandingsDialog h2{font-size:21px;margin:0}#sweStandingsDialog table{width:100%;border-collapse:collapse;font-size:14px}#sweStandingsDialog th,#sweStandingsDialog td{padding:12px 5px;border-bottom:1px solid #dfe7ef;text-align:center}#sweStandingsDialog th:nth-child(2),#sweStandingsDialog td:nth-child(2){text-align:left}#sweStandingsDialog td:last-child{font-weight:900}#sweStandingsDialog .muted{font-size:13px;line-height:1.5}#sweMatchStandingsButton{margin:8px 0;min-height:44px}#sweStandingsDialog button{min-height:44px}@media(max-width:650px){#sweStandingsDialog{inset:auto 0 0;margin:0;width:100%;height:auto;max-height:82dvh;border-radius:18px 18px 0 0;padding:18px}}';document.head.append(style);
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

;

;
/* SOURCE fast-conquest/browser-engine.js */
(()=>{
'use strict';
// Pure domain engine. Persistence and authorization belong to the server adapter.
const PITCHES=['Carrefour','Mercedes','Boulogne'];
const ROLES=['Terres du Roi','Terrain des Conquérants','Terres des Bannis'];
const PHASES=['qualification','conquest_1','conquest_2','finals','finished'];
const fail=message=>{throw new Error(message)};
function balancedPairs(teamIds,ratings){
 const values=teamIds.map(id=>ratings[id]);
 if(values.some(v=>typeof v!=='number'||!Number.isFinite(v)))fail('Le niveau de chaque équipe est requis');
 const matchings=remaining=>{
  if(!remaining.length)return [[]];
  const [a,...rest]=remaining,out=[];
  rest.forEach((b,i)=>{for(const tail of matchings(rest.filter((_,j)=>j!==i)))out.push([[a,b],...tail])});
  return out;
 };
 const all=matchings([0,1,2,3,4,5]);let best=null,bestMax=Infinity,bestCost=Infinity;
 for(const first of all)for(const second of all){
  if(second.some(([a,b])=>first.some(([x,y])=>a===x&&b===y)))continue;
  const gaps=[...first,...second].map(([a,b])=>Math.abs(values[a]-values[b]));
  const max=Math.max(...gaps),cost=gaps.reduce((sum,v)=>sum+v*v,0);
  if(max<bestMax-1e-9||Math.abs(max-bestMax)<1e-9&&cost<bestCost-1e-9){best=[first,second];bestMax=max;bestCost=cost}
 }
 const prior=new Map();best[0].forEach(([a,b],p)=>{prior.set(a,p);prior.set(b,p)});
 const second=Array(3);for(const [a,b] of best[1]){const p=[0,1,2].find(p=>p!==prior.get(a)&&p!==prior.get(b));second[p]=[a,b]}
 return [best[0],second];
}
function rebuildQualification(s){
 const rebuilt=create(s.teams);rebuilt.matches=[];
 for(const m of s.matches.filter(m=>m.phase==='qualification'))add(rebuilt,m.id,m.home,m.away,PITCHES.indexOf(m.pitch),'qualification',m.label);
 if(s.qualificationMethod)rebuilt.qualificationMethod=s.qualificationMethod;
 return rebuilt;
}
function create(teamIds,teamRatings){
 if(!Array.isArray(teamIds)||teamIds.length!==6||new Set(teamIds).size!==6||teamIds.some(x=>!x))fail('Exactement six équipes distinctes sont requises');
 const state={format:'fast_conquest',version:1,phase:'qualification',teams:[...teamIds],matches:[],ranking:null,finalRanking:null,draw:null};
 const pairs=teamRatings?balancedPairs(teamIds,teamRatings):[[[0,1],[2,3],[4,5]],[[3,5],[0,4],[1,2]]];
 if(teamRatings)state.qualificationMethod='balanced_levels';
 pairs.forEach((round,r)=>round.forEach(([h,a],p)=>add(state,`q${r+1}_${p+1}`,teamIds[h],teamIds[a],p,'qualification',`Qualification ${r+1}`)));
 return state;
}
function add(s,id,home,away,pitch,phase,label){
 if(s.matches.some(x=>x.id===id))return;
 if(!home||!away||home===away)fail('Rencontre invalide');
 s.matches.push({id,home,away,pitch:PITCHES[pitch],pitchRole:ROLES[pitch],phase,label,order:s.matches.length+1,status:'scheduled',homeScore:0,awayScore:0,winner:null,loser:null,penalties:null,events:[]});
}
function standings(s){
 const rows=s.teams.map(id=>({id,played:0,wins:0,draws:0,losses:0,points:0,for:0,against:0,difference:0})),map=new Map(rows.map(r=>[r.id,r]));
 s.matches.filter(m=>m.phase==='qualification'&&m.status==='finished').forEach(m=>{const h=map.get(m.home),a=map.get(m.away);h.played++;a.played++;h.for+=m.homeScore;h.against+=m.awayScore;a.for+=m.awayScore;a.against+=m.homeScore;if(m.homeScore>m.awayScore){h.points+=3;h.wins++;a.losses++}else if(m.awayScore>m.homeScore){a.points+=3;a.wins++;h.losses++}else{h.points++;a.points++;h.draws++;a.draws++}});
 rows.forEach(r=>r.difference=r.for-r.against);
 return rows.sort(compare);
}
function compare(a,b){return b.points-a.points||b.difference-a.difference||b.for-a.for}
function tiedGroups(rows){
 const groups=[];for(const r of rows){const last=groups.at(-1);if(last&&compare(last[0],r)===0)last.push(r);else groups.push([r])}return groups.filter(g=>g.length>1).map(g=>g.map(r=>r.id));
}
function qualificationDone(s){return s.matches.filter(m=>m.phase==='qualification').every(m=>m.status==='finished')}
function proposeDraw(s,random){
 if(s.phase!=='qualification'||s.ranking)fail('Départage déjà validé');
 if(!qualificationDone(s))fail('Les six qualifications doivent être terminées');
 if(typeof random!=='function')fail('Source aléatoire serveur requise');
 const rows=standings(s),groups=tiedGroups(rows),ranking=rows.map(r=>r.id);
 for(const group of groups){const shuffled=[...group];for(let i=shuffled.length-1;i>0;i--){const value=random();if(value<0||value>=1||!Number.isFinite(value))fail('Source aléatoire invalide');const j=Math.floor(value*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}const indexes=group.map(id=>ranking.indexOf(id));indexes.forEach((p,i)=>ranking[p]=shuffled[i])}
 s.draw={ranking,groups,validated:false};return structuredClone(s.draw);
}
function validateDraw(s,operator){
 if(s.phase!=='qualification'||s.ranking)fail('Départage déjà validé');
 if(!operator)fail('Validation organisateur requise');
 if(!s.draw||!qualificationDone(s))fail('Tirage à effectuer avant validation');
 s.draw.validated=true;s.draw.validatedBy=operator;s.ranking=[...s.draw.ranking];advance(s);return s;
}
function penaltyWinner(m,penalties){
 if(penalties?.winnerTeamId!==undefined){
  if(![m.home,m.away].includes(penalties.winnerTeamId)||penalties.home!==undefined||penalties.away!==undefined)fail('Choisis une des deux équipes gagnantes aux tirs au but');
  return penalties.winnerTeamId;
 }
 if(!penalties||!Array.isArray(penalties.home)||!Array.isArray(penalties.away))fail('Séance de tirs au but requise');
 const h=penalties.home,a=penalties.away;
 if(h.length!==a.length||h.length<3||[...h,...a].some(x=>typeof x!=='boolean'))fail('Trois tireurs par équipe puis mort subite par paires');
 let hs=h.slice(0,3).filter(Boolean).length,as=a.slice(0,3).filter(Boolean).length;
 if(hs!==as){if(h.length!==3)fail('La séance devait finir après trois tireurs');return hs>as?m.home:m.away}
 for(let i=3;i<h.length;i++){if(h[i]!==a[i]){if(i!==h.length-1)fail('Tirs enregistrés après la décision');return h[i]?m.home:m.away}}
 fail('Égalité persistante : poursuivre la mort subite');
}
function finish(s,id,result){
 const m=s.matches.find(x=>x.id===id);if(!m)fail('Match introuvable');
 if(m.status==='finished')fail('Match déjà terminé');
 if(s.phase!==m.phase)fail('Phase précédente non terminée');
 const {homeScore,awayScore}=result||{};
 if(!Number.isInteger(homeScore)||!Number.isInteger(awayScore)||homeScore<0||awayScore<0)fail('Scores entiers positifs ou nuls requis');
 const winner=homeScore===awayScore?(m.phase==='qualification'?null:penaltyWinner(m,result.penalties)):(homeScore>awayScore?m.home:m.away);
 if(homeScore!==awayScore&&result.penalties)fail('Les tirs au but sont réservés aux matchs nuls');
 if(m.phase==='qualification'&&result.penalties)fail('Aucun tir au but en qualification');
 Object.assign(m,{homeScore,awayScore,winner,loser:winner?(winner===m.home?m.away:m.home):null,penalties:result.penalties?structuredClone(result.penalties):null,status:'finished'});
 advance(s);return s;
}
function advance(s){
 const current=s.matches.filter(m=>m.phase===s.phase);
 if(!current.length||current.some(m=>m.status!=='finished'))return;
 const get=id=>s.matches.find(m=>m.id===id);
 if(s.phase==='qualification'){
  if(!s.ranking){const rows=standings(s);if(tiedGroups(rows).length)return;s.ranking=rows.map(r=>r.id)}
  s.phase='conquest_1';for(let p=0;p<3;p++)add(s,`c1_${p+1}`,s.ranking[p*2],s.ranking[p*2+1],p,'conquest_1','Conquête 1');
 }else if(s.phase==='conquest_1'){
  s.phase='conquest_2';const c=get('c1_1'),m=get('c1_2'),b=get('c1_3');
  add(s,'semi_1',c.winner,m.winner,0,'conquest_2','Demi-finale 1');add(s,'semi_2',c.loser,b.winner,1,'conquest_2','Demi-finale 2');add(s,'place_5',m.loser,b.loser,2,'conquest_2','Classement 5e / 6e');
 }else if(s.phase==='conquest_2'){
  s.phase='finals';const a=get('semi_1'),b=get('semi_2');add(s,'final',a.winner,b.winner,0,'finals','Finale');add(s,'bronze',a.loser,b.loser,1,'finals','Petite finale — 3e place');
 }else if(s.phase==='finals'){
  const f=get('final'),b=get('bronze'),p=get('place_5');s.finalRanking=[f.winner,f.loser,b.winner,b.loser,p.winner,p.loser];s.champion=f.winner;s.king=f.winner;s.phase='finished';
 }
}
function progression(s){
 return s.matches.filter(m=>m.phase===s.phase&&m.status!=='finished').flatMap(m=>[m.home,m.away].map(team=>{
  const previous=s.matches.filter(x=>x.status==='finished'&&x.order<m.order&&[x.home,x.away].includes(team)).at(-1);
  const from=previous?PITCHES.indexOf(previous.pitch):null,to=PITCHES.indexOf(m.pitch);
  const movement=from===null?'Joue à '+m.pitch:from===to?'Reste à '+m.pitch:to<from?'Monte à '+m.pitch:'Descend à '+m.pitch;
  return {team,pitch:m.pitch,role:m.pitchRole,message:movement+(m.id==='place_5'?' · Joue la 5e place':m.id.startsWith('semi_')?' · Qualifié en demi-finale':'')};
 }));
}
function correct(s,id,result){
 const old=s.matches.find(m=>m.id===id);if(!old||old.status!=='finished')fail('Match terminé requis');
 const phase=old.phase,rebuilt=rebuildQualification(s);
 // Replay preceding phases, preserving a previously validated random tie draw.
 for(const p of PHASES.slice(0,PHASES.indexOf(phase)+1)){
  for(const m of s.matches.filter(m=>m.phase===p&&m.status==='finished'))finish(rebuilt,m.id,m.id===id?result:m);
  if(p==='qualification'&&phase!=='qualification'&&rebuilt.phase==='qualification'){
   const groups=tiedGroups(standings(rebuilt));rebuilt.draw={ranking:s.ranking,groups,validated:false};validateDraw(rebuilt,s.draw?.validatedBy||'server');
  }
 }
 return rebuilt;
}
function remove(s,id){
 const target=s.matches.find(m=>m.id===id);if(!target)fail('Match introuvable');
 const rebuilt=rebuildQualification(s);
 for(const p of PHASES.slice(0,PHASES.indexOf(target.phase)+1)){
  for(const m of s.matches.filter(m=>m.phase===p&&m.status==='finished'&&m.id!==id)){
   finish(rebuilt,m.id,m);
  }
  if(p==='qualification'&&target.phase!=='qualification'&&rebuilt.phase==='qualification'){
   rebuilt.draw={ranking:s.ranking,groups:tiedGroups(standings(rebuilt)),validated:false};validateDraw(rebuilt,s.draw?.validatedBy||'server');
  }
 }
 rebuilt.matches.find(m=>m.id===id).deleted=true;return rebuilt;
}
window.SWE_FAST_ENGINE={create,finish,correct,remove,standings,tiedGroups,proposeDraw,validateDraw,progression,PHASES,PITCHES,ROLES};
})();

;

;
/* SOURCE fast-conquest/ui.js */
/* Fast Conquête organizer integration. No private vote or rating enters public state. */
(()=>{
'use strict';
const phases={qualification:'Qualifications',conquest_1:'Conquête 1',conquest_2:'Conquête 2',finals:'Finales',finished:'Tournoi terminé'};
let cached=null,loading=false,pending=false,timer,deepNoteLinkHandled=false;const drafts=new Map();
const t=()=>{try{return currentTour()}catch(_){return null}};
const n=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x};
const team=id=>(S.teams||[]).find(x=>x.id===id)?.name||'Équipe';
const player=id=>(S.players||[]).find(x=>x.id===id)?.name||'Joueur';
const button=(label,fn,disabled=false)=>{const b=n('button',label);b.type='button';b.disabled=disabled||pending;b.onclick=fn;return b};
async function refresh(force=false){
 inbox().catch(()=>{});
 openDeepNoteLink().catch(()=>{});
 const tour=t();if(tour?.format!=='fast_conquest'){document.getElementById('fastConquestPanel')?.remove();cached=null;return}
 if(loading)return;if(!force&&cached?.id===tour.id&&Date.now()-cached.at<5000){mount();return}
 loading=true;try{const r=await sb.rpc('fast_conquest_context',{p_tournament_id:tour.id});if(r.error)throw r.error;if(t()?.id===tour.id){if(r.data.tournament)Object.assign(tour,r.data.tournament);const matchKey=data=>JSON.stringify((data?.matches||[]).map(m=>[m.id,m.status,m.pitch,m.scoring_digest]));if((r.data.matches?.length||(S.matches||[]).length)&&matchKey(r.data)!==matchKey(cached?.data))await loadTournament();cached={id:tour.id,at:Date.now(),data:r.data};mount();if(typeof renderMatches==='function'&&(S.matches||[]).length)renderMatches(false)}}catch(e){cached=null;window.SWE_FAST_CONQUEST_CONTEXT=null;document.getElementById('fastConquestPanel')?.remove();if(typeof renderMatches==='function'&&(S.matches||[]).length)renderMatches(false);if(force)toast(e.message||'Accès Fast Conquête refusé')}finally{loading=false}
}
async function openDeepNoteLink(){
 const id=new URLSearchParams(location.search).get('fast_notes');if(!id||deepNoteLinkHandled||!S.session?.user)return;deepNoteLinkHandled=true;
 try{await openNotes(id);const url=new URL(location.href);url.searchParams.delete('fast_notes');history.replaceState(null,'',url)}catch(_){deepNoteLinkHandled=false}
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
 let dialog=document.getElementById('fastNotesDialog');dialog?.remove();dialog=n('dialog');dialog.id='fastNotesDialog';dialog.className='swe-notes-salon';dialog.style.cssText='position:fixed;margin:auto;width:min(1000px,94vw);max-height:90vh;overflow:auto;z-index:100000;padding:22px;background:#f7fbff;color:#102342;border:1px solid #bcd3ed;border-radius:20px;box-shadow:0 25px 70px rgba(2,18,35,.36)';dialog.setAttribute('aria-label','Salon de notation confidentiel');document.body.append(dialog);
 const style=n('style');style.textContent='#fastNotesDialog [data-note-player]>label,#fastNotesDialog [data-note-player]>h4{font-size:1.2rem;font-weight:800;color:#124da0}#fastNotesDialog [data-note-player]>label select{font-size:1rem;font-weight:400}#fastNotesDialog [data-note-player]>.swe-note-current{font-size:1.1rem;font-weight:800;color:#075c48;background:#dff5ec;border:1px solid #82c7ad;border-radius:10px;padding:10px 12px;line-height:1.4}#fastNotesDialog::backdrop{background:rgba(5,20,35,.66)}#fastNotesDialog h2{color:#173b67}#fastNotesDialog [data-note-team]{background:#fff;border:1px solid #c9dceb;border-radius:16px;padding:14px;margin:14px 0}#fastNotesDialog [data-note-player]{background:#eef5fb;border:1px solid #d7e3ef;border-radius:11px;padding:12px;margin:9px 0;display:grid;grid-template-columns:minmax(140px,1fr) minmax(0,2fr) 140px;align-items:end;gap:12px}#fastNotesDialog [data-note-player] label{display:grid;gap:6px;min-width:0;margin:0}#fastNotesDialog [data-note-player] select{width:100%;box-sizing:border-box;min-height:44px}#fastNotesDialog [data-note-player] button{width:100%;min-height:44px}#fastNotesDialog [data-note-player]>p{margin:0}#fastNotesDialog [data-note-player]>[role=status]{grid-column:1/-1}#fastNotesDialog [data-note-player]>[role=status]:empty{display:none}#fastNotesDialog .swe-note-initial{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}#fastNotesDialog .swe-note-initial h4,#fastNotesDialog .swe-note-initial>p,#fastNotesDialog .swe-note-initial .swe-note-role{grid-column:1/-1;margin:0}#fastNotesDialog .swe-note-initial button{grid-column:2;justify-self:end}@media(max-width:600px){#fastNotesDialog [data-note-player]:not(.swe-note-initial){grid-template-columns:minmax(0,1fr) 120px}#fastNotesDialog [data-note-player]:not(.swe-note-initial)>p:first-child{grid-column:1/-1}#fastNotesDialog .swe-note-initial{gap:10px}}#fastNotesDialog [hidden]{display:none!important}#fastNotesDialog button{background:#1762bf;color:#fff;border:1px solid #1762bf;border-radius:10px;min-height:40px;padding:8px 14px}#fastNotesDialog select,#fastNotesDialog input{background:#fff;color:#102342;border:1px solid #bcd3ed;border-radius:10px;padding:9px}';dialog.append(style);const close=button('Fermer',()=>dialog.close());dialog.append(close,n('h2','Votes / Notes de fin de tournoi'),n('p','Chargement du salon…'));dialog.showModal();dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 try{
  const {data:c,error}=await sb.rpc('fast_conquest_context',{p_tournament_id:tournamentId});if(error)throw error;if(!c.can_note)throw Error('Seuls l’organisateur et les co-gestionnaires désignés présents peuvent noter.');if(!c.notes_open)throw Error(c.notes_closed?'Les votes sont clôturés.':'Le salon sera ouvert à la fin du tournoi.');
  const completionResult=await sb.rpc('fast_conquest_note_completion_status',{p_tournament_id:tournamentId});if(completionResult.error)throw completionResult.error;let completion=completionResult.data||{complete:false,rated:0,expected:0};let accessSummary=[];if(c.admin){const progress=await sb.rpc('fast_conquest_note_access_summary',{p_tournament_id:tournamentId});if(progress.error)throw progress.error;accessSummary=progress.data||[]}
  if(!dialog.isConnected)return;dialog.replaceChildren(style,close,n('h2','Votes / Notes de fin de tournoi'),n('p','Confidentiel · notes sur 10 modifiables jusqu’à la clôture.'));
  if(c.admin){const voted=accessSummary.filter(x=>x.has_voted).length,done=accessSummary.filter(x=>x.completed).length,progress=n('section');progress.style.cssText='margin:0 0 18px;padding:14px;border:1px solid #89b5e5;border-radius:14px;background:#eaf4ff';progress.append(n('h3','Suivi des accès et évaluations'),n('p',accessSummary.length+' personne'+(accessSummary.length>1?'s':'')+' autorisée'+(accessSummary.length>1?'s':'')+' · '+voted+' a/ont voté · '+done+' a/ont terminé.'));for(const row of accessSummary){const line=n('p');line.style.cssText='margin:7px 0;padding:9px 10px;border-radius:9px;background:'+(row.completed?'#dff5ec':row.has_voted?'#fff3d5':'#fff')+';font-weight:700';line.textContent=(row.completed?'✓ ':row.has_voted?'◔ ':'○ ')+row.name+' · accès autorisé · '+Number(row.rated||0)+' joueur'+(Number(row.rated||0)>1?'s':'')+' évalué'+(Number(row.rated||0)>1?'s':'')+' / '+Number(row.expected||0)+(row.completed?' · terminé':row.has_voted?' · en cours':' · pas encore voté');progress.append(line)}dialog.append(progress)}
  const known=new Map((S.players||[]).map(p=>[p.id,p.name]));for(const p of c.participant_details||[])known.set(p.id,p.name);
  const selfIds=new Set((c.note_peers?.self||[]).map(String));
  const roster=[...(c.participants||[])].filter(id=>!selfIds.has(String(id))).sort((a,b)=>(known.get(a)||'').localeCompare(known.get(b)||'','fr'));
  const counter=n('p',roster.length+' joueurs du tournoi · '+(c.my_notes||[]).filter(n=>n.rating!=null||n.initial_skills).length+' notés');dialog.append(counter);
  const search=n('input');search.type='search';search.placeholder='Rechercher un joueur';search.setAttribute('aria-label','Rechercher un joueur du tournoi');dialog.append(search);if(c.admin)dialog.append(button('Clôturer les notes',async()=>{if(!confirm('Clôturer les notes et appliquer les moyennes une seule fois ?'))return;const r=await sb.rpc('fast_conquest_manage',{p_tournament_id:tournamentId,p_action:'close_notes',p_payload:{}});if(r.error){toast(r.error.message);return}dialog.close();await refresh(true);toast('Notes clôturées et moyennes appliquées ✓')}));const filter=picker('Afficher les joueurs',[['all','Tous'],['with','A joué avec moi'],['against','A joué contre moi']],'all');dialog.append(filter.l);
  if(!c.note_peers?.linked){filter.s.querySelectorAll('option').forEach(o=>{if(o.value!=='all')o.disabled=true});dialog.append(n('p','Associe ton profil joueur pour utiliser les filtres avec moi / contre moi.'))}
  const groups=new Map(),assigned=new Set();
  for(const team of c.note_teams||[]){const section=n('section');section.dataset.noteTeam=team.id;section.style.cssText='margin-top:18px;padding:12px;border:1px solid #b7816b;border-radius:12px';section.append(n('h3',team.name));groups.set(team.id,section);for(const id of team.players||[])if(!assigned.has(id))assigned.add(id);dialog.append(section)}
  const others=n('section');others.dataset.noteTeam='other';others.append(n('h3','Remplaçants / autres participants'));dialog.append(others);
  const applyFilter=()=>{const allowed=filter.s.value==='all'?null:new Set(c.note_peers?.[filter.s.value]||[]);let visible=0;for(const card of dialog.querySelectorAll('[data-note-player]')){card.hidden=!card.dataset.notePlayer.includes(search.value.trim().toLocaleLowerCase('fr'))||!!(allowed&&!allowed.has(card.dataset.noteId));if(!card.hidden)visible++}for(const section of dialog.querySelectorAll('[data-note-team]'))section.hidden=![...section.querySelectorAll('[data-note-player]')].some(card=>!card.hidden);counter.textContent=visible+' / '+roster.length+' joueurs affichés · '+(c.my_notes||[]).filter(n=>n.rating!=null||n.initial_skills).length+' notés'};
  search.oninput=applyFilter;filter.s.onchange=applyFilter;
  if((c.participants||[]).some(id=>!known.has(id))){const r=await sb.from('players').select('id,name').in('id',c.participants);if(r.error)throw r.error;for(const p of r.data||[])known.set(p.id,p.name)}
  for(const id of roster){
   const prior=(c.my_notes||[]).find(x=>x.player_id===id),name=known.get(id)||'Joueur',detail=(c.participant_details||[]).find(p=>p.id===id),initial=!!prior?.initial_skills||!!detail?.requires_initial,pick=initial?null:picker(name,noteOptions(),prior?.rating??'');const fields={};if(initial){for(const [key,label] of [['cardio','Cardio'],['dribble','Dribble'],['collectif','Collectif'],['frappe','Frappe']])fields[key]=picker(label,[['','Choisir'],...Array.from({length:5},(_,i)=>[String(i+1),String(i+1)+' / 5'])],prior?.initial_skills?.[key]??'');fields.preferred_role=picker('Rôle de prédilection',[['','Choisir le rôle'],['defenseur','Défenseur'],['metronome','Métronome'],['ratisseur','Ratisseur'],['finisseur','Finisseur'],['dribbleur','Dribbleur'],['frappeur','Frappeur'],['top_player','Top player']],prior?.initial_skills?.preferred_role??'');}
   const card=n('section');card.dataset.notePlayer=name.toLocaleLowerCase('fr');card.dataset.noteId=id;card.style.cssText='padding:12px';const obs={value:prior?.comment||''};const status=n('p');status.setAttribute('role','status');if(detail){const ratingLabel=n('p',detail.current_rating==null?'Pas encore noté':'Note actuelle : '+Number(detail.current_rating).toFixed(1)+' / 10');ratingLabel.className='swe-note-current';card.append(ratingLabel)}
   const save=button('Enregistrer',async()=>{if(initial?Object.values(fields).some(f=>f.s.value===''):pick.s.value===''){status.textContent=initial?'Complète les quatre critères et le rôle.':'Choisis une note sur 10.';return}save.disabled=true;try{const r=await sb.rpc('fast_conquest_manage',{p_tournament_id:tournamentId,p_action:'note',p_payload:{playerId:id,...(initial?{initialSkills:Object.fromEntries(Object.entries(fields).map(([key,f])=>[key,key==='preferred_role'?f.s.value:Number(f.s.value)]))}:{rating:Number(pick.s.value)}),comment:obs.value}});if(r.error)throw r.error;status.textContent='Enregistré ✓';const existing=(c.my_notes||[]).find(n=>n.player_id===id);const saved=initial?{initial_skills:Object.fromEntries(Object.entries(fields).map(([key,f])=>[key,key==='preferred_role'?f.s.value:Number(f.s.value)]))}:{rating:Number(pick.s.value)};if(existing)Object.assign(existing,saved);else(c.my_notes||(c.my_notes=[])).push({player_id:id,...saved});applyFilter()}catch(e){status.textContent=e.message||'Enregistrement impossible'}finally{save.disabled=false}});
   if(initial){card.classList.add('swe-note-initial');fields.preferred_role.l.classList.add('swe-note-role');card.prepend(n('h4',name),n('p','Première évaluation par toi · quatre critères et rôle de prédilection'));for(const field of Object.values(fields))card.append(field.l);card.append(save,status)}else card.append(pick.l,save,status);const team=(c.note_teams||[]).find(team=>(team.players||[]).includes(id));(groups.get(team?.id)||others).append(card);
  }
  applyFilter();
  const completionBox=n('section');completionBox.style.cssText='position:sticky;bottom:0;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:18px 0 2px;padding:14px;border:2px solid #e5ae44;border-radius:14px;background:#102e54;color:#fff;box-shadow:0 10px 24px #0b20394d';const completionText=n('p');completionText.style.margin='0';const completionButton=button('',async()=>{completionButton.disabled=true;try{const r=await sb.rpc('fast_conquest_complete_notes',{p_tournament_id:tournamentId,p_complete:!completion.complete});if(r.error)throw r.error;completion=r.data||completion;renderCompletion()}catch(e){completionBox.style.background='#8b1e2d';completionText.textContent=e.message||'Validation impossible';setTimeout(renderCompletion,4500)}finally{completionButton.disabled=false}});const renderCompletion=()=>{completionBox.style.background=completion.complete?'#075c48':'#102e54';completionText.textContent=completion.complete?'✓ Évaluation terminée · tu peux encore modifier tes notes avant la clôture.':'Tu as évalué '+Number(completion.rated||0)+' joueur'+(Number(completion.rated||0)>1?'s':'')+' sur '+Number(completion.expected||0)+'.';completionButton.textContent=completion.complete?'Reprendre l’évaluation':'J’ai terminé mon évaluation';};completionBox.append(completionText,completionButton);dialog.append(completionBox);renderCompletion();
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
   if(c.can_note&&c.notes_open)notes.append(button('Ouvrir le salon de notation',()=>openNotes(tour.id)));
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

;

;
/* SOURCE match-quick-csc.js */
// CSC : ajout de deux raccourcis sous les joueurs, sans recréer la saisie rapide.
(function installQuickScoringCSC(){
  'use strict';
  let queued=false;
  const normalize=value=>String(value||'').normalize('NFC').toLocaleLowerCase('fr').replace(/\s+/g,' ').trim();
  const nameOnButton=(button,name)=>{
    const label=normalize(button.textContent),wanted=normalize(name);
    return !!wanted&&(label===wanted||label.endsWith(' '+wanted)||label.includes(' '+wanted+' '));
  };
  const cscBallSvg=()=>'<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="19" height="19" style="vertical-align:-3px;flex:none;margin-right:3px"><circle cx="12" cy="12" r="10.4" fill="#d6283f" stroke="#921328" stroke-width="1.2"/><path d="m12 6 4.1 3-1.55 4.8h-5.1L7.9 9Z" fill="#fff"/><path d="M12 6V1.8M7.9 9 3.15 7.4M16.1 9l4.75-1.6M9.45 13.8 6.3 19.4M14.55 13.8l3.15 5.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>';
  const assignedIds=(matchId,teamId)=>[...new Set(matchTeamPlayerIds(matchId,teamId).filter(id=>p(id)))];
  const playerButtons=(panel,ids)=>{
    const names=ids.flatMap(id=>{const raw=p(id)?.name||'';const display=playerDisplayName(p(id));return [raw,display,raw.replace(/^\[[^\]]+\]\s*/,''),display.replace(/^\[[^\]]+\]\s*/,'')]}).filter(Boolean);
    return [...panel.querySelectorAll('button')].filter(button=>
      !button.closest('.swe-quick-csc')&&names.some(name=>nameOnButton(button,name))
    );
  };
  const findLocation=heading=>{
    // La saisie Roi du terrain n'utilise pas toujours la même structure
    // que la fiche "Matchs" classique. Utiliser le vrai match dans S.matches,
    // jamais la position d'un élément HTML dans la liste.
    const roots=[];
    for(let el=heading.parentElement,depth=0;el&&el!==document.body&&depth<13;el=el.parentElement,depth++){
      roots.push(el);
      if(el.id==='matchesList')break;
    }
    const active=S.matches.filter(m=>m.status!=='finished');
    for(const root of roots){
      const buttons=root.querySelectorAll('button');
      if(buttons.length<4)continue;
      const assigned=root.closest('[data-match-id]');
      const matchId=assigned?.getAttribute('data-match-id')||root.getAttribute('data-match-id')||'';
      // Lire le titre situé au-dessus de "⚡ Saisie rapide", et non
      // le texte d'une autre rencontre se trouvant après la carte.
      const prefix=(root.textContent||'').split(/saisie rapide/i)[0];
      const numberMatch=prefix.match(/\bmatch\s*(\d+)\b/i);
      const matchNumber=numberMatch?Number(numberMatch[1]):null;
      const candidates=[];
      for(const match of active){
        if(matchId&&String(matchId)!==String(match.id))continue;
        if(matchNumber!==null&&Number(match.match_order)!==matchNumber)continue;
        const homeIds=assignedIds(match.id,match.home_team_id);
        const awayIds=assignedIds(match.id,match.away_team_id);
        if(!homeIds.length||!awayIds.length)continue;
        const home=playerButtons(root,homeIds);
        const away=playerButtons(root,awayIds);
        if(home.length<Math.min(2,homeIds.length)||away.length<Math.min(2,awayIds.length))continue;
        // Si deux matchs affichent les mêmes joueurs, refuser de les confondre.
        candidates.push({match,homeIds,awayIds,home,away,scope:root});
      }
      if(candidates.length===1)return candidates[0];
    }
    return null;
  };
  function columnAnchor(buttons,otherButtons,scope){
    const last=buttons[buttons.length-1];
    if(!last)return null;
    // Chercher la colonne commune aux joueurs de cette équipe,
    // sans englober également la colonne adverse.
    for(let parent=last.parentElement;parent&&parent!==scope;parent=parent.parentElement){
      if(!buttons.every(b=>parent.contains(b)))continue;
      if(otherButtons.some(b=>parent.contains(b)))continue;
      const direct=[...parent.children].find(child=>child.contains(last));
      if(direct)return {anchor:direct,teamColumn:parent};
    }
    // Mise en page alternative : chaque joueur possède sa propre rangée.
    const row=last.closest('.quick-player-row,.scorer-row,.match-scorer-row,.row');
    if(row&&row!==scope&&!otherButtons.some(b=>row.contains(b)))
      return {anchor:row,teamColumn:row.parentElement};
    return {anchor:last.parentElement,teamColumn:last.parentElement};
  }
  function appendControl(buttons,otherButtons,playerIds,match,beneficiaryTeamId,scope){
    const last=buttons[buttons.length-1];
    if(!last)return;
    const insertion=columnAnchor(buttons,otherButtons,scope);
    const anchor=insertion?.anchor;
    if(!anchor?.parentElement)return;
    if(insertion.teamColumn?.querySelector('.swe-quick-csc[data-csc-team="'+beneficiaryTeamId+'"]'))return;
    if(anchor.nextElementSibling?.matches?.('.swe-quick-csc[data-csc-team="'+beneficiaryTeamId+'"]'))return;
    const control=document.createElement('div');
    control.className='swe-quick-csc';
    control.dataset.cscTeam=beneficiaryTeamId;
    control.style.cssText='margin-top:8px;width:100%;';
    const trigger=document.createElement('button');
    trigger.type='button';trigger.innerHTML=cscBallSvg()+' <span>CSC</span>';trigger.className='ghost smallbtn';
    trigger.setAttribute('aria-expanded','false');
    trigger.style.cssText='width:100%;min-height:38px;';
    const choices=document.createElement('div');
    choices.style.cssText='display:none;margin-top:6px;max-height:220px;overflow-y:auto;';
    choices.setAttribute('aria-label','Choisir le responsable du CSC');
    const label=document.createElement('div');
    label.className='small muted';label.textContent='Joueur responsable du CSC :';
    choices.appendChild(label);
    for(const id of playerIds){
      const player=p(id);if(!player)continue;
      const choice=document.createElement('button');
      choice.type='button';choice.className='smallbtn';
      choice.textContent=playerDisplayName(player)||player.name||'Joueur';
      choice.style.cssText='display:block;width:100%;text-align:left;margin-top:4px;';
      choice.addEventListener('click',async event=>{
        event.preventDefault();event.stopPropagation();
        if(!canEditCurrentMatches())return toast('Saisie non autorisée.');
        if(!S.matches.some(m=>String(m.id)===String(match.id)&&m.status!=='finished'))return toast('Ce match est terminé.');
        trigger.disabled=true;
        [...choices.querySelectorAll('button')].forEach(b=>b.disabled=true);
        try{
          const {error}=await sb.from('goals').insert({
            match_id:match.id,
            team_id:beneficiaryTeamId,
            scorer_player_id:id,
            assister_player_id:null,
            is_own_goal:true,
            assist_decided:true
          });
          if(error)throw error;
          await loadTournament();renderAll();toast('CSC enregistré pour l’équipe adverse ✅');
        }catch(error){
          toast(error?.message||'Impossible d’enregistrer le CSC.');
          trigger.disabled=false;
          [...choices.querySelectorAll('button')].forEach(b=>b.disabled=false);
        }
      });
      choices.appendChild(choice);
    }
    trigger.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      const opening=choices.style.display==='none';
      document.querySelectorAll('.swe-quick-csc').forEach(other=>{
        const list=other.querySelector('[aria-label="Choisir le responsable du CSC"]');
        const btn=other.querySelector('button');
        if(list)list.style.display='none';
        btn?.setAttribute('aria-expanded','false');
      });
      choices.style.display=opening?'block':'none';
      trigger.setAttribute('aria-expanded',String(opening));
    });
    control.append(trigger,choices);
    anchor.insertAdjacentElement('afterend',control);
  }
  // Affiche la vraie nature des buts contre leur camp dans le suivi des buteurs.
  // Les informations viennent de goals.is_own_goal, jamais d'une déduction sur le score.

  // Les CSC sont portés au score de l'adversaire : le responsable est
  // obligatoirement choisi dans l'équipe opposée à celle créditée du but.
  function protectOwnGoalEntry(entry,editButton,goal,match){
    if(entry.dataset.sweOwnGoalControls===String(goal.id))return;
    const offenderTeamId=String(goal.team_id)===String(match.home_team_id)
      ?match.away_team_id
      :String(goal.team_id)===String(match.away_team_id)
        ?match.home_team_id:null;
    if(!offenderTeamId)return;
    entry.dataset.sweOwnGoalControls=String(goal.id);

    for(const select of entry.querySelectorAll('select')){
      select.value='';
      select.disabled=true;
      const label=select.closest('label');
      if(label&&label!==entry&&!label.querySelector('button')){label.hidden=true;label.style.display='none';}
      else{select.hidden=true;select.style.display='none';}
    }
    for(const button of entry.querySelectorAll('button')){
      if(/enregistrer le passeur/i.test(button.textContent||'')){
        button.disabled=true;button.hidden=true;button.style.display='none';
      }
    }
    // Le formulaire de passe décisive disparaît pour ce CSC uniquement.
    for(const node of entry.querySelectorAll('label,div,span,p,small')){
      if(node===entry||node.children.length)continue;
      if(/^(passeur|passeur à compléter|aucun passeur)$/i.test((node.textContent||'').trim())){
        node.hidden=true;node.style.display='none';
      }
    }
    if(!entry.querySelector('.swe-csc-assist-info')){
      const info=document.createElement('div');
      info.className='swe-csc-assist-info small';
      info.style.cssText='margin:7px 0;color:#bc1d36;font-weight:700;';
      info.textContent='CSC · Aucune passe décisive';
      const actions=editButton.parentElement;
      if(actions&&actions!==entry)actions.before(info);
      else entry.appendChild(info);
    }

    if(editButton.dataset.sweCscCorrectionBound)return;
    // L'ancienne commande ouvre aussi son éditeur de buteur. On remplace
    // exclusivement CE bouton CSC par une copie sans anciens gestionnaires
    // d'événements, afin de garder un seul éditeur et la même apparence.
    const cscEdit=editButton.cloneNode(true);
    cscEdit.removeAttribute('onclick');
    cscEdit.onclick=null;
    cscEdit.dataset.sweCscCorrectionBound='true';
    cscEdit.classList.add('swe-csc-edit-trigger');
    editButton.replaceWith(cscEdit);
    editButton=cscEdit;
    editButton.addEventListener('click',event=>{
      // Neutralise l'éditeur classique, qui utilise l'équipe bénéficiaire.
      event.preventDefault();event.stopImmediatePropagation();
      if(!canEditCurrentMatches()&&!S.isSuperAdmin)
        return toast('Tu ne peux pas modifier ce match.');
      let box=entry.querySelector('.swe-csc-correction');
      if(box){box.remove();return;}
      box=document.createElement('div');
      box.className='swe-csc-correction';
      box.style.cssText='margin-top:10px;padding:10px;border:1px solid #e4adbb;border-radius:12px;background:#fff9fb;';
      const title=document.createElement('b');
      title.textContent='Corriger le responsable du CSC · '+(tm(offenderTeamId)?.name||'Équipe fautive');
      box.append(title);
      const hint=document.createElement('div');
      hint.className='small muted';
      hint.textContent='Le but reste attribué à '+(tm(goal.team_id)?.name||"l’équipe adverse")+'.';
      box.append(hint);

      const roster=[...new Set(matchTeamPlayerIds(match.id,offenderTeamId))]
        .filter(id=>p(id));
      const choices=document.createElement('div');
      choices.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px;margin-top:10px;';
      const feedback=document.createElement('div');
      feedback.className='small';
      feedback.setAttribute('role','status');
      feedback.style.cssText='margin-top:8px;color:#a11737;';
      if(!roster.length)feedback.textContent='Aucun joueur trouvé dans l’équipe fautive.';
      const close=document.createElement('button');
      close.type='button';close.className='ghost smallbtn';
      close.textContent='Annuler la correction';
      close.style.marginTop='9px';
      close.addEventListener('click',e=>{e.preventDefault();box.remove()});

      for(const id of roster){
        const choice=document.createElement('button');
        choice.type='button';choice.className='smallbtn';
        choice.textContent=playerDisplayName(p(id))||p(id)?.name||'Joueur';
        if(String(id)===String(goal.scorer_player_id))
          choice.title='Responsable actuel du CSC';
        choice.addEventListener('click',async e=>{
          e.preventDefault();e.stopPropagation();
          for(const btn of choices.querySelectorAll('button'))btn.disabled=true;
          close.disabled=true;
          feedback.textContent='Enregistrement du CSC…';
          try{
            const read=await sb.from('goals')
              .select('id,match_id,team_id,is_own_goal')
              .eq('id',goal.id).single();
            if(read.error)throw read.error;
            if(!read.data?.is_own_goal||
               String(read.data.match_id)!==String(match.id)||
               String(read.data.team_id)!==String(goal.team_id))
              throw Error('Ce but a changé. Actualise les matchs avant de corriger.');
            const result=await sb.from('goals').update({
              scorer_player_id:id,
              assister_player_id:null,
              assist_decided:true,
              is_own_goal:true
            }).eq('id',goal.id).eq('match_id',match.id)
              .eq('team_id',goal.team_id).eq('is_own_goal',true).select('id');
            if(result.error)throw result.error;
            if(!result.data?.length)throw Error('Modification non enregistrée : vérifie tes autorisations.');
            await loadTournament();renderAll();
            toast('Responsable du CSC corrigé ✅');
          }catch(error){
            feedback.textContent=error?.message||'Correction du CSC impossible.';
            for(const btn of choices.querySelectorAll('button'))btn.disabled=false;
            close.disabled=false;
          }
        });
        choices.append(choice);
      }
      box.append(choices,feedback,close);
      entry.append(box);
    },true);
  }

  function annotateOwnGoals(){
    const host=document.getElementById('matchesList');
    if(!host||!Array.isArray(S.goals)||!Array.isArray(S.matches))return;
    const ownGoals=S.goals.filter(goal=>goal.is_own_goal);
    if(!ownGoals.length)return;
    const normalise=value=>normalize(value).replace(/^[⚽🏐🔵\s]+/,'');
    const actionButtons=[...host.querySelectorAll('button')].filter(button=>/modifier le buteur/i.test(button.textContent||''));
    for(const action of actionButtons){
      const matchCard=action.closest('[data-match-id],.match,.match-card');
      if(!matchCard)continue;
      const explicit=matchCard.getAttribute('data-match-id');
      const topText=(matchCard.textContent||'').slice(0,260);
      const numberMatch=topText.match(/\bmatch\s*(\d+)\b/i);
      const order=numberMatch?Number(numberMatch[1]):null;
      const matches=S.matches.filter(m=>explicit?String(m.id)===String(explicit):order!==null&&Number(m.match_order)===order);
      if(matches.length!==1)continue;
      const match=matches[0];
      const candidates=ownGoals.filter(goal=>String(goal.match_id)===String(match.id));
      if(!candidates.length)continue;

      // Remonter du bouton d'édition vers UNE fiche de but (et non toute la liste).
      let entry=null;
      for(let node=action.parentElement;node&&node!==matchCard;node=node.parentElement){
        const text=node.textContent||'';
        if(!/annuler ce but/i.test(text))continue;
        if([...node.querySelectorAll('button')].filter(b=>/modifier le buteur/i.test(b.textContent||'')).length!==1)continue;
        const heading=normalise(text.split(/\b(?:passeur|aucun passeur)\b/i)[0]);
        if(heading.length>230||!heading)continue;
        if(!candidates.some(goal=>{
          const person=p(goal.scorer_player_id)?.name||'';
          const team=tm(goal.team_id)?.name||'';
          return person&&team&&heading.includes(normalise(person))&&heading.includes(normalise(team));
        }))continue;
        entry=node;break;
      }
      if(!entry)continue;
      const headingText=normalise((entry.textContent||'').split(/\b(?:passeur|aucun passeur)\b/i)[0]);
      const matched=candidates.filter(goal=>{
        const person=p(goal.scorer_player_id)?.name||'';
        const team=tm(goal.team_id)?.name||'';
        return person&&team&&headingText.includes(normalise(person))&&headingText.includes(normalise(team));
      });
      if(!matched.length)continue;
      // N'annoter qu'une ligne identifiable. Si un but normal et un CSC portent
      // exactement le même joueur et l'équipe créditée, ne pas deviner.
      const possible=S.goals.filter(goal=>String(goal.match_id)===String(match.id)&&
        String(goal.scorer_player_id)===String(matched[0].scorer_player_id)&&
        String(goal.team_id)===String(matched[0].team_id));
      if(possible.some(goal=>!goal.is_own_goal))continue;

      if(!entry.querySelector('.swe-csc-history-label')){
      const person=normalise(p(matched[0].scorer_player_id)?.name||'');
      const team=normalise(tm(matched[0].team_id)?.name||'');
      const headingElements=[...entry.querySelectorAll('strong,b')];
      let header=headingElements.find(el=>{
        const label=normalise(el.textContent||'');
        return label.includes(person)&&label.includes(team);
      });
      if(!header)header=headingElements.find(el=>normalise(el.textContent).includes(person));
      if(!header){
        // Le titre peut être un simple élément avec font-weight, sans <b>.
        header=[...entry.querySelectorAll('div,span,p')]
          .filter(el=>!el.querySelector('button'))
          .find(el=>{
            const label=normalise(el.textContent||'');
            return label.length<160&&label.includes(person)&&label.includes(team);
          });
      }
      if(!header)continue;
      // Supprimer uniquement l'emoji de tête s'il est dans un nœud texte isolé.
      const first=header.firstChild;
      if(first?.nodeType===Node.TEXT_NODE){
        const changed=(first.nodeValue||'').replace(/^\s*⚽\s*/,'');
        if(changed!==first.nodeValue)first.nodeValue=changed;
      }
      // Certains thèmes placent le ballon bleu dans un span ou juste avant le titre.
      const inlineIcon=header.firstElementChild;
      if(inlineIcon&&/^\s*⚽\s*$/.test(inlineIcon.textContent||''))inlineIcon.remove();
      const sibling=header.previousSibling;
      if(sibling?.nodeType===Node.TEXT_NODE){
        const clean=(sibling.nodeValue||'').replace(/^\s*⚽\s*/,'');
        if(clean!==sibling.nodeValue)sibling.nodeValue=clean;
      }else if(sibling?.nodeType===Node.ELEMENT_NODE&&/^\s*⚽\s*$/.test(sibling.textContent||'')){
        sibling.remove();
      }
      const label=document.createElement('span');
      label.className='swe-csc-history-label';
      label.style.cssText='display:inline-flex;align-items:center;gap:3px;color:#bc1d36;font-weight:800;margin-right:5px;';
      label.innerHTML=cscBallSvg()+' CSC ·';
      label.title='Contre son camp : le but est attribué à '+(tm(matched[0].team_id)?.name||"l'équipe adverse");
      header.prepend(label);
      }
      protectOwnGoalEntry(entry,action,matched[0],match);
    }
  }

  function mount(){
    if(!S.session||!S.activeTour)return;
    annotateOwnGoals();
    if(!canEditCurrentMatches())return;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      if(!/saisie rapide/i.test(node.nodeValue||''))continue;
      const heading=node.parentElement;
      if(!heading||heading.closest('.swe-quick-csc'))continue;
      const found=findLocation(heading);
      if(!found)continue;
      appendControl(found.home,found.away,found.homeIds,found.match,found.match.away_team_id,found.scope);
      appendControl(found.away,found.home,found.awayIds,found.match,found.match.home_team_id,found.scope);
    }
  }
  function schedule(){
    if(queued)return;
    queued=true;
    window.setTimeout(()=>{queued=false;try{mount()}catch(error){console.warn('CSC quick scoring',error)}},80);
  }
  function start(){
    if(!document.body)return;
    const observer=new MutationObserver(records=>{
      if(records.some(record=>[...record.addedNodes].some(node=>
        node.nodeType===1&&!node.closest?.('.swe-quick-csc')
      )))schedule();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    schedule();
  }
  document.addEventListener('swe:rendered',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

;

;
/* SOURCE match-finish-audit-ui.js */
// SWÉ Tournament — clôture visible des matchs et auteur de clôture pour l'administrateur.
(function setupMatchFinishAuditUI(){
  'use strict';
  let scheduled=false,loading=false,auditKey='',auditRecords=new Map();

  const current=()=>typeof currentTour==='function'?currentTour():null;
  const allowed=()=>typeof canEditCurrentMatches==='function'&&canEditCurrentMatches();
  const isAdministrator=()=>typeof isAdmin==='function'&&(isAdmin()||!!S.isSuperAdmin);
  const matchesRoot=()=>document.getElementById('matchesList');
  const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();

  function cardMatch(card){
    if(!card||!card.isConnected)return null;
    const explicit=card.dataset.matchId;
    if(explicit)return S.matches.find(m=>String(m.id)===String(explicit))||null;
    const root=matchesRoot();
    const cards=[...(root?.querySelectorAll(':scope > .match')||[])];
    const idx=cards.indexOf(card);
    if(idx>=0&&S.matches[idx])return S.matches[idx];
    const title=normalize(card.textContent).slice(0,190);
    const matchNumber=title.match(/(?:^|\s|⚽)\s*match\s*(\d+)\b/i);
    const index=matchNumber?Number(matchNumber[1])-1:-1;
    if(index>=0&&S.matches[index])return S.matches[index];
    return null;
  }

  function cards(){
    const root=matchesRoot();
    if(!root)return [];
    const primary=[...root.querySelectorAll(':scope > .match,[data-match-id].match')];
    if(primary.length)return [...new Set(primary)];
    const explicit=[...root.querySelectorAll('[data-match-id]')].filter(x=>x.closest('#matchesList'));
    if(explicit.length)return explicit;
    // Compatibilité avec les fiches de saisie rapide des anciennes versions.
    const found=[];
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let textNode;
    while((textNode=walker.nextNode())){
      if(!/saisie rapide/i.test(textNode.nodeValue||''))continue;
      for(let parent=textNode.parentElement,depth=0;parent&&parent!==root&&depth<9;parent=parent.parentElement,depth++){
        const text=normalize(parent.textContent);
        const indices=[...text.matchAll(/\bmatch\s*(\d+)\b/gi)].map(x=>Number(x[1]));
        if(indices.length!==1||parent.querySelectorAll('button').length<4)continue;
        const match=S.matches[indices[0]-1];
        if(!match)continue;
        parent.dataset.matchId=match.id;
        found.push(parent);
        break;
      }
    }
    return [...new Set(found)];
  }

  function quickHeading(card){
    const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);
    let n;
    while((n=walker.nextNode())){
      if(/saisie rapide/i.test(n.nodeValue||''))return n.parentElement;
    }
    return null;
  }

  function visible(el){
    if(!el||!el.isConnected)return false;
    return el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
  }

  async function finish(match,button){
    if(!allowed())return toast('Saisie non autorisée.');
    const tour=current();
    if(!tour||tour.id!==match.tournament_id)return toast('Tournoi non sélectionné.');
    if(tour.format==='fast_conquest'){
      return toast('Termine ce match depuis les commandes Fast Conquête.');
    }
    button.disabled=true;
    try{
      const fetched=await sb.from('matches').select('id,status,home_score,away_score,competition_type,home_team_id,away_team_id,match_order,pitch,rotation_role').eq('id',match.id).single();
      if(fetched.error)throw fetched.error;
      const fresh=fetched.data;
      if(fresh.status==='finished'){toast('Ce match est déjà terminé.');await loadTournament();renderMatches();return;}
      const home=S.teams.find(t=>t.id===fresh.home_team_id)?.name||'Équipe 1';
      const away=S.teams.find(t=>t.id===fresh.away_team_id)?.name||'Équipe 2';
      const score=Number(fresh.home_score||0)+' - '+Number(fresh.away_score||0);
      let response;
      let tieDecision=null;
      if(tour.format==='king_of_pitch'){
        if(typeof window.SWEKingResolveTie!=='function')throw Error('Module Roi du terrain non chargé : actualise la page.');
        tieDecision=await window.SWEKingResolveTie(fresh,home,away,fresh.home_score,fresh.away_score);
        if(!tieDecision)return;
      }
      if(tour.format!=='conquest'||fresh.competition_type!=='conquest_playoff'){
        const winnerName=String(tieDecision?.tie_break_winner_team_id||'')===String(fresh.home_team_id)?home:
          String(tieDecision?.tie_break_winner_team_id||'')===String(fresh.away_team_id)?away:null;
        if(!confirm('Terminer ce match ?\n'+home+' '+score+' '+away+
          (winnerName?'\nVainqueur du départage : '+winnerName:'')+
          '\n\nLa clôture sera enregistrée avec ton compte et son heure.'))return;
      }
      if(tour.format==='conquest'&&fresh.competition_type==='conquest_playoff'){
        let winner=null;
        if(Number(fresh.home_score)===Number(fresh.away_score)){
          const choice=prompt('Match nul : qui remporte le départage ?\n1 = '+home+'\n2 = '+away+'\nAnnuler = garder le match en cours');
          if(choice===null)return;
          if(choice!=='1'&&choice!=='2')return toast('Choisis 1 ou 2.');
          winner=choice==='1'?fresh.home_team_id:fresh.away_team_id;
        }
        if(!confirm('Terminer ce match ?\n'+home+' '+score+' '+away+
          (winner?'\nVainqueur du départage : '+(String(winner)===String(fresh.home_team_id)?home:away):'')+
          '\n\nLa clôture sera enregistrée avec ton compte et son heure.'))return;
        response=await sb.rpc('conquest_finish_match_v2',{p_match_id:fresh.id,p_tie_break_winner_team_id:winner});
      }else{
        const finishFields={status:'finished',finished_at:new Date().toISOString()};
        if(tour.format==='king_of_pitch')Object.assign(finishFields,tieDecision);
        response=await sb.from('matches')
          .update(finishFields)
          .eq('id',fresh.id).neq('status','finished').select('id');
        if(!response.error&&Array.isArray(response.data)&&!response.data.length)
          throw Error('Le match a été clôturé par un autre utilisateur.');
      }
      if(response.error)throw response.error;
      auditKey='';
      if(tour.format==='king_of_pitch')await loadAll();
      else {await loadTournament();renderAll();}
      toast('Match terminé et clôture tracée ✅');
    }catch(error){
      toast(error?.message||'Impossible de terminer le match.');
    }finally{button.disabled=false;}
  }

  function addFinish(card,match){
    if(!allowed()||match.status==='finished'||card.querySelector('.swe-quick-finish'))return;
    if(current()?.format==='fast_conquest')return;
    const heading=quickHeading(card);
    const existing=[...card.querySelectorAll('button')].find(button=>/terminer le match/i.test(button.textContent||'')&&visible(button));
    // L'ancien bouton, présent ailleurs sur la fiche, ne remplace pas celui de la saisie rapide.
    if(!heading&&existing)return;
    const row=document.createElement('div');row.className='swe-quick-finish';
    row.style.cssText='margin-top:12px;display:flex;justify-content:flex-end;gap:8px;';
    const button=document.createElement('button');
    button.type='button';button.textContent='✅ Terminer le match';button.className='primary';
    button.style.cssText='min-height:42px;min-width:170px;';
    button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();finish(match,button)});
    row.append(button);

    const controls=[...card.querySelectorAll('.swe-quick-csc')];
    if(heading&&controls.length>=2){
      let grid=controls[0].parentElement;
      while(grid&&grid!==card&&!grid.contains(controls[1]))grid=grid.parentElement;
      if(grid&&grid!==card){grid.after(row);return;}
    }
    if(heading){
      // Place le contrôle avant le rappel des buts enregistrés, et non dans une équipe.
      const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);
      let n;
      while((n=walker.nextNode())){
        if(!/buts enregistrés/i.test(n.nodeValue||''))continue;
        const label=n.parentElement;
        const line=label?.closest('.row,.small,.muted')||label;
        if(line&&line!==card&&line.parentElement){line.before(row);return;}
      }
    }
    const manager=card.querySelector('.match-player-manager');
    if(manager&&manager.parentElement){manager.after(row);return;}
    card.append(row);
  }

  function renderAudit(){
    if(!isAdministrator())return;
    for(const card of cards()){
      const match=cardMatch(card);
      if(!match||match.status!=='finished')continue;
      const record=auditRecords.get(String(match.id));
      if(!record)continue;
      let line=card.querySelector('.swe-match-finish-audit');
      if(!line){
        line=document.createElement('div');line.className='swe-match-finish-audit';
        line.style.cssText='margin-top:8px;font-size:12px;color:var(--muted,#526b64);';
        const badge=[...card.querySelectorAll('.guest-badge')].find(x=>/match terminé/i.test(x.textContent||''));
        if(badge)badge.after(line);else card.append(line);
      }
      const when=record.finished_at?new Date(record.finished_at).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):'date inconnue';
      const who=record.finished_by_name||'Auteur non identifié';
      line.textContent='🔎 Clôture : '+who+' · '+when;
      line.title='Journal de clôture réservé à l’administrateur, utile en cas de réclamation.';
    }
  }

  async function fetchAudit(){
    if(!isAdministrator()||loading)return;
    const tour=current();if(!tour?.id)return;
    const fingerprint=tour.id+':'+S.matches.filter(m=>m.status==='finished').map(m=>m.id).join(',');
    if(auditKey===fingerprint)return;
    auditKey=fingerprint;loading=true;
    try{
      const {data,error}=await sb.rpc('admin_get_match_finish_audit_v1',{p_tournament_id:tour.id});
      if(error)throw error;
      if(current()?.id!==tour.id)return;
      auditRecords=new Map((data||[]).map(item=>[String(item.match_id),item]));
      renderAudit();
    }catch(error){
      auditKey='';
      console.warn('Historique de clôture inaccessible :',error?.message||error);
    }finally{loading=false;}
  }


  // Historique accessible même après la clôture du tournoi (contestations ultérieures).
  let historicalPanelRequest=0;
  function ensureAdminHistory(){
    if(!isAdministrator())return;
    const host=document.getElementById('view-matches');
    if(!host)return;
    let panel=document.getElementById('sweMatchClosureHistory');
    if(!panel){
      panel=document.createElement('details');
      panel.id='sweMatchClosureHistory';panel.className='card';
      panel.style.cssText='margin-top:16px;padding:12px;';
      const summary=document.createElement('summary');
      summary.textContent='🔎 Historique des matchs terminés · administrateur';
      summary.style.cssText='cursor:pointer;font-weight:700;';
      const intro=document.createElement('p');
      intro.className='small muted';
      intro.textContent='Retrouve la personne qui a clôturé un match, la date et le score, même pour les anciens tournois.';
      const picker=document.createElement('select');
      picker.id='sweMatchClosureTournament';picker.setAttribute('aria-label','Tournoi à auditer');
      picker.style.cssText='max-width:100%;margin:8px 0;';
      const refresh=document.createElement('button');
      refresh.type='button';refresh.textContent='Actualiser';refresh.className='smallbtn';
      refresh.style.marginLeft='8px';
      const results=document.createElement('div');results.id='sweMatchClosureResults';results.className='small';
      panel.append(summary,intro,picker,refresh,results);
      host.append(panel);
      const load=async()=>{
        const tournamentId=picker.value;
        if(!tournamentId)return;
        const request=++historicalPanelRequest;
        results.textContent='Chargement des clôtures…';
        refresh.disabled=true;
        try{
          const [audit,matches,teams]=await Promise.all([
            sb.rpc('admin_get_match_finish_audit_v1',{p_tournament_id:tournamentId}),
            sb.from('matches').select('id,match_order,home_team_id,away_team_id,home_score,away_score').eq('tournament_id',tournamentId),
            sb.from('teams').select('id,name').eq('tournament_id',tournamentId)
          ]);
          if(request!==historicalPanelRequest||!panel.isConnected)return;
          if(audit.error)throw audit.error;
          if(matches.error)throw matches.error;
          if(teams.error)throw teams.error;
          const matchMap=new Map((matches.data||[]).map(m=>[String(m.id),m]));
          const teamMap=new Map((teams.data||[]).map(t=>[String(t.id),t.name]));
          results.replaceChildren();
          const entries=audit.data||[];
          if(!entries.length){results.textContent='Aucun match terminé pour ce tournoi.';return;}
          for(const item of entries){
            const m=matchMap.get(String(item.match_id));
            const row=document.createElement('div');row.className='player';
            row.style.cssText='margin:7px 0;padding:9px;';
            const head=document.createElement('b');
            head.textContent=m?'Match '+m.match_order+' · '+(teamMap.get(String(m.home_team_id))||'Équipe')+' '+m.home_score+' – '+m.away_score+' '+(teamMap.get(String(m.away_team_id))||'Équipe'):'Match '+String(item.match_id).slice(0,8);
            const info=document.createElement('div');info.className='muted';
            const when=item.finished_at?new Date(item.finished_at).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):'date inconnue';
            info.textContent='Clôturé par : '+(item.finished_by_name||'Auteur inconnu')+' · '+when;
            row.append(head,info);results.append(row);
          }
        }catch(error){if(request===historicalPanelRequest)results.textContent='Historique indisponible : '+(error?.message||'erreur');}
        finally{refresh.disabled=false;}
      };
      picker.addEventListener('change',()=>{if(panel.open)load()});
      refresh.addEventListener('click',load);
      panel.addEventListener('toggle',()=>{if(panel.open)load()});
    }
    const picker=panel.querySelector('#sweMatchClosureTournament');
    const signature=S.tournaments.map(t=>t.id+':'+t.name).join(';');
    if(picker.dataset.signature!==signature){
      const selected=picker.value||S.activeTour;
      picker.replaceChildren();
      for(const t of S.tournaments){
        const option=document.createElement('option');option.value=t.id;
        option.textContent=(t.name||t.tournament_date||'Tournoi')+(t.status==='finished'?' · terminé':'');
        picker.append(option);
      }
      picker.value=[...picker.options].some(o=>o.value===selected)?selected:(S.activeTour||'');
      picker.dataset.signature=signature;
    }
  }

  function mount(){
    if(!S.session||!S.activeTour)return;
    for(const card of cards()){
      const match=cardMatch(card);
      if(!match)continue;
      if(match.status!=='finished')addFinish(card,match);
    }
    renderAudit();
    ensureAdminHistory();
    if(isAdministrator()&&S.matches.some(m=>m.status==='finished'))fetchAudit();
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    setTimeout(()=>{scheduled=false;try{mount()}catch(e){console.warn('Actions des matchs',e)}},180);
  }
  function boot(){
    if(!document.body)return;
    const observer=new MutationObserver(records=>{
      if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.closest?.('.swe-quick-finish')&&!n.closest?.('.swe-match-finish-audit'))))schedule();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    schedule();
  }
  document.addEventListener('swe:rendered',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();

;

;
/* SOURCE king-rotation-auto-ui.js */
/* Roi du terrain — activation explicite du circuit et suivi des trois terrains. */
(function(){
'use strict';
let pending=false,scheduled=false;
const roles=[
  {key:'king',title:'👑 Terrain du Roi',param:'p_king_pitch_id'},
  {key:'middle',title:'⚔️ Terrain des Conquérants',param:'p_middle_pitch_id'},
  {key:'stream',title:'🛡️ Terres des Bannis',param:'p_stream_pitch_id'}
];
const tour=()=>{try{return currentTour()}catch(_){return null}};
const admin=()=>typeof isAdmin==='function'&&(isAdmin()||!!S.isSuperAdmin);
const make=(tag,txt)=>{const el=document.createElement(tag);if(txt!==undefined)el.textContent=txt;return el};

function resolveTie(match,home,away,homeScore,awayScore){
  if(Number(homeScore)!==Number(awayScore))
    return {tie_break_winner_team_id:null,tie_break_method_used:null};
  const t=tour();
  if(t?.format!=='king_of_pitch')return null;
  const role=match.rotation_role||
    (String(match.pitch||'').toLocaleLowerCase('fr').includes('carrefour')?'king':
     String(match.pitch||'').toLocaleLowerCase('fr').includes('mercedes')?'middle':
     String(match.pitch||'').toLocaleLowerCase('fr').includes('boulogne')?'stream':
     Number(match.match_order)===1?'king':Number(match.match_order)===2?'middle':'stream');
  const active=!!t.rotation_state?.initialized&&t.rotation_mode==='king_of_pitch';
  const round=active?Number(t.rotation_state?.round||1):1;
  if(role==='king'&&round>1){
    const holder=String(t.rotation_state?.king_holder_team_id||'');
    if(![match.home_team_id,match.away_team_id].some(id=>String(id)===holder)){
      toast('Roi en titre inconnu : actualise le circuit avant de terminer le match.');
      return null;
    }
    const name=String(match.home_team_id)===holder?home:away;
    if(!confirm('Match nul sur Carrefour : le Roi en titre '+name+' conserve la couronne.\nLe prétendant descend à Mercedes.\nConfirmer la clôture ?'))return null;
    return {tie_break_winner_team_id:holder,tie_break_method_used:'king_retains'};
  }
  let method='penalties_3',description='tirs au but obligatoires avec 3 tireurs (pas de Shifumi)';
  if(role!=='king'){
    method=t.tie_break_method||'shifumi_1';
    description={shifumi_1:'Shifumi · 1 manche',shifumi_3:'Shifumi · 3 manches',penalties:'tirs au but (TAB)'}[method]||'départage prévu pour le tournoi';
  }
  return new Promise(resolve=>{
    const overlay=make('div');
    overlay.className='swe-king-tie-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Choisir le vainqueur du départage');
    overlay.innerHTML='<div class="swe-king-tie-dialog"><h3>🤜 ✋ ✌️ Match nul — départage</h3><p class="swe-king-tie-method"></p><p>Quelle équipe a gagné ?</p><div class="swe-king-tie-choices"></div><button type="button" class="swe-king-tie-cancel">Annuler — ne pas clôturer</button></div>';
    overlay.querySelector('.swe-king-tie-method').textContent=description;
    const choices=overlay.querySelector('.swe-king-tie-choices');
    let settled=false;
    const done=value=>{if(settled)return;settled=true;document.removeEventListener('keydown',escapeKey);overlay.remove();resolve(value);};
    const escapeKey=e=>{if(e.key==='Escape')done(null);};
    [[home,match.home_team_id],[away,match.away_team_id]].forEach(([label,id])=>{
      const button=make('button',label);
      button.type='button';
      button.className='swe-king-tie-team';
      button.onclick=()=>done({tie_break_winner_team_id:id,tie_break_method_used:method});
      choices.append(button);
    });
    overlay.querySelector('.swe-king-tie-cancel').onclick=()=>done(null);
    document.addEventListener('keydown',escapeKey);
    document.body.append(overlay);
    choices.querySelector('button')?.focus();
  });
}
window.SWEKingResolveTie=resolveTie;

const refresh=async()=>{await loadAll();renderMatches();};

function mountFourTeamCircuit(current,panel){
 const matches=(S.matches||[]).filter(m=>String(m.tournament_id)===String(current.id)).sort((a,b)=>Number(a.match_order)-Number(b.match_order));
 const active=current.rotation_mode==='king_of_pitch'&&Number(current.rotation_state?.version)===3&&!!current.rotation_state?.initialized;
 const round=Number(current.rotation_state?.round||1);
 const currentRound=matches.filter(m=>Number(m.match_order)>2*(round-1)&&Number(m.match_order)<=2*round);
 const done=currentRound.filter(m=>m.status==='finished').length;
 const signature=JSON.stringify([current.id,active,round,current.rotation_state?.stop_after_round,matches.map(m=>[m.id,m.status,m.match_order,m.pitch]),current.reserved_pitch_ids]);
 if(panel.dataset.signature===signature)return;
 panel.dataset.signature=signature;panel.replaceChildren();
 panel.append(make('h3','👑 Roi du Terrain — 4 équipes / 2 terrains'));
 panel.append(make('p','👑 Carrefour : le gagnant conserve le terrain du Roi. ⚔️ Mercedes : le vainqueur monte défier le Roi, les autres équipes jouent sur Mercedes.'));
 if((current.reserved_pitch_ids||[]).length!==2){panel.append(make('p','⚠️ Le circuit à 4 équipes nécessite exactement 2 terrains réservés : Carrefour et Mercedes. Corrige la réservation avant de lancer les rotations.'));return;}
 if(active){
  const status=make('p','✅ Circuit actif · Tour '+round+' · '+done+' / 2 matchs terminés');
  status.style.fontWeight='700';panel.append(status);
  const next=make('p',done===2?'Deux matchs terminés : la rotation suivante doit apparaître automatiquement.':'La prochaine paire de matchs sera créée dès que les deux résultats seront validés.');
  next.className='muted';panel.append(next);
  for(const m of currentRound){
   const teamName=id=>(S.teams||[]).find(x=>String(x.id)===String(id))?.name||'Équipe';
   const entry=make('p',(m.rotation_role==='king'?'👑 ':'⚔️ ')+(m.pitch||'Terrain')+' · '+teamName(m.home_team_id)+' — '+teamName(m.away_team_id)+' · '+(m.status==='finished'?'Terminé':'À jouer'));
   panel.append(entry);
  }
  return;
 }
 const info=make('p',matches.length+' matchs enregistrés · '+matches.filter(x=>x.status==='finished').length+' terminés');
 info.style.fontWeight='700';panel.append(info);
 if(matches.length!==2){panel.append(make('p','Ce circuit démarre avec exactement 2 matchs : un à Carrefour et un à Mercedes.'));return;}
 if(!admin()){panel.append(make('p','Connexion organisateur requise pour activer la rotation.'));return;}
 const pitches=(current.reserved_pitch_ids||[]).map(id=>(S.sportsPitches||[]).find(p=>String(p.id)===String(id))).filter(Boolean);
 const king=pitches.find(p=>String(p.name||'').toLocaleLowerCase('fr').trim()==='carrefour');
 const lower=pitches.find(p=>String(p.name||'').toLocaleLowerCase('fr').trim()==='mercedes');
 if(!king||!lower){panel.append(make('p','Carrefour et Mercedes doivent être réservés pour ce tournoi.'));return;}
 const button=make('button',matches.every(m=>m.status==='finished')?'👑 Débloquer et créer les matchs 3 et 4':'👑 Activer la rotation automatique');
 button.type='button';button.className='primary';button.disabled=pending;
 const feedback=make('p');feedback.className='muted';feedback.setAttribute('role','status');
 panel.append(make('p','Les deux matchs déjà enregistrés, leurs scores et leurs buteurs seront conservés.'));panel.append(button,feedback);
 button.onclick=async()=>{
  if(pending)return;
  if(!confirm('Activer le circuit Roi du Terrain à 4 équipes / 2 terrains ?\n\nLes scores existants seront conservés. Si les deux premiers matchs sont terminés, les matchs 3 et 4 seront créés automatiquement.'))return;
  pending=true;button.disabled=true;feedback.textContent='Création des rencontres en cours…';
  try{
   const {data,error}=await sb.rpc('swe_king_start_four_v1',{p_tournament_id:current.id,p_king_pitch_id:king.id,p_stream_pitch_id:lower.id,p_tie_break_method:current.tie_break_method||'shifumi_1'});
   if(error)throw error;
   await refresh();
   toast(data?.generated?'👑 Matchs 3 et 4 créés — Carrefour et Mercedes':'👑 Circuit activé. Prochains matchs générés après les résultats.');
  }catch(error){feedback.textContent=error?.message||'Activation impossible';button.disabled=false;}
  finally{pending=false;}
 };
}

function mountOddTeamCircuit(current,panel,count){
 const k=(count-1)/2;
 const matches=(S.matches||[]).filter(m=>String(m.tournament_id)===String(current.id)).sort((a,b)=>Number(a.match_order)-Number(b.match_order));
 const active=current.rotation_mode==='king_of_pitch'&&Number(current.rotation_state?.version)===4&&!!current.rotation_state?.initialized;
 const round=Number(current.rotation_state?.round||1);
 panel.replaceChildren();
 panel.append(make('h3','👑 Roi du terrain · '+count+' équipes / '+k+' terrains'));
 const desc=make('p','Chaque tour comporte '+k+' matchs et une équipe au repos. Les gagnants montent ou conservent leur terrain, et une équipe ayant perdu laisse sa place à celle qui était au repos.');
 panel.append(desc);
 if(active){
  const currentRound=matches.filter(m=>Number(m.match_order)>k*(round-1)&&Number(m.match_order)<=k*round);
  panel.append(make('p','✅ Circuit actif · Tour '+round+' · '+currentRound.filter(m=>m.status==='finished').length+' / '+k+' matchs terminés'));
  const teams=S.teams||[];
  const resting=teams.find(t=>String(t.id)===String(current.rotation_state?.bye_team_id));
  panel.append(make('p','🪑 Équipe au repos : '+(resting?.name||'Équipe à confirmer')));
  for(const m of currentRound){
   const line=make('p',(m.rotation_role==='king'?'👑 ':m.rotation_role==='middle'?'⚔️ ':'🛡️ ')+(m.pitch||'Terrain')+' · '+(teams.find(t=>String(t.id)===String(m.home_team_id))?.name||'Équipe')+' contre '+(teams.find(t=>String(t.id)===String(m.away_team_id))?.name||'Équipe')+' · '+(m.status==='finished'?'✓ terminé':'À jouer'));
   panel.append(line);
  }
  return;
 }
 if(current.rotation_mode!=='standard'){panel.append(make('p','Ce tournoi possède déjà une rotation différente.'));return;}
 const ids=current.reserved_pitch_ids||[];
 if(ids.length!==k){panel.append(make('p','⚠️ Réserve exactement '+k+' terrains pour lancer ce format.'));return;}
 if(matches.length!==k){panel.append(make('p','Prépare '+k+' matchs initiaux sur les '+k+' terrains, avec '+(2*k)+' équipes différentes. La dernière équipe sera au repos.'));return;}
 if(!admin()){panel.append(make('p','Connexion organisateur requise.'));return;}
 const pitches=ids.map(id=>(S.sportsPitches||[]).find(p=>String(p.id)===String(id))).filter(Boolean);
 if(pitches.length!==k){panel.append(make('p','Chargement des terrains réservés nécessaire.'));return;}
 const roleNames=k===2?['👑 Terrain du Roi','🛡️ Terrain inférieur']:['👑 Terrain du Roi','⚔️ Terrain intermédiaire','🛡️ Terrain inférieur'];
 const selects=[];
 for(let i=0;i<k;i++){
  const label=make('label',roleNames[i]);label.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px;margin:9px 0;flex-wrap:wrap;';
  const select=make('select');select.style.cssText='min-width:180px;max-width:100%;';
  for(const p of pitches){const o=make('option',p.name);o.value=p.id;select.append(o)}
  select.value=pitches[i].id;label.append(select);panel.append(label);selects.push(select);
 }
 const notice=make('p','Les '+k+' matchs initiaux doivent être placés sur les terrains sélectionnés dans cet ordre. Les résultats déjà saisis sont conservés.');
 notice.className='muted';panel.append(notice);
 const button=make('button','👑 Activer le circuit à '+count+' équipes');button.type='button';button.className='primary';
 const feedback=make('p');feedback.setAttribute('role','status');panel.append(button,feedback);
 button.onclick=async()=>{
  if(pending)return;
  if(new Set(selects.map(s=>s.value)).size!==k){feedback.textContent='Choisis '+k+' terrains distincts.';return}
  if(!confirm('Activer le circuit Roi du terrain à '+count+' équipes avec une équipe au repos à chaque tour ?'))return;
  pending=true;button.disabled=true;feedback.textContent='Activation en cours…';
  try{
   const ids=selects.map(s=>s.value);
   const {data,error}=await sb.rpc('swe_king_start_odd_v1',{p_tournament_id:current.id,p_king_pitch_id:ids[0],p_middle_pitch_id:k===3?ids[1]:null,p_stream_pitch_id:ids[k-1]});
   if(error)throw error;
   await refresh();toast(data?.generated?'👑 Tour suivant généré':'👑 Circuit activé. Termine les matchs pour passer au tour suivant.');
  }catch(error){feedback.textContent=error?.message||'Activation impossible';button.disabled=false;}
  finally{pending=false}
 };
}

function mount(){
  const current=tour();
  let panel=document.getElementById('sweKingCircuit');
  if(!current||current.format!=='king_of_pitch'||S.publicMode){
    panel?.remove();return;
  }
  const anchor=document.getElementById('matchCompetitionStatus');
  if(!anchor)return;
  if(!panel){
    panel=make('section');panel.id='sweKingCircuit';
    panel.className='player';
    panel.style.cssText='margin:10px 0 16px;padding:14px;border:2px solid #d4a64a;border-radius:14px;background:#fffcf3;';
    anchor.after(panel);
  }
  const teamCount=(S.teams||[]).filter(x=>String(x.tournament_id)===String(current.id)).length;
  if(teamCount===5||teamCount===7){mountOddTeamCircuit(current,panel,teamCount);return;}
  const fourTeams=teamCount===4;
  if(fourTeams){mountFourTeamCircuit(current,panel);return;}
  const active=current.rotation_mode==='king_of_pitch'&&!!current.rotation_state?.initialized;
  const round=Number(current.rotation_state?.round||1);
  const matches=(S.matches||[]).slice().sort((a,b)=>Number(a.match_order)-Number(b.match_order));
  const currentRound=active?matches.filter(m=>Number(m.match_order)>3*(round-1)&&Number(m.match_order)<=3*round):matches.slice(0,3);
  const finished=currentRound.filter(m=>m.status==='finished').length;
  const signature=JSON.stringify([current.id,active,round,current.rotation_state?.stop_after_round,matches.map(m=>[m.id,m.match_order,m.status,m.pitch]),current.reserved_pitch_ids,(S.sportsPitches||[]).map(x=>[x.id,x.name])]);
  if(panel.dataset.signature===signature)return;
  panel.dataset.signature=signature;
  panel.replaceChildren();
  panel.append(make('h3','👑 Roi du terrain · Circuit automatique'));
  if(active&&Number(current.rotation_state?.version||0)<2){
    panel.append(make('p','Circuit historique : les matchs et rotations de cette ancienne version sont conservés sans changement.'));
    return;
  }

  const hint=make('p');
  hint.className='muted';
  hint.textContent='👑 Vainqueur du Roi : reste au Roi · Vainqueur des Conquérants : monte au Roi · Vainqueur des Bannis : monte aux Conquérants. Les perdants descendent ou restent sur les Bannis.';
  panel.append(hint);

  if(active){
    const stop=!!current.rotation_state?.stop_after_round;
    const state=make('p');
    state.style.cssText='font-weight:700;margin:8px 0;';
    state.textContent='✅ Circuit actif · Tour '+round+' · '+finished+' / 3 matchs terminés'+(stop?' · arrêt prévu après ce tour':'');
    panel.append(state);
    const next=make('p');
    next.className='muted';
    next.textContent=stop?'Les rotations sont en pause. Aucun tour supplémentaire ne sera créé avant la reprise.':
      'Les trois matchs du tour '+round+' doivent être terminés : les trois rencontres du tour '+(round+1)+' seront alors créées automatiquement sur les mêmes terrains.';
    panel.append(next);
    const list=make('div');list.style.cssText='display:flex;gap:7px;flex-wrap:wrap;';
    for(const role of roles){
      const m=currentRound.find(x=>x.rotation_role===role.key);
      if(!m)continue;
      const pill=make('span',role.title+' · '+(m.pitch||'Terrain')+' · '+(m.status==='finished'?'✓ terminé':'en attente'));
      pill.style.cssText='padding:6px 10px;border:1px solid #d8b970;border-radius:9px;background:#fff;font-size:12px;';
      list.append(pill);
    }
    panel.append(list);
    if(admin()){
      const control=make('button',stop?'▶️ Reprendre les rotations':'⏹️ Arrêter après ce tour');
      control.type='button';control.className='smallbtn';
      control.style.marginTop='10px';control.disabled=pending;
      control.onclick=async()=>{
        if(pending)return;
        if(!stop&&!confirm('Arrêter la génération automatique après le tour en cours ? Les résultats et les matchs existants seront conservés.'))return;
        pending=true;control.disabled=true;
        try{
          const {error}=await sb.rpc('swe_king_set_stop_v1',{p_tournament_id:current.id,p_stop:!stop});
          if(error)throw error;
          await refresh();
          toast(stop?'Rotations relancées ✅':'Arrêt après ce tour programmé ✅');
        }catch(error){toast(error.message||'Modification des rotations impossible');control.disabled=false}
        finally{pending=false}
      };
      panel.append(control);
    }
  }else{
    const info=make('p');
    info.style.cssText='font-weight:700;margin:8px 0;';
    info.textContent=matches.length===3?'3 matchs initiaux détectés · '+finished+' / 3 terminés · rotations non activées.':
      matches.length+' matchs enregistrés · le circuit attend trois matchs initiaux.';
    panel.append(info);
    if(!admin()){
      panel.append(make('p','L’administrateur doit activer les rotations automatiques.'));
      return;
    }
    const eligible=matches.length===3&&(S.teams||[]).length===6;
    if(!eligible){
      const note=make('p','Pour activer le circuit, crée trois matchs avec six équipes distinctes (deux par terrain).');
      note.className='muted';panel.append(note);return;
    }
    const pitched=(current.reserved_pitch_ids||[]).map(id=>(S.sportsPitches||[]).find(x=>String(x.id)===String(id))).filter(Boolean);
    const byPitchName=name=>pitched.find(x=>String(x.name||'').trim().toLocaleLowerCase('fr')===String(name||'').trim().toLocaleLowerCase('fr'));
    const ordered=matches.slice().sort((a,b)=>a.match_order-b.match_order);
    const row=make('div');row.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;';
    const selects={};
    for(let i=0;i<roles.length;i++){
      const role=roles[i],label=make('label');
      label.style.cssText='display:flex;flex-direction:column;gap:4px;min-width:0;font-weight:700;';
      label.append(make('span',role.title));
      const select=make('select');
      select.style.minHeight='42px';
      select.append(new Option('Choisir le terrain',''));
      for(const pitch of pitched)select.append(new Option(pitch.name,pitch.id));
      select.value=byPitchName(ordered[i]?.pitch)?.id||'';
      selects[role.key]=select;label.append(select);row.append(label);
    }
    panel.append(row);
    const breakLabel=make('label');
    breakLabel.style.cssText='display:flex;flex-direction:column;gap:4px;margin:12px 0;font-weight:700;';
    breakLabel.append(make('span','Départage des matchs nuls sur Mercedes et Boulogne'));
    const breakSelect=make('select');
    breakSelect.style.cssText='min-height:42px;max-width:430px;';
    for(const [value,label] of [
      ['shifumi_1','Shifumi · 1 manche'],
      ['shifumi_3','Shifumi · 3 manches'],
      ['penalties','Tirs au but (TAB)']
    ])breakSelect.append(new Option(label,value));
    breakSelect.value=current.tie_break_method||'shifumi_1';
    breakLabel.append(breakSelect);
    panel.append(breakLabel);
    const noteKing=make('p','Carrefour : première égalité départagée obligatoirement aux TAB à 3 tireurs ; ensuite le Roi en titre reste en cas de nul.');
    noteKing.className='muted';panel.append(noteKing);
    const explanation=make('p','Choisis le terrain du Roi, des Conquérants et des Bannis. Tu gardes les trois matchs, leurs scores et leurs buteurs. La rotation démarrera après la clôture du troisième match.');
    explanation.className='muted';explanation.style.marginTop='8px';panel.append(explanation);
    const activate=make('button','👑 Activer les rotations automatiques');
    activate.type='button';activate.className='primary';
    activate.disabled=pending||pitched.length!==3;
    const feedback=make('p');feedback.className='muted';feedback.setAttribute('role','status');
    if(pitched.length!==3)feedback.textContent='Impossible de retrouver les trois terrains réservés : vérifie les réglages du tournoi.';
    activate.onclick=async()=>{
      if(pending)return;
      const values=roles.map(role=>selects[role.key].value);
      if(values.some(v=>!v)||new Set(values).size!==3){feedback.textContent='Choisis trois terrains différents.';return}
      const summary=roles.map(role=>role.title+' : '+selects[role.key].selectedOptions[0]?.textContent).join('\n')+'\nDépartage Mercedes/Boulogne : '+breakSelect.selectedOptions[0]?.textContent;
      if(!confirm('Activer les rotations automatiques du Roi du terrain ?\n\n'+summary+'\n\nLes matchs et résultats déjà saisis sont conservés.'))return;
      pending=true;activate.disabled=true;feedback.textContent='Activation du circuit…';
      try{
        const params={p_tournament_id:current.id,p_tie_break_method:breakSelect.value};
        for(const role of roles)params[role.param]=selects[role.key].value;
        const {error}=await sb.rpc('swe_king_start_with_tie_v1',params);
        if(error)throw error;
        await refresh();
        toast('Circuit Roi du terrain activé ✅');
      }catch(error){feedback.textContent=error.message||'Activation impossible';activate.disabled=false;}
      finally{pending=false}
    };
    panel.append(activate,feedback);
  }
}
function schedule(){
  if(scheduled)return;scheduled=true;
  setTimeout(()=>{scheduled=false;try{mount()}catch(error){console.warn('Roi du terrain',error)}},110);
}
function start(){
  const host=document.getElementById('matchesList');
  if(host){const observer=new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length||r.removedNodes.length))schedule()});
    observer.observe(host,{childList:true,subtree:false});}
  document.addEventListener('swe:rendered',schedule);
  schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
;

;
/* SOURCE format-theme-auto.js */
/* SWÉ Tournament — single source of truth for tournament format background colors.
 * Changing a tournament format updates the UI without touching tournament rules. */
(function(){
  'use strict';
  const THEMES=Object.freeze({
    king_of_pitch:Object.freeze({name:'Roi du terrain',background:'#1769E0',dark:'#0D397A',soft:'#EAF2FF'}),
    conquest:Object.freeze({name:'Conquête',background:'#800020',dark:'#4D0013',soft:'#FFF0F3'}),
    fast_conquest:Object.freeze({name:'Fast Conquête',background:'#F28C28',dark:'#924300',soft:'#FFF3E5'})
  });
  window.SWE_FORMAT_THEMES=THEMES;
  const normalize=value=>Object.prototype.hasOwnProperty.call(THEMES,value)?value:null;
  let pending=false;
  function update(){
    pending=false;
    const select=document.getElementById('tourFormat');
    const creator=document.getElementById('tournamentAdminCard');
    const creating=!!(select&&creator&&!creator.classList.contains('hidden')&&getComputedStyle(creator).display!=='none');
    let format=creating?normalize(select.value):null;
    if(!format){
      try{
        if(typeof currentTour==='function')format=normalize(currentTour()?.format);
      }catch(_){}
    }
    if(!format && creating)format=normalize(select?.value);
    const root=document.documentElement;
    if(!format){
      root.removeAttribute('data-swe-format');
      root.style.removeProperty('--swe-format-bg');
      root.style.removeProperty('--swe-format-dark');
      root.style.removeProperty('--swe-format-soft');
      return;
    }
    if(root.dataset.sweFormat===format)return;
    const theme=THEMES[format];
    root.dataset.sweFormat=format;
    root.style.setProperty('--swe-format-bg',theme.background);
    root.style.setProperty('--swe-format-dark',theme.dark);
    root.style.setProperty('--swe-format-soft',theme.soft);
  }
  function schedule(){
    if(pending)return;
    pending=true;
    requestAnimationFrame(update);
  }
  document.addEventListener('change',event=>{
    if(event.target?.id==='tourFormat')schedule();
  });
  document.addEventListener('click',schedule);
  document.addEventListener('DOMContentLoaded',()=>{
    schedule();
    // Views are rendered dynamically; re-evaluate after rendering.
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  });
  window.addEventListener('pageshow',schedule);
  window.addEventListener('popstate',schedule);
})();

;

;
/* SOURCE guest-host-rating.js */
/* A player's guest is rated by their authenticated host only.
   Server verifies host identity on every list and write. */
(()=>{
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 let pending=false;
 async function mount(){
  if(pending||typeof sb==='undefined')return;
  if(document.activeElement?.closest?.('.swe-guest-rating-item'))return;
  const publicForm=document.getElementById('publicGuestFields');
  document.getElementById('sweGuestRating')?.remove();
  if(!publicForm || getComputedStyle(publicForm).display==='none')return;
  pending=true;
  try{
   const {data:session}=await sb.auth.getSession();
   if(!session?.session){document.getElementById('sweGuestRating')?.remove();return}
   const {data,error}=await sb.rpc('my_guest_rating_requests_v1');
   if(error)throw error;
   const items=Array.isArray(data)?data:[];
   const own=document.getElementById('publicOwnGuests');
   const inline=Boolean(own&&publicForm&&getComputedStyle(publicForm).display!=='none');
   document.getElementById('sweGuestRating')?.remove();
   if(!inline)return;
   items.forEach(item=>{
    const form=document.createElement('form');form.className='swe-guest-rating-item';
    form.dataset.guestId=item.guest_player_id;
    const options=['À préciser','Débutant','En progression','Intermédiaire','Bon niveau','Très bon niveau','Excellent niveau'];
    const comment=options.includes(item.comment)?item.comment:'À préciser';
    form.innerHTML='<label>Évaluation définitive sur 10 <select name="rating" required><option value="" '+(item.rating==null?'selected':'')+' disabled>Choisir une note</option>'+Array.from({length:19},(_,i)=>{const val=(i+2)/2;return '<option value="'+val+'"'+(Number(item.rating)===val?' selected':'')+'>'+val+'/10</option>'}).join('')+'</select></label><label>Appréciation <select name="comment">'+options.map(v=>'<option value="'+esc(v)+'"'+(v===comment?' selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label><button type="submit">Enregistrer la note</button><span class="swe-guest-feedback" aria-live="polite"></span>';
    if(item.rating!=null){
      form.querySelectorAll('select').forEach(el=>el.disabled=true);
      form.querySelector('button').remove();
      const state=document.createElement('strong');state.className='swe-guest-locked';state.textContent='✓ Évaluation définitive — modification réservée au super-administrateur';form.append(state);
    }
    form.onsubmit=async e=>{
     e.preventDefault();const btn=form.querySelector('button');btn.disabled=true;
     const feedback=form.querySelector('.swe-guest-feedback');feedback.textContent='Enregistrement…';
     const {error}=await sb.rpc('rate_my_guest_v1',{p_tournament_id:item.tournament_id,p_guest_id:item.guest_player_id,p_rating:Number(form.elements.rating.value),p_comment:form.elements.comment.value});
     feedback.textContent=error?'Erreur : '+error.message:'✓ Évaluation définitive enregistrée';
     if(!error){form.querySelectorAll('select').forEach(el=>el.disabled=true);btn.remove();}
     btn.disabled=false;
    };
    if(inline){const rows=[...own.querySelectorAll('[data-swe-guest-player-id]')];const row=rows.find(el=>el.dataset.sweGuestPlayerId===String(item.guest_player_id));if(row){row.querySelector('.swe-guest-inline')?.remove();const slot=document.createElement('div');slot.className='swe-guest-inline';slot.append(form);row.append(slot)}}
   });
  }catch(e){console.warn('Guest assessment unavailable',e)}finally{pending=false}
 }
 document.addEventListener('DOMContentLoaded',mount);
 document.addEventListener('swe:guest-added',mount);
 document.addEventListener('change',event=>{if(event.target?.id==='publicPlayerSelect')mount()});
 setInterval(()=>{if(document.visibilityState==='visible'&&document.getElementById('publicGuestFields'))mount()},15000);
 document.addEventListener('swe:rendered',()=>{mount()});
 window.addEventListener('pageshow',mount);
})();

;

;
/* SOURCE super-admin-guest-ratings.js */
/* Super-administrator corrections to definitive guest assessments. */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const options=['À préciser','Débutant','En progression','Intermédiaire','Bon niveau','Très bon niveau','Excellent niveau'];
let busy=false,loaded=false;
async function refresh(){
 const panel=document.getElementById('saGuestRatings');
 if(!panel||typeof sb==='undefined'||busy)return;
 busy=true;
 try{
  const {data,error}=await sb.rpc('super_admin_guest_ratings_v1');
  if(error)throw error;
  if(!Array.isArray(data)){panel.hidden=true;return}
  panel.hidden=false;
  const container=panel.querySelector('.sa-guest-list');
  const query=(panel.querySelector('.sa-guest-search')?.value||'').toLocaleLowerCase('fr');
  const items=data.filter(x=>[x.guest_name,x.host_name,x.tournament_name].join(' ').toLocaleLowerCase('fr').includes(query));
  container.replaceChildren();
  if(!items.length){container.textContent='Aucune évaluation trouvée.';return}
  items.forEach(item=>{
   const form=document.createElement('form');form.className='sa-guest-rating-card';
   form.innerHTML='<b>'+esc(item.guest_name)+'</b><small>Parrain : '+esc(item.host_name)+' · '+esc(item.tournament_name)+'</small>'+
   '<label>Note sur 10<select name="rating" required>'+Array.from({length:19},(_,i)=>{const v=(i+2)/2;return '<option value="'+v+'"'+(v===Number(item.rating)?' selected':'')+'>'+v+'/10</option>'}).join('')+'</select></label>'+
   '<label>Appréciation<select name="comment">'+options.map(o=>'<option value="'+esc(o)+'"'+(o===item.comment?' selected':'')+'>'+esc(o)+'</option>').join('')+'</select></label>'+
   '<button type="submit">Enregistrer la correction</button><span role="status" aria-live="polite"></span>';
   form.onsubmit=async event=>{
    event.preventDefault();
    if(!confirm('Corriger définitivement l’évaluation de '+item.guest_name+' ?'))return;
    const button=form.querySelector('button');button.disabled=true;
    const status=form.querySelector('[role="status"]');status.textContent='Enregistrement…';
    const {error}=await sb.rpc('rate_my_guest_v1',{p_tournament_id:item.tournament_id,p_guest_id:item.guest_player_id,p_rating:Number(form.elements.rating.value),p_comment:form.elements.comment.value});
    status.textContent=error?'Erreur : '+error.message:'✓ Correction enregistrée';
    button.disabled=false;
   };
   container.append(form);
  });
 }catch(e){panel.querySelector('.sa-guest-list').textContent='Impossible de charger les évaluations : '+e.message}
 finally{busy=false}
}
function mount(){
 const admin=document.getElementById('superAdminPanel');
 if(!admin)return;
 let panel=document.getElementById('saGuestRatings');
 if(!panel){
  panel=document.createElement('section');panel.id='saGuestRatings';panel.className='card sa-guest-ratings';panel.hidden=true;
  panel.innerHTML='<h2>⚽ Évaluations définitives des invités</h2><p>Seul le super-administrateur peut corriger une note enregistrée par un parrain.</p><input class="sa-guest-search" placeholder="Rechercher un invité, un parrain ou un tournoi" aria-label="Rechercher les évaluations"><div class="sa-guest-list"></div>';
  admin.append(panel);
  panel.querySelector('.sa-guest-search').addEventListener('input',()=>{clearTimeout(panel._searchTimer);panel._searchTimer=setTimeout(refresh,250)});
 }
 if(!admin.classList.contains('hidden')&&!loaded){loaded=true;refresh()}
 if(admin.classList.contains('hidden'))loaded=false;
}
document.addEventListener('DOMContentLoaded',mount);
document.addEventListener('swe:rendered',mount);
window.addEventListener('pageshow',mount);
setInterval(mount,3000);
})();

;

;
/* SOURCE organizer-pending-requests-v5203.js */
/* Requests visible on organizer home; existing server RPCs enforce workspace admin rights. */
(()=>{
'use strict';
let pending=false,stamp=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
async function render(force=false){
 let s;try{s=S}catch(_){return}
 const root=document.getElementById('view-home');
 if(!root||!s?.session||!s?.workspace?.id||s.workspace.role!=='admin'||s.publicMode){document.getElementById('sweOrganizerRequests')?.remove();return}
 if(pending||(!force&&Date.now()-stamp<12000))return;
 pending=true;
 try{
  const {data,error}=await sb.rpc('list_workspace_player_requests',{p_workspace_id:s.workspace.id});
  if(error)throw error;
  stamp=Date.now();
  const rows=(Array.isArray(data)?data:[]).filter(x=>x.status==='pending');
  let box=document.getElementById('sweOrganizerRequests');
  // Empty requests never take up dashboard space.
  if(!rows.length){box?.remove();window.SWERefreshHomeActionCenter?.();return}
  const center=document.getElementById('homeActionCenter')||root;
  if(!box){box=document.createElement('section');box.id='sweOrganizerRequests';box.className='card';center.append(box)}
  else if(box.parentElement!==center)center.append(box);
  box.replaceChildren();
  const title=document.createElement('h2');title.className='sectiontitle';title.textContent='🙋 Demandes de participation à valider ('+rows.length+')';box.append(title);
  const intro=document.createElement('p');intro.textContent='Joueurs SWÉ extérieurs au groupe. Une acceptation crée leur inscription au tournoi, sous réserve des règles de places et de paiement.';box.append(intro);
  window.SWERefreshHomeActionCenter?.();
  for(const r of rows){
    const item=document.createElement('article');item.className='swe-organizer-request';
    const top=document.createElement('div');top.className='swe-request-top';
    const avatar=document.createElement('div');avatar.className='swe-request-avatar';avatar.textContent=String(r.display_name||'J').trim().charAt(0).toUpperCase();
    const content=document.createElement('div');content.className='swe-request-main';
    const headline=document.createElement('div');headline.className='swe-request-headline';
    const heading=document.createElement('h3');heading.textContent=r.display_name||'Joueur';
    const role=document.createElement('span');role.className='swe-request-role';role.textContent='Joueur extérieur';headline.append(heading,role);
    const details=document.createElement('div');details.className='swe-request-meta';
    const tour=document.createElement('p');tour.className='swe-request-tournament';tour.textContent=r.tournament_name||'Tournoi SWÉ';
    if(r.tournament_date){const d=document.createElement('span');d.className='swe-request-chip';d.textContent='📅 '+new Date(String(r.tournament_date)+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});details.append(d)}
    if(r.start_time){const time=document.createElement('span');time.className='swe-request-chip';time.textContent='⏰ '+String(r.start_time).slice(0,5);details.append(time)}
    content.append(headline,tour,details);top.append(avatar,content);
    const message=document.createElement('div');message.className='swe-request-message';
    const messageTitle=document.createElement('strong');messageTitle.textContent='MESSAGE DU JOUEUR';
    const messageBody=document.createElement('p');messageBody.textContent=r.message||'Aucun message du joueur';message.append(messageTitle,messageBody);
    const action=document.createElement('div');action.className='swe-organizer-request-actions';
    const feedback=document.createElement('span');feedback.setAttribute('role','status');
    for(const [accept,label] of [[true,'✅ Accepter'],[false,'Refuser']]){
      const btn=document.createElement('button');btn.type='button';btn.textContent=label;if(accept)btn.className='primary';
      btn.onclick=async()=>{if(!confirm((accept?'Accepter':'Refuser')+' la demande de '+r.display_name+' ?'))return;
       action.querySelectorAll('button').forEach(b=>b.disabled=true);
       const {data:result,error}=await sb.rpc('respond_global_player_participation_request',{p_request_id:r.request_id,p_accept:accept});
       if(error){feedback.textContent=error.message;action.querySelectorAll('button').forEach(b=>b.disabled=false);return}
       feedback.textContent=accept?(result?.payment_required?'Acceptée — paiement du joueur en attente':'Demande acceptée — inscription créée'):'Demande refusée';
       stamp=0;item.remove();
       if(!box.querySelector('.swe-organizer-request'))box.remove();
       window.SWERefreshHomeActionCenter?.();
      };action.append(btn);
    }
    action.append(feedback);item.append(top,message,action);box.append(item);
  }
 }catch(e){console.warn('Organizer pending SWÉ requests',e)}
 finally{pending=false}
}
document.addEventListener('DOMContentLoaded',()=>render(true));
document.addEventListener('swe:rendered',()=>render());
document.addEventListener('swe:page-view',()=>render());
window.addEventListener('pageshow',()=>render(true));
setInterval(()=>{if(document.visibilityState==='visible')render()},16000);
})();

;

;
/* SOURCE player-identity-v52.js */
/* Complete a player identity after Google / Apple or password sign-in. */
(()=>{
'use strict';
let busy=false,checked='',state=null;
const E=id=>document.getElementById(id);
const css='swe-identity-v52';
async function inspect(){
 let session;try{session=S?.session}catch(_){return}
 if(!session?.user||busy||document.getElementById('publicView')&&!document.getElementById('publicView').classList.contains('hidden'))return;
 if(checked===session.user.id)return;
 busy=true;
 try{
  let {data,error}=await sb.rpc('my_player_identity_form_v52');
  if(error){console.warn('Player identity check:',error.message);return}
  if(!data?.exists){const created=await sb.rpc('ensure_my_global_player_profile',{p_display_name:null});if(created.error){console.warn('Player profile:',created.error.message);return}const current=await sb.rpc('my_player_identity_form_v52');if(current.error)return;data=current.data;}
  checked=session.user.id;
  if(data.complete){E('sweIdentity52')?.remove();return}
  state=data;open();
 }finally{busy=false}
}
function open(){
 if(E('sweIdentity52'))return;
 const shade=document.createElement('div');shade.id='sweIdentity52';
 shade.innerHTML='<section role="dialog" aria-modal="true" aria-label="Compléter mon identité joueur" class="swe-identity-card"><h2>⚽ Complète ta fiche joueur</h2><p>Pour t’identifier auprès des organisateurs et participer aux SWÉs, indique tes informations personnelles.</p><form id="sweIdentityForm"><label>Prénom<input name="first" maxlength="80" required autocomplete="given-name"></label><label>Nom<input name="last" maxlength="80" required autocomplete="family-name"></label><label>Surnom<input name="nickname" maxlength="80" required></label><label>Date de naissance<input name="birth" type="date" required></label><label>Niveau de football (auto-évaluation)<select name="skill" required><option value="">Choisir…</option><option value="1">1 — Débutant</option><option value="2">2 — Occasionnel</option><option value="3">3 — Intermédiaire</option><option value="4">4 — Confirmé</option><option value="5">5 — Excellent</option></select></label><label>Photo de profil<input name="photo" type="file" accept="image/png,image/jpeg,image/webp"></label><div class="swe-identity-status" role="status"></div><button type="submit" class="primary">Enregistrer ma fiche</button></form></section>';
 document.body.append(shade);
 const f=E('sweIdentityForm');for(const [key,value] of [['first',state.first_name],['last',state.last_name],['nickname',state.nickname],['birth',state.birth_date],['skill',state.skill_level]])if(value!=null)f.elements[key].value=value;
 f.onsubmit=async ev=>{
  ev.preventDefault();const btn=f.querySelector('button');btn.disabled=true;const message=f.querySelector('[role="status"]');message.textContent='Enregistrement en cours…';
  try{
   let avatar=state.avatar_url;
   const file=f.elements.photo.files[0];
   if(file){
     if(file.size>3*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Photo JPG, PNG ou WebP, 3 Mo maximum.');
     const uid=S.session.user.id,path=uid+'/profile-'+Date.now()+'.'+(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg');
     const up=await sb.storage.from('player-avatars').upload(path,file,{contentType:file.type,upsert:false});
     if(up.error)throw up.error;
     avatar=sb.storage.from('player-avatars').getPublicUrl(path).data.publicUrl;
   }
   const {error}=await sb.rpc('save_my_player_identity_v52',{p_first:f.elements.first.value,p_last:f.elements.last.value,p_nickname:f.elements.nickname.value,p_birth:f.elements.birth.value,p_skill:Number(f.elements.skill.value),p_avatar_url:avatar||null});
   if(error)throw error;
   shade.remove();if(typeof toast==='function')toast('Fiche joueur enregistrée ✅');
  }catch(e){message.textContent=e.message||'Enregistrement impossible'}finally{btn.disabled=false}
 };
}
document.addEventListener('swe:rendered',inspect);
document.addEventListener('swe:page-view',inspect);
window.addEventListener('pageshow',()=>{checked='';inspect()});
setInterval(()=>{if(document.visibilityState==='visible')inspect()},5000);
})();

;

;
/* SOURCE admin-player-cards-v52.js */
(()=>{'use strict';
const $=id=>document.getElementById(id);
let busy=false,seen=0,lastWorkspace='';
function safely(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
async function refresh(){
 let s;try{s=S}catch(_){return}
 // Administrative details are not dashboard content: keep them in Joueurs / Notes.
 const view=$('view-players');
 const oldPanel=$('sweAdminPlayerIdentity52');
 if(!view||!s?.session?.user?.id||!s?.workspace?.id||s.workspace.role!=='admin'||s.publicMode){
  oldPanel?.remove();
  return;
 }
 if(oldPanel&&oldPanel.parentElement!==view)view.append(oldPanel);
 // Avoid loading the entire private player directory on every homepage refresh.
 if(!view.classList.contains('active'))return;
 if(lastWorkspace!==String(s.workspace.id)){lastWorkspace=String(s.workspace.id);seen=0}
 if(busy||Date.now()-seen<30000)return;busy=true;
 try{
  const {data,error}=await sb.rpc('admin_player_identity_cards_v52',{p_workspace_id:s.workspace.id});
  if(error)throw error;seen=Date.now();
  let block=$('sweAdminPlayerIdentity52');
  if(!block||block.tagName!=='DETAILS'){
   const replacement=document.createElement('details');
   replacement.id='sweAdminPlayerIdentity52';
   replacement.className='card swe-admin-player-details';
   if(block)block.replaceWith(replacement);else {const listCard=$('playersList')?.closest('.card');if(listCard)listCard.before(replacement);else view.append(replacement);}
   block=replacement;
  }else if(block.parentElement!==view)view.append(block);
  const previousSearch=$('sweAdminPlayerSearch52')?.value||'';
  const wasOpen=block.open;
  const players=(Array.isArray(data)?data:[]).filter(p=>!s.playerAliases?.[String(p.player_id)]);
  block.innerHTML='<summary class="sectiontitle">👤 Fiches administratives des joueurs <span class="muted" style="font-weight:400;font-size:.8em">· ouvrir les détails</span></summary><p class="muted">Informations réservées à l’administration : identité, participations, notation et historique des désistements tardifs (moins de 24 h avant le tournoi).</p><input id="sweAdminPlayerSearch52" placeholder="Rechercher un joueur" aria-label="Rechercher un joueur"><div id="sweAdminPlayerRows52"></div>';
  block.open=wasOpen;
  const rows=$('sweAdminPlayerRows52'),search=$('sweAdminPlayerSearch52');
  search.value=previousSearch;
  const paint=()=>{
   const needle=search.value.toLocaleLowerCase('fr');
   rows.replaceChildren();
   for(const p of players.filter(p=>[p.name,p.first_name,p.last_name,p.nickname].join(' ').toLocaleLowerCase('fr').includes(needle)).slice(0,80)){
    const card=document.createElement('details');card.className='swe-admin-player-card';
    const pct=p.late_withdrawal_pct==null?'Historique insuffisant':p.late_withdrawal_pct+' % ('+p.late_withdrawals+'/'+p.eligible_registrations+')';
    const kind=p.member?'Membre du groupe':p.guest_of?'Invité de '+p.guest_of:'Joueur extérieur SWÉ';
    const summary=document.createElement('summary');summary.textContent=(p.nickname||p.name||'Joueur')+' · '+kind;card.append(summary);
    const content=document.createElement('div');const count=s.playerParticipations?.[String(p.player_id)];content.innerHTML=(Number.isFinite(count)?'<p><strong>Tournois joués :</strong> '+count+'</p>':'')+'<p><strong>Identité :</strong> '+safely([p.first_name,p.last_name].filter(Boolean).join(' ')||'Non renseignée')+'</p><p><strong>Surnom :</strong> '+safely(p.nickname||'Non renseigné')+'</p><p><strong>Date de naissance :</strong> '+safely(p.birth_date||'Non renseignée')+'</p><p><strong>Niveau déclaré :</strong> '+safely(p.skill_level||'Non renseigné')+'</p><p><strong>Désistements de dernière minute :</strong> '+safely(pct)+'</p>';
    if(p.avatar_url){const img=document.createElement('img');img.src=p.avatar_url;img.alt='Photo de '+(p.nickname||p.name);img.width=64;img.height=64;img.style.borderRadius='50%';content.prepend(img)}
    card.append(content);rows.append(card);
   }
  };
  search.oninput=paint;paint();
  // Keep the last withdrawal alerts in the protected admin directory, not on the homepage.
  const {data:lateAlerts,error:lateError}=await sb.from('community_swe_organizer_alerts_v1')
    .select('id,player_name,minutes_before_start').order('id',{ascending:false}).limit(5);
  if(!lateError&&Array.isArray(lateAlerts)&&lateAlerts.length){
    const recent=document.createElement('section');recent.id='sweAdminRecentWithdrawals52';
    const title=document.createElement('h3');title.textContent='🚨 Désistements récents';recent.append(title);
    for(const item of lateAlerts){
      const line=document.createElement('p');line.textContent=String(item.player_name||'Joueur')+
        (item.minutes_before_start===null?'':' · '+String(item.minutes_before_start)+' min avant le début');
      recent.append(line);
    }
    search.before(recent);
  }
 }catch(e){console.warn('Admin player identities',e)}finally{busy=false}
}
document.addEventListener('swe:rendered',refresh);document.addEventListener('swe:page-view',refresh);window.addEventListener('pageshow',()=>{seen=0;refresh()});setInterval(()=>{if(document.visibilityState==='visible')refresh()},30000);
})();
;

;
/* SOURCE coorganizer-experience-v4402.js */
(()=>{
'use strict';
if(window.__SWE_COORGANIZER_EXPERIENCE_4402)return;window.__SWE_COORGANIZER_EXPERIENCE_4402=true;
const E=id=>document.getElementById(id),state=()=>{try{return S}catch(_){return null}},client=()=>{try{return sb}catch(_){return null}},esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let latest=null,busy=false,lastKey='',timer=0,observer=null;
const rights=[
 ['can_view_players','👤','Voir les joueurs'],['can_enter_scores','⚽','Saisir les scores'],
 ['can_generate_teams','👥','Gérer les équipes'],['can_create_tournaments','📅','Créer des tournois'],
 ['can_add_members','➕','Ajouter des joueurs'],['can_delete_members','➖','Retirer des joueurs'],
 ['can_invite_coorganizers','🛠️','Inviter des co-gestionnaires']
];
function css(){if(E('swe4402Style'))return;const x=document.createElement('style');x.id='swe4402Style';x.textContent=`
.swe-coorg-rights .swe-coorg-chips{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px!important}.swe-coorg-rights .swe-coorg-chips span{margin:0!important;border:1px solid #d8e1e9!important;background:#f1f4f6!important;color:#77828e!important;opacity:.82}.swe-coorg-rights .swe-coorg-chips span.allowed{background:#dff8e9!important;border-color:#72d49a!important;color:#11643a!important;opacity:1;box-shadow:0 4px 12px #16845118}.swe-coorg-rights .swe-coorg-chips span.denied{filter:grayscale(1)}
.organizer-access-banner [data-go="home"]{background:linear-gradient(135deg,#ffd84e,#f4b900)!important;color:#102342!important;border:1px solid #d99f00!important;font-weight:950!important;box-shadow:0 7px 17px #b07a0029!important}.organizer-access-banner [data-go="home"]:hover{transform:translateY(-1px)}
.swe4402-rating{border:2px solid #efc544!important;background:linear-gradient(145deg,#fffdf4,#fff4c7)!important}.swe4402-rating .swe-coorg-action-icon{background:#ffe58a!important}.swe4402-rating button{background:linear-gradient(90deg,#efb51d,#ffcf3d)!important;color:#102342!important;font-weight:950!important}.swe4402-rating-label{font-size:10px;font-weight:950;letter-spacing:.06em;color:#845700;margin-bottom:3px}
@media(max-width:650px){.swe-coorg-rights .swe-coorg-chips{grid-template-columns:1fr}}
`;document.head.appendChild(x)}
function permissions(){const s=state(),box=E('sweCoorgDashboard4399')?.querySelector('.swe-coorg-chips');if(!box||s?.workspace?.role!=='coorganizer')return;const p=s.myPermissions||{};const signature=rights.map(r=>p[r[0]]?'1':'0').join('');if(box.dataset.sweRights===signature)return;box.dataset.sweRights=signature;box.innerHTML=rights.map(r=>'<span class="'+(p[r[0]]?'allowed':'denied')+'">'+(p[r[0]]?'✓ ':'🔒 ')+r[1]+' '+r[2]+'</span>').join('')}
function commercial(){const b=E('organizerAccessBanner')?.querySelector('[data-go="home"]'),label='Développer toute la puissance de SWÉ →';if(b&&b.textContent!==label)b.textContent=label}
function fmt(v){if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}
function ratingCard(d){const a=d.rating_action||{},t=d.tournament||{},total=Number(a.total||0),done=Number(a.done||0),pct=total?Math.min(100,Math.round(done*100/total)):0;return '<article class="swe-coorg-action active swe4402-rating" data-action-kind="rating" data-swe-latest-rating="4402"><div class="swe-coorg-action-top"><span class="swe-coorg-action-icon">👤⭐</span><div><div class="swe4402-rating-label">DERNIER SWÉ JOUÉ</div><h3>Noter les joueurs</h3><p>L’administrateur t’a désigné pour noter les joueurs après ce tournoi.</p></div>'+(a.deadline?'<span class="swe-coorg-deadline">⏱ Avant le '+fmt(a.deadline)+'</span>':'')+'</div><div class="swe-coorg-progress-label"><span>🏆 '+esc(t.name||'Dernier tournoi')+'</span><b>'+done+' sur '+total+' joueurs notés</b></div><div class="swe-coorg-progress" role="progressbar" aria-valuemin="0" aria-valuemax="'+total+'" aria-valuenow="'+done+'"><span style="width:'+pct+'%"></span></div><button type="button" data-rate-latest="'+esc(t.id)+'">Noter les joueurs →</button></article>'}
function actions(){const root=E('sweCoorgDashboard4399');if(!root||root.querySelector('#sweVoteTournamentSelect'))return;root.querySelectorAll('[data-action-kind="team"].waiting,[data-action-kind="team"].locked,[data-action-kind="team"].expired').forEach(x=>x.remove());const a=latest?.rating_action||{},show=!!latest?.assigned&&Number(a.total||0)>Number(a.done||0)&&a.status==='open'&&!!a.deadline&&new Date(a.deadline).getTime()>Date.now(),section=[...root.querySelectorAll('.swe-coorg-section')].find(x=>x.querySelector('h2')?.textContent.includes('Actions à réaliser'));let wrap=root.querySelector('.swe-coorg-actions');if(!wrap&&show&&section){section.querySelector(':scope > .muted')?.remove();wrap=document.createElement('div');wrap.className='swe-coorg-actions';section.appendChild(wrap)}if(!wrap)return;const existing=wrap.querySelector('[data-swe-latest-rating]');if(show&&!existing){wrap.querySelector('[data-action-kind="rating"]')?.remove();wrap.insertAdjacentHTML('beforeend',ratingCard(latest));wrap.querySelector('[data-rate-latest]')?.addEventListener('click',e=>{const id=e.currentTarget.dataset.rateLatest,u=new URL(location.href);u.searchParams.set('rate',id);location.assign(u.toString())})}else if(!show&&existing)existing.remove();const visible=[...wrap.querySelectorAll('.swe-coorg-action')].filter(x=>x.isConnected).length,badge=root.querySelector('.swe-coorg-pending'),label='🕒 '+visible+' action'+(visible>1?'s':'')+' en attente';if(badge&&badge.textContent!==label)badge.textContent=label;if(!visible){const parent=wrap.closest('.swe-coorg-section');if(parent)wrap.outerHTML='<div class="muted">Aucune action ne t’est demandée pour le moment.</div>'}}
async function loadLatest(){const s=state(),c=client();if(s?.workspace?.role!=='coorganizer'||!s.workspace?.id||!c||busy)return;const key=String(s.workspace.id);if(key===lastKey&&latest)return;busy=true;try{const r=await c.rpc('get_my_coorganizer_latest_rating_action_v1',{p_workspace_id:s.workspace.id});if(!r.error){latest=r.data||{assigned:false};lastKey=key}}catch(e){console.warn('Action de notation indisponible',e)}finally{busy=false;apply()}}
function apply(){css();permissions();commercial();actions()}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>{apply();loadLatest()},50)}
observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('swe:rendered',schedule);document.addEventListener('swe:dashboard-ready',schedule);window.addEventListener('pageshow',schedule);schedule();
})();

;

;
/* SOURCE player-profile-identity-v52.js */
(()=>{'use strict';
const E=id=>document.getElementById(id);let waiting=false,stamp=0;
async function render(){
 let s;try{s=S}catch(_){return}
 const view=E('view-myplayer');if(!view||!s?.session||waiting||Date.now()-stamp<15000)return;
 waiting=true;
 try{
 const {data,error}=await sb.rpc('my_player_identity_form_v52');
 if(error||!data?.exists)return;
 // Preserve live controls and unsaved changes when background refresh runs.
 if(E('swePlayerPreferencesTab52')&&E('sweProfileCatalog52')&&E('sweProfileNotifications52')){stamp=Date.now();return;}
 E('swePlayerPreferencesTab52')?.remove();
 stamp=Date.now();
 let section=E('sweProfileIdentity52');if(!section){section=document.createElement('section');section.id='sweProfileIdentity52';section.className='card';view.append(section)}
 section.dataset.playerSections='profile';section.style.setProperty('--player-order','2');
 section.classList.toggle('swe-player-filtered',view.dataset.playerPanel!=='profile');
 section.replaceChildren();
 const title=document.createElement('h2');title.textContent='👤 Mes informations personnelles';section.append(title);
 const row=document.createElement('div');row.className='swe-profile-id-row';
 if(data.avatar_url){const img=document.createElement('img');img.src=data.avatar_url;img.alt='Ma photo de profil';img.width=112;img.height=112;row.append(img)}
 const text=document.createElement('div');for(const [label,val] of [['Prénom',data.first_name],['Nom',data.last_name],['Surnom',data.nickname],['Date de naissance',data.birth_date],['Niveau déclaré',data.skill_level?data.skill_level+'/5':null]]){const p=document.createElement('p');p.textContent=label+' : '+(val||'Non renseigné');text.append(p)}row.append(text);section.append(row);
 const prefs=document.createElement('div');prefs.className='swe-profile-preferences';
 prefs.innerHTML='<div class="swe-pref-heading"><span class="swe-pref-badge">⚙️</span><div><h2>Mes préférences</h2><p>Personnalise ton expérience SWÉ Tournament selon tes envies.</p></div></div><div class="swe-pref-panel"><h3>👤 Visibilité et communications</h3><p>Ton profil est privé par défaut. Choisis les informations que tu souhaites partager.</p><label class="swe-pref-setting"><input id="sweProfileCatalog52" type="checkbox"><span><strong>Rendre mon profil public et visible dans le catalogue</strong><small>Les autres joueurs pourront découvrir ton profil.</small></span></label><label class="swe-pref-setting"><input id="sweProfileNotifications52" type="checkbox"><span><strong>Recevoir les informations sur les SWÉs</strong><small>Actualités et communications de la communauté.</small></span></label></div><div class="swe-pref-panel"><h3>🔔 Notifications sur cet appareil</h3><p>Sois prévenu des matchs, équipes et tournois même lorsque ton téléphone est verrouillé.</p><div class="swe-pref-setting"><span class="swe-pref-push-status" id="sweProfilePushStatus52">Vérification des notifications…</span><button type="button" id="sweProfilePushEnable52" class="swe-pref-push-button">Activer les notifications</button></div></div><button type="button" class="primary" id="sweProfilePrefsSave52">💾 Enregistrer mes préférences</button><span id="sweProfilePrefsFeedback52" role="status"></span>';
 section.append(prefs);
 const preferencesSection=document.createElement('section');preferencesSection.id='swePlayerPreferencesTab52';preferencesSection.className='card';preferencesSection.dataset.playerSections='preferences';preferencesSection.style.setProperty('--player-order','3');preferencesSection.classList.toggle('swe-player-filtered',view.dataset.playerPanel!=='preferences');preferencesSection.append(prefs);section.after(preferencesSection);
 const theme=document.createElement('fieldset');theme.className='swe-profile-theme-choices';theme.innerHTML='<legend>🎨 Préférence d’affichage</legend><label><input type="radio" name="sweProfileTheme52" value="light"><span>☀️ <strong>Mode clair</strong><small>Thème lumineux et moderne</small></span></label><label><input type="radio" name="sweProfileTheme52" value="dark"><span>🌙 <strong>Mode sombre</strong><small>Pour plus de confort visuel</small></span></label>';prefs.insertBefore(theme,E('sweProfilePrefsSave52'));
 theme.querySelector('input[value="'+(document.documentElement.dataset.sweTheme==='dark'?'dark':'light')+'"]').checked=true;
 theme.addEventListener('change',e=>{if(e.target.name!=='sweProfileTheme52')return;const mode=e.target.value;try{localStorage.setItem('swe-theme',mode)}catch(_){}if(document.documentElement.dataset.sweTheme!==mode){const toggle=document.getElementById('sweThemeToggle');if(toggle)toggle.click();else document.documentElement.dataset.sweTheme=mode;}});
 const pushButton=E('sweProfilePushEnable52'),pushStatus=E('sweProfilePushStatus52');
 async function refreshPushPreferences(){
  if(!pushButton||!pushStatus)return;
  if(!('Notification'in window)||!('PushManager'in window)||!('serviceWorker'in navigator)){pushStatus.textContent='Notifications push indisponibles sur ce navigateur';pushButton.disabled=true;return}
  const registered=await navigator.serviceWorker.getRegistration().catch(()=>null);
  const subscription=await registered?.pushManager.getSubscription().catch(()=>null);
  const enabled=Notification.permission==='granted'&&!!subscription;
  pushStatus.textContent=enabled?'✓ Notifications activées sur cet appareil':Notification.permission==='denied'?'Notifications bloquées dans les réglages du navigateur':'Notifications désactivées sur cet appareil';
  pushButton.textContent=enabled?'✓ Déjà activées':'Activer les notifications';
  pushButton.disabled=enabled||Notification.permission==='denied';
 }
 pushButton.onclick=async()=>{pushButton.disabled=true;pushButton.textContent='Activation…';try{
  if(typeof window.SWEEnablePushNotifications!=='function')throw Error('Module de notifications indisponible');
  await window.SWEEnablePushNotifications();
  localStorage.setItem('swe_push_enabled_device_v1','1');
  pushStatus.textContent='✓ Notifications push activées';
 }catch(e){pushStatus.textContent=e?.message||'Activation impossible'}finally{await refreshPushPreferences()}};
 refreshPushPreferences();
 const profile=s.playerDashboard?.profile||{};E('sweProfileCatalog52').checked=!!profile.is_public&&!!profile.discoverable;E('sweProfileNotifications52').checked=!!profile.notify_upcoming_swes;
 E('sweProfilePrefsSave52').onclick=async()=>{const btn=E('sweProfilePrefsSave52');btn.disabled=true;const show=E('sweProfilePrefsFeedback52');const visible=E('sweProfileCatalog52').checked;const {error}=await sb.rpc('update_my_global_player_profile',{p_display_name:data.nickname||profile.display_name||'',p_is_public:visible,p_discoverable:visible,p_notify_upcoming_swes:E('sweProfileNotifications52').checked,p_home_area:profile.home_area||null});show.textContent=error?'Erreur : '+error.message:'✓ Préférences enregistrées';btn.disabled=false};
 }finally{waiting=false}
}
document.addEventListener('swe:rendered',render);document.addEventListener('swe:page-view',render);window.addEventListener('pageshow',()=>{stamp=0;render()});setInterval(()=>{if(document.visibilityState==='visible')render()},16000);
})();
;

;
/* SOURCE player-organizer-offers-v52.js */
/* Offer comparison before launching a player's organizer workspace. */
(()=>{
 'use strict';
 const E=id=>document.getElementById(id);
 let selected='standard',billing='monthly';
 function mount(){
  const view=E('view-myplayer');
  if(!view)return;
  let card=E('sweOrganizerOffers52');
  if(!card){
   card=document.createElement('section');
   card.id='sweOrganizerOffers52';
   card.className='card';
   card.dataset.playerSections='organizer';
   card.style.setProperty('--player-order','1');
   card.innerHTML='<h2>🏆 Créer mon espace organisateur</h2><p>Compare les formules SWÉ et leurs options avant de choisir ton espace.</p><div id="sweOrganizerCatalog52"></div><p class="swe-organizer-disclaimer">Le choix d’une formule ici ne déclenche aucun paiement ni abonnement. Les éventuelles conditions commerciales seront confirmées dans le parcours de souscription.</p><button type="button" class="primary" id="sweOrganizerContinue52">Continuer vers la création de mon espace →</button><p id="sweOrganizerOfferStatus52" role="status"></p>';
   view.append(card);
   E('sweOrganizerContinue52').onclick=()=>{
     try{localStorage.setItem('swe_selected_offer',selected);localStorage.setItem('swe_selected_billing',billing)}catch(_){}
     if(typeof window.SWEPlayerHome?.openOffers==='function')window.SWEPlayerHome.openOffers();
     else E('becomeOrganizer')?.click();
   };
  }
  card.classList.toggle('swe-player-filtered',view.dataset.playerPanel!=='organizer');
  const catalog=E('sweOrganizerCatalog52');
  if(!catalog.dataset.offerMounted){
    if(typeof window.SWEOffers?.mount==='function'){
      window.SWEOffers.mount(catalog,{organizer:true,onSelect:(code,annual)=>{
       if(code)selected=code;
       billing=annual?'annual':'monthly';
       const line=E('sweOrganizerOfferStatus52');
       if(line)line.textContent=code?'Formule choisie : '+(code==='standard'?'Standard':code==='pro'?'Pro':code)+'. Tu peux consulter toutes les options avant de poursuivre.':'';
      }});
    }else catalog.textContent='Catalogue temporairement indisponible. Réessaie après actualisation.';
  }
 }
 document.addEventListener('swe:rendered',mount);
 document.addEventListener('swe:page-view',mount);
 window.addEventListener('pageshow',mount);
 window.SWEOrganizerOffers52={mount};
})();
;

;
/* SOURCE admin-revolut-cooler-v52.js */
(()=>{'use strict';let loading=false,when=0,workspace='';
const E=id=>document.getElementById(id);
const fmt=n=>(Number(n||0)/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
async function load(force=false){
 let s;try{s=S}catch(_){return}const root=E('view-cooler');
 if(!root||s?.workspace?.role!=='admin'||!s?.workspace?.id||s.publicMode)return;
 if(loading||(!force&&when>Date.now()-20000&&workspace===s.workspace.id))return;
 loading=true;
 try{
  const {data,error}=await sb.rpc('admin_revolut_glaciere_tournaments_v1',{p_workspace_id:s.workspace.id});
  if(error)throw error;when=Date.now();workspace=s.workspace.id;
  const items=Array.isArray(data)?data:[];
  let box=E('sweRevolutReconcile52');if(!box){box=document.createElement('section');box.id='sweRevolutReconcile52';box.className='card';root.append(box)}
  box.hidden=!items.length;if(!items.length)return;
  box.innerHTML='<h2>💶 Glacière — vérifier les paiements Revolut</h2><p>Le lien Revolut personnel ne confirme pas automatiquement les transactions dans SWÉ. Vérifie d’abord le paiement dans Revolut, puis associe-le au joueur ici.</p><label>Tournoi <select id="sweRevolutTournament52"></select></label><div id="sweRevolutPlayers52" role="status"></div>';
  const select=E('sweRevolutTournament52');
  items.forEach(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=item.name+' · '+item.date;select.append(option)});
  const wanted=items.find(x=>x.date>='2026-10-18');if(wanted)select.value=wanted.id;
  const refresh=async()=>{
   const area=E('sweRevolutPlayers52');area.textContent='Chargement…';
   const {data:result,error:err}=await sb.rpc('admin_revolut_glaciere_review_v1',{p_tournament_id:select.value});
   if(err){area.textContent=err.message;return}
   const players=result?.players||[];area.replaceChildren();
   const label=document.createElement('p');label.textContent='Choisis le joueur dont tu as vérifié le virement. Les paiements confirmés figurent ci-dessous.';area.append(label);
   const form=document.createElement('form');form.className='swe-revolut-form';
   const player=document.createElement('select');player.required=true;
   players.forEach(p=>{const opt=document.createElement('option');opt.value=p.player_id;opt.textContent=p.player_name+(p.confirmed_cents!=null?' — confirmé '+fmt(p.confirmed_cents):'');player.append(opt)});
   const amount=document.createElement('input');amount.type='number';amount.min='0.50';amount.max='500';amount.step='0.01';amount.value='3.00';amount.required=true;amount.setAttribute('aria-label','Montant reçu en euros');
   const reference=document.createElement('input');reference.type='text';reference.maxLength=140;reference.required=true;reference.placeholder='Référence ou date et libellé Revolut';reference.setAttribute('aria-label','Référence de transaction vérifiée');
   const button=document.createElement('button');button.type='submit';button.className='primary';button.textContent='Confirmer le paiement vérifié';
   const status=document.createElement('p');status.setAttribute('role','status');
   for(const [text,input] of [['Joueur',player],['Montant (€)',amount],['Référence Revolut',reference]]){const l=document.createElement('label');l.textContent=text;l.append(input);form.append(l)}
   form.append(button,status);area.append(form);
   form.onsubmit=async ev=>{ev.preventDefault();if(!confirm('As-tu vérifié ce paiement sur ton compte Revolut ?'))return;button.disabled=true;const cents=Math.round(Number(amount.value)*100);const {error:e}=await sb.rpc('admin_confirm_revolut_glaciere_v1',{p_tournament_id:select.value,p_player_id:player.value,p_amount_cents:cents,p_reference:reference.value.trim()});if(e){status.textContent=e.message;button.disabled=false;return}await refresh()};
   for(const p of players.filter(p=>p.confirmed_cents!=null)){const row=document.createElement('p');row.textContent='✓ '+p.player_name+' : '+fmt(p.confirmed_cents)+' vérifiés';area.append(row)}
  };
  select.onchange=refresh;await refresh();
 }catch(e){console.warn('Revolut cooler admin',e)}finally{loading=false}
}
document.addEventListener('swe:rendered',()=>load());window.addEventListener('pageshow',()=>load(true));setInterval(()=>{if(document.visibilityState==='visible')load()},30000);
})();
;

;
/* SOURCE organizer-notifications-v54.js */
(()=>{'use strict';
const E=id=>document.getElementById(id);let busy=false,lastPoll=0;
function state(){try{return S}catch(_){return null}}

async function enablePush(){
 if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw Error('Push non disponible sur cet appareil');
 if(!state()?.session?.user?.id)throw Error('Connexion nécessaire');
 const response=await fetch('https://fbppesfxkvledwjemwsn.supabase.co/functions/v1/swe-push');
 if(!response.ok)throw Error('Service push indisponible');
 const config=await response.json();
 if(!config.enabled||!config.publicKey)throw Error('Clés push non configurées');
 const permission=await Notification.requestPermission();
 if(permission!=='granted')throw Error('Autorisation non accordée');
 const reg=await navigator.serviceWorker.ready;
 const base64=config.publicKey.replace(/-/g,'+').replace(/_/g,'/');
 const bytes=Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length/4)*4,'=')),char=>char.charCodeAt(0));
 let sub=await reg.pushManager.getSubscription();
 if(sub?.options?.applicationServerKey&&String(Array.from(new Uint8Array(sub.options.applicationServerKey)))!==String(Array.from(bytes))){
  await sub.unsubscribe();sub=null;
 }
 if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
 const json=sub.toJSON();
 const result=await sb.rpc('swe_save_push_subscription',{p_endpoint:json.endpoint,p_p256dh:json.keys.p256dh,p_auth:json.keys.auth});
 if(result.error)throw Error(result.error.message);
}


let promptShowing=false;
async function offerPushOnLogin(){
 const s=state(),uid=s?.session?.user?.id;
 if(!uid||s.publicMode||!s.workspace?.id||promptShowing||E('swePushFirstLoginDialog'))return;
 if(!('Notification'in window)||!('PushManager'in window)||!('serviceWorker'in navigator))return;
 const key='swe_push_first_login_offer_20261018:'+uid;
 if(localStorage.getItem(key))return;
 if(Notification.permission==='denied'){localStorage.setItem(key,'blocked');return}
 if(Notification.permission==='granted'){
  const reg=await navigator.serviceWorker.ready.catch(()=>null);
  const sub=await reg?.pushManager.getSubscription().catch(()=>null);
  if(sub){localStorage.setItem(key,'already_enabled');return}
 }
 promptShowing=true;
 const overlay=document.createElement('div');
 overlay.id='swePushFirstLoginDialog';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-label','Activer les notifications SWÉ');
 overlay.style.cssText='position:fixed;inset:0;z-index:2147483600;background:rgba(4,15,29,.68);display:flex;align-items:center;justify-content:center;padding:20px';
 const panel=document.createElement('div');
 panel.style.cssText='background:#fff;color:#102f49;border-radius:20px;padding:24px;max-width:390px;width:100%;box-shadow:0 18px 60px #0005;font:inherit';
 const title=document.createElement('h2');title.textContent='🔔 Activer les notifications SWÉ ?';
 const info=document.createElement('p');info.textContent='Reçois les informations de ton équipe, tes matchs et les annonces importantes, même lorsque ton téléphone est verrouillé.';
 const actions=document.createElement('div');actions.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin-top:20px';
 const yes=document.createElement('button');yes.type='button';yes.textContent='Activer les notifications';yes.className='primary';
 const later=document.createElement('button');later.type='button';later.textContent='Plus tard';
 const feedback=document.createElement('p');feedback.style.cssText='font-size:13px;margin-top:10px';
 const close=()=>{overlay.remove();promptShowing=false};
 later.onclick=()=>{localStorage.setItem(key,'later');close()};
 yes.onclick=async()=>{
  yes.disabled=true;yes.textContent='Activation…';
  try{
   await enablePush();
   localStorage.setItem('swe_push_enabled_device_v1','1');
   localStorage.setItem(key,'enabled');
   close();check();
  }catch(err){
   feedback.textContent=err?.message||'Activation impossible, réessaie depuis l’accueil.';
   yes.disabled=false;yes.textContent='Réessayer';
   if(Notification.permission==='denied'){localStorage.setItem(key,'blocked');yes.disabled=true}
  }
 };
 actions.append(yes,later);panel.append(title,info,actions,feedback);overlay.append(panel);document.body.append(overlay);
 yes.focus();
}
function schedulePushOffer(){offerPushOnLogin().catch(e=>console.warn('SWÉ push opt-in',e))}

window.SWEEnablePushNotifications=enablePush;

async function check(force=false){
const s=state();if(!s?.session?.user?.id||s.publicMode||busy)return;
if(!force&&Date.now()-lastPoll<20000)return;busy=true;lastPoll=Date.now();
try{
 const uid=s.session.user.id,key='swe_org_notification_seen_v54:'+uid,stored=localStorage.getItem(key),after=Number(stored)||0;
 const {data,error}=await sb.rpc('my_swe_organizer_notifications_v54',{p_after_id:0});if(error)throw error;
 const allItems=Array.isArray(data)?data:[];
 const items=allItems.filter(n=>Number(n.id)>after);
 const manager=['admin','coorganizer'].includes(s.workspace?.role);
 const playerHome=E('view-myplayer');
 const usePlayerHome=!!playerHome?.classList.contains('active')&&!E('main')?.classList.contains('hidden');
 const root=manager?E('sweNotificationsContainer'):(usePlayerHome?playerHome:null);
 const dedicated=manager&&!!E('view-notifications')?.classList.contains('active');
 const badge=E('sweNotificationsUnreadBadge');
 if(badge){
   const unseen=Math.max(0,items.length);
   badge.textContent=unseen>99?'99+':String(unseen);
   badge.classList.toggle('hidden',unseen===0||dedicated);
 }
 if(root){let card=E('sweOrganizerNotificationsV54');if(!card){card=document.createElement('section');card.id='sweOrganizerNotificationsV54';card.className=manager?'swe-notifications-content':'card swe-notifications-home-card';root.append(card)}else if(card.parentElement!==root){root.append(card)}
 // Player notifications are a separate dashboard section, never nested inside Mes SWÉs.
 if(!manager){card.dataset.playerSections='home mine';card.style.setProperty('--player-order','24');card.classList.toggle('swe-player-filtered',playerHome?.dataset.playerPanel!=='home'&&playerHome?.dataset.playerPanel!=='mine');}
 else{delete card.dataset.playerSections;card.style.removeProperty('--player-order');card.classList.remove('swe-player-filtered');}
 let heading=card.querySelector('h2');if(!heading&&!manager){heading=document.createElement('h2');heading.textContent='🔔 Mes notifications SWÉ';card.prepend(heading)}
 if(heading&&manager)heading.remove();
 let button=E('sweEnableNotificationsV54');if(!button){button=document.createElement('button');button.type='button';button.id='sweEnableNotificationsV54';card.append(button);button.onclick=async()=>{button.disabled=true;button.textContent='Activation…';try{await enablePush();button.textContent='✓ Notifications push activées';localStorage.setItem('swe_push_enabled_device_v1','1')}catch(e){button.textContent=e.message||'Activation impossible'}finally{button.disabled=false}};}
 button.textContent=!('PushManager'in window)?'Notifications push non prises en charge':(Notification.permission==='granted'&&localStorage.getItem('swe_push_enabled_device_v1')==='1')?'✓ Notifications push activées':Notification.permission==='granted'?'Activer les notifications push':'Autoriser les notifications sur cet appareil';
 let box=E('sweOrganizerNotificationsListV54');if(!box){box=document.createElement('div');box.id='sweOrganizerNotificationsListV54';card.append(box)}
 box.replaceChildren();
 for(const n of allItems.slice(-12).reverse()){const p=document.createElement('p');p.className='swe-notification-entry';const title=document.createElement('strong');title.textContent=n.title||'Notification SWÉ';const body=document.createElement('span');body.textContent=n.body||'';p.append(title,body);box.append(p)}
 // Recent withdrawals are private player-management information, not homepage content.
 E('sweHomeLateWithdrawalsV1')?.remove();

 if(!allItems.length)box.textContent='Aucune notification pour le moment. Les prochaines inscriptions et informations de matchs apparaîtront ici.';
 }
 if(dedicated&&items.length){
   localStorage.setItem(key,String(Math.max(...items.map(n=>Number(n.id)||0))));
   if(badge)badge.classList.add('hidden');
 }
 if(items.length&&stored&&typeof Notification!=='undefined'&&Notification.permission==='granted'){
   const notifiedKey='swe_org_push_notified_v54:'+uid;
   const notified=Number(localStorage.getItem(notifiedKey)||after);
   const unseenPush=items.filter(n=>Number(n.id)>notified).slice(-5);
   if(unseenPush.length){
     const reg=await navigator.serviceWorker?.ready.catch(()=>null);
     if(reg){
       for(const item of unseenPush)await reg.showNotification(item.title,{body:item.body,tag:'swe-'+item.id,icon:'/icon-192.png',badge:'/icon-192.png',data:{url:'/?space=management'}});
       localStorage.setItem(notifiedKey,String(Math.max(...unseenPush.map(n=>Number(n.id)||0))));
     }
   }
 }
}catch(e){console.warn('SWÉ notifications',e)}finally{busy=false}
}
window.addEventListener('pageshow',()=>{check(true);schedulePushOffer()});document.addEventListener('swe:rendered',()=>{check();schedulePushOffer()});document.addEventListener('swe:page-view',()=>{if(E('view-notifications')?.classList.contains('active'))check(true)});setInterval(()=>{if(document.visibilityState==='visible')check()},30000);
})();
;

;
/* SOURCE simple-swe-page-v4350.js */
(()=>{
'use strict';
if(window.__SWE_SIMPLE_PAGE_4351)return;window.__SWE_SIMPLE_PAGE_4351=true;
const E=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const state=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
const api=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};
let venues={complexes:[],venues:[]},mine={created:[],participations:[]},thirdIncluded=false,visibility='public',capacity=10,loading=false,staged=[],organizerTools={allowed:false,catalog:[],members:[]};
const DRAFT_KEY='swe-simple-draft-v4351';
function money(c){return (Number(c||0)/100).toLocaleString('fr-FR',{minimumFractionDigits:0,maximumFractionDigits:2})+' €'}
function toastMsg(t){try{if(typeof toast==='function')return toast(t)}catch(_){ }const x=E('toast');if(x){x.textContent=t;x.style.display='block';setTimeout(()=>x.style.display='none',3000)}}
function tomorrow(){const d=new Date();d.setDate(d.getDate()+1);return d.toISOString().slice(0,10)}
function workspaceId(){return state()?.workspace?.id||null}
function avatarHtml(x,cls=''){const url=x?.avatar_url||'';return url?'<img class="swe4351-avatar '+cls+'" src="'+esc(url)+'" alt="">':'<span class="swe4351-avatar '+cls+'">'+esc((x?.display_name||'?').slice(0,1).toUpperCase())+'</span>'}
function css(){if(E('swe4351Css'))return;const s=document.createElement('style');s.id='swe4351Css';s.textContent=`
html[data-simple-swe-premium="1"] body{background:#eef4fb!important}html[data-simple-swe-premium="1"] .tabs,html[data-simple-swe-premium="1"] .top{display:none!important}html[data-simple-swe-premium="1"] .app{max-width:none!important;padding:0 0 80px!important;margin:0!important}html[data-simple-swe-premium="1"] #view-simple-swe{display:block!important}
#simpleSweTab{display:flex!important}#simpleSweTab:before{content:'⚽'!important}
#view-simple-swe{max-width:none!important;margin:0!important;padding:0!important;color:#0b2347}.swe4351-sitebar{height:68px;background:#071f45;color:#fff;display:flex;align-items:center;gap:26px;padding:0 max(22px,calc((100vw - 1320px)/2));position:sticky;top:0;z-index:60;box-shadow:0 6px 24px rgba(3,19,47,.18)}.swe4351-brand{display:flex;align-items:center;gap:10px;font-weight:950;letter-spacing:.02em;white-space:nowrap}.swe4351-brand img{width:38px;height:38px;border-radius:50%;object-fit:cover}.swe4351-brand span{line-height:1.05}.swe4351-nav{display:flex;gap:8px;align-items:center;flex:1}.swe4351-nav button{background:transparent!important;border:0!important;color:#dce9f9!important;min-height:38px!important;padding:8px 11px!important;font-size:13px!important}.swe4351-nav button:hover{background:rgba(255,255,255,.08)!important}.swe4351-nav .grow{margin-left:auto}.swe4351-account{display:flex;align-items:center;gap:8px;color:#fff;font-weight:800;font-size:13px}
.swe4351-hero{position:relative;overflow:hidden;background:radial-gradient(circle at 72% 24%,rgba(255,214,88,.28),transparent 20%),radial-gradient(circle at 66% 8%,rgba(255,255,255,.22),transparent 18%),linear-gradient(115deg,#061b3c 0%,#0d356f 48%,#123e75 100%);color:#fff;padding:30px max(22px,calc((100vw - 1320px)/2)) 34px;min-height:310px}.swe4351-hero:before{content:'';position:absolute;inset:0;background:repeating-radial-gradient(ellipse at 70% 130%,rgba(255,255,255,.055) 0 1px,transparent 1px 28px);opacity:.7;pointer-events:none}.swe4351-hero:after{content:'10';position:absolute;right:max(5vw,90px);bottom:-64px;font-size:285px;line-height:1;font-weight:1000;color:rgba(255,255,255,.06);letter-spacing:-.08em;transform:skewX(-7deg)}.swe4351-breadcrumb{font-size:12px;color:#bdd0e9;margin-bottom:14px;position:relative;z-index:2}.swe4351-free{display:inline-flex;border:1px solid #f4c84e;background:rgba(7,31,69,.45);color:#fff6cc;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:950;letter-spacing:.05em}.swe4351-hero h1{font-size:45px;line-height:1.02;margin:10px 0 8px;max-width:770px;letter-spacing:-.035em;position:relative;z-index:2}.swe4351-gold{color:#f0bd35}.swe4351-hero p{max-width:760px;margin:0;color:#dbe8f7;font-size:16px;line-height:1.55;position:relative;z-index:2}.swe4351-visibility{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:820px;margin-top:18px;position:relative;z-index:2}.swe4351-choice{position:relative;text-align:left;display:grid;grid-template-columns:48px 1fr;gap:12px;align-items:center;background:rgba(255,255,255,.96)!important;color:#102b55!important;border:2px solid transparent!important;border-radius:17px!important;padding:13px 15px!important;box-shadow:0 10px 26px rgba(0,0,0,.16);min-height:86px!important}.swe4351-choice .ico{width:42px;height:42px;border-radius:12px;background:#edf4ff;display:grid;place-items:center;font-size:22px}.swe4351-choice b{display:block;font-size:15px}.swe4351-choice small{display:block;color:#657b96;font-weight:650;margin-top:3px;line-height:1.35}.swe4351-choice.active{border-color:#147df3!important;box-shadow:0 0 0 4px rgba(20,125,243,.14),0 14px 30px rgba(0,0,0,.18)}.swe4351-choice.active:after{content:'✓';position:absolute;right:12px;top:12px;width:23px;height:23px;border-radius:50%;background:#147df3;color:#fff;display:grid;place-items:center;font-weight:950}
.swe4351-wrap{max-width:1320px;margin:-14px auto 0;padding:0 22px 50px;position:relative;z-index:5}.swe4351-columns{display:grid;grid-template-columns:minmax(0,1.95fr) minmax(310px,.85fr);gap:18px;align-items:start}.swe4351-card{background:#fff;border:1px solid #d9e5f3;border-radius:20px;box-shadow:0 10px 32px rgba(11,43,84,.08);padding:20px;margin-bottom:14px}.swe4351-section-title{display:flex;align-items:center;gap:10px;margin:0;font-size:18px;color:#0b2b54;letter-spacing:-.01em}.swe4351-stepnum{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#e9f3ff;color:#0d71d9;font-weight:950}.swe4351-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.swe4351-muted{font-size:12px;color:#71839a}.swe4351-grid3{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:11px}.swe4351-grid4{display:grid;grid-template-columns:1.2fr 1fr .8fr 1fr;gap:11px;margin-top:11px}.swe4351-card label{display:block;font-size:12px;color:#60758e;font-weight:800}.swe4351-card input,.swe4351-card select{margin-top:6px;min-height:46px;border-radius:11px;border:1px solid #d6e2ee;background:#fff;color:#17314f;padding:10px 12px;box-shadow:none}.swe4351-card input:focus,.swe4351-card select:focus{outline:3px solid rgba(29,116,224,.12);border-color:#6fa9ef}.swe4351-caprow{display:flex;gap:8px;margin-top:10px}.swe4351-cap{min-width:64px!important;min-height:38px!important;border-radius:999px!important;background:#f4f8fc!important;border:1px solid #d8e5f1!important;color:#23405f!important;padding:6px 14px!important}.swe4351-cap.active{background:#0e72df!important;border-color:#0e72df!important;color:#fff!important}.swe4351-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:12px}.swe4351-infobox{border-radius:14px;padding:13px;background:#f4f8fd;border:1px solid #e1eaf4}.swe4351-infobox.gold{background:#fff8e5;border-color:#efd98f}.swe4351-infobox.blue{background:#eef7ff;border-color:#cfe6fb}.swe4351-infobox b{color:#0c3e78}.swe4351-tariff strong{font-size:16px;color:#7e5700}.swe4351-invitebar{display:grid;grid-template-columns:1fr auto;gap:9px}.swe4351-invitebar button{min-height:46px!important;background:#0e72df!important;color:#fff!important}.swe4351-chipbox{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.swe4351-chip{display:inline-flex;align-items:center;gap:7px;background:#f4f8fc;border:1px solid #d9e5ef;border-radius:999px;padding:6px 9px;font-size:12px;font-weight:800;color:#24415f}.swe4351-chip button{background:transparent!important;border:0!important;min-height:22px!important;padding:0 2px!important;color:#6d7c8d!important}.swe4351-note{margin-top:10px;border-radius:11px;background:#eaf5ff;color:#0d5ca7;border:1px solid #cae6ff;padding:10px 12px;font-size:12px;font-weight:800}.swe4351-avatar{width:30px;height:30px;border-radius:50%;object-fit:cover;background:#0b2b54;color:#fff;display:inline-grid;place-items:center;font-weight:950;flex:0 0 auto}.swe4351-tools-tag{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 9px;background:#fff3c9;color:#7d5700;font-size:10px;font-weight:950;margin-left:4px}.swe4351-search{display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:10px}.swe4351-publicgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.swe4351-playercard{display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center;border:1px solid #dde7f1;border-radius:14px;padding:10px;background:#fff}.swe4351-playercard .name{font-weight:900;color:#12345e;font-size:12px}.swe4351-playercard .meta{font-size:10px;color:#728296;margin-top:2px;line-height:1.45}.swe4351-playercard button{min-height:34px!important;padding:6px 9px!important;border-radius:9px!important;background:#087be5!important;color:#fff!important;font-size:11px!important}.swe4351-groupgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.swe4351-member{border:1px solid #dde7f1;border-radius:13px;padding:9px;display:flex;align-items:center;gap:8px;background:#fff}.swe4351-member .grow{flex:1;min-width:0}.swe4351-member .name{font-size:11px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.swe4351-member button{min-height:32px!important;padding:5px 7px!important;font-size:10px!important;background:#edf6ff!important;color:#0c67bd!important;border:1px solid #c7e2fb!important}.swe4351-locked{padding:16px;border-radius:15px;background:linear-gradient(135deg,#fff7db,#fffdf5);border:1px solid #edd485;color:#684d0d}.swe4351-locked b{color:#6c4d00}.swe4351-summary{position:sticky;top:82px}.swe4351-summary-list{background:#f7fafe;border-radius:14px;padding:5px 13px;margin:12px 0}.swe4351-summary-row{display:grid;grid-template-columns:1fr 1.15fr;gap:10px;padding:10px 0;border-bottom:1px solid #e5edf6;font-size:12px}.swe4351-summary-row:last-child{border-bottom:0}.swe4351-summary-row span{color:#71839a}.swe4351-summary-row b{color:#183657}.swe4351-autonote{padding:12px;border-radius:13px;background:#eaf5ff;border:1px solid #bfe0ff;color:#0b63bb;font-size:12px;font-weight:900;line-height:1.5}.swe4351-create{width:100%;min-height:52px!important;margin-top:12px;background:linear-gradient(135deg,#efc44d,#dea71e)!important;color:#172a43!important;border:1px solid #d5a52b!important;font-size:16px!important;font-weight:950!important;box-shadow:0 9px 22px rgba(214,165,34,.25)}.swe4351-draft{width:100%;margin-top:8px;background:#f7fafc!important;color:#183657!important;border:1px solid #d7e3ee!important}.swe4351-third{padding:14px;border-radius:15px;margin-top:10px;border:1px solid #cfe3d7;background:#effaf3}.swe4351-third.upsell{background:linear-gradient(135deg,#eff7ff,#fff);border-color:#d5e6f6}.swe4351-third-price{font-size:18px;font-weight:950;color:#0b67be}.swe4351-third ul{padding-left:18px;margin:8px 0 0;font-size:12px;color:#566e83;line-height:1.6}.swe4351-slogan{font-family:Georgia,serif;font-style:italic;text-align:center;color:#0b2b54;font-size:20px;margin:16px 0 5px}.swe4351-history{max-width:1320px;margin:0 auto;padding:0 22px 40px}.swe4351-matches{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.swe4351-match{border:1px solid #d9e5ef;border-radius:16px;padding:13px;background:#fff}.swe4351-match.finished{opacity:.65;background:#f6f8fa}.swe4351-match h3{font-size:14px;margin:0;color:#173758}.swe4351-match .meta{font-size:11px;color:#6b7d91;line-height:1.65;margin-top:7px}.swe4351-badge{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:950;margin-top:6px}.swe4351-badge.public{background:#dcfce7;color:#166534}.swe4351-badge.private{background:#eaf2ff;color:#1d4ed8}.swe4351-match-actions{display:flex;gap:6px;margin-top:9px}.swe4351-match-actions button{min-height:34px!important;padding:6px 8px!important;font-size:10px!important}.swe4351-empty{padding:22px;border:1px dashed #ccd9e6;border-radius:14px;text-align:center;color:#71839a;grid-column:1/-1}
@media(max-width:1050px){.swe4351-columns{grid-template-columns:1fr}.swe4351-summary{position:static}.swe4351-publicgrid{grid-template-columns:1fr 1fr}.swe4351-groupgrid{grid-template-columns:1fr 1fr}.swe4351-hero h1{font-size:38px}}@media(max-width:760px){.swe4351-sitebar{padding:0 14px;height:60px}.swe4351-nav button:not(.mobilekeep){display:none!important}.swe4351-brand span{font-size:13px}.swe4351-hero{padding:24px 14px 28px;min-height:auto}.swe4351-hero h1{font-size:31px}.swe4351-visibility{grid-template-columns:1fr}.swe4351-wrap,.swe4351-history{padding-left:12px;padding-right:12px}.swe4351-grid3,.swe4351-grid4,.swe4351-info-grid,.swe4351-publicgrid,.swe4351-groupgrid,.swe4351-matches{grid-template-columns:1fr}.swe4351-columns{gap:0}.swe4351-card{padding:15px}.swe4351-section-head{align-items:flex-start;flex-direction:column}.swe4351-invitebar,.swe4351-search{grid-template-columns:1fr}.swe4351-hero:after{font-size:160px;right:-20px}}
`;document.head.appendChild(s)}
function mount(){css();const main=E('main'),nav=main?.querySelector('nav.tabs');if(!main||!nav)return;let tab=E('simpleSweTab');if(!tab){tab=document.createElement('button');tab.type='button';tab.className='tab';tab.id='simpleSweTab';tab.dataset.view='simple-swe';tab.textContent='Créer un SWÉ';const my=nav.querySelector('[data-view="myplayer"]');my?.insertAdjacentElement('afterend',tab);tab.onclick=()=>show('public')}
 let view=E('view-simple-swe');if(!view){view=document.createElement('div');view.id='view-simple-swe';view.className='view';view.innerHTML=pageHtml();main.appendChild(view);wire();defaults()}}
function pageHtml(){return `
<div class="swe4351-sitebar">
  <div class="swe4351-brand"><img src="/favicon.png?v=4351" alt="SWÉ"><span>SWÉ<br>TOURNAMENT</span></div>
  <div class="swe4351-nav"><button type="button" data-swe-go="home">Accueil</button><button type="button" data-swe-go="tournaments">Tournois</button><button type="button" data-swe-go="myplayer">Mon profil</button><button type="button" class="grow mobilekeep" data-swe-go="myplayer">← Retour à l'application</button></div>
</div>
<section class="swe4351-hero">
  <div class="swe4351-breadcrumb">⌂ Accueil &nbsp;›&nbsp; Créer un SWÉ simple</div>
  <span class="swe4351-free">GRATUIT</span>
  <h1>Créer un <span class="swe4351-gold">SWÉ</span> simple</h1>
  <p>Crée ton match en quelques clics, invite tes joueurs avant la création, puis laisse SWÉ envoyer automatiquement les invitations.</p>
  <div class="swe4351-visibility"><button type="button" class="swe4351-choice" data-simple-vis="private"><span class="ico">🔒</span><span><b>SWÉ privé</b><small>Match sur invitation uniquement. Idéal pour ton groupe de joueurs.</small></span></button><button type="button" class="swe4351-choice" data-simple-vis="public"><span class="ico">🌍</span><span><b>SWÉ public</b><small>Ouvert à la communauté SWÉ. Les joueurs peuvent demander à participer.</small></span></button></div>
</section>
<div class="swe4351-wrap"><div class="swe4351-columns"><main>
  <section class="swe4351-card">
    <div class="swe4351-section-head"><h2 class="swe4351-section-title"><span class="swe4351-stepnum">1</span>Configurer le match</h2><span class="swe4351-muted">Renseigne les informations principales de ton match.</span></div>
    <div class="swe4351-grid3"><label>Nom du SWÉ *<input id="swe4351Title" maxlength="80" placeholder="Ex. SWÉ du dimanche"></label><label>Date *<input id="swe4351Date" type="date"></label><label>Heure *<input id="swe4351Time" type="time" value="09:00"></label></div>
    <div class="swe4351-grid4"><label>Complexe / lieu *<select id="swe4351Venue"><option value="">Chargement…</option></select></label><label>Terrain *<select id="swe4351Terrain"><option value="">Choisir un complexe d’abord</option></select></label><label>Tarif sur place<input id="swe4351Fee" value="0 €" readonly></label><label>N° de réservation<input id="swe4351Reservation" maxlength="120" placeholder="Ex. Résa n° 12345"></label></div>
    <div style="margin-top:12px"><div class="swe4351-muted" style="font-weight:900;color:#4e647c">Participants *</div><div class="swe4351-caprow"><button type="button" class="swe4351-cap" data-simple-cap="10">10</button><button type="button" class="swe4351-cap" data-simple-cap="11">11</button><button type="button" class="swe4351-cap" data-simple-cap="12">12</button></div><div class="swe4351-muted" style="margin-top:5px">10 joueurs par défaut • jusqu'à 12 maximum.</div></div>
    <div class="swe4351-info-grid"><div id="swe4351Tariffs" class="swe4351-infobox gold"><b>💶 Tarifs du complexe</b><div class="swe4351-muted" style="margin-top:5px">Choisis un complexe pour afficher les tarifs renseignés par le super-admin.</div></div><div class="swe4351-infobox blue"><b>💳 Paiement sur place uniquement</b><div class="swe4351-muted" style="margin-top:5px">Les joueurs paieront directement au complexe le jour du match.</div></div></div>
  </section>
  <section class="swe4351-card">
    <div class="swe4351-section-head"><h2 class="swe4351-section-title"><span class="swe4351-stepnum">2</span>Inviter mes joueurs avant de créer le SWÉ</h2><span class="swe4351-muted">E-mail, téléphone ou ID SWÉ.</span></div>
    <div class="swe4351-invitebar"><input id="swe4351InviteQuery" placeholder="Téléphone, e-mail ou ID SWÉ"><button type="button" id="swe4351InviteAdd">Ajouter</button></div>
    <div id="swe4351InviteChips" class="swe4351-chipbox"></div>
    <div class="swe4351-note">✈️ Les invitations seront envoyées automatiquement lorsque tu cliqueras sur « Créer le SWÉ ».</div>
  </section>
  <section id="swe4351OrganizerSection" class="swe4351-card"><div id="swe4351OrganizerBody" class="swe4351-muted">Vérification de ton accès organisateur…</div></section>
  <section class="swe4351-card"><div class="swe4351-section-head"><h2 class="swe4351-section-title"><span class="swe4351-stepnum">4</span>Mes SWÉ simples</h2><span class="swe4351-muted">Tes matchs restent séparés des tournois.</span></div><div id="swe4351Mine" class="swe4351-matches"><div class="swe4351-empty">Chargement…</div></div></section>
</main><aside class="swe4351-summary">
  <section class="swe4351-card"><h2 class="swe4351-section-title">📋 Résumé avant création</h2><div class="swe4351-muted" style="margin-top:4px">Vérifie les informations de ton match.</div><div class="swe4351-summary-list" id="swe4351Summary"></div><div id="swe4351ShareResult" aria-live="polite"></div><div class="swe4351-autonote">✈️ Les invitations partiront automatiquement après la création.</div><button type="button" id="swe4351Create" class="swe4351-create">♛ Créer le SWÉ →</button><button type="button" id="swe4351Draft" class="swe4351-draft">▣ Enregistrer en brouillon</button></section>
  <section class="swe4351-card"><h2 class="swe4351-section-title">🍴 La 3e mi-temps</h2><div class="swe4351-muted">Prolonge le plaisir après le match.</div><div id="swe4351Third"></div><div class="swe4351-slogan">Le foot continue<br>même après le match.</div></section>
</aside></div></div>`}
function defaults(){if(E('swe4351Date')&&!E('swe4351Date').value)E('swe4351Date').value=tomorrow();setVisibility(visibility);setCapacity(10);restoreDraft();renderInvites();renderSummary()}
function wire(){['swe4351Title','swe4351Date','swe4351Time','swe4351Venue','swe4351Terrain','swe4351Reservation'].forEach(id=>E(id)?.addEventListener('input',()=>{if(id==='swe4351Venue'||id==='swe4351Date'||id==='swe4351Time')renderPrice();renderSummary()}));E('swe4351Venue')?.addEventListener('change',()=>{renderTerrainOptions();renderPrice();renderSummary()});E('swe4351Create')?.addEventListener('click',createSwe);E('swe4351Draft')?.addEventListener('click',saveDraft);E('swe4351InviteAdd')?.addEventListener('click',resolveInvite);E('swe4351InviteQuery')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();resolveInvite()}});document.querySelectorAll('[data-simple-vis]').forEach(b=>b.onclick=()=>setVisibility(b.dataset.simpleVis));document.querySelectorAll('[data-simple-cap]').forEach(b=>b.onclick=()=>setCapacity(Number(b.dataset.simpleCap)));document.addEventListener('click',actionClick,true)}
function setVisibility(v){visibility=v==='public'?'public':'private';document.querySelectorAll('[data-simple-vis]').forEach(b=>b.classList.toggle('active',b.dataset.simpleVis===visibility));renderSummary()}
function setCapacity(n){capacity=Math.max(10,Math.min(12,Number(n)||10));document.querySelectorAll('[data-simple-cap]').forEach(b=>b.classList.toggle('active',Number(b.dataset.simpleCap)===capacity));if(staged.length>capacity-1){staged=staged.slice(0,capacity-1);renderInvites();toastMsg('Le nombre d’invités a été ajusté à la capacité du match.')}renderSummary()}
function selectedVenue(){const val=E('swe4351Venue')?.value||'';if(!val)return null;const [kind,id]=val.split(':');const rows=kind==='complex'?venues.complexes:venues.venues;const item=rows.find(x=>String(x.id)===String(id));return item?{kind,id,item}:null}
function renderVenueOptions(){const sel=E('swe4351Venue');if(!sel)return;const old=sel.value;let html='<option value="">Choisir le complexe / lieu</option>';if(venues.complexes.length)html+='<optgroup label="Complexes partenaires">'+venues.complexes.map(x=>'<option value="complex:'+esc(x.id)+'">'+esc(x.name)+(x.city?' • '+esc(x.city):'')+'</option>').join('')+'</optgroup>';if(venues.venues.length)html+='<optgroup label="Autres terrains partagés">'+venues.venues.map(x=>'<option value="community:'+esc(x.id)+'">'+esc(x.name)+'</option>').join('')+'</optgroup>';sel.innerHTML=html;if([...sel.options].some(o=>o.value===old))sel.value=old}
function renderTerrainOptions(){
 const sel=E('swe4351Terrain'),v=selectedVenue();if(!sel)return;
 const previous=sel.dataset.restoreValue||sel.value;
 const pitches=v?.kind==='complex'?(v.item.pitches||[]):[];
 sel.replaceChildren(new Option(v?.kind==='community'?'Pas de terrain enregistré':'Choisir un terrain',''));
 pitches.forEach(p=>sel.add(new Option(p.name,p.name)));
 sel.disabled=!pitches.length;
 if([...sel.options].some(o=>o.value===previous))sel.value=previous;
 delete sel.dataset.restoreValue;
}
function simpleFeeCents(){
 const date=E('swe4351Date')?.value||'',time=E('swe4351Time')?.value||'';
 if(!date||!time)return 0;
 const dow=new Date(date+'T12:00:00').getDay();
 return dow===0||dow===6?500:time>='21:30'?700:1000;
}
function renderPrice(){
 const box=E('swe4351Tariffs'),fee=E('swe4351Fee');if(!box||!fee)return;
 const cents=simpleFeeCents();fee.value=cents?money(cents):'À confirmer';
 box.innerHTML='<b>💶 Tarif par participant (sur place)</b><div class="swe4351-tariff" style="margin-top:6px">Samedi et dimanche : <strong>5 €</strong> • Du lundi au vendredi avant 21h30 : <strong>10 €</strong> • À partir de 21h30 : <strong>7 €</strong></div><div class="swe4351-muted" style="margin-top:5px">Pour ce créneau : <b>'+(cents?money(cents):'10 €')+'</b></div>';
}
function renderThird(){const box=E('swe4351Third');if(!box)return;if(thirdIncluded){box.innerHTML='<div class="swe4351-third"><div style="display:flex;justify-content:space-between;gap:8px"><b>👑 Inclus avec l’abonnement organisateur</b><span class="swe4351-tools-tag">INCLUS</span></div><label style="display:flex;gap:8px;align-items:center;margin-top:9px"><input id="swe4351ThirdToggle" type="checkbox" style="width:auto;margin:0"><span>Activer pour ce SWÉ</span></label><ul><li>Gestion des présences</li><li>Communication 3e mi-temps</li><li>Organisation simplifiée</li></ul></div>'}else{box.innerHTML='<div class="swe4351-third upsell"><div style="display:flex;justify-content:space-between;gap:10px"><b>🛒 Option ponctuelle</b><span class="swe4351-third-price">5,99 €</span></div><div class="swe4351-muted" style="margin-top:5px">Pour ce SWÉ uniquement, sans abonnement.</div><ul><li>À la demande</li><li>Idéal pour une occasion spéciale</li><li>Active la gestion 3e mi-temps sur ce match</li></ul></div>'}}
function renderInvites(){const box=E('swe4351InviteChips');if(!box)return;box.innerHTML=staged.length?staged.map(x=>'<span class="swe4351-chip">'+avatarHtml(x)+'<span>'+esc(x.display_name||x.public_player_id)+'</span><small>'+esc(x.public_player_id)+'</small><button type="button" data-remove-invite="'+esc(x.public_player_id)+'">×</button></span>').join(''):'<span class="swe4351-muted">Aucun joueur ajouté pour le moment.</span>';renderSummary();renderOrganizerTools()}
function addInvite(x){if(!x?.public_player_id)return;if(staged.some(i=>i.public_player_id===x.public_player_id))return toastMsg('Ce joueur est déjà dans la liste.');if(staged.length>=capacity-1)return toastMsg('Tu as atteint le nombre maximum d’invités pour ce match.');staged.push({public_player_id:x.public_player_id,display_name:x.display_name||x.public_player_id,avatar_url:x.avatar_url||'',source:x.source||'manual'});renderInvites();toastMsg('Joueur ajouté à la liste d’invitation ✅')}
async function resolveInvite(){const c=api(),q=(E('swe4351InviteQuery')?.value||'').trim(),btn=E('swe4351InviteAdd');if(!c||!q||!btn)return toastMsg('Saisis un e-mail, un téléphone ou un ID SWÉ.');btn.disabled=true;btn.textContent='Recherche…';try{const {data,error}=await c.rpc('resolve_community_swe_invitee_v1',{p_query:q});if(error)throw error;if(!data?.found)return toastMsg('Aucun ID SWÉ confirmé trouvé pour cette information.');addInvite({...data,source:'manual'});E('swe4351InviteQuery').value=''}catch(err){toastMsg(err?.message||'Recherche impossible.')}finally{btn.disabled=false;btn.textContent='Ajouter'}}
async function loadOrganizerTools(query=''){const c=api(),wid=workspaceId();if(!c||!wid){organizerTools={allowed:false,catalog:[],members:[]};renderOrganizerTools();return}try{const {data,error}=await c.rpc('get_simple_swe_organizer_invites_v1',{p_workspace_id:wid,p_query:query||null,p_limit:12});if(error)throw error;organizerTools=data||{allowed:false,catalog:[],members:[]}}catch(_){organizerTools={allowed:false,catalog:[],members:[]}}renderOrganizerTools()}
function renderOrganizerTools(){const body=E('swe4351OrganizerBody');if(!body)return;if(!organizerTools.allowed){body.innerHTML='<div class="swe4351-section-head"><h2 class="swe4351-section-title"><span class="swe4351-stepnum">3</span>Invitations organisateur <span class="swe4351-tools-tag">👑 ABONNEMENT</span></h2></div><div class="swe4351-locked"><b>Débloque les invitations avancées</b><div class="swe4351-muted" style="margin-top:5px;color:#775f26">Avec un abonnement organisateur, tu peux parcourir les profils publics et inviter directement les membres de ton groupe disposant d’un ID SWÉ confirmé.</div></div>';return}const catalog=organizerTools.catalog||[],members=organizerTools.members||[];body.innerHTML='<div class="swe4351-section-head"><h2 class="swe4351-section-title"><span class="swe4351-stepnum">3</span>Catalogue des joueurs publics <span class="swe4351-tools-tag">👑 ORGANISATEUR</span></h2><span class="swe4351-muted">Ajoute-les avant de créer le SWÉ.</span></div><div class="swe4351-search"><input id="swe4351CatalogQuery" placeholder="Rechercher un joueur (nom, ville, ID SWÉ)"><button type="button" id="swe4351CatalogSearch">Rechercher</button></div><div class="swe4351-publicgrid">'+(catalog.length?catalog.map(x=>'<div class="swe4351-playercard">'+avatarHtml(x)+'<div><div class="name">'+esc(x.display_name||'Joueur SWÉ')+'</div><div class="meta">✅ ID SWÉ confirmé'+(x.rating!=null?' • ⭐ '+(Number(x.rating)*2).toFixed(1)+'/10':'')+' • '+Number(x.matches_count||0)+' matchs</div></div><button type="button" data-stage-public="'+esc(x.public_player_id)+'">'+(staged.some(i=>i.public_player_id===x.public_player_id)?'Ajouté':'Inviter')+'</button></div>').join(''):'<div class="swe4351-empty">Aucun profil public trouvé.</div>')+'</div><div class="swe4351-section-head" style="margin-top:16px;margin-bottom:9px"><h3 class="swe4351-section-title" style="font-size:15px">👥 Membres de mon groupe avec ID SWÉ confirmé</h3></div><div class="swe4351-groupgrid">'+(members.length?members.map(x=>'<div class="swe4351-member">'+avatarHtml(x)+'<div class="grow"><div class="name">'+esc(x.display_name||'Membre')+'</div><div class="swe4351-muted">✅ '+esc(x.public_player_id||'ID confirmé')+'</div></div><button type="button" data-stage-member="'+esc(x.public_player_id)+'">'+(staged.some(i=>i.public_player_id===x.public_player_id)?'Ajouté':'Ajouter')+'</button></div>').join(''):'<div class="swe4351-muted">Aucun membre avec ID SWÉ confirmé.</div>')+'</div>';E('swe4351CatalogSearch')?.addEventListener('click',()=>loadOrganizerTools((E('swe4351CatalogQuery')?.value||'').trim()));E('swe4351CatalogQuery')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loadOrganizerTools(e.target.value.trim())}})}
function renderSummary(){const box=E('swe4351Summary');if(!box)return;const v=selectedVenue(),date=E('swe4351Date')?.value||'—',time=E('swe4351Time')?.value||'—',terrain=(E('swe4351Terrain')?.value||'').trim(),place=v?(v.item.name+(terrain?' • '+terrain:'')):'—';box.innerHTML='<div class="swe4351-summary-row"><span>🔒 Type de SWÉ</span><b>'+(visibility==='public'?'Public':'Privé')+'</b></div><div class="swe4351-summary-row"><span>📅 Date et heure</span><b>'+esc(date)+' à '+esc(time)+'</b></div><div class="swe4351-summary-row"><span>📍 Lieu</span><b>'+esc(place)+'</b></div><div class="swe4351-summary-row"><span>👥 Participants</span><b>'+capacity+' joueurs</b></div><div class="swe4351-summary-row"><span>👤 Joueurs invités</span><b>'+staged.length+' joueur'+(staged.length>1?'s':'')+'</b></div><div class="swe4351-summary-row"><span>💳 Paiement</span><b>Sur place uniquement</b></div>'}
function saveDraft(){const v=selectedVenue();const draft={visibility,capacity,title:E('swe4351Title')?.value||'',date:E('swe4351Date')?.value||'',time:E('swe4351Time')?.value||'',venue:v?E('swe4351Venue').value:'',terrain:E('swe4351Terrain')?.value||'',reservation:E('swe4351Reservation')?.value||'',staged};localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));toastMsg('Brouillon enregistré sur cet appareil ✅')}
function restoreDraft(){try{const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(!d)return;if(d.title)E('swe4351Title').value=d.title;if(d.date)E('swe4351Date').value=d.date;if(d.time)E('swe4351Time').value=d.time;if(d.terrain)E('swe4351Terrain').dataset.restoreValue=d.terrain;if(d.reservation)E('swe4351Reservation').value=d.reservation;if(Array.isArray(d.staged))staged=d.staged.slice(0,11);if(d.visibility)setVisibility(d.visibility);if(d.capacity)setCapacity(d.capacity);E('swe4351Venue').dataset.restoreValue=d.venue||''}catch(_){}}
async function loadData(){const c=api();if(!c||loading)return;loading=true;try{const [v,m,e]=await Promise.all([c.rpc('get_community_swe_venues'),c.rpc('get_my_community_swes_v2'),c.rpc('community_swe_third_half_entitlement_v1')]);if(v.error)throw v.error;venues=v.data||{complexes:[],venues:[]};if(m.error)throw m.error;mine=m.data||{created:[],participations:[]};thirdIncluded=!e.error&&e.data===true;renderVenueOptions();const saved=E('swe4351Venue')?.dataset.restoreValue;if(saved&&[...E('swe4351Venue').options].some(o=>o.value===saved)){E('swe4351Venue').value=saved;delete E('swe4351Venue').dataset.restoreValue}renderTerrainOptions();renderPrice();renderThird();renderMine();renderSummary();await loadOrganizerTools()}catch(err){console.warn('simple swe load',err);const out=E('swe4351Mine');if(out)out.innerHTML='<div class="swe4351-empty">Impossible de charger tes SWÉ pour le moment.</div>'}finally{loading=false}}
function fmtDate(v){if(!v)return 'Date à préciser';try{return new Date(v).toLocaleString('fr-FR',{timeZone:'America/Martinique',weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(_){return String(v)}}
function renderMine(){const box=E('swe4351Mine');if(!box)return;const rows=Array.isArray(mine.created)?mine.created:[];box.innerHTML=rows.length?rows.map(x=>'<div class="swe4351-match '+(x.status==='finished'?'finished':'')+'"><div style="display:flex;justify-content:space-between;gap:8px"><div><h3>'+esc(x.title||'SWÉ simple')+'</h3><span class="swe4351-badge '+esc(x.visibility)+'">'+(x.visibility==='public'?'🌍 PUBLIC':'🔒 PRIVÉ')+'</span></div><b>'+Number(x.confirmed||0)+'/'+Number(x.max_players||10)+'</b></div><div class="meta">📅 '+esc(fmtDate(x.start_at))+'<br>📍 '+esc(x.venue_name||'Lieu à confirmer')+(x.terrain_label?' • '+esc(x.terrain_label):'')+'<br>💶 '+(Number(x.onsite_entry_fee_cents||0)?money(x.onsite_entry_fee_cents):'Paiement sur place')+(Array.isArray(x.guest_names)&&x.guest_names.length?'<br>👥 Invités sans compte : '+x.guest_names.map(esc).join(', '):'')+(Number(x.invited||0)?'<br>✈️ '+Number(x.invited)+' invitation(s) en attente':'')+(x.third_half_active?'<br>🍴 3e mi-temps activée':'')+'</div>'+(x.status!=='finished'?'<div class="swe4351-match-actions">'+(x.visibility==='public'?'<button type="button" data-simple-copy="'+esc(x.id)+'">📋 Copier le lien</button>':'')+'<button type="button" data-simple-invite="'+esc(x.id)+'">Inviter par ID SWÉ</button><button type="button" class="danger" data-simple-finish="'+esc(x.id)+'">Terminer le match</button></div>':'<div class="swe4351-muted" style="margin-top:8px">✅ Match terminé</div>')+'</div>').join(''):'<div class="swe4351-empty">Tu n’as pas encore créé de SWÉ simple.</div>'}
async function createSwe(){const c=api(),btn=E('swe4351Create');if(!c||!btn)return;const date=E('swe4351Date')?.value,time=E('swe4351Time')?.value,venue=selectedVenue();if(!date||!time)return toastMsg('Choisis la date et l’heure du match.');if(!venue)return toastMsg('Choisis un complexe ou un lieu.');if(venue.kind==='complex'&&!E('swe4351Terrain')?.value)return toastMsg('Choisis un terrain enregistré pour ce complexe.');const start=new Date(date+'T'+time+':00-04:00');if(!Number.isFinite(start.getTime())||start.getTime()<=Date.now())return toastMsg('Choisis une date et une heure futures.');if(staged.length>capacity-1)return toastMsg('Trop de joueurs invités pour la capacité choisie.');const title=(E('swe4351Title')?.value||'').trim()||('SWÉ du '+date.split('-').reverse().join('/')),ref=(E('swe4351Reservation')?.value||'').trim()||null,terrain=(E('swe4351Terrain')?.value||'').trim()||null,third=!!E('swe4351ThirdToggle')?.checked;btn.disabled=true;btn.textContent='Création et envoi des invitations…';try{const {data,error}=await c.rpc('create_community_swe_v3',{p_title:title,p_visibility:visibility,p_venue_kind:venue.kind,p_venue_id:venue.id,p_start_at:start.toISOString(),p_max_players:capacity,p_reservation_reference:ref,p_third_half_requested:third,p_invite_public_ids:staged.map(x=>x.public_player_id),p_terrain_label:terrain});if(error)throw error;const sent=Number(data?.invite_count||0);showCreatedLink(data?.id,visibility);toastMsg('✅ SWÉ créé'+(sent?' • '+sent+' invitation'+(sent>1?'s':'')+' envoyée'+(sent>1?'s':''):''));staged=[];renderInvites();localStorage.removeItem(DRAFT_KEY);E('swe4351Title').value='';E('swe4351Reservation').value='';E('swe4351Terrain').value='';const m=await c.rpc('get_my_community_swes_v2');if(!m.error){mine=m.data||mine;renderMine()}(E('swe4351ShareResult')||E('swe4351Mine'))?.scrollIntoView({behavior:'smooth',block:'center'})}catch(err){toastMsg(err?.message||'Impossible de créer ce SWÉ.')}finally{btn.disabled=false;btn.textContent='♛ Créer le SWÉ →'}}
function swePublicLink(id){return location.origin+'/swe-public.html?swe='+encodeURIComponent(id)}
function showCreatedLink(id,type){const result=E('swe4351ShareResult');if(!result)return;if(type!=='public'||!id){result.textContent='SWÉ privé créé. Pour partager un lien d’inscription, sélectionne « Public ».';return}const link=swePublicLink(id);result.innerHTML='<div class="swe4351-note" style="margin-top:12px"><b>🌍 Ton lien public est prêt !</b><p>Partage-le sur Facebook ou par message pour permettre les inscriptions.</p><input type="url" readonly aria-label="Lien public du SWÉ" value="'+esc(link)+'" style="width:100%;min-width:0;box-sizing:border-box"><button type="button" data-simple-copy="'+esc(id)+'">📋 Copier le lien</button> <button type="button" data-simple-share="'+esc(id)+'">Partager</button></div>'}
async function actionClick(e){const copy=e.target?.closest?.('[data-simple-copy]');if(copy){try{await navigator.clipboard.writeText(swePublicLink(copy.dataset.simpleCopy));toastMsg('Lien public copié ✅')}catch(_){prompt('Copie ce lien :',swePublicLink(copy.dataset.simpleCopy))}return}const share=e.target?.closest?.('[data-simple-share]');if(share){const url=swePublicLink(share.dataset.simpleShare);if(navigator.share){try{await navigator.share({title:'Rejoins mon SWÉ',url})}catch(_){}}else{window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url),'_blank','noopener,noreferrer')}return}const go=e.target?.closest?.('[data-swe-go]');if(go){e.preventDefault();closePremium();document.querySelector('.tabs button[data-view="'+go.dataset.sweGo+'"]')?.click();return}const rem=e.target?.closest?.('[data-remove-invite]');if(rem){staged=staged.filter(x=>x.public_player_id!==rem.dataset.removeInvite);renderInvites();return}const p=e.target?.closest?.('[data-stage-public]');if(p){const x=(organizerTools.catalog||[]).find(v=>v.public_player_id===p.dataset.stagePublic);if(x)addInvite({...x,source:'catalog'});return}const m=e.target?.closest?.('[data-stage-member]');if(m){const x=(organizerTools.members||[]).find(v=>v.public_player_id===m.dataset.stageMember);if(x)addInvite({...x,source:'group'});return}const invite=e.target?.closest?.('[data-simple-invite]');if(invite){const code=prompt('Entre l’ID SWÉ du joueur à inviter :');if(!code)return;const c=api();invite.disabled=true;try{const {error}=await c.rpc('invite_player_to_community_swe',{p_swe_id:invite.dataset.simpleInvite,p_public_player_id:code.trim()});if(error)throw error;toastMsg('Invitation envoyée ✅')}catch(err){toastMsg(err?.message||'Invitation impossible.')}finally{invite.disabled=false}return}const finish=e.target?.closest?.('[data-simple-finish]');if(finish){if(!confirm('Terminer ce match ? Il passera dans l’historique.'))return;const c=api();finish.disabled=true;try{const {error}=await c.rpc('finish_community_swe_v1',{p_swe_id:finish.dataset.simpleFinish});if(error)throw error;const r=await c.rpc('get_my_community_swes_v2');if(!r.error){mine=r.data||mine;renderMine()}toastMsg('Match terminé ✅')}catch(err){toastMsg(err?.message||'Impossible de terminer le match.')}finally{finish.disabled=false}}}
function closePremium(){delete document.documentElement.dataset.simpleSwePremium}
function show(type){mount();document.documentElement.dataset.simpleSwePremium='1';if(type)setVisibility(type);document.querySelectorAll('#main .view').forEach(v=>v.classList.remove('active'));document.querySelectorAll('#main .tabs .tab').forEach(t=>t.classList.remove('active'));E('view-simple-swe')?.classList.add('active');E('simpleSweTab')?.classList.add('active');try{if(typeof S!=='undefined')S.lastView='simple-swe'}catch(_){ }document.dispatchEvent(new Event('swe:page-view'));window.scrollTo({top:0,behavior:'smooth'});loadData()}
window.openSimpleSweCreator=show;
document.addEventListener('click',e=>{const direct=e.target?.closest?.('#swe4348SimpleBtn');if(direct){e.preventDefault();e.stopImmediatePropagation();show('public');return}const b=e.target?.closest?.('#swe4348StartSimple');if(!b)return;const m=E('swe4348SimpleInfo'),type=m?.dataset.sweType||'public';e.preventDefault();e.stopImmediatePropagation();m?.classList.add('hidden');show(type)},true);
document.addEventListener('click',e=>{const tab=e.target?.closest?.('.tabs button:not(#simpleSweTab)');if(tab)closePremium()},true);
function soon(){mount();if(E('view-simple-swe')?.classList.contains('active')){document.documentElement.dataset.simpleSwePremium='1';loadData()}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',soon,{once:true});else soon();document.addEventListener('swe:rendered',soon);document.addEventListener('swe:player-profile-updated',soon);window.addEventListener('pageshow',()=>setTimeout(soon,80));setTimeout(soon,500);
})();
;

;
/* SOURCE simple-swe-responsive-v4353.js */
(()=>{
'use strict';
if(window.__SWE_SIMPLE_RESPONSIVE_4353)return;window.__SWE_SIMPLE_RESPONSIVE_4353=true;
const E=id=>document.getElementById(id);
function appState(){try{return typeof S!=='undefined'?S:null}catch(_){return null}}
function isCoorg(){return String(appState()?.workspace?.role||'').toLowerCase()==='coorganizer'}
function css(){
 if(E('sweSimpleResponsive4353Css'))return;
 const s=document.createElement('style');s.id='sweSimpleResponsive4353Css';s.textContent=`
/* V43.53 — page SWÉ simple : exploiter réellement l'écran et rester fluide partout */
html[data-simple-swe-premium="1"],html[data-simple-swe-premium="1"] body{width:100%!important;max-width:none!important;overflow-x:hidden!important}
html[data-simple-swe-premium="1"] .app,html[data-simple-swe-premium="1"] #main,html[data-simple-swe-premium="1"] #view-simple-swe{width:100%!important;max-width:none!important;margin:0!important;padding-left:0!important;padding-right:0!important}
html[data-simple-swe-premium="1"] #main{display:block!important}
html[data-simple-swe-premium="1"] .swe4351-sitebar{padding-left:max(24px,calc((100vw - 1500px)/2))!important;padding-right:max(24px,calc((100vw - 1500px)/2))!important}
html[data-simple-swe-premium="1"] .swe4351-hero{padding-left:max(24px,calc((100vw - 1500px)/2))!important;padding-right:max(24px,calc((100vw - 1500px)/2))!important}
html[data-simple-swe-premium="1"] .swe4351-wrap{width:min(1500px,calc(100vw - 40px))!important;max-width:1500px!important;margin:-14px auto 0!important;padding-left:0!important;padding-right:0!important}
html[data-simple-swe-premium="1"] .swe4351-history{width:min(1500px,calc(100vw - 40px))!important;max-width:1500px!important;margin:0 auto!important;padding-left:0!important;padding-right:0!important}
html[data-simple-swe-premium="1"] .swe4351-columns{grid-template-columns:minmax(0,2.25fr) minmax(330px,.75fr)!important;gap:20px!important}
html[data-simple-swe-premium="1"] .swe4351-card{border-radius:22px!important;box-shadow:0 12px 34px rgba(11,43,84,.09)!important}
html[data-simple-swe-premium="1"] .swe4351-summary{top:84px!important}
html[data-simple-swe-premium="1"] .swe4351-visibility{max-width:900px!important}
html[data-simple-swe-premium="1"] .swe4351-publicgrid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
html[data-simple-swe-premium="1"] .swe4351-groupgrid{grid-template-columns:repeat(4,minmax(0,1fr))!important}

/* Co-gestionnaire : la création simple se fait depuis le compte personnel, pas depuis l'espace géré. */
#swe4350LaunchCard.swe4353-coorg-locked{background:linear-gradient(125deg,#e8edf3 0%,#dce4ec 100%)!important;color:#637083!important;box-shadow:none!important;border:1px solid #cbd5df!important}
#swe4350LaunchCard.swe4353-coorg-locked:after{opacity:.035!important}
#swe4350LaunchCard.swe4353-coorg-locked .swe4350-launch-kicker{background:#f2f4f7!important;color:#6b7280!important;border:1px solid #d7dde5!important}
#swe4350LaunchCard.swe4353-coorg-locked .swe4350-launch-title{color:#536171!important}
#swe4350LaunchCard.swe4353-coorg-locked .swe4350-launch-copy,#swe4350LaunchCard.swe4353-coorg-locked .swe4350-launch-pills span{color:#788493!important}
#swe4350LaunchCard.swe4353-coorg-locked .swe4350-launch-pills span{background:#eef1f4!important;border-color:#d9dfe6!important}
#swe4350LaunchCard.swe4353-coorg-locked .swe4350-launch-btn{background:#d6dde5!important;color:#7a8794!important;cursor:not-allowed!important;box-shadow:none!important;pointer-events:none!important}
.swe4353-coorg-note{grid-column:1/-1;margin-top:-4px;padding:10px 12px;border-radius:12px;background:#fff8df;border:1px solid #ead390;color:#755b13;font-size:12px;font-weight:800;line-height:1.45}
#simpleSweTab.swe4353-coorg-tab{opacity:.34!important;filter:grayscale(1)!important;cursor:not-allowed!important;color:#8d9aaa!important;position:relative!important}
#simpleSweTab.swe4353-coorg-tab:after{content:'🔒';margin-left:auto;font-size:11px}
.swe4353-page-lock{margin:18px auto;width:min(900px,calc(100% - 28px));padding:18px;border-radius:16px;background:#fff8df;border:1px solid #ead390;color:#6f5611;font-weight:800;box-shadow:0 10px 28px rgba(90,69,14,.08)}

@media(max-width:1180px){
 html[data-simple-swe-premium="1"] .swe4351-wrap,html[data-simple-swe-premium="1"] .swe4351-history{width:min(1120px,calc(100vw - 32px))!important}
 html[data-simple-swe-premium="1"] .swe4351-columns{grid-template-columns:minmax(0,1.65fr) minmax(300px,.85fr)!important;gap:16px!important}
 html[data-simple-swe-premium="1"] .swe4351-grid4{grid-template-columns:1.2fr 1fr 1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-grid4 label:last-child{grid-column:1/-1!important}
 html[data-simple-swe-premium="1"] .swe4351-publicgrid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 html[data-simple-swe-premium="1"] .swe4351-groupgrid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
}
@media(max-width:900px){
 html[data-simple-swe-premium="1"] .swe4351-sitebar{height:auto!important;min-height:60px!important;padding:10px 16px!important;gap:12px!important}
 html[data-simple-swe-premium="1"] .swe4351-nav{display:none!important}
 html[data-simple-swe-premium="1"] .swe4351-account{margin-left:auto!important}
 html[data-simple-swe-premium="1"] .swe4351-hero{padding:24px 16px 28px!important;min-height:auto!important}
 html[data-simple-swe-premium="1"] .swe4351-hero h1{font-size:36px!important}
 html[data-simple-swe-premium="1"] .swe4351-wrap,html[data-simple-swe-premium="1"] .swe4351-history{width:calc(100vw - 24px)!important;margin-left:auto!important;margin-right:auto!important}
 html[data-simple-swe-premium="1"] .swe4351-columns{grid-template-columns:1fr!important;gap:0!important}
 html[data-simple-swe-premium="1"] .swe4351-summary{position:static!important;top:auto!important}
 html[data-simple-swe-premium="1"] .swe4351-summary-col{display:grid!important;grid-template-columns:1fr 1fr!important;gap:14px!important;align-items:start!important}
 html[data-simple-swe-premium="1"] .swe4351-summary-col>.swe4351-card{margin-bottom:0!important;height:100%!important}
 html[data-simple-swe-premium="1"] .swe4351-grid3{grid-template-columns:1.35fr 1fr 1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-grid4{grid-template-columns:1fr 1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-grid4 label:last-child{grid-column:auto!important}
}
@media(max-width:680px){
 html[data-simple-swe-premium="1"] .swe4351-brand span{font-size:12px!important}
 html[data-simple-swe-premium="1"] .swe4351-account{font-size:0!important}
 html[data-simple-swe-premium="1"] .swe4351-hero h1{font-size:31px!important}
 html[data-simple-swe-premium="1"] .swe4351-hero p{font-size:14px!important}
 html[data-simple-swe-premium="1"] .swe4351-visibility{grid-template-columns:1fr!important;gap:9px!important}
 html[data-simple-swe-premium="1"] .swe4351-choice{min-height:76px!important}
 html[data-simple-swe-premium="1"] .swe4351-card{padding:15px!important;border-radius:17px!important}
 html[data-simple-swe-premium="1"] .swe4351-section-head{align-items:flex-start!important;flex-direction:column!important;gap:5px!important}
 html[data-simple-swe-premium="1"] .swe4351-grid3,html[data-simple-swe-premium="1"] .swe4351-grid4,html[data-simple-swe-premium="1"] .swe4351-info-grid{grid-template-columns:1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-invitebar,html[data-simple-swe-premium="1"] .swe4351-search{grid-template-columns:1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-invitebar button,html[data-simple-swe-premium="1"] .swe4351-search button{width:100%!important}
 html[data-simple-swe-premium="1"] .swe4351-publicgrid,html[data-simple-swe-premium="1"] .swe4351-groupgrid,html[data-simple-swe-premium="1"] .swe4351-matches{grid-template-columns:1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-summary-col{grid-template-columns:1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-summary-row{grid-template-columns:1fr 1fr!important}
 html[data-simple-swe-premium="1"] .swe4351-caprow{display:grid!important;grid-template-columns:repeat(3,1fr)!important}
 html[data-simple-swe-premium="1"] .swe4351-cap{min-width:0!important;width:100%!important}
 .swe4353-coorg-note{font-size:11px!important}
}
`;
 document.head.appendChild(s);
}
function lockLauncherForCoorg(){
 const card=E('swe4350LaunchCard');if(!card)return;
 const btn=card.querySelector('.swe4350-launch-btn,button');
 let note=card.querySelector('.swe4353-coorg-note');
 if(isCoorg()){
   card.classList.add('swe4353-coorg-locked');
   if(btn){btn.disabled=true;btn.setAttribute('aria-disabled','true');btn.title='Fonction disponible sur les comptes personnels uniquement';}
   if(!note){note=document.createElement('div');note.className='swe4353-coorg-note';note.innerHTML='<b>🔒 Fonction disponible sur les comptes personnels uniquement.</b><br>Les co-gestionnaires ne peuvent pas créer de SWÉ depuis cet espace. Utilise ton compte personnel joueur pour organiser ton match.';card.appendChild(note);}
 }else{
   card.classList.remove('swe4353-coorg-locked');
   if(btn){btn.disabled=false;btn.removeAttribute('aria-disabled');if(btn.title==='Fonction disponible sur les comptes personnels uniquement')btn.removeAttribute('title');}
   note?.remove();
 }
}
function lockSimpleTabForCoorg(){
 const tab=E('simpleSweTab');if(!tab)return;
 tab.classList.toggle('swe4353-coorg-tab',isCoorg());
 tab.setAttribute('aria-disabled',isCoorg()?'true':'false');
 if(isCoorg())tab.title='Créer un SWÉ est disponible depuis le compte personnel joueur';
 else if(tab.title==='Créer un SWÉ est disponible depuis le compte personnel joueur')tab.removeAttribute('title');
}
function lockPageForCoorg(){
 if(!isCoorg())return;
 const view=E('view-simple-swe');if(!view||!view.classList.contains('active'))return;
 let n=E('swe4353PageLock');if(!n){n=document.createElement('div');n.id='swe4353PageLock';n.className='swe4353-page-lock';n.innerHTML='<b>🔒 Création indisponible en mode co-gestionnaire.</b><br><span style="font-weight:650">Passe sur ton compte personnel joueur pour créer un SWÉ simple.</span>';view.prepend(n);}
 view.querySelectorAll('.swe4351-create').forEach(b=>{b.disabled=true;b.setAttribute('aria-disabled','true');b.style.opacity='.45';b.style.cursor='not-allowed'});
}
function apply(){css();lockLauncherForCoorg();lockSimpleTabForCoorg();lockPageForCoorg()}
document.addEventListener('click',e=>{const t=e.target.closest?.('#simpleSweTab.swe4353-coorg-tab,#swe4350LaunchCard.swe4353-coorg-locked button');if(!t)return;e.preventDefault();e.stopImmediatePropagation();try{typeof toast==='function'&&toast('Crée ton SWÉ depuis ton compte personnel joueur.')}catch(_){}},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
document.addEventListener('swe:rendered',()=>setTimeout(apply,40));document.addEventListener('swe:player-profile-updated',()=>setTimeout(apply,40));window.addEventListener('pageshow',()=>setTimeout(apply,80));setTimeout(apply,500);setTimeout(apply,1400);
})();

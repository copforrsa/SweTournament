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
 if(m.phase==='qualification'&&m.label==='Qualification 2'&&s.matches.some(x=>x.label==='Qualification 1'&&x.status!=='finished'))fail('Le premier tour doit être terminé');
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
   if(p==='qualification'&&target.label==='Qualification 1'&&m.label==='Qualification 2')continue;
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

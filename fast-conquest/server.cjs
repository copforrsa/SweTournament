'use strict';
// All public inputs are commands. A client-supplied state is never accepted.
const E=require('./engine.cjs');
async function command(repository,userId,input,random){
 if(!userId)throw new Error('Connexion requise');
 const {tournamentId,action,matchId}=input||{};
 if(!tournamentId)throw new Error('Tournoi requis');
 const c=await repository.context(tournamentId,userId);
 if(!c.entitled)throw new Error('Abonnement Organisateur actif requis');
 const adminActions=['start','draw','validate_draw','correct','delete_match','repair','reset'];
 if(adminActions.includes(action)?!c.admin:action==='finish'?!c.can_score:true)throw new Error('Action non autorisée');
 let state=c.state?structuredClone(c.state):null;
 if(action==='start'){
  if(state)throw new Error('Tournoi déjà lancé');
  if(!c.locked)throw new Error('Verrouille les équipes avant le lancement');
  if(c.pitch_count!==3)throw new Error('Trois terrains sont requis');
  state=E.create(c.teams,c.team_ratings?Object.fromEntries(c.team_ratings.map(t=>[t.id,t.rating])):undefined);
 }else{
  if(!state)throw new Error('Tournoi non lancé');
  if(action==='delete_match')state=E.remove(state,matchId);
  else if(action==='repair')state.matches.forEach(m=>delete m.deleted);
  else if(action==='reset')state=E.create(c.teams,c.team_ratings?Object.fromEntries(c.team_ratings.map(t=>[t.id,t.rating])):undefined);
  else if(action==='draw')E.proposeDraw(state,random);
  else if(action==='validate_draw')E.validateDraw(state,userId);
  else if(action==='finish'||action==='correct'){
   const row=c.matches.find(m=>m.format_slot==='fast:'+matchId);
   if(!row)throw new Error('Match introuvable');
   const result={homeScore:action==='correct'?input.homeScore:row.home_score,awayScore:action==='correct'?input.awayScore:row.away_score,penalties:input.penalties||null};
   if(action==='correct')state=E.correct(state,matchId,result);else E.finish(state,matchId,result);
  }else throw new Error('Action inconnue');
 }
 return repository.commit(tournamentId,userId,c.version,state,{action,matchId});
}
module.exports={command};

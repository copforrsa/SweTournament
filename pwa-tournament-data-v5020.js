(()=>{
'use strict';
const standalone=()=>navigator.standalone===true||window.matchMedia?.('(display-mode: standalone)').matches;
const appleMobile=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
if(!standalone()&&!appleMobile)return;
const E=id=>document.getElementById(id);
const relevantQueue=()=>{const rows=JSON.parse(localStorage.getItem('swe_offline_queue_v1')||'[]');if(!Array.isArray(rows))throw Error('File hors ligne illisible : données locales conservées.');return rows.filter(x=>x.user_id===S.session?.user?.id&&x.workspace_id===S.workspace?.id);};
let sequence=0;
const read=async query=>{const r=await query;if(r.error)throw Error(r.error.message||'Lecture du tournoi impossible');return r.data;};
async function refresh(){
 const id=S.activeTour,workspace=S.workspace?.id,user=S.session?.user?.id,request=++sequence;
 if(!id||!workspace||!user||S.publicMode)return;
 if(navigator.onLine===false)throw Error('Reconnecte-toi pour actualiser les données.');
 if(relevantQueue().length)throw Error('Des actions hors ligne attendent leur synchronisation. Elles sont conservées ; réessaie après leur envoi.');
 const [t,venues,players,teams,matches]=await Promise.all([
  read(sb.from('tournaments').select('*').eq('id',id).eq('workspace_id',workspace).single()),
  read(sb.rpc('get_sports_venues')),
  read(sb.from('tournament_players').select('*').eq('tournament_id',id)),
  read(sb.from('teams').select('*').eq('tournament_id',id).order('created_at')),
  read(sb.from('matches').select('*').eq('tournament_id',id).order('match_order'))
 ]);
 if(!t||!Array.isArray(venues?.pitches)||!Array.isArray(venues?.complexes)||![players,teams,matches].every(Array.isArray))throw Error('Données du tournoi incomplètes : réessaie.');
 const tids=teams.map(x=>x.id),mids=matches.map(x=>x.id);
 const [teamPlayers,goals,assignments,scores,review]=await Promise.all([
  tids.length?read(sb.from('team_players').select('*').in('team_id',tids)):[],
  mids.length?read(sb.from('goals').select('*').in('match_id',mids).order('created_at')):[],
  mids.length?read(sb.from('match_player_assignments').select('*').in('match_id',mids)):[],
  read(sb.rpc('get_tournament_team_balance_scores',{p_tournament_id:id})).catch(()=>[]),
  t.format!=='league'&&S.workspaceFeatures.team_review_enabled?read(sb.rpc('get_tournament_team_review_state',{p_tournament_id:id})).catch(()=>null):null
 ]);
 if(request!==sequence||S.activeTour!==id||S.workspace?.id!==workspace||S.session?.user?.id!==user)return false;
 if(relevantQueue().length)throw Error('Une action locale attend sa synchronisation ; les données locales sont conservées.');
 const index=S.tournaments.findIndex(x=>x.id===id);if(index<0)return false;
 S.tournaments[index]=t;S.sportsComplexes=venues.complexes;S.sportsPitches=venues.pitches;
 Object.assign(S,{tPlayers:players,teams,teamPlayers,matches,goals,matchAssignments:assignments,teamBalanceScores:scores||[],teamReviewState:review});
 S.pwaTournamentLoadedId=id;
 renderMatchPitchSelect();window.SWECacheOfflineSnapshot?.();
 document.dispatchEvent(new CustomEvent('swe:rotation-updated',{detail:{tournamentId:id,state:t.rotation_state||{}}}));
 return true;
}
const original=loadTournament;
loadTournament=async function(...args){if(S.publicMode||!S.activeTour||navigator.onLine===false)return original.apply(this,args);return refresh();};
function controls(){
 if(S.publicMode||!hasAdminOps()||!S.activeTour)return;
 for(const anchorId of ['matchCompetitionStatus','teamCompetitionStatus']){
  const anchor=E(anchorId);if(!anchor||E(anchorId+'RefreshPWA'))continue;
  const box=document.createElement('div');box.id=anchorId+'RefreshPWA';box.className='player';
  const button=document.createElement('button');button.type='button';button.textContent='↻ Actualiser les données du tournoi';
  const status=document.createElement('p');status.className='muted';status.setAttribute('role','status');box.append(button,status);anchor.after(box);
  button.onclick=async()=>{button.disabled=true;status.textContent='Actualisation…';try{const ok=await refresh();if(!ok){status.textContent='Le tournoi sélectionné a changé. Réessaie.';return;}E('matchPitchRoleSettings')?.remove();renderTeams();renderMatches();window.SWE_MOUNT_MATCH_EXTRAS_4306?.(true);status.textContent='Données actualisées : '+S.tPlayers.filter(p=>p.present).length+' inscrits · '+S.teams.length+' équipes · '+(currentTour()?.reserved_pitch_ids||[]).length+' terrains.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};
 }
}
document.addEventListener('swe:rendered',controls);document.addEventListener('swe:page-view',()=>{
 controls();
 if(S.publicMode||S.lastView!=='matches'||navigator.onLine===false||E('matchPitchRoleSettings')?.open)return;
 refresh().then(ok=>{if(ok&&S.lastView==='matches'&&!E('matchPitchRoleSettings')?.open){renderMatches();window.SWE_MOUNT_MATCH_EXTRAS_4306?.(true);}}).catch(()=>{});
});
window.SWEPWATournamentData={refresh};
})();

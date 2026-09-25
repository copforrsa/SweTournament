(()=>{
'use strict';
if(window.__SWE_MATCH_REALTIME_4361)return;window.__SWE_MATCH_REALTIME_4361=true;
let channel=null,pending=new Map(),matchPending=new Map();
const localBusy=()=>Number(window.__SWE_LOCAL_MATCH_MUTATION_UNTIL||0)>Date.now();
const currentTourId=()=>{try{return currentTour()?.id||S.activeTour||null}catch(_){return S?.activeTour||null}};
function activeMatchIdFromGoal(g){return g?.match_id||null}
async function syncGoalMatch(matchId){
 if(!matchId||localBusy())return;
 try{
   const [mr,gr]=await Promise.all([
     sb.from('matches').select('*').eq('id',matchId).maybeSingle(),
     sb.from('goals').select('*').eq('match_id',matchId)
   ]);
   if(mr.error)throw mr.error;
   const m=mr.data;if(!m)return;
   const tid=currentTourId();if(tid&&m.tournament_id&&String(m.tournament_id)!==String(tid))return;
   const i=(S.matches||[]).findIndex(x=>String(x.id)===String(matchId));
   if(i>=0)S.matches[i]=m;else (S.matches=S.matches||[]).push(m);
   if(!gr.error)S.goals=[...(S.goals||[]).filter(g=>String(g.match_id)!==String(matchId)),...(gr.data||[])];
   document.dispatchEvent(new CustomEvent('swe:match-remote-final',{detail:{match:m,matchId,reason:'goal'}}));
 }catch(e){console.warn('SWÉ V43.61 synchro but',e)}
}
function queue(matchId){if(!matchId)return;clearTimeout(pending.get(matchId));pending.set(matchId,setTimeout(()=>{pending.delete(matchId);syncGoalMatch(matchId)},180))}
async function syncTournamentMatches(tournamentId){
 if(!tournamentId)return;
 try{
   const active=currentTourId();if(active&&String(active)!==String(tournamentId))return;
   const mr=await sb.from('matches').select('*').eq('tournament_id',tournamentId).order('match_order');
   if(mr.error)throw mr.error;
   S.matches=mr.data||[];
   const ids=S.matches.map(m=>m.id);
   if(ids.length){const gr=await sb.from('goals').select('*').in('match_id',ids);if(!gr.error)S.goals=gr.data||[]}
   document.dispatchEvent(new CustomEvent('swe:match-remote-final',{detail:{tournamentId,reason:'bracket'}}));
 }catch(e){console.warn('SWÉ V50.35 synchro tableau',e)}
}
function queueTournament(tournamentId){if(!tournamentId)return;clearTimeout(matchPending.get(tournamentId));matchPending.set(tournamentId,setTimeout(()=>{matchPending.delete(tournamentId);syncTournamentMatches(tournamentId)},220))}
function subscribe(){
 try{if(channel)sb.removeChannel(channel)}catch(_){}
 channel=sb.channel('swe-matches-5035')
   .on('postgres_changes',{event:'*',schema:'public',table:'goals'},payload=>queue(activeMatchIdFromGoal(payload?.new)||activeMatchIdFromGoal(payload?.old)))
   .on('postgres_changes',{event:'*',schema:'public',table:'matches'},payload=>queueTournament(payload?.new?.tournament_id||payload?.old?.tournament_id))
   .subscribe(status=>{document.documentElement.dataset.sweRealtime=String(status||'').toLowerCase()});
}
subscribe();window.addEventListener('online',subscribe);
// Pas de polling : sans but créé/modifié/supprimé, aucune reconstruction de l'écran Matchs.
})();

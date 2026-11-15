/* Reconciles scheduled Conquête line-ups with their current team composition.
   It is deliberately limited to untouched 15-match qualification rounds. */
(()=>{
  'use strict';
  let running=false,done=false,attempts=0;
  const eq=(a,b)=>String(a)===String(b);
  const same=(left,right)=>{
    const a=[...new Set(left.map(String))].sort(),b=[...new Set(right.map(String))].sort();
    return a.length===b.length&&a.every((value,index)=>value===b[index]);
  };
  async function reconcile(){
    if(done||running)return;
    const state=window.S;
    if(!state?.session||typeof sb==='undefined'||typeof isAdmin!=='function'||!isAdmin())return;
    const matches=(state.matches||[]).filter(match=>
      match.competition_type==='championship_qualification'&&
      match.format_stage==='qualification'&&
      String(match.status||'scheduled')==='scheduled'
    );
    if(matches.length!==15)return;
    const teamPlayers=state.teamPlayers||[],assignments=state.matchAssignments||[];
    const repairs=[];
    for(const match of matches){
      const teamIds=[match.home_team_id,match.away_team_id];
      const wanted=teamPlayers.filter(row=>teamIds.some(teamId=>eq(row.team_id,teamId)));
      if(!wanted.length)continue;
      const current=assignments.filter(row=>eq(row.match_id,match.id));
      const correct=teamIds.every(teamId=>same(
        current.filter(row=>eq(row.team_id,teamId)).map(row=>row.player_id),
        wanted.filter(row=>eq(row.team_id,teamId)).map(row=>row.player_id)
      ));
      if(!correct)repairs.push({match,wanted});
    }
    if(!repairs.length){done=true;return;}
    running=true;
    try{
      for(const {match,wanted} of repairs){
        const removed=await sb.from('match_player_assignments').delete().eq('match_id',match.id);
        if(removed.error)throw removed.error;
        const added=await sb.from('match_player_assignments').insert(
          wanted.map(row=>({match_id:match.id,player_id:row.player_id,team_id:row.team_id}))
        );
        if(added.error)throw added.error;
      }
      if(typeof loadTournament==='function')await loadTournament();
      if(typeof renderMatches==='function')renderMatches(false);
      document.dispatchEvent(new CustomEvent('swe:lineups-reconciled',{detail:{count:repairs.length}}));
      done=true;
      if(typeof toast==='function')toast('Feuilles de match réalignees avec les équipes ✅');
    }catch(error){
      console.warn('SWÉ reconciliation des feuilles de match',error);
    }finally{running=false;}
  }
  const tick=()=>{if(done||attempts++>30)return;reconcile();};
  document.addEventListener('DOMContentLoaded',()=>{tick();setInterval(tick,1000)},{once:true});
  document.addEventListener('swe:rendered',tick);
  document.addEventListener('swe:match-remote-final',tick);
  if(document.readyState!=='loading')tick();
})();

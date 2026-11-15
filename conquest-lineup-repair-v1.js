/* Keeps every scheduled Conquête line-up aligned with its team.
   Display is corrected immediately; an admin session also persists the repair. */
(()=>{
  'use strict';
  let syncing=false,stored=false;
  const eq=(a,b)=>String(a)===String(b);
  const same=(left,right)=>{
    const a=[...new Set(left.map(String))].sort(),b=[...new Set(right.map(String))].sort();
    return a.length===b.length&&a.every((value,index)=>value===b[index]);
  };
  function collect(state){
    const matches=(state.matches||[]).filter(match=>
      match.competition_type==='championship_qualification'&&
      match.format_stage==='qualification'&&
      String(match.status||'scheduled')==='scheduled'
    );
    if(matches.length!==15||(state.teamPlayers||[]).length===0)return [];
    const repairs=[];
    for(const match of matches){
      const teamIds=[match.home_team_id,match.away_team_id];
      const wanted=(state.teamPlayers||[]).filter(row=>teamIds.some(teamId=>eq(row.team_id,teamId)));
      if(!wanted.length)continue;
      const current=(state.matchAssignments||[]).filter(row=>eq(row.match_id,match.id));
      const right=teamIds.every(teamId=>same(
        current.filter(row=>eq(row.team_id,teamId)).map(row=>row.player_id),
        wanted.filter(row=>eq(row.team_id,teamId)).map(row=>row.player_id)
      ));
      if(!right)repairs.push({match,wanted});
    }
    return repairs;
  }
  function applyInMemory(state,repairs){
    if(!repairs.length)return false;
    const ids=new Set(repairs.map(item=>String(item.match.id)));
    state.matchAssignments=[
      ...(state.matchAssignments||[]).filter(row=>!ids.has(String(row.match_id))),
      ...repairs.flatMap(item=>item.wanted.map(row=>({
        match_id:item.match.id,player_id:row.player_id,team_id:row.team_id
      })))
    ];
    try{window.SWE_RENDER_MATCHES_4302?.(false)}catch(_){}
    try{window.renderMatches?.(false)}catch(_){}
    document.dispatchEvent(new CustomEvent('swe:lineups-reconciled',{detail:{count:repairs.length}}));
    return true;
  }
  async function persist(repairs){
    if(stored||syncing||!repairs.length)return;
    const client=window.sb||(typeof sb!=='undefined'?sb:null);
    const allowed=typeof isAdmin==='function'&&isAdmin();
    if(!client||!allowed)return;
    syncing=true;
    try{
      for(const {match,wanted} of repairs){
        const removed=await client.from('match_player_assignments').delete().eq('match_id',match.id);
        if(removed.error)throw removed.error;
        const added=await client.from('match_player_assignments').insert(wanted.map(row=>({
          match_id:match.id,player_id:row.player_id,team_id:row.team_id
        })));
        if(added.error)throw added.error;
      }
      stored=true;
      if(typeof toast==='function')toast('Feuilles de match réalignees avec les équipes ✅');
    }catch(error){
      console.warn('SWÉ : affichage corrigé, synchronisation serveur à reprendre',error);
    }finally{syncing=false;}
  }
  function reconcile(){
    const state=window.S;
    if(!state)return;
    const repairs=collect(state);
    if(!repairs.length)return;
    applyInMemory(state,repairs);
    persist(repairs);
  }
  document.addEventListener('DOMContentLoaded',()=>{reconcile();setInterval(reconcile,1000)},{once:true});
  document.addEventListener('swe:rendered',reconcile);
  document.addEventListener('swe:match-remote-final',reconcile);
  if(document.readyState!=='loading')reconcile();
})();

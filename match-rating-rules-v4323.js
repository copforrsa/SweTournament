(()=>{
'use strict';
if(window.__SWE_MATCH_RATING_RULES_4323)return;window.__SWE_MATCH_RATING_RULES_4323=true;
function ratingBase(own,opp){
  const diff=Number(own)-Number(opp);
  if(diff>2)return 7;
  if(diff>0)return 6;
  if(diff===0)return 5;
  const loss=Math.abs(diff);
  if(loss<=2)return 4;
  if(loss<=5)return 3;
  return 2;
}
window.ratingForMatchPlayer=function(match,playerId,teamId,goalRows){
  if(!match||!teamId)return null;
  const hs=Number(match.home_score||0),as=Number(match.away_score||0);
  const isHome=String(teamId)===String(match.home_team_id),isAway=String(teamId)===String(match.away_team_id);
  if(!isHome&&!isAway)return null;
  const own=isHome?hs:as,opp=isHome?as:hs;
  const base=ratingBase(own,opp);
  let rows=goalRows;
  try{if(!Array.isArray(rows)&&typeof S!=='undefined')rows=S.goals||[]}catch(_){rows=[]}
  rows=Array.isArray(rows)?rows:[];
  const mg=rows.filter(g=>String(g.match_id)===String(match.id));
  const goals=mg.filter(g=>String(g.scorer_player_id)===String(playerId)&&g.is_own_goal!==true).length;
  const assists=mg.filter(g=>String(g.assister_player_id||'')===String(playerId)).length;
  return {rating:Math.min(10,base+goals+(assists*.5)),base,goals,assists,result:own>opp?'V':(own===opp?'N':'D')};
};
window.SWE_MATCH_RATING_BASE_4323=ratingBase;
})();
(()=>{
'use strict';
if(window.__SWE_MATCH_ACTIONS_4303)return;window.__SWE_MATCH_ACTIONS_4303=true;
const A={};
const byTeam=id=>(S.teamPlayers||[]).filter(x=>String(x.team_id)===String(id)).map(x=>(S.players||[]).find(p=>String(p.id)===String(x.player_id))).filter(Boolean);
const matchById=id=>(S.matches||[]).find(m=>String(m.id)===String(id));
function fieldForTeam(m,teamId){return String(teamId)===String(m.home_team_id)?'home_score':String(teamId)===String(m.away_team_id)?'away_score':null}
function emit(m,type,extra={}){document.dispatchEvent(new CustomEvent('swe:match-local-change',{detail:{match:m,type,...extra}}))}
A.playersForTeam=byTeam;
A.addGoal=async function({match,teamId,scorerId,assisterId=null}){
 const field=fieldForTeam(match,teamId);if(!field)throw new Error('Équipe invalide');
 const old=Number(match[field]||0),next=old+1;
 const ins=await sb.from('goals').insert({match_id:match.id,team_id:teamId,scorer_player_id:scorerId,assister_player_id:assisterId||null}).select('*').single();
 if(ins.error)throw ins.error;
 const up=await sb.from('matches').update({[field]:next}).eq('id',match.id);if(up.error){await sb.from('goals').delete().eq('id',ins.data.id);throw up.error}
 match[field]=next;S.goals=S.goals||[];S.goals.push(ins.data);emit(match,'goal-added',{goal:ins.data,teamId});return ins.data;
};
A.setAssist=async function(goal,assisterId){const r=await sb.from('goals').update({assister_player_id:assisterId||null}).eq('id',goal.id);if(r.error)throw r.error;goal.assister_player_id=assisterId||null;emit(matchById(goal.match_id),'assist-updated',{goal});return goal};
A.deleteGoal=async function(goal){const m=matchById(goal.match_id);if(!m)throw new Error('Match introuvable');const field=fieldForTeam(m,goal.team_id);const next=field?Math.max(0,Number(m[field]||0)-1):null;
 const del=await sb.from('goals').delete().eq('id',goal.id);if(del.error)throw del.error;
 if(field){const up=await sb.from('matches').update({[field]:next}).eq('id',m.id);if(up.error)throw up.error;m[field]=next}
 S.goals=(S.goals||[]).filter(g=>String(g.id)!==String(goal.id));emit(m,'goal-deleted',{goal});return m;
};
A.refreshMatch=async function(matchId){const [mr,gr]=await Promise.all([sb.from('matches').select('*').eq('id',matchId).single(),sb.from('goals').select('*').eq('match_id',matchId)]);if(mr.error)throw mr.error;const i=(S.matches||[]).findIndex(m=>String(m.id)===String(matchId));if(i>=0)S.matches[i]=mr.data;S.goals=[...(S.goals||[]).filter(g=>String(g.match_id)!==String(matchId)),...(gr.data||[])];emit(mr.data,'refreshed');return mr.data};
window.SWE_MATCH_ACTIONS_4303=A;
})();
(()=>{
'use strict';
if(window.__SWE_MATCH_QUICKSCORE_4360)return;window.__SWE_MATCH_QUICKSCORE_4360=true;
const E=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const vibrate=p=>{try{navigator.vibrate?.(p)}catch(_){}};
let busy=false,timer=null,lastGoal=null,pendingAssist=null;
const context=window.SWE_MATCH_CONTEXT||null;
const notify=message=>{if(context)context.notify(message);else if(typeof toast==='function')toast(message)};

function state(){if(context)return context.state;try{return typeof S!=='undefined'?S:null}catch(_){return null}}
function editable(match){
  if(context)return !!context.canEditScores();
  const s=state();if(!s?.session||s.publicMode)return false;
  let ok=false;try{ok=typeof canEditCurrentMatches==='function'&&!!canEditCurrentMatches()}catch(_){ok=false}
  if(!ok)return false;
  const finished=String(match?.status||'').toLowerCase()==='finished';
  if(!finished)return true;
  try{return typeof isAdmin==='function'&&!!isAdmin()}catch(_){return false}
}
function team(id){return (state()?.teams||[]).find(x=>String(x.id)===String(id))||null}
function player(id){return (state()?.players||[]).find(x=>String(x.id)===String(id))||null}
function playerName(id){const p=player(id);try{return typeof playerDisplayName==='function'?playerDisplayName(p)||(p?.name||'Joueur'):(p?.name||'Joueur')}catch(_){return p?.name||'Joueur'}}
function teamPlayerIds(match,teamId){
  try{if(typeof matchTeamPlayerIds==='function'){const a=matchTeamPlayerIds(match.id,teamId);if(Array.isArray(a)&&a.length)return [...new Set(a.map(String))]}}catch(_){}
  return [...new Set((state()?.teamPlayers||[]).filter(x=>String(x.team_id)===String(teamId)).map(x=>String(x.player_id)))];
}
function css(){if(E('swe4360QuickCss'))return;const s=document.createElement('style');s.id='swe4360QuickCss';s.textContent=`
.swe4360-quick{margin-top:14px;border:1px solid #cfe1ef;border-radius:16px;background:linear-gradient(180deg,#f6fbff,#f9fcfb);overflow:hidden;box-shadow:0 4px 14px rgba(11,43,84,.05)}
.swe4360-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:linear-gradient(90deg,#e8f5ff,#edf9f3);border-bottom:1px solid #d8e7ef}.swe4360-head b{font-size:14px;color:#0b2b54}.swe4360-head small{font-size:11px;color:#64748b;font-weight:750}
.swe4360-teams{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;padding:10px}.swe4360-team{min-width:0}.swe4360-team h4{margin:0 0 7px;text-align:center;font-size:13px;color:#0f2846;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.swe4360-players{display:grid;gap:7px}.swe4360-player{min-height:46px;border:1px solid #cbdde9!important;background:#fff!important;color:#102a43!important;border-radius:12px!important;padding:8px 9px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;text-align:left!important;cursor:pointer!important;font-weight:850!important;box-shadow:none!important}.swe4360-player:hover{border-color:#168ac1!important;background:#f2faff!important}.swe4360-player:active{transform:scale(.985)}.swe4360-player span{font-size:17px;flex:0 0 auto}.swe4360-player b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
.swe4360-assist{display:none;border-top:1px solid #d8e7ef;background:#fff;padding:10px 12px}.swe4360-assist.show{display:block}.swe4360-assist-title{font-size:13px;font-weight:900;color:#0b2b54;margin-bottom:8px}.swe4360-assist-actions{display:flex;flex-wrap:wrap;gap:7px}.swe4360-assist-actions button{border:1px solid #cadbe6!important;background:#f8fbfd!important;color:#19324d!important;border-radius:999px!important;padding:7px 10px!important;font-weight:800!important;box-shadow:none!important}.swe4360-assist-actions .none{background:#eef2f4!important}.swe4360-assist-actions .undo{color:#a12525!important;background:#fff1f1!important;border-color:#f0bcbc!important}.swe4360-busy{opacity:.58;pointer-events:none}
@media(max-width:620px){.swe4360-teams{gap:7px;padding:8px}.swe4360-player{min-height:50px!important;padding:7px!important}.swe4360-player b{font-size:11px}.swe4360-head small{display:none}.swe4360-assist-actions button{flex:1 1 auto}}
`;document.head.appendChild(s)}
function syncScore(match,card){
  const result=card?.querySelector('.swe4300-result');if(result)result.textContent=Number(match.home_score||0)+' - '+Number(match.away_score||0);
  const inputs=card?.querySelectorAll('.swe4300-edit input');if(inputs?.length>=2){inputs[0].value=Number(match.home_score||0);inputs[1].value=Number(match.away_score||0)}
  try{window.SWE_MATCH_COMMON_4302?.syncCardScore?.(match)}catch(_){}
}
function refreshGoalPanel(card,match){const panel=card?.querySelector('.swe4301-goals');try{if(panel)window.SWE_MATCH_COMMON_4302?.renderGoalPanel?.(panel,match)}catch(_){}}
function addLocalGoal(g){const s=state();if(!Array.isArray(s.goals))s.goals=[];if(!s.goals.some(x=>String(x.id)===String(g.id)))s.goals.push(g)}
function removeLocalGoal(id){const s=state();if(Array.isArray(s.goals))s.goals=s.goals.filter(x=>String(x.id)!==String(id))}
function bump(match,teamId,delta){if(String(match.home_team_id)===String(teamId))match.home_score=Math.max(0,Number(match.home_score||0)+delta);else if(String(match.away_team_id)===String(teamId))match.away_score=Math.max(0,Number(match.away_score||0)+delta)}

async function recordGoal(match,teamId,scorerId,card,quick){
  if(busy)return;busy=true;quick.classList.add('swe4360-busy');
  const beforeHome=Number(match.home_score||0),beforeAway=Number(match.away_score||0);
  try{
    if(context){
      const data=await context.addGoal(match,teamId,scorerId,null);
      pendingAssist={matchId:match.id,goalId:data.action_goal_id};enhance();vibrate(35);return;
    }
    const ins=await sb.from('goals').insert({match_id:match.id,team_id:teamId,scorer_player_id:scorerId,assister_player_id:null}).select('*').single();
    if(ins.error)throw ins.error;
    bump(match,teamId,1);
    const up=await sb.from('matches').update({home_score:Number(match.home_score||0),away_score:Number(match.away_score||0)}).eq('id',match.id);
    if(up.error){match.home_score=beforeHome;match.away_score=beforeAway;await sb.from('goals').delete().eq('id',ins.data.id);throw up.error}
    const goal=ins.data;addLocalGoal(goal);syncScore(match,card);refreshGoalPanel(card,match);showAssist(match,teamId,scorerId,goal,card,quick);lastGoal={goal,match,card,quick};vibrate(35);if(typeof toast==='function')toast('⚽ But de '+playerName(scorerId)+' ajouté !');
  }catch(e){if(!context){match.home_score=beforeHome;match.away_score=beforeAway;syncScore(match,card)}notify(e?.message||'Impossible d’enregistrer le but')}
  finally{busy=false;quick.classList.remove('swe4360-busy')}
}
function showAssist(match,teamId,scorerId,goal,card,quick){
  const zone=quick.querySelector('.swe4360-assist');if(!zone)return;
  const ids=teamPlayerIds(match,teamId).filter(id=>String(id)!==String(scorerId));
  zone.innerHTML='<div class="swe4360-assist-title">🎯 Passeur pour '+esc(playerName(scorerId))+' ?</div><div class="swe4360-assist-actions">'+ids.map(id=>'<button type="button" data-assist="'+esc(id)+'">'+esc(playerName(id))+'</button>').join('')+'<button type="button" class="none" data-assist="">Aucun passeur</button><button type="button" class="undo" data-undo="1">↶ Annuler ce but</button></div>';
  zone.classList.add('show');
  zone.onclick=async e=>{
    const undo=e.target.closest?.('[data-undo]');if(undo){e.preventDefault();await undoGoal(goal,match,card,quick);return}
    const b=e.target.closest?.('[data-assist]');if(!b)return;e.preventDefault();
    const assist=b.dataset.assist||null;zone.classList.add('swe4360-busy');
    try{
      if(context){await context.setAssist(match,goal,assist);pendingAssist=null;enhance()}
      else{const up=await sb.from('goals').update({assister_player_id:assist}).eq('id',goal.id);if(up.error)throw up.error;goal.assister_player_id=assist;zone.classList.remove('show');zone.innerHTML='';refreshGoalPanel(card,match)}
      vibrate(assist?[20,35,20]:20);notify(assist?'🎯 Passe de '+playerName(assist)+' ajoutée !':'✅ But enregistré sans passeur');
    }catch(error){notify(error.message)}finally{zone.classList.remove('swe4360-busy')}
  };
}
async function undoGoal(goal,match,card,quick){
  if(busy||!goal?.id)return;busy=true;quick.classList.add('swe4360-busy');
  if(context){try{await context.deleteGoal(match,goal);pendingAssist=null;enhance();vibrate([15,25,15])}catch(error){notify(error.message)}finally{busy=false;quick.classList.remove('swe4360-busy')}return}
  const beforeHome=Number(match.home_score||0),beforeAway=Number(match.away_score||0);bump(match,goal.team_id,-1);
  try{
    const up=await sb.from('matches').update({home_score:Number(match.home_score||0),away_score:Number(match.away_score||0)}).eq('id',match.id);if(up.error)throw up.error;
    const del=await sb.from('goals').delete().eq('id',goal.id);
    if(del.error){match.home_score=beforeHome;match.away_score=beforeAway;await sb.from('matches').update({home_score:beforeHome,away_score:beforeAway}).eq('id',match.id);throw del.error}
    removeLocalGoal(goal.id);syncScore(match,card);refreshGoalPanel(card,match);const z=quick.querySelector('.swe4360-assist');if(z){z.classList.remove('show');z.innerHTML=''}lastGoal=null;vibrate([15,25,15]);if(typeof toast==='function')toast('But annulé ✅');
  }catch(e){match.home_score=beforeHome;match.away_score=beforeAway;syncScore(match,card);if(typeof toast==='function')toast(e?.message||'Impossible d’annuler le but')}
  finally{busy=false;quick.classList.remove('swe4360-busy')}
}
function playerButtons(match,teamId){const ids=teamPlayerIds(match,teamId);if(!ids.length)return '<div style="font-size:11px;color:#7b8794;text-align:center;padding:8px">Aucun joueur affecté</div>';return ids.map(id=>'<button type="button" class="swe4360-player" data-team="'+esc(teamId)+'" data-player="'+esc(id)+'"><span>⚽</span><b>'+esc(playerName(id))+'</b></button>').join('')}
function build(match,card){const h=team(match.home_team_id),a=team(match.away_team_id),q=document.createElement('section');q.className='swe4360-quick';q.dataset.quickMatch=String(match.id);q.innerHTML='<div class="swe4360-head"><b>⚡ Saisie rapide des buteurs</b><small>1 clic sur un joueur = 1 but</small></div><div class="swe4360-teams"><div class="swe4360-team"><h4>'+esc(h?.name||'Équipe 1')+'</h4><div class="swe4360-players">'+playerButtons(match,match.home_team_id)+'</div></div><div class="swe4360-team"><h4>'+esc(a?.name||'Équipe 2')+'</h4><div class="swe4360-players">'+playerButtons(match,match.away_team_id)+'</div></div></div><div class="swe4360-assist"></div>';
  q.onclick=e=>{const b=e.target.closest?.('.swe4360-player');if(!b)return;e.preventDefault();e.stopPropagation();recordGoal(match,b.dataset.team,b.dataset.player,card,q)};return q}
function enhance(){
  css();const s=state();if(!s||(!context&&(!s.session||s.publicMode)))return;const box=E('matchesList');if(!box)return;
  [...box.querySelectorAll('.swe4300-match[data-match-id]')].forEach(card=>{
    const id=card.dataset.matchId,match=(s.matches||[]).find(x=>String(x.id)===String(id));if(!match||!editable(match))return;
    let q=card.querySelector('.swe4360-quick[data-quick-match="'+CSS.escape(String(id))+'"]');
    if(!q){q=build(match,card);const goals=card.querySelector('.swe4301-goals');if(goals)goals.insertAdjacentElement('beforebegin',q);else card.appendChild(q)}
    if(context){const goal=pendingAssist?.matchId===match.id&&(s.goals||[]).find(g=>g.id===pendingAssist.goalId);
      if(goal)showAssist(match,goal.team_id,goal.scorer_player_id,goal,card,q);
      else{const zone=q.querySelector('.swe4360-assist');zone.classList.remove('show');zone.innerHTML=''}
    }
  });
}
window.SWE_ENHANCE_QUICKSCORE_4360=enhance;
function schedule(){clearTimeout(timer);timer=setTimeout(enhance,35)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
document.addEventListener('swe:rendered',schedule);document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="matches"],#matchesList,#matchCompetitionSelect'))setTimeout(schedule,60)},true);window.addEventListener('pageshow',schedule);
const startObs=()=>{if(context)return;const root=E('matchesList')||document.body;new MutationObserver(schedule).observe(root,{childList:true,subtree:true})};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObs,{once:true});else startObs();
setTimeout(enhance,250);setTimeout(enhance,900);
})();

(()=>{
'use strict';
if(window.__SWE_QUICKSCORE_4262)return;
window.__SWE_QUICKSCORE_4262=true;
window.__SWE_QUICK_ASSIST_ACTIVE=false;
const escHtml=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const vibrate=p=>{try{if(navigator.vibrate)navigator.vibrate(p)}catch(_){}};
const q=(root,sel)=>root?.querySelector(sel);
const qa=(root,sel)=>[...(root?.querySelectorAll(sel)||[])];
let lastGoal=null;

function canUse(){
  try{return typeof S!=='undefined'&&S.session&&typeof canEditCurrentMatches==='function'&&canEditCurrentMatches()&&!S.publicMode}catch(_){return false}
}
function playerName(id){
  try{return playerDisplayName(p(id))||'Joueur'}catch(_){return 'Joueur'}
}
function teamPlayerButtons(match,team){
  const ids=matchTeamPlayerIds(match.id,team.id);
  return ids.map(id=>`<button type="button" class="swe-qgoal-player" data-match="${match.id}" data-team="${team.id}" data-player="${id}"><span>⚽</span><b>${escHtml(playerName(id))}</b></button>`).join('');
}
function ensureStyle(){
  if(document.getElementById('sweQuickScore4262Style'))return;
  const s=document.createElement('style');s.id='sweQuickScore4262Style';s.textContent=`
.swe-qscore{margin-top:12px;border:1px solid #d7e5de;border-radius:18px;background:#f8fbf9;overflow:hidden}
.swe-qscore-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:#eef7f2}
.swe-qscore-head b{font-size:14px}.swe-qscore-head small{color:#65756d}.swe-qscore-teams{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px}
.swe-qscore-team{min-width:0}.swe-qscore-team h4{margin:0 0 7px;font-size:13px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.swe-qscore-players{display:grid;gap:7px}.swe-qgoal-player{min-height:48px;border:1px solid #cfe0d7;background:#fff;border-radius:13px;padding:8px 9px;display:flex;align-items:center;gap:8px;text-align:left;cursor:pointer}.swe-qgoal-player:active{transform:scale(.98)}.swe-qgoal-player span{font-size:17px}.swe-qgoal-player b{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.swe-qassist{display:none;border-top:1px solid #d7e5de;padding:10px;background:#fff}.swe-qassist.show{display:block}.swe-qassist-title{font-weight:850;margin-bottom:7px}.swe-qassist-actions{display:flex;flex-wrap:wrap;gap:7px}.swe-qassist button{border:1px solid #cfe0d7;background:#f8fbf9;border-radius:999px;padding:8px 11px;font-weight:750}.swe-qassist .none{background:#eef1ef}.swe-qundo{border:0;background:transparent;color:#9b2d2d;font-weight:800;cursor:pointer}.swe-qbusy{opacity:.55;pointer-events:none}
@media(max-width:620px){.swe-qscore-teams{gap:7px;padding:8px}.swe-qgoal-player{min-height:52px;padding:7px}.swe-qgoal-player b{font-size:12px}.swe-qscore-head small{display:none}}
`;
  document.head.appendChild(s);
}
function localScore(match,teamId,delta){
  if(String(match.home_team_id)===String(teamId))match.home_score=Math.max(0,Number(match.home_score||0)+delta);
  else if(String(match.away_team_id)===String(teamId))match.away_score=Math.max(0,Number(match.away_score||0)+delta);
}
function paintScore(card,match){const score=q(card,'.score');if(score)score.textContent=`${Number(match.home_score||0)} - ${Number(match.away_score||0)}`}
function closeAssistLock(){
  window.__SWE_QUICK_ASSIST_ACTIVE=false;
  document.dispatchEvent(new CustomEvent('swe:quick-assist-closed'));
}
async function writeGoal(match,teamId,scorerId,card,quick){
  quick.classList.add('swe-qbusy');
  window.__SWE_QUICK_ASSIST_ACTIVE=true;
  const beforeHome=Number(match.home_score||0),beforeAway=Number(match.away_score||0);
  const ins=await sb.from('goals').insert({match_id:match.id,team_id:teamId,scorer_player_id:scorerId,assister_player_id:null}).select('id').single();
  if(ins.error){quick.classList.remove('swe-qbusy');closeAssistLock();toast(ins.error.message);return}
  localScore(match,teamId,1);paintScore(card,match);vibrate(40);
  const upd=await sb.from('matches').update({home_score:Number(match.home_score||0),away_score:Number(match.away_score||0)}).eq('id',match.id);
  if(upd.error){
    match.home_score=beforeHome;match.away_score=beforeAway;paintScore(card,match);
    await sb.from('goals').delete().eq('id',ins.data.id);
    quick.classList.remove('swe-qbusy');closeAssistLock();toast('But non enregistré : '+upd.error.message);return;
  }
  const goal={id:ins.data.id,match_id:match.id,team_id:teamId,scorer_player_id:scorerId,assister_player_id:null};
  if(Array.isArray(S.goals)&&!S.goals.some(g=>String(g.id)===String(goal.id)))S.goals.push(goal);
  lastGoal={goal,match,card,quick,beforeHome,beforeAway};
  showAssist(match,teamId,scorerId,goal,quick);
  quick.classList.remove('swe-qbusy');
  toast('But de '+playerName(scorerId)+' ✅');
}
function showAssist(match,teamId,scorerId,goal,quick){
  const zone=q(quick,'.swe-qassist');if(!zone){closeAssistLock();return}
  window.__SWE_QUICK_ASSIST_ACTIVE=true;
  const mateIds=matchTeamPlayerIds(match.id,teamId).filter(id=>String(id)!==String(scorerId));
  zone.innerHTML=`<div class="swe-qassist-title">🎯 Passeur pour ${escHtml(playerName(scorerId))} ?</div><div class="swe-qassist-actions">${mateIds.map(id=>`<button type="button" data-assist="${id}">${escHtml(playerName(id))}</button>`).join('')}<button type="button" class="none" data-assist="">Aucun</button><button type="button" class="swe-qundo" data-undo-goal="${goal.id}">↶ Annuler le but</button></div>`;
  zone.classList.add('show');
  zone.scrollIntoView?.({block:'nearest',behavior:'smooth'});
  zone.onclick=async e=>{
    const undo=e.target.closest?.('[data-undo-goal]');if(undo){e.preventDefault();await undoGoal(goal,match,quick);return}
    const b=e.target.closest?.('[data-assist]');if(!b)return;
    const assistId=b.dataset.assist||null;
    zone.classList.add('swe-qbusy');
    const up=await sb.from('goals').update({assister_player_id:assistId}).eq('id',goal.id);
    zone.classList.remove('swe-qbusy');
    if(up.error)return toast(up.error.message);
    goal.assister_player_id=assistId;zone.classList.remove('show');zone.innerHTML='';vibrate(assistId?[25,40,25]:20);
    closeAssistLock();
    toast(assistId?'Passe de '+playerName(assistId)+' ✅':'But enregistré sans passeur ✅');
  };
}
async function undoGoal(goal,match,quick){
  if(!goal?.id)return;
  quick.classList.add('swe-qbusy');
  const del=await sb.from('goals').delete().eq('id',goal.id);
  if(del.error){quick.classList.remove('swe-qbusy');return toast(del.error.message)}
  localScore(match,goal.team_id,-1);paintScore(lastGoal?.card||quick.closest('.match'),match);
  const upd=await sb.from('matches').update({home_score:Number(match.home_score||0),away_score:Number(match.away_score||0)}).eq('id',match.id);
  if(upd.error){
    localScore(match,goal.team_id,1);paintScore(lastGoal?.card||quick.closest('.match'),match);quick.classList.remove('swe-qbusy');return toast('Impossible de corriger le score : '+upd.error.message)
  }
  if(Array.isArray(S.goals))S.goals=S.goals.filter(g=>String(g.id)!==String(goal.id));
  const zone=q(quick,'.swe-qassist');if(zone){zone.classList.remove('show');zone.innerHTML=''}
  quick.classList.remove('swe-qbusy');lastGoal=null;closeAssistLock();vibrate([20,30,20]);toast('But annulé ✅');
}
function buildQuick(match,home,away,card){
  const wrap=document.createElement('section');wrap.className='swe-qscore';wrap.dataset.quickMatch=match.id;
  wrap.innerHTML=`<div class="swe-qscore-head"><b>⚡ Saisie rapide</b><small>1 tap = 1 but</small></div><div class="swe-qscore-teams"><div class="swe-qscore-team"><h4>${escHtml(home.name)}</h4><div class="swe-qscore-players">${teamPlayerButtons(match,home)}</div></div><div class="swe-qscore-team"><h4>${escHtml(away.name)}</h4><div class="swe-qscore-players">${teamPlayerButtons(match,away)}</div></div></div><div class="swe-qassist"></div>`;
  wrap.onclick=e=>{
    const b=e.target.closest?.('.swe-qgoal-player');if(!b)return;
    e.preventDefault();e.stopPropagation();writeGoal(match,b.dataset.team,b.dataset.player,card,wrap);
  };
  return wrap;
}
function enhance(){
  if(!canUse())return;
  ensureStyle();
  const box=document.getElementById('matchesList');if(!box)return;
  const cards=qa(box,'.card.match');
  let idx=0;
  (S.matches||[]).forEach(match=>{
    const home=tm(match.home_team_id),away=tm(match.away_team_id);if(!home||!away)return;
    const card=cards[idx++];if(!card||q(card,`.swe-qscore[data-quick-match="${match.id}"]`))return;
    const quick=buildQuick(match,home,away,card);
    const row=q(card,'.row');if(row)row.insertAdjacentElement('afterend',quick);else card.prepend(quick);
  });
}
function patch(){
  if(typeof renderMatches!=='function'){setTimeout(patch,150);return}
  if(renderMatches.__sweQuick4262)return;
  const original=renderMatches;
  const wrapped=function(){const r=original.apply(this,arguments);queueMicrotask(enhance);return r};
  wrapped.__sweQuick4262=true;renderMatches=wrapped;
  setTimeout(enhance,50);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(patch,500),{once:true});else setTimeout(patch,500);
document.addEventListener('swe:rendered',()=>setTimeout(enhance,60));
})();
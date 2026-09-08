(()=>{
'use strict';
if(window.__SWE_4290_GOAL_ASSIST_SHEET)return;window.__SWE_4290_GOAL_ASSIST_SHEET=true;
let busy=false,current=null;
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const playerName=id=>{try{return playerDisplayName(p(id))||'Joueur'}catch(_){return 'Joueur'}};
const canUse=()=>{try{return typeof S!=='undefined'&&S.session&&typeof canEditCurrentMatches==='function'&&canEditCurrentMatches()&&!S.publicMode}catch(_){return false}};
function setLock(on){window.__SWE_QUICK_ASSIST_ACTIVE=!!on;if(!on)document.dispatchEvent(new CustomEvent('swe:quick-assist-closed'))}
function ensureStyle(){if(document.getElementById('swe4290SheetStyle'))return;const s=document.createElement('style');s.id='swe4290SheetStyle';s.textContent=`
#swe4290Backdrop{position:fixed;inset:0;z-index:9998;background:rgba(7,27,18,.48);backdrop-filter:blur(2px)}
#swe4290Sheet{position:fixed;z-index:9999;left:50%;bottom:max(10px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(560px,calc(100% - 20px));background:#fff;border:1px solid #dbe7f5;border-radius:22px;box-shadow:0 22px 60px rgba(15,23,42,.3);padding:16px;max-height:min(74vh,620px);overflow:auto}
#swe4290Sheet h3{margin:0 0 6px;font-size:19px;color:#10213f}#swe4290Sheet .sub{font-size:13px;color:#64748b;margin-bottom:12px}
#swe4290Sheet .assist-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}#swe4290Sheet button{min-height:50px;border-radius:13px;border:1px solid #cfe0d7;background:#f8fbf9;font-weight:850;padding:10px 12px}
#swe4290Sheet button.assist{background:#eff6ff;color:#174f8a;border-color:#bfdbfe}#swe4290Sheet button.none{background:#f1f5f9;color:#334155}#swe4290Sheet button.undo{background:#fff1f2;color:#b91c1c;border-color:#fecaca;grid-column:1/-1}#swe4290Sheet .busy{opacity:.55;pointer-events:none}
@media(max-width:520px){#swe4290Sheet{bottom:max(6px,env(safe-area-inset-bottom));border-radius:18px;padding:13px}#swe4290Sheet .assist-grid{grid-template-columns:1fr}#swe4290Sheet button.undo{grid-column:auto}}
`;document.head.appendChild(s)}
function removeSheet(){document.getElementById('swe4290Backdrop')?.remove();document.getElementById('swe4290Sheet')?.remove()}
async function refreshAfter(){try{if(typeof loadTournament==='function')await loadTournament();if(typeof renderMatches==='function')renderMatches();if(typeof renderHome==='function')renderHome()}catch(e){console.warn('SWÉ 42.90 refresh',e)}}
function closeAndRefresh(){removeSheet();current=null;busy=false;setLock(false);setTimeout(refreshAfter,140)}
function localScore(match,teamId,delta){if(String(match.home_team_id)===String(teamId))match.home_score=Math.max(0,Number(match.home_score||0)+delta);else if(String(match.away_team_id)===String(teamId))match.away_score=Math.max(0,Number(match.away_score||0)+delta)}
function paintCard(card,match){const score=card?.querySelector?.('.score');if(score)score.textContent=Number(match.home_score||0)+' - '+Number(match.away_score||0)}
function showSheet(match,teamId,scorerId,goal,beforeHome,beforeAway,card){ensureStyle();removeSheet();const mates=matchTeamPlayerIds(match.id,teamId).filter(id=>String(id)!==String(scorerId));const back=document.createElement('div');back.id='swe4290Backdrop';const sh=document.createElement('section');sh.id='swe4290Sheet';sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');sh.innerHTML='<h3>🎯 Qui a fait la passe ?</h3><div class="sub">But de <b>'+esc(playerName(scorerId))+'</b> • le score est déjà enregistré.</div><div class="assist-grid">'+mates.map(id=>'<button type="button" class="assist" data-assist="'+esc(id)+'">'+esc(playerName(id))+'</button>').join('')+'<button type="button" class="none" data-assist="">Aucun passeur</button><button type="button" class="undo" data-undo="1">↶ Annuler ce but</button></div>';
document.body.append(back,sh);current={match,teamId,scorerId,goal,beforeHome,beforeAway,card,sheet:sh};
sh.addEventListener('click',async e=>{const btn=e.target.closest('button');if(!btn||btn.disabled)return;sh.classList.add('busy');
 try{
  if(btn.dataset.undo==='1'){
   const del=await sb.from('goals').delete().eq('id',goal.id);if(del.error)throw del.error;
   match.home_score=beforeHome;match.away_score=beforeAway;paintCard(card,match);
   const upm=await sb.from('matches').update({home_score:beforeHome,away_score:beforeAway}).eq('id',match.id);if(upm.error)throw upm.error;
   if(Array.isArray(S.goals))S.goals=S.goals.filter(g=>String(g.id)!==String(goal.id));
   if(typeof toast==='function')toast('But annulé ✅');closeAndRefresh();return;
  }
  const aid=btn.dataset.assist||null;
  if(aid){const up=await sb.from('goals').update({assister_player_id:aid}).eq('id',goal.id);if(up.error)throw up.error;goal.assister_player_id=aid;if(typeof toast==='function')toast('Passe de '+playerName(aid)+' ✅')}
  else if(typeof toast==='function')toast('But enregistré sans passeur ✅');
  closeAndRefresh();
 }catch(err){sh.classList.remove('busy');if(typeof toast==='function')toast(err?.message||'Action impossible')}
});}
async function handleGoal(button){if(busy||!canUse())return;const mid=button.dataset.match,teamId=button.dataset.team,scorerId=button.dataset.player;const match=(S.matches||[]).find(m=>String(m.id)===String(mid));if(!match)return;const card=button.closest('.match');busy=true;setLock(true);button.disabled=true;const beforeHome=Number(match.home_score||0),beforeAway=Number(match.away_score||0);
 try{
  const ins=await sb.from('goals').insert({match_id:match.id,team_id:teamId,scorer_player_id:scorerId,assister_player_id:null}).select('id').single();if(ins.error)throw ins.error;
  localScore(match,teamId,1);paintCard(card,match);
  const upd=await sb.from('matches').update({home_score:Number(match.home_score||0),away_score:Number(match.away_score||0)}).eq('id',match.id);if(upd.error){match.home_score=beforeHome;match.away_score=beforeAway;paintCard(card,match);await sb.from('goals').delete().eq('id',ins.data.id);throw upd.error}
  const goal={id:ins.data.id,match_id:match.id,team_id:teamId,scorer_player_id:scorerId,assister_player_id:null};if(Array.isArray(S.goals)&&!S.goals.some(g=>String(g.id)===String(goal.id)))S.goals.push(goal);
  if(typeof toast==='function')toast('But de '+playerName(scorerId)+' ✅');showSheet(match,teamId,scorerId,goal,beforeHome,beforeAway,card);
 }catch(err){busy=false;setLock(false);if(typeof toast==='function')toast(err?.message||'But non enregistré')}
 finally{button.disabled=false}}
function bind(){document.addEventListener('click',e=>{const b=e.target.closest?.('.swe-qgoal-player');if(!b)return;if(!canUse())return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();handleGoal(b)},true)}
function boot(){ensureStyle();bind();window.addEventListener('pageshow',()=>{if(!current){removeSheet();busy=false;setLock(false)}})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
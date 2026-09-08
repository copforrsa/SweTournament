(()=>{
'use strict';
if(window.__SWE_4277)return;window.__SWE_4277=true;
const E=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const appState=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
const client=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};
const isAdminUser=()=>{try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}};
let busy=false;
async function render(){
 if(busy||!isAdminUser())return;
 const st=appState(),c=client(),box=E('homeCoorgVotes'),card=E('homeCoorgVotesCard');
 if(!st?.workspace?.id||!c||!box||!card)return;
 busy=true;
 try{
  card.classList.remove('hidden');
  const [progress,reviewsResp]=await Promise.all([
   c.rpc('get_admin_evaluation_progress_v1',{p_workspace_id:st.workspace.id}),
   (!Array.isArray(st.skillReviews)||!st.skillReviews.length)?c.rpc('get_admin_player_skill_reviews',{p_workspace_id:st.workspace.id}):Promise.resolve({data:st.skillReviews,error:null})
  ]);
  const prog=progress.error?[]:(Array.isArray(progress.data)?progress.data:[]);
  const reviews=reviewsResp.error?[]:(Array.isArray(reviewsResp.data)?reviewsResp.data:[]);
  if(!Array.isArray(st.skillReviews)||!st.skillReviews.length)st.skillReviews=reviews;
  const activePlayers=(st.players||[]).filter(p=>p.active!==false&&p.is_group_member!==false);
  const evaluatedIds=[...new Set(reviews.filter(r=>r.player_id).map(r=>String(r.player_id)))];
  const totalVotes=prog.reduce((n,r)=>n+Number(r.evaluations_count||0),0);
  const activeCoorgs=(st.coorgs||[]).filter(cg=>cg.active!==false);
  const pct=activePlayers.length?Math.round(evaluatedIds.length*100/activePlayers.length):0;
  const pmap=new Map(prog.map(r=>[String(r.evaluator_user_id||''),r]));
  const rows=activeCoorgs.map(cg=>{
   const linked=(st.players||[]).find(p=>String(p.id)===String(cg.linked_player_id||''));
   const label=linked?.name||String(cg.email||'Co-gestionnaire').split('@')[0];
   const pr=pmap.get(String(cg.user_id||''));
   const count=Number(pr?.evaluated_players||0);
   const max=Math.max(0,activePlayers.filter(p=>String(p.id)!==String(cg.linked_player_id||'')).length);
   return {label,count,max};
  }).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'fr'));
  box.innerHTML='<div class="swe-eval-summary"><div class="swe-eval-kpi"><b>'+evaluatedIds.length+'</b><small>joueurs évalués</small></div><div class="swe-eval-kpi"><b>'+activePlayers.length+'</b><small>joueurs du groupe</small></div><div class="swe-eval-kpi"><b>'+totalVotes+'</b><small>évaluations enregistrées</small></div></div><div class="muted" style="margin-bottom:8px">Couverture globale : <b>'+pct+'%</b></div>'+(rows.length?rows.map(r=>{const p=r.max?Math.min(100,Math.round(r.count*100/r.max)):0;return '<div class="swe-eval-row"><div><b>'+esc(r.label)+'</b></div><div><div class="swe-eval-bar"><span style="width:'+p+'%"></span></div></div><div><b>'+r.count+'</b> / '+r.max+'</div></div>'}).join(''):'<div class="muted">Aucun co-gestionnaire actif pour le moment.</div>');
 }catch(e){console.warn('evaluation progress 4277',e)}finally{busy=false}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(render,350),{once:true});else setTimeout(render,160);
[700,1700,3200].forEach(ms=>setTimeout(render,ms));
document.addEventListener('swe:rendered',()=>setTimeout(render,120));
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="home"]'))setTimeout(render,140)});
window.addEventListener('pageshow',()=>setTimeout(render,140));
})();
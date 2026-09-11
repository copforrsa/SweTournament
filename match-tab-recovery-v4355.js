(()=>{
'use strict';
if(window.__SWE_MATCH_TAB_RECOVERY_4361)return;window.__SWE_MATCH_TAB_RECOVERY_4361=true;
let busy=false,lastTourId=null,lastLoadedAt=0;
const E=id=>document.getElementById(id);
const activeView=()=>document.querySelector('.view.active')?.id||'';
const inMatches=()=>activeView()==='view-matches'||document.querySelector('.tabs button[data-view="matches"].active');
const tour=()=>{try{return typeof currentTour==='function'?currentTour():null}catch(_){return null}};
const canScore=()=>{try{return typeof canEditCurrentMatches==='function'?!!canEditCurrentMatches():!!(S?.workspace?.role==='coorganizer'&&S?.myPermissions?.can_enter_scores)}catch(_){return false}};
function render(){
 const box=E('matchesList');if(box){box.classList.remove('hidden');box.style.removeProperty('display');box.style.removeProperty('visibility')}
 try{if(typeof window.SWE_RENDER_MATCHES_4302==='function')window.SWE_RENDER_MATCHES_4302(false);else if(typeof renderMatches==='function')renderMatches()}catch(e){console.warn('SWÉ V43.61 render matchs',e)}
 document.dispatchEvent(new CustomEvent('swe:matches-ready',{detail:{tournamentId:S?.activeTour||null}}));
}
async function optional(query,apply){try{const r=await query();if(!r?.error)apply(r.data||[]);else console.warn('SWÉ V43.61 donnée optionnelle',r.error.message)}catch(e){console.warn('SWÉ V43.61 donnée optionnelle',e)}}
async function hydrate(force=false){
 if(busy||!inMatches())return;
 const t=tour();if(!t?.id)return render();
 const now=Date.now();if(!force&&lastTourId===t.id&&Array.isArray(S.matches)&&S.matches.length&&now-lastLoadedAt<120000)return render();
 busy=true;
 try{
   const [mr,tr]=await Promise.all([
     sb.from('matches').select('*').eq('tournament_id',t.id).order('match_order'),
     sb.from('teams').select('*').eq('tournament_id',t.id).order('created_at')
   ]);
   if(mr.error)throw mr.error;
   S.matches=mr.data||[];
   if(!tr.error)S.teams=tr.data||[];else console.warn('SWÉ V43.61 équipes',tr.error.message);
   lastTourId=t.id;lastLoadedAt=Date.now();
   render();
   const mids=(S.matches||[]).map(x=>x.id),tids=(S.teams||[]).map(x=>x.id);
   const jobs=[];
   jobs.push(optional(()=>sb.from('tournament_players').select('*').eq('tournament_id',t.id),d=>S.tPlayers=d));
   if(tids.length)jobs.push(optional(()=>sb.from('team_players').select('*').in('team_id',tids),d=>S.teamPlayers=d));
   else S.teamPlayers=[];
   if(mids.length){
     jobs.push(optional(()=>sb.from('goals').select('*').in('match_id',mids),d=>S.goals=d));
     jobs.push(optional(()=>sb.from('match_player_assignments').select('*').in('match_id',mids),d=>S.matchAssignments=d));
   }else{S.goals=[];S.matchAssignments=[]}
   await Promise.all(jobs);
   render();
 }catch(e){
   console.warn('SWÉ V43.61 récupération matchs',e);
   const box=E('matchesList');
   if(box&&!box.children.length)box.innerHTML='<div class="card"><b>⚽ Matchs indisponibles</b><p class="muted">Impossible de charger les matchs pour le moment. Réessaie dans quelques secondes.</p></div>';
 }finally{busy=false}
}
function selectorChanged(){lastTourId=null;lastLoadedAt=0;setTimeout(()=>hydrate(true),40)}
document.addEventListener('click',e=>{if(e.target.closest?.('.tabs button[data-view="matches"],#view-home [data-go="matches"]'))setTimeout(()=>hydrate(true),80)},true);
document.addEventListener('change',e=>{if(e.target?.id==='matchCompetitionSelect')selectorChanged()},true);
// Un rendu UI ne déclenche plus de requête réseau : on repeint seulement l'état local.
document.addEventListener('swe:rendered',()=>{if(inMatches())setTimeout(render,20)});
document.addEventListener('swe:match-remote-final',()=>{if(inMatches())setTimeout(render,20)});
document.addEventListener('swe:match-local-change',()=>{if(inMatches())setTimeout(render,20)});
window.addEventListener('pageshow',()=>setTimeout(()=>{if(inMatches())hydrate(!(S.matches||[]).length)},100));
// Garde-fou : le co-gestionnaire avec droit scores doit toujours voir la zone des matchs.
const guard=()=>{if(!inMatches())return;const box=E('matchesList');if(box&&canScore()){box.classList.remove('hidden');box.style.setProperty('display','block','important');if(!(S.matches||[]).length)hydrate(false)}};
setInterval(guard,5000);
})();
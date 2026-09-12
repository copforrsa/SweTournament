(()=>{
'use strict';
if(window.__SWE_MATCH_TAB_RECOVERY_4363)return;window.__SWE_MATCH_TAB_RECOVERY_4363=true;
let busy=false,lastTourId=null,lastLoadedAt=0;
const E=id=>document.getElementById(id);
const activeView=()=>document.querySelector('.view.active')?.id||'';
const inMatches=()=>activeView()==='view-matches'||document.querySelector('.tabs button[data-view="matches"].active');
const tour=()=>{try{return typeof currentTour==='function'?currentTour():null}catch(_){return null}};
const canScore=()=>{try{return typeof canEditCurrentMatches==='function'?!!canEditCurrentMatches():!!(S?.workspace?.role==='coorganizer'&&S?.myPermissions?.can_enter_scores)}catch(_){return false}};
let testWorkspaceKey='',testLoadedAt=0,testLoadingKey='',testRows=[];
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function openAssignedTest(id){
 const host=E('assignedTestHost');if(!host)return;host.replaceChildren();
 if(!testRows.some(row=>row.id===id))return;
 const frame=document.createElement('iframe');frame.id='assignedTestFrame';frame.title='Match test — saisie rapide';frame.dataset.matchId=id;
 frame.src='/live.html?test='+encodeURIComponent(id)+'&tab=matches&embed=1';
 frame.style.cssText='width:100%;height:1050px;border:0;display:block';host.appendChild(frame);
}
async function loadAssignedTests(force=false){
 if(!inMatches())return;
 const workspace=S?.workspace?.id,user=S?.session?.user?.id,key=workspace+':'+user;
 if(key!==testWorkspaceKey){E('assignedWorkspaceTests')?.remove();testRows=[];testLoadedAt=0;testWorkspaceKey=key}
 if(!workspace||!user||S.publicMode||testLoadingKey===key||(!force&&Date.now()-testLoadedAt<30000))return;
 testLoadingKey=key;
 try{
  const r=await sb.rpc('get_my_workspace_test_matches',{p_workspace_id:workspace});
  if(testWorkspaceKey!==key||S?.workspace?.id!==workspace||S?.session?.user?.id!==user)return;
  if(r.error)throw r.error;
  testLoadedAt=Date.now();testRows=r.data||[];
  if(!testRows.length){E('assignedWorkspaceTests')?.remove();return}
  let section=E('assignedWorkspaceTests');
  if(!section){section=document.createElement('section');section.id='assignedWorkspaceTests';section.className='card';section.innerHTML='<h3>🧪 Match test</h3><p class="muted">Test attribué par le Super Admin. Démarre le match, clique sur un buteur puis sur son passeur.</p><div class="row"><label for="assignedTestSelect">Match test à afficher</label><select id="assignedTestSelect" style="min-width:0;max-width:100%"></select><button type="button" id="assignedTestRefresh">Actualiser les tests</button></div><p id="assignedTestError" role="alert"></p><div id="assignedTestHost"></div>';E('view-matches')?.prepend(section);E('assignedTestSelect').onchange=e=>openAssignedTest(e.target.value);E('assignedTestRefresh').onclick=()=>loadAssignedTests(true)}
  E('assignedTestError').textContent='';
  const select=E('assignedTestSelect'),previous=select.value;
  select.innerHTML=testRows.map(r=>'<option value="'+esc(r.id)+'">'+esc(new Date(r.created_at).toLocaleString('fr-FR'))+' • '+esc(({scheduled:'À démarrer',live:'En cours',finished:'Terminé'})[r.status]||r.status)+'</option>').join('');
  if(testRows.some(r=>r.id===previous))select.value=previous;
  if(E('assignedTestFrame')?.dataset.matchId!==select.value)openAssignedTest(select.value);
 }catch(error){
  if(testWorkspaceKey!==key)return;
  testLoadedAt=Date.now();E('assignedTestHost')?.replaceChildren();
  if(E('assignedTestError'))E('assignedTestError').textContent=error.message||'Impossible de charger les matchs tests.';
 }finally{if(testLoadingKey===key)testLoadingKey=''}
}
window.addEventListener('message',event=>{
 const frame=E('assignedTestFrame'),data=event.data;
 if(event.origin!==location.origin||event.source!==frame?.contentWindow||data?.type!=='swe:test-height'||data.matchId!==frame.dataset.matchId)return;
 if(Number.isFinite(data.height))frame.style.height=Math.max(360,Math.min(2400,data.height))+'px';
});
function emptyState(){
 const box=E('matchesList');if(!box)return;
 box.innerHTML='<div class="readonly-note" style="padding:18px 20px"><b>⚽ Aucun match de compétition créé</b><div class="muted" style="margin-top:5px">Crée ou génère les équipes puis les matchs pour les afficher ici.</div></div>';
}
function render(){
 const box=E('matchesList');if(box){box.classList.remove('hidden');box.style.removeProperty('display');box.style.removeProperty('visibility')}
 try{if(typeof window.SWE_RENDER_MATCHES_4302==='function')window.SWE_RENDER_MATCHES_4302(false);else if(typeof renderMatches==='function')renderMatches()}catch(e){console.warn('SWÉ V43.63 render matchs',e)}
 if(box&&!(S?.matches||[]).length)emptyState();
 document.dispatchEvent(new CustomEvent('swe:matches-ready',{detail:{tournamentId:S?.activeTour||null}}));
}
async function optional(query,apply){try{const r=await query();if(!r?.error)apply(r.data||[]);else console.warn('SWÉ V43.63 donnée optionnelle',r.error.message)}catch(e){console.warn('SWÉ V43.63 donnée optionnelle',e)}}
async function hydrate(force=false){
 if(busy||!inMatches())return;
 void loadAssignedTests(force);
 const t=tour();if(!t?.id)return render();
 const now=Date.now();
 if(!force&&lastTourId===t.id&&lastLoadedAt&&now-lastLoadedAt<120000)return render();
 busy=true;
 try{
   const [mr,tr]=await Promise.all([
     sb.from('matches').select('*').eq('tournament_id',t.id).order('match_order'),
     sb.from('teams').select('*').eq('tournament_id',t.id).order('created_at')
   ]);
   if(mr.error)throw mr.error;
   const teams=tr.error?(S.teams||[]):(tr.data||[]);
   if(tr.error)console.warn('SWÉ V43.63 équipes',tr.error.message);else S.teams=teams;
   const tids=new Set(teams.map(x=>String(x.id)));
   const raw=mr.data||[];
   S.matches=raw.filter(m=>tids.has(String(m.home_team_id))&&tids.has(String(m.away_team_id)));
   lastTourId=t.id;lastLoadedAt=Date.now();
   const mids=(S.matches||[]).map(x=>x.id),teamIds=teams.map(x=>x.id);
   const jobs=[];
   jobs.push(optional(()=>sb.from('tournament_players').select('*').eq('tournament_id',t.id),d=>S.tPlayers=d));
   if(teamIds.length)jobs.push(optional(()=>sb.from('team_players').select('*').in('team_id',teamIds),d=>S.teamPlayers=d));
   else S.teamPlayers=[];
   if(mids.length){
     jobs.push(optional(()=>sb.from('goals').select('*').in('match_id',mids),d=>S.goals=d));
     jobs.push(optional(()=>sb.from('match_player_assignments').select('*').in('match_id',mids),d=>S.matchAssignments=d));
   }else{S.goals=[];S.matchAssignments=[]}
   await Promise.all(jobs);
   render();
 }catch(e){
   console.warn('SWÉ V43.63 récupération matchs',e);
   const box=E('matchesList');
   if(box)box.innerHTML='<div class="card"><b>⚽ Matchs indisponibles</b><p class="muted">Impossible de charger les matchs pour le moment. Réessaie dans quelques secondes.</p></div>';
 }finally{busy=false}
}
function selectorChanged(){lastTourId=null;lastLoadedAt=0;setTimeout(()=>hydrate(true),40)}
document.addEventListener('click',e=>{if(e.target.closest?.('.tabs button[data-view="matches"],#view-home [data-go="matches"]'))setTimeout(()=>hydrate(true),80)},true);
document.addEventListener('change',e=>{if(e.target?.id==='matchCompetitionSelect')selectorChanged()},true);
// Les rendus et événements de buts repeignent uniquement l'état local : aucune boucle de requêtes réseau.
document.addEventListener('swe:rendered',()=>{if(inMatches()){void loadAssignedTests();setTimeout(render,20)}});
document.addEventListener('swe:match-remote-final',()=>{if(inMatches())setTimeout(render,20)});
document.addEventListener('swe:match-local-change',()=>{if(inMatches())setTimeout(render,20)});
window.addEventListener('pageshow',()=>setTimeout(()=>{if(inMatches())hydrate(false)},100));
// Garde-fou d'affichage uniquement : pas de refresh périodique quand aucun but / aucun match ne change.
const guard=()=>{if(!inMatches())return;void loadAssignedTests();const box=E('matchesList');if(box&&canScore()){box.classList.remove('hidden');box.style.setProperty('display','block','important');if(lastLoadedAt&&!(S.matches||[]).length)emptyState()}};
setInterval(guard,5000);
})();

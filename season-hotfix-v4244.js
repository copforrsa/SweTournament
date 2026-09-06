(()=>{
'use strict';
const {createClient}=window.supabase;
const sb44=createClient('https://fbppesfxkvledwjemwsn.supabase.co','sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp',{global:{fetch:(input,init={})=>fetch(input,{...init,cache:'no-store'})}});
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function rankRows(rows){let prev=null,rank=0;return rows.map((x,i)=>{const v=Number(x.avg||0).toFixed(1);if(v!==prev){rank=i+1;prev=v}return {...x,rank}})}
function playedMatch(m,goalIds){return !!(m.finished_at||m.started_at||m.status==='finished'||m.status==='started'||Number(m.home_score)||Number(m.away_score)||goalIds.has(String(m.id)))}
function ratingFor(match,playerId,teamId,goals){const hs=Number(match.home_score||0),as=Number(match.away_score||0),home=String(teamId)===String(match.home_team_id),away=String(teamId)===String(match.away_team_id);if(!home&&!away)return null;const own=home?hs:as,opp=home?as:hs,base=own>opp?6:(own===opp?5:4);const mg=goals.filter(g=>String(g.match_id)===String(match.id));const g=mg.filter(x=>String(x.scorer_player_id)===String(playerId)).length,a=mg.filter(x=>String(x.assister_player_id||'')===String(playerId)).length;return Math.min(10,base+g+a*.5)}
function draw(rows){
  const box=$('#seasonNewPlayers'),btn=$('#toggleSeasonNewPlayers');if(!box||!btn)return;
  let expanded=false;
  const paint=()=>{
    const visible=expanded?rows:rows.slice(0,10);
    box.innerHTML=visible.length?visible.map(x=>{
      const currentGuest=x.guest===true;
      const joined=!currentGuest&&x.wasGuest;
      const cls=currentGuest||joined?'guest-row':'';
      const badge=currentGuest?'<span class="guest-badge">Invité • hors groupe</span>':joined?'<span class="guest-badge" style="background:#dcfce7;color:#166534">A rejoint le groupe</span>':'<span class="guest-badge">Nouveau</span>';
      return '<div class="rank '+cls+'"><b>'+(x.rank===1?'👑':x.rank)+'</b><span><b>'+esc(x.name)+'</b> '+badge+'<div class="muted">'+x.matches+' match'+(x.matches>1?'s':'')+'</div></span><b class="right">'+Number(x.avg).toFixed(1)+' points</b></div>';
    }).join(''):'<p class="muted">Aucun nouveau joueur noté pour cette saison.</p>';
    btn.classList.toggle('hidden',rows.length<=10);btn.textContent=expanded?'Réduire au Top 10':'Voir tous les nouveaux joueurs ('+Math.max(0,rows.length-10)+' autres)';btn.onclick=()=>{expanded=!expanded;paint()};
  };
  paint();
  const section=box.closest('.card');if(section&&!section.querySelector('[data-newcomer-legend44]')){const p=section.querySelector('p.muted');const n=document.createElement('div');n.dataset.newcomerLegend44='1';n.className='readonly-note';n.style.marginBottom='10px';n.innerHTML='ℹ️ Les lignes grisées correspondent aux <b>invités</b>, qui ne font pas partie du groupe. Un invité devenu membre reste dans ce classement avec la mention <b>« A rejoint le groupe »</b>.';(p||section.firstElementChild)?.insertAdjacentElement('afterend',n)}
}
async function resolveToken(){const p=new URLSearchParams(location.search);let token=p.get('public')||null,tournamentId=null;if(token)return {token,tournamentId};const code=(p.get('s')||'').trim().toUpperCase();if(!code)return {token:null,tournamentId:null};const r=await sb44.rpc('resolve_public_tournament_short_link',{p_code:code});if(r.error)return {token:null,tournamentId:null};return {token:r.data?.public_token||null,tournamentId:r.data?.tournament_id||null}}
async function refreshNewcomers44(){
  const {token,tournamentId}=await resolveToken();if(!token)return;
  const [snap,flags]=await Promise.all([sb44.rpc('get_public_workspace_snapshot_v2',{p_token:token}),sb44.rpc('get_public_player_membership_history_flags',{p_public_token:String(token)})]);
  if(snap.error||flags.error)return;
  const data=snap.data||{},players=data.players||[],seasons=data.seasons||[],tournaments=data.tournaments||[],allMatches=data.matches||[],allGoals=data.goals||[],assignments=data.match_player_assignments||[];
  const params=new URLSearchParams(location.search);let seasonId=params.get('season')||null;if(!seasonId&&tournamentId)seasonId=tournaments.find(t=>String(t.id)===String(tournamentId))?.season_id||null;const season=seasons.find(s=>String(s.id)===String(seasonId))||seasons.find(s=>s.is_active)||seasons[0];if(!season)return;
  const tourIds=new Set(tournaments.filter(t=>String(t.season_id)===String(season.id)&&t.format!=='league').map(t=>String(t.id)));
  const candidates=allMatches.filter(m=>tourIds.has(String(m.tournament_id))),candidateIds=new Set(candidates.map(m=>String(m.id))),seasonGoals=allGoals.filter(g=>candidateIds.has(String(g.match_id))),goalIds=new Set(seasonGoals.map(g=>String(g.match_id))),matches=candidates.filter(m=>playedMatch(m,goalIds)),matchIds=new Set(matches.map(m=>String(m.id))),goals=seasonGoals.filter(g=>matchIds.has(String(g.match_id))),matchMap=new Map(matches.map(m=>[String(m.id),m])),flagMap=new Map((flags.data||[]).map(f=>[String(f.player_id),f]));
  const stats=new Map(players.map(p=>[String(p.id),{id:String(p.id),name:p.name,guest:p.is_group_member===false,wasGuest:!!flagMap.get(String(p.id))?.was_guest,joinedAt:flagMap.get(String(p.id))?.joined_group_at||null,total:0,matches:0,avg:0}]));
  const seen=new Set();assignments.forEach(a=>{const key=String(a.match_id)+'|'+String(a.player_id);if(seen.has(key)||!matchIds.has(String(a.match_id))||!a.team_id)return;seen.add(key);const m=matchMap.get(String(a.match_id)),s=stats.get(String(a.player_id));if(!m||!s)return;const r=ratingFor(m,a.player_id,a.team_id,goals);if(r==null)return;s.total+=r;s.matches++});stats.forEach(s=>{s.avg=s.matches?s.total/s.matches:0});
  const rows=rankRows([...stats.values()].filter(x=>x.matches&&(x.guest||x.wasGuest)).sort((a,b)=>b.avg-a.avg||a.name.localeCompare(b.name,'fr')));draw(rows);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refreshNewcomers44,250),{once:true});else setTimeout(refreshNewcomers44,250);
})();

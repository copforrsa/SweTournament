(()=>{
'use strict';
const {createClient}=window.supabase;
const sb=createClient('https://fbppesfxkvledwjemwsn.supabase.co','sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp',{global:{fetch:(input,init={})=>fetch(input,{...init,cache:'no-store'})}});
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const params=new URLSearchParams(location.search);
let token=params.get('public')||null,seasonId=params.get('season')||null,tournamentId=null;
function competitionRanks(rows,value){let previous=null,rank=0;return rows.map((row,index)=>{const current=value(row);if(current!==previous){rank=index+1;previous=current}return {...row,rank}})}
function plural(n,one,many){return n+' '+(n>1?many:one)}
function playedMatch(m,goalMatchIds){return !!(m.finished_at||m.started_at||m.status==='finished'||m.status==='started'||Number(m.home_score)||Number(m.away_score)||goalMatchIds.has(String(m.id)))}
function delta(n){return Number(n)>0?'<span class="season-delta">+'+Number(n)+'</span>':''}
function statRows(rows,key,label){const deltaKey=key==='g'?'recentG':key==='a'?'recentA':null;return rows.length?rows.map(x=>'<div class="rank '+(x.guest?'guest-row':'')+'"><b>'+(x.rank===1?'👑':x.rank)+'</b><span><b>'+esc(x.name)+'</b>'+(x.guest?' <span class="guest-badge">Nouveau</span>':'')+(x.matches!=null?'<div class="muted">'+plural(x.matches,'match','matchs')+(key==='score'&&(x.g||x.a)?' • ⚽ '+x.g+delta(x.recentG)+' • 🎯 '+x.a+delta(x.recentA):'')+'</div>':'')+'</span><b class="right">'+x[key]+' '+label+(Number(x[key])>1?'s':'')+(deltaKey?delta(x[deltaKey]):'')+'</b></div>').join(''):'<p class="muted">Aucune donnée disponible pour cette saison.</p>'}
function expandable(boxId,buttonId,rows,key,label){let expanded=false;const box=$(boxId),button=$(buttonId);const paint=()=>{const visible=expanded?rows:rows.slice(0,10);box.innerHTML=statRows(visible,key,label);button.classList.toggle('hidden',rows.length<=10);button.textContent=expanded?'Réduire au Top 10':'Voir les autres ('+(rows.length-10)+')'};button.onclick=()=>{expanded=!expanded;paint()};paint()}
async function resolveShortLink(){const code=(params.get('s')||'').trim().toUpperCase();if(!code||token)return;const r=await sb.rpc('resolve_public_tournament_short_link',{p_code:code});if(r.error)throw r.error;if(!r.data?.public_token)throw new Error('Lien de saison invalide.');token=r.data.public_token;tournamentId=r.data.tournament_id||null}
function ratingFor(match,playerId,teamId,goals){const hs=Number(match.home_score||0),as=Number(match.away_score||0),home=String(teamId)===String(match.home_team_id),away=String(teamId)===String(match.away_team_id);if(!home&&!away)return null;const own=home?hs:as,opp=home?as:hs,base=own>opp?6:(own===opp?5:4);const matchGoals=goals.filter(g=>String(g.match_id)===String(match.id));const g=matchGoals.filter(x=>String(x.scorer_player_id)===String(playerId)).length,a=matchGoals.filter(x=>String(x.assister_player_id||'')===String(playerId)).length;return {rating:Math.min(10,base+g+(a*.5)),g,a}}
function render(data){
  const players=data.players||[],seasons=data.seasons||[],tournaments=data.tournaments||[],allMatches=data.matches||[],allGoals=data.goals||[],assignments=data.match_player_assignments||[];
  if(!seasonId&&tournamentId)seasonId=tournaments.find(t=>String(t.id)===String(tournamentId))?.season_id||null;
  const season=seasons.find(s=>String(s.id)===String(seasonId))||seasons.find(s=>s.is_active)||seasons[0];
  if(!season)throw new Error('Aucune saison n’est disponible.');seasonId=season.id;
  const seasonTours=tournaments.filter(t=>String(t.season_id)===String(season.id)&&t.format!=='league');
  const latestTour=[...seasonTours].sort((a,b)=>String(b.tournament_date||'').localeCompare(String(a.tournament_date||''))||String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]||null;
  const tournamentIds=new Set(seasonTours.map(t=>String(t.id))),candidateMatches=allMatches.filter(m=>tournamentIds.has(String(m.tournament_id)));
  const candidateIds=new Set(candidateMatches.map(m=>String(m.id))),seasonGoals=allGoals.filter(g=>candidateIds.has(String(g.match_id))),goalMatchIds=new Set(seasonGoals.map(g=>String(g.match_id)));
  const matches=candidateMatches.filter(m=>playedMatch(m,goalMatchIds)),matchIds=new Set(matches.map(m=>String(m.id))),goals=seasonGoals.filter(g=>matchIds.has(String(g.match_id)));
  const playerMap=new Map(players.map(p=>[String(p.id),p])),matchMap=new Map(matches.map(m=>[String(m.id),m]));
  const stats=new Map(players.map(p=>[String(p.id),{id:String(p.id),name:p.name,guest:p.is_group_member===false,g:0,a:0,recentG:0,recentA:0,total:0,matches:0,avg:0}]));
  goals.forEach(g=>{const isLatest=String(matchMap.get(String(g.match_id))?.tournament_id||'')===String(latestTour?.id||'');const scorer=stats.get(String(g.scorer_player_id));if(scorer){scorer.g++;if(isLatest)scorer.recentG++}const assister=stats.get(String(g.assister_player_id||''));if(assister){assister.a++;if(isLatest)assister.recentA++}});
  const seen=new Set();assignments.forEach(a=>{const key=String(a.match_id)+'|'+String(a.player_id);if(seen.has(key)||!matchIds.has(String(a.match_id))||!a.team_id)return;seen.add(key);const match=matchMap.get(String(a.match_id)),st=stats.get(String(a.player_id));if(!match||!st)return;const performance=ratingFor(match,a.player_id,a.team_id,goals);if(!performance)return;st.total+=performance.rating;st.matches++});
  stats.forEach(s=>{s.avg=s.matches?s.total/s.matches:0});
  const scorers=competitionRanks([...stats.values()].filter(x=>x.g).sort((a,b)=>b.g-a.g||b.a-a.a||a.name.localeCompare(b.name,'fr')),x=>x.g);
  const assists=competitionRanks([...stats.values()].filter(x=>x.a).sort((a,b)=>b.a-a.a||b.g-a.g||a.name.localeCompare(b.name,'fr')),x=>x.a);
  const averages=competitionRanks([...stats.values()].filter(x=>x.matches).sort((a,b)=>b.avg-a.avg||b.g-a.g||b.a-a.a||a.name.localeCompare(b.name,'fr')),x=>x.avg.toFixed(1));
  const newcomers=competitionRanks(averages.filter(x=>x.guest),x=>x.avg.toFixed(1));
  $('#seasonTitle').textContent=(data.workspace?.name||'SWÉ Tournament')+' • '+(season.name||'Saison en cours');
  $('#seasonStatus').textContent=season.is_active?'🟢 Saison en cours':'✅ Saison terminée';
  $('#seasonSummary').innerHTML='<div><b>'+seasonTours.length+'</b>tournoi'+(seasonTours.length>1?'s':'')+'</div><div><b>'+matches.length+'</b>match'+(matches.length>1?'s':'')+'</div><div><b>'+averages.length+'</b>joueur'+(averages.length>1?'s':'')+' noté'+(averages.length>1?'s':'')+'</div>';
  const podiumOrder=[{player:averages[1],className:'second',medal:'🥈'},{player:averages[0],className:'first',medal:'🥇'},{player:averages[2],className:'third',medal:'🥉'}].filter(x=>x.player);
  $('#seasonPodium').innerHTML=podiumOrder.length?podiumOrder.map(({player:x,className,medal})=>'<article class="podium-player '+className+'"><div class="podium-medal">'+medal+'</div><div class="podium-name">'+esc(x.name)+'</div><div class="podium-score">⭐ '+x.avg.toFixed(1)+'/10</div><div class="muted">'+plural(x.matches,'match','matchs')+' • ⚽ '+x.g+delta(x.recentG)+' • 🎯 '+x.a+delta(x.recentA)+'</div></article>').join(''):'<p class="muted">Le podium apparaîtra dès que les participations aux matchs seront enregistrées.</p>';
  expandable('#seasonScorers','#toggleSeasonScorers',scorers,'g','but');expandable('#seasonAssists','#toggleSeasonAssists',assists,'a','passe');
  expandable('#seasonTopPlayers','#toggleSeasonTopPlayers',averages.map(x=>({...x,score:x.avg.toFixed(1)})),'score','point');
  expandable('#seasonNewPlayers','#toggleSeasonNewPlayers',newcomers.map(x=>({...x,score:x.avg.toFixed(1)})),'score','point');
  $('#seasonUpdated').textContent='Données actualisées le '+new Date().toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'});
  $('#seasonError').classList.add('hidden');
}
async function load(){try{await resolveShortLink();if(!token)throw new Error('Paramètres du lien de saison incomplets.');const r=await sb.rpc('get_public_workspace_snapshot_v2',{p_token:token});if(r.error)throw r.error;render(r.data||{})}catch(e){$('#seasonError').textContent=e.message||'Impossible de charger les classements.';$('#seasonError').classList.remove('hidden');$('#seasonStatus').textContent='Lien indisponible'}}
$('#shareSeason').onclick=async()=>{const url=location.href,title='Classements de la saison SWÉ';if(navigator.share){try{await navigator.share({title,url});return}catch(e){if(e.name==='AbortError')return}}try{await navigator.clipboard.writeText(url);$('#shareSeason').textContent='✅ Lien copié'}catch(e){$('#shareSeason').textContent='Copie impossible'}};
load();
})();

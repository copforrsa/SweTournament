(()=>{
'use strict';
if(window.__SWE_MATCH_ENGINE_4302)return;
window.__SWE_MATCH_ENGINE_4302=true;

const E=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let hydrating=false;
// The test view supplies data and actions; the match cards keep the same renderer.
const context=window.SWE_MATCH_CONTEXT||null;
const state=context?context.state:S;
const notify=message=>{if(context)context.notify(message);else if(typeof toast==='function')toast(message)};

function teamById(id){return (state.teams||[]).find(t=>String(t.id)===String(id))||null}
function playerById(id){return (state.players||[]).find(p=>String(p.id)===String(id))||null}
function playersForTeam(teamId){
  const ids=(state.teamPlayers||[]).filter(tp=>String(tp.team_id)===String(teamId)).map(tp=>tp.player_id);
  return ids.map(playerById).filter(Boolean).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
}
function canEditScores(){if(context)return !!context.canEditScores();try{return typeof canEditCurrentMatches==='function'?!!canEditCurrentMatches():false}catch(_){return false}}
function adminUser(){if(context)return !!context.adminUser();try{return typeof isAdmin==='function'?!!isAdmin():false}catch(_){return false}}
function current(){if(context)return context.current();try{return typeof currentTour==='function'?currentTour():null}catch(_){return null}}
function scoreFieldForGoal(m,g){
  if(String(g.team_id)===String(m.home_team_id))return 'home_score';
  if(String(g.team_id)===String(m.away_team_id))return 'away_score';
  return null;
}
function syncCardScore(m){
  const card=document.querySelector('.swe4300-match[data-match-id="'+CSS.escape(String(m.id))+'"]');
  const score=card?.querySelector('.swe4300-result');
  if(score)score.textContent=Number(m.home_score||0)+' - '+Number(m.away_score||0);
  const inputs=card?.querySelectorAll('.swe4300-edit input');
  if(inputs?.length>=2){inputs[0].value=Number(m.home_score||0);inputs[1].value=Number(m.away_score||0)}
}

function installCss(){
  if(E('sweMatchEngine4302Css'))return;
  const s=document.createElement('style');s.id='sweMatchEngine4302Css';s.textContent=`
  #matchesList .swe4300-match{background:#fff;border:1px solid #dfe7ef;border-radius:18px;padding:15px;margin:12px 0;box-shadow:0 5px 16px rgba(15,23,42,.06)}
  #matchesList .swe4300-match.finished{opacity:.58;background:#f3f4f6;order:99}
  .swe4300-top{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:12px;font-size:12px;font-weight:800;color:#64748b}
  .swe4300-score{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:10px;align-items:center}
  .swe4300-team{font-size:17px;font-weight:900}.swe4300-team.right{text-align:right}.swe4300-result{font-size:25px;font-weight:950;white-space:nowrap}
  .swe4300-edit{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-top:12px}.swe4300-edit input{min-width:0;text-align:center;font-weight:900}
  .swe4301-goals{margin-top:14px;border-top:1px solid #e5e7eb;padding-top:12px}.swe4301-goals h4{margin:0 0 9px;font-size:14px}
  .swe4301-goal-form{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px}.swe4301-goal-form select{min-width:0}
  .swe4301-goal-history{margin-top:10px;display:grid;gap:6px}.swe4301-goal-line{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:10px;background:#f8fafc;font-size:12px}.swe4301-goal-line span{flex:1}
  .swe4300-note{margin-top:9px;font-size:11px;color:#64748b}.swe4300-finished{font-size:11px;font-weight:900;color:#475569}
  @media(max-width:650px){.swe4300-match{padding:13px}.swe4300-team{font-size:15px}.swe4300-result{font-size:22px}.swe4300-edit{grid-template-columns:1fr 1fr}.swe4300-edit button{grid-column:1/-1;min-height:44px}.swe4301-goal-form{grid-template-columns:1fr}.swe4301-goal-form button{min-height:44px}}
  `;document.head.appendChild(s);
}

async function hydrate(tid){
  if(context)return context.refresh();
  if(hydrating||!tid)return;hydrating=true;
  try{
    const [mr,tr,tpr]=await Promise.all([
      sb.from('matches').select('*').eq('tournament_id',tid).order('match_order'),
      sb.from('teams').select('*').eq('tournament_id',tid).order('created_at'),
      sb.from('teams').select('id').eq('tournament_id',tid)
    ]);
    if(!mr.error)state.matches=mr.data||[];
    if(!tr.error)state.teams=tr.data||[];
    const teamIds=(tpr.data||[]).map(x=>x.id);
    if(teamIds.length){const tp=await sb.from('team_players').select('*').in('team_id',teamIds);if(!tp.error)state.teamPlayers=tp.data||[]}
    const mids=(state.matches||[]).map(x=>x.id);
    if(mids.length){const gr=await sb.from('goals').select('*').in('match_id',mids);if(!gr.error)state.goals=gr.data||[]}
  }catch(e){console.error('SWÉ V43.02 hydrate matchs',e)}
  finally{hydrating=false;renderStableMatches(false)}
}

async function saveScore(m,homeInput,awayInput,btn){
  const home=Math.max(0,parseInt(homeInput.value||'0',10)||0),away=Math.max(0,parseInt(awayInput.value||'0',10)||0);
  btn.disabled=true;
  try{
    if(context){await context.saveScore(m,home,away);return}
    const r=await sb.from('matches').update({home_score:home,away_score:away}).eq('id',m.id);
    if(r.error)throw r.error;
    m.home_score=home;m.away_score=away;syncCardScore(m);
    if(typeof toast==='function')toast('Score enregistré ✅');
  }catch(e){if(typeof toast==='function')toast(e?.message||'Erreur lors de l’enregistrement')}
  finally{btn.disabled=false}
}

async function deleteGoalAndSyncScore(m,g,button,panel){
  button.disabled=true;
  const field=scoreFieldForGoal(m,g);
  const previous=field?Number(m[field]||0):null;
  const next=field?Math.max(0,previous-1):null;
  try{
    if(context){await context.deleteGoal(m,g);return}
    const del=await sb.from('goals').delete().eq('id',g.id);
    if(del.error)throw del.error;
    if(field){
      const up=await sb.from('matches').update({[field]:next}).eq('id',m.id);
      if(up.error)throw up.error;
      m[field]=next;
      syncCardScore(m);
    }
    state.goals=(state.goals||[]).filter(x=>String(x.id)!==String(g.id));
    renderGoalPanel(panel,m);
    if(typeof toast==='function')toast('But annulé • score corrigé ✅');
  }catch(e){
    console.error('SWÉ V43.02 suppression but',e);
    if(typeof toast==='function')toast(e?.message||'Impossible d’annuler le but');
  }finally{button.disabled=false}
}

function renderGoalPanel(panel,m){
  panel.innerHTML='';
  const title=document.createElement('h4');title.textContent='⚽ Buteurs / passeurs';panel.appendChild(title);
  const editable=canEditScores()&&(String(m.status||'').toLowerCase()!=='finished'||adminUser());
  if(editable){
    const form=document.createElement('div');form.className='swe4301-goal-form';
    const teamSel=document.createElement('select'),scorerSel=document.createElement('select'),assistSel=document.createElement('select'),addBtn=document.createElement('button');
    const h=teamById(m.home_team_id),a=teamById(m.away_team_id);
    teamSel.innerHTML='<option value="">Équipe</option><option value="'+safe(m.home_team_id)+'">'+safe(h?.name||'Domicile')+'</option><option value="'+safe(m.away_team_id)+'">'+safe(a?.name||'Extérieur')+'</option>';
    scorerSel.innerHTML='<option value="">Buteur</option>';assistSel.innerHTML='<option value="">Passeur (facultatif)</option>';
    const refill=()=>{
      const people=playersForTeam(teamSel.value);
      scorerSel.innerHTML='<option value="">Buteur</option>'+people.map(p=>'<option value="'+safe(p.id)+'">'+safe(p.name)+'</option>').join('');
      assistSel.innerHTML='<option value="">Passeur (facultatif)</option>'+people.map(p=>'<option value="'+safe(p.id)+'">'+safe(p.name)+'</option>').join('');
    };
    teamSel.onchange=refill;
    addBtn.type='button';addBtn.className='primary';addBtn.textContent='➕ Ajouter';
    addBtn.onclick=async()=>{
      if(!teamSel.value)return notify('Choisis l’équipe.');
      if(!scorerSel.value)return notify('Choisis le buteur.');
      if(assistSel.value&&assistSel.value===scorerSel.value)return notify('Buteur et passeur doivent être différents.');
      addBtn.disabled=true;
      try{
        if(context){await context.addGoal(m,teamSel.value,scorerSel.value,assistSel.value||null);return}
        const r=await sb.from('goals').insert({match_id:m.id,team_id:teamSel.value,scorer_player_id:scorerSel.value,assister_player_id:assistSel.value||null}).select('*').single();
        if(r.error)throw r.error;
        state.goals=state.goals||[];state.goals.push(r.data);
        scorerSel.value='';assistSel.value='';renderGoalPanel(panel,m);
        if(typeof toast==='function')toast('Buteur / passeur ajouté ✅');
      }catch(e){if(typeof toast==='function')toast(e?.message||'Impossible d’ajouter le buteur')}
      finally{addBtn.disabled=false}
    };
    form.append(teamSel,scorerSel,assistSel,addBtn);panel.appendChild(form);
  }
  const hist=document.createElement('div');hist.className='swe4301-goal-history';
  const rows=(state.goals||[]).filter(g=>String(g.match_id)===String(m.id));
  if(!rows.length){const empty=document.createElement('div');empty.className='swe4300-note';empty.textContent='Aucun buteur enregistré.';hist.appendChild(empty)}
  rows.forEach(g=>{
    const line=document.createElement('div');line.className='swe4301-goal-line';
    const scorer=playerById(g.scorer_player_id),assist=g.assister_player_id?playerById(g.assister_player_id):null,team=teamById(g.team_id);
    const text=document.createElement('span');text.textContent='⚽ '+(scorer?.name||'?')+(assist?' ← '+assist.name:' • sans passe')+(team?' • '+team.name:'');line.appendChild(text);
    if(editable){const del=document.createElement('button');del.type='button';del.textContent='Annuler';del.onclick=()=>deleteGoalAndSyncScore(m,g,del,panel);line.appendChild(del)}
    hist.appendChild(line);
  });
  panel.appendChild(hist);
}

function buildCard(m,index){
  const h=teamById(m.home_team_id),a=teamById(m.away_team_id);
  const d=document.createElement('div');
  const finished=String(m.status||'').toLowerCase()==='finished';
  d.className='swe4300-match'+(finished?' finished':'');d.dataset.matchId=String(m.id||'');
  d.innerHTML='<div class="swe4300-top"><span>⚽ MATCH '+(index+1)+'</span><span>'+safe(m.pitch||'Terrain non indiqué')+(m.round_label?' • '+safe(m.round_label):'')+'</span></div>'+
    '<div class="swe4300-score"><span class="swe4300-team">'+safe(h?.name||'Équipe domicile')+'</span><span class="swe4300-result">'+Number(m.home_score||0)+' - '+Number(m.away_score||0)+'</span><span class="swe4300-team right">'+safe(a?.name||'Équipe extérieure')+'</span></div>'+
    (finished?'<div class="swe4300-note swe4300-finished">✓ MATCH TERMINÉ</div>':'');
  const editable=canEditScores()&&(!finished||adminUser());
  if(editable){
    const row=document.createElement('div');row.className='swe4300-edit';
    const hi=document.createElement('input'),ai=document.createElement('input'),b=document.createElement('button');
    hi.type='number';hi.min='0';hi.value=Number(m.home_score||0);ai.type='number';ai.min='0';ai.value=Number(m.away_score||0);
    b.type='button';b.className='primary';b.textContent='💾 Enregistrer le score';b.onclick=()=>saveScore(m,hi,ai,b);
    row.append(hi,ai,b);d.appendChild(row);
  }
  const goals=document.createElement('div');goals.className='swe4301-goals';renderGoalPanel(goals,m);d.appendChild(goals);
  return d;
}

function renderStableMatches(allowHydrate=true){
  installCss();
  const t=current(),box=E('matchesList'),selector=E('matchCompetitionSelect'),status=E('matchCompetitionStatus');
  if(!box)return;
  const eligible=(state.tournaments||[]).filter(x=>x.status!=='finished').sort((a,b)=>String(a.tournament_date||'').localeCompare(String(b.tournament_date||'')));
  if(selector){
    const selected=t?.id||'';
    selector.innerHTML='<option value="">Choisir une compétition</option>'+eligible.map(x=>'<option value="'+safe(x.id)+'"'+(String(x.id)===String(selected)?' selected':'')+'>'+safe(x.name||x.tournament_date||'Compétition')+'</option>').join('');
    selector.onchange=async()=>{state.activeTour=selector.value||null;try{await loadTournament()}catch(e){console.error('SWÉ V43.02 changement tournoi',e)}renderStableMatches(true)};
  }
  if(!t){box.innerHTML='<div class="card"><p class="muted">Choisis d’abord un tournoi ou un Swé de Ligue.</p></div>';if(status)status.textContent='Aucune compétition sélectionnée';return}
  const rows=[...(state.matches||[])].sort((a,b)=>{const af=String(a.status||'')==='finished'?1:0,bf=String(b.status||'')==='finished'?1:0;return af-bf||Number(a.match_order||0)-Number(b.match_order||0)});
  if(status)status.innerHTML=(t.format==='league'?'Swé de Ligue : ':'Tournoi : ')+safe(t.name||t.tournament_date||'Compétition')+' • '+rows.length+' match'+(rows.length>1?'s':'');
  box.innerHTML='';
  if(!rows.length){box.innerHTML='<div class="card"><p class="muted">Chargement des matchs…</p></div>';if(allowHydrate)hydrate(t.id);return}
  rows.forEach((m,i)=>box.appendChild(buildCard(m,i)));
}

window.SWE_MATCH_COMMON_4302={hydrate,saveScore,deleteGoalAndSyncScore,renderGoalPanel,buildCard,renderStableMatches,teamById,playerById,playersForTeam,canEditScores,adminUser,current,syncCardScore};
if(!context)try{window.__SWE_NATIVE_RENDER_MATCHES=typeof renderMatches==='function'?renderMatches:null;renderMatches=renderStableMatches}catch(e){console.error('SWÉ V43.02 remplacement renderMatches',e)}
window.SWE_RENDER_MATCHES_4302=renderStableMatches;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>renderStableMatches(true),100),{once:true});else setTimeout(()=>renderStableMatches(true),100);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="matches"]'))setTimeout(()=>renderStableMatches(true),80)},true);
})();

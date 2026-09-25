(()=>{
'use strict';
if(window.__SWE_MATCH_ENGINE_4302)return;
window.__SWE_MATCH_ENGINE_4302=true;

const E=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let hydrating=false;
const selectedMatchByTournament=new Map();
const selectedFinishedMatchByTournament=new Map();
// The test view supplies data and actions; the match cards keep the same renderer.
const context=window.SWE_MATCH_CONTEXT||null;
const state=context?context.state:S;
const notify=message=>{if(context)context.notify(message);else if(typeof toast==='function')toast(message)};

function teamById(id){return (state.teams||[]).find(t=>String(t.id)===String(id))||null}
function playerById(id){return (state.players||[]).find(p=>String(p.id)===String(id))||null}
function playersForTeam(teamId,matchId=null){
  const assignments=context?(state.matchAssignments||[]).filter(a=>String(a.match_id)===String(matchId||state.matches[0]?.id)):[];
  const ids=(assignments.length?assignments:state.teamPlayers||[]).filter(tp=>String(tp.team_id)===String(teamId)).map(tp=>tp.player_id);
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
// Rebuild the current reign from finished King matches; no extra stored counter.
function kingReign(t,target,matches,pitches){
  if(t?.rotation_mode!=='king_of_pitch'||!target)return null;
  const kingPitch=(pitches||[]).find(p=>String(p.id)===String(t.king_pitch_id));
  const isKing=m=>{
    if(['king','middle','stream'].includes(m.rotation_role))return m.rotation_role==='king';
    if(t.rotation_state?.active?.king&&String(t.rotation_state.active.king)===String(m.id))return true;
    return !!kingPitch&&String(m.pitch||'').trim().toLowerCase()===String(kingPitch.name||'').trim().toLowerCase();
  };
  if(!isKing(target))return null;
  const rows=(matches||[]).filter(m=>String(m.tournament_id)===String(t.id)&&String(m.id)!==String(target.id)).concat(target)
    .filter(isKing).sort((a,b)=>Number(a.match_order||0)-Number(b.match_order||0)||String(a.created_at||'').localeCompare(String(b.created_at||''))||String(a.id).localeCompare(String(b.id)));
  let holder=null,count=0;
  for(const m of rows){
    const home=String(m.home_team_id||''),away=String(m.away_team_id||'');
    const finished=String(m.status||'').toLowerCase()==='finished';
    if(String(m.id)===String(target.id)&&!finished){
      const saved=String(t.rotation_state?.king_holder_team_id||'');
      const savedIsCurrent=String(t.rotation_state?.active?.king||'')===String(m.id)&&[home,away].includes(saved);
      const currentHolder=savedIsCurrent?saved:[home,away].includes(holder)?holder:home;
      return {teamId:currentHolder,count:currentHolder===holder?count:0};
    }
    if(!finished)continue;
    const incumbent=[home,away].includes(holder)?holder:home;
    const hs=Number(m.home_score||0),as=Number(m.away_score||0);
    const winner=hs>as?home:as>hs?away:incumbent;
    count=winner===holder?count+1:1;holder=winner;
    if(String(m.id)===String(target.id))return {teamId:holder,count};
  }
  return null;
}
function decorateKingTeam(card,m){
  if(!card)return;
  card.querySelectorAll('.swe-king-reign').forEach(node=>node.remove());
  const t=(state.tournaments||[]).find(t=>String(t.id)===String(m.tournament_id))||current();
  const reign=kingReign(t,m,state.matches,state.sportsPitches);if(!reign)return;
  const names=card.querySelectorAll('.swe4300-team');
  const name=String(m.home_team_id)===reign.teamId?names[0]:String(m.away_team_id)===reign.teamId?names[1]:null;
  if(!name)return;
  const badge=document.createElement('span');badge.className='swe-king-reign';
  badge.title='Matchs terminés consécutifs sur le terrain du Roi. Le match en cours ne compte pas encore.';
  const crown=document.createElement('span');crown.className='swe-king-crown';crown.textContent='👑 Roi';
  const count=document.createElement('span');count.className='swe-king-count';count.textContent=reign.count+' match'+(reign.count===1?'':'s')+' enchaîné'+(reign.count===1?'':'s');
  badge.append(crown,count);name.appendChild(badge);
}

function syncCardScore(m){
  const card=document.querySelector('.swe4300-match[data-match-id="'+CSS.escape(String(m.id))+'"]');
  const score=card?.querySelector('.swe4300-result');
  if(score)score.textContent=Number(m.home_score||0)+' - '+Number(m.away_score||0);
  const inputs=card?.querySelectorAll('.swe4300-edit input');
  if(inputs?.length>=2){inputs[0].value=Number(m.home_score||0);inputs[1].value=Number(m.away_score||0)}
  decorateKingTeam(card,m);
}

function installCss(){
  if(E('sweMatchEngine4302Css'))return;
  const s=document.createElement('style');s.id='sweMatchEngine4302Css';s.textContent=`
  #matchesList .swe4300-match{background:#fff;border:1px solid #dfe7ef;border-radius:18px;padding:15px;margin:12px 0;box-shadow:0 5px 16px rgba(15,23,42,.06)}
  .swe4300-pitch-tabs{display:flex;gap:8px;overflow-x:auto;padding:4px 1px 8px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
  .swe4300-pitch-tab{flex:0 0 auto;min-height:42px;border:1px solid #bfd2e5;border-radius:12px;background:#f5f9fd;color:#17324d;font-weight:900;padding:9px 13px;white-space:nowrap}
  .swe4300-pitch-tab.active{background:linear-gradient(135deg,#1769e0,#10b7c9);border-color:transparent;color:#fff;box-shadow:0 5px 14px rgba(23,105,224,.23)}
  .swe4300-finished-tab{display:block;width:100%;min-height:44px;margin:2px 0 10px;border:1px solid #7c9bb8;border-radius:12px;background:#edf4fa;color:#17324d;font-weight:900;padding:10px 13px;text-align:left}
  .swe4300-finished-tab.active{background:linear-gradient(135deg,#475569,#0f172a);border-color:transparent;color:#fff}
  .swe4300-finished-picker{display:grid;gap:7px;margin:8px 0 12px}.swe4300-finished-choice{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:center;width:100%;min-height:48px;padding:9px 11px;border:1px solid #c5d5e4;border-radius:12px;background:#f8fbfe;color:#17324d;text-align:left}.swe4300-finished-choice.active{border:2px solid #1769e0;background:#eaf3ff}.swe4300-finished-choice b{white-space:nowrap}.swe4300-finished-choice span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.swe4300-finished-choice em{font-style:normal;font-weight:950;white-space:nowrap;color:#0f4f9c}
  #matchesList .swe4300-match.finished{opacity:.58;background:#f3f4f6;order:99}
  .swe4300-top{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:12px;font-size:12px;font-weight:800;color:#64748b}
  .swe4300-score{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:10px;align-items:center}
  .swe4300-team{font-size:17px;font-weight:900}.swe4300-team.right{text-align:right}.swe4300-result{font-size:25px;font-weight:950;white-space:nowrap}
  .swe-king-reign{display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px 7px;margin:5px 0 0 6px;vertical-align:middle;font-size:11px;line-height:1.4;font-weight:850;color:#714a00;background:#fff5ce;border:1px solid #e9c453;border-radius:10px;padding:4px 7px;max-width:100%;box-sizing:border-box}.swe-king-crown{white-space:nowrap}.swe-king-count{font-variant-numeric:tabular-nums}
  .swe4300-edit{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-top:12px}.swe4300-edit input{min-width:0;text-align:center;font-weight:900}
  .swe4301-goals{margin-top:14px;border-top:1px solid #e5e7eb;padding-top:12px}.swe4301-goals h4{margin:0 0 9px;font-size:14px}
  .swe4301-goal-form{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px}.swe4301-goal-form select{min-width:0}
  .swe4301-goal-history{margin-top:10px;display:grid;gap:6px}.swe4301-goal-line{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:7px 9px;border-radius:10px;background:#f8fafc;font-size:12px}.swe4301-goal-line span{flex:1 1 180px}.swe4301-assist-edit{display:flex;flex-wrap:wrap;gap:6px;width:100%}.swe4301-assist-edit select{min-width:0;flex:1}
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
  finally{
    hydrating=false;
    renderStableMatches(false);
    // The launch counter lives outside #matchesList. Rebuild it from the
    // freshly hydrated collection on desktop and mobile alike.
    setTimeout(()=>window.SWE_MOUNT_MATCH_EXTRAS_4306?.(true),0);
  }
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
  if(!context&&window.SWE_QUICK_MATCH_UI){window.SWE_QUICK_MATCH_UI.render(panel,m);return}
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
      const people=playersForTeam(teamSel.value,m.id);
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
    if(editable&&context?.setAssist){
      const edit=document.createElement('button');edit.type='button';edit.textContent=assist?'Modifier le passeur':'Ajouter un passeur';
      edit.onclick=()=>{
        const existing=line.querySelector('.swe4301-assist-edit');if(existing){existing.remove();return}
        const form=document.createElement('div');form.className='swe4301-assist-edit';
        const select=document.createElement('select');select.setAttribute('aria-label','Passeur du but');
        select.innerHTML='<option value="">Sans passeur</option>'+playersForTeam(g.team_id,m.id).filter(p=>p.id!==g.scorer_player_id).map(p=>'<option value="'+safe(p.id)+'">'+safe(p.name)+'</option>').join('');select.value=g.assister_player_id||'';
        const save=document.createElement('button');save.type='button';save.textContent='Enregistrer le passeur';
        save.onclick=async()=>{save.disabled=true;try{await context.setAssist(m,g,select.value||null)}catch(e){context.notify(e.message)}finally{save.disabled=false}};
        form.append(select,save);line.appendChild(form);
      };line.appendChild(edit);
      if(assist){const remove=document.createElement('button');remove.type='button';remove.textContent='Retirer le passeur';remove.onclick=async()=>{remove.disabled=true;try{await context.setAssist(m,g,null)}catch(e){context.notify(e.message)}finally{remove.disabled=false}};line.appendChild(remove)}
    }
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
  const editable=!!context&&canEditScores()&&(!finished||adminUser());
  if(editable){
    const row=document.createElement('div');row.className='swe4300-edit';
    const hi=document.createElement('input'),ai=document.createElement('input'),b=document.createElement('button');
    hi.type='number';hi.min='0';hi.value=Number(m.home_score||0);ai.type='number';ai.min='0';ai.value=Number(m.away_score||0);
    b.type='button';b.className='primary';b.textContent='💾 Enregistrer le score';b.onclick=()=>saveScore(m,hi,ai,b);
    row.append(hi,ai,b);d.appendChild(row);
  }
  decorateKingTeam(d,m);
  const goals=document.createElement('div');goals.className='swe4301-goals';renderGoalPanel(goals,m);d.appendChild(goals);
  return d;
}

function canManageDeletion(){
  return !context && !state.publicMode && !!state.session &&
    (adminUser() || (typeof hasTemporaryAdmin==='function' && hasTemporaryAdmin()));
}
function deletionButton(t,m=null){
  const button=document.createElement('button');button.type='button';button.className='danger';
  button.dataset.sweMatchDelete=m?'single':'all';
  button.textContent=m?'Supprimer ce match':'Réinitialiser tous les matchs à 0';
  button.onclick=async()=>{
    if(!canManageDeletion() || String(current()?.id)!==String(t.id))return notify('Sélectionne à nouveau le tournoi.');
    const label=t.name||t.tournament_date||t.id;
    if(!confirm((m?'Supprimer ce match':'Supprimer TOUS les matchs')+' du tournoi « '+label+' » ? Les scores et buts associés seront supprimés. Les équipes et inscriptions seront conservées.'))return;
    if(!m && prompt('Pour confirmer la suppression de tous les matchs de « '+label+' », saisis REINITIALISER')!=='REINITIALISER')return;
    button.disabled=true;
    try{
      const result=await sb.rpc(m?'admin_delete_tournament_match_v1':'admin_reset_tournament_matches_v1',m?{p_match_id:m.id}:{p_tournament_id:t.id});
      if(result.error)throw result.error;
      if(!m){
        // loadTournament reloads child rows, not the tournament rotation state.
        t.rotation_state={};
        const saved=(state.tournaments||[]).find(row=>String(row.id)===String(t.id));
        if(saved)saved.rotation_state={};
      }
      await loadTournament();renderStableMatches(false);
      if(!m)document.dispatchEvent(new CustomEvent('swe:rotation-updated',{detail:{tournamentId:t.id,state:{}}}));
      notify(m?'Match supprimé.':'Matchs supprimés ; équipes et inscriptions conservées.');
    }catch(error){notify(error.message||'Suppression impossible.');}
    finally{button.disabled=false;}
  };
  return button;
}
function renderStableMatches(allowHydrate=true){
  installCss();
  const t=current(),box=E('matchesList'),selector=E('matchCompetitionSelect'),status=E('matchCompetitionStatus');
  if(!context)window.SWEPitchRoles?.mountMatches(t);
  if(!box)return;
  const eligible=(state.tournaments||[]).filter(x=>x.status!=='finished').sort((a,b)=>String(a.tournament_date||'').localeCompare(String(b.tournament_date||'')));
  if(selector){
    const assigned=!context?window.SWE_ASSIGNED_TEST_MATCHES:null,selected=assigned?.value()||t?.id||'';
    const html='<option value="">Choisir une compétition ou un match test</option>'+eligible.map(x=>'<option value="'+safe(x.id)+'">'+safe(x.name||x.tournament_date||'Compétition')+'</option>').join('')+(assigned?.options()||'');
    if(selector.innerHTML!==html)selector.innerHTML=html;selector.value=selected;
    selector.onchange=async()=>{if(assigned?.select(selector.value))return;state.activeTour=selector.value||null;try{await loadTournament()}catch(e){console.error('SWÉ V43.02 changement tournoi',e)}renderStableMatches(true)};
  }
  if(!context&&window.SWE_ASSIGNED_TEST_MATCHES?.show())return;
  if(!t){box.innerHTML='<div class="card"><p class="muted">Choisis d’abord un tournoi ou un Swé de Ligue.</p></div>';if(status)status.textContent='Aucune compétition sélectionnée';return}
  // Match numbering is permanent: Match 1, Match 2, Match 3… regardless
  // of whether earlier matches have already finished.
  const rows=[...(state.matches||[])].sort((a,b)=>Number(a.match_order||0)-Number(b.match_order||0));
  if(status)status.innerHTML=(t.format==='league'?'Swé de Ligue : ':'Tournoi : ')+safe(t.name||t.tournament_date||'Compétition')+' • '+rows.length+' match'+(rows.length>1?'s':'');
  box.innerHTML='';
  if(canManageDeletion()){
    const controls=document.createElement('div');controls.className='card';controls.dataset.sweMatchAdmin='';
    const label=document.createElement('p');label.textContent='Administration des matchs — '+(t.name||t.tournament_date||'Tournoi');
    controls.append(label,deletionButton(t));box.appendChild(controls);
  }
  if(!rows.length){box.innerHTML='<div class="card"><p class="muted">Chargement des matchs…</p></div>';if(allowHydrate)hydrate(t.id);return}
  if(rows.length){
    const finished=rows.filter(m=>String(m.status)==='finished');
    const active=rows.filter(m=>String(m.status)!=='finished');
    // En Conquête, le championnat est préparé d'un coup : les matchs sans
    // terrain doivent tous rester accessibles, un onglet par match. Dans les
    // autres formats, on conserve un seul match courant par terrain.
    const conquest=/conqu[êe]te/i.test([t.name,t.format,t.reservation_reference].filter(Boolean).join(' '));
    let current;
    if(conquest){
      current=active;
    }else{
      const byPitch=new Map();
      active.forEach(m=>byPitch.set(String(m.pitch||m.round_label||'Terrain'),m));
      current=[...byPitch.values()];
    }
    const previous=selectedMatchByTournament.get(String(t.id));
    // Keep the completed-match view selected after its own click. Previously
    // it was immediately replaced by the first active pitch (Carrefour).
    let selectedKey=previous==='finished'&&finished.length?'finished':(current.some(m=>String(m.id)===String(previous))?String(previous):(current[0]?String(current[0].id):(finished.length?'finished':null)));
    selectedMatchByTournament.set(String(t.id),selectedKey);
    const tabs=document.createElement('div');tabs.className='swe4300-pitch-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Matchs par terrain');
    current.forEach(m=>{
      const number=rows.indexOf(m)+1,button=document.createElement('button');button.type='button';button.className='swe4300-pitch-tab'+(String(m.id)===selectedKey?' active':'');button.setAttribute('role','tab');button.setAttribute('aria-selected',String(m.id)===selectedKey?'true':'false');
      const home=teamById(m.home_team_id),away=teamById(m.away_team_id);
      button.textContent=conquest?'⚔️ '+(home?.name||'Équipe 1')+' vs '+(away?.name||'Équipe 2'):'⚽ '+(m.pitch||m.round_label||'Terrain')+' · Match '+number;
      button.onclick=()=>{selectedMatchByTournament.set(String(t.id),String(m.id));renderStableMatches(false)};tabs.appendChild(button);
    });
    box.appendChild(tabs);
    if(finished.length){
      // This control deliberately sits outside the horizontal terrain strip:
      // it remains reachable with one tap on every phone.
      const button=document.createElement('button');button.type='button';button.className='swe4300-finished-tab'+(selectedKey==='finished'?' active':'');button.setAttribute('aria-pressed',selectedKey==='finished'?'true':'false');button.textContent='✓ Matchs terminés ('+finished.length+')';
      button.onclick=()=>{selectedMatchByTournament.set(String(t.id),'finished');renderStableMatches(false)};box.appendChild(button);
    }
    if(selectedKey==='finished'){
      const note=document.createElement('div');note.className='swe4300-note';note.textContent='Historique des matchs. Choisis un match pour l’ouvrir ; seul l’administrateur du groupe peut le corriger avant la clôture du tournoi.';box.appendChild(note);
      const previousFinished=selectedFinishedMatchByTournament.get(String(t.id));
      const selectedFinished=finished.find(m=>String(m.id)===String(previousFinished))||finished[finished.length-1];
      selectedFinishedMatchByTournament.set(String(t.id),String(selectedFinished.id));
      const picker=document.createElement('div');picker.className='swe4300-finished-picker';picker.setAttribute('aria-label','Choisir un match terminé');
      finished.slice().reverse().forEach(m=>{
        const number=rows.indexOf(m)+1,button=document.createElement('button');button.type='button';button.className='swe4300-finished-choice'+(String(m.id)===String(selectedFinished.id)?' active':'');button.setAttribute('aria-pressed',String(m.id)===String(selectedFinished.id)?'true':'false');
        const home=teamById(m.home_team_id),away=teamById(m.away_team_id);button.innerHTML='<b>Match '+number+'</b><span>'+safe(m.pitch||m.round_label||'Terrain')+' · '+safe(home?.name||'Domicile')+' vs '+safe(away?.name||'Extérieur')+'</span><em>'+Number(m.home_score||0)+' - '+Number(m.away_score||0)+'</em>';
        button.onclick=()=>{selectedFinishedMatchByTournament.set(String(t.id),String(m.id));renderStableMatches(false)};picker.appendChild(button);
      });
      box.appendChild(picker);
      box.appendChild(buildCard(selectedFinished,rows.indexOf(selectedFinished)));
      if(canManageDeletion())box.appendChild(deletionButton(t,selectedFinished));
    }else{
      const selected=current.find(m=>String(m.id)===selectedKey)||current[0];
      if(selected)box.appendChild(buildCard(selected,rows.indexOf(selected)));
      if(selected && canManageDeletion())box.appendChild(deletionButton(t,selected));
    }
  }
  // Targeted and mobile refreshes do not emit the global swe:rendered event.
  // Keep the King-of-the-pitch launch control synchronized anyway.
  setTimeout(()=>window.SWE_MOUNT_MATCH_EXTRAS_4306?.(true),0);
}

window.SWE_MATCH_COMMON_4302={kingReign,decorateKingTeam,hydrate,saveScore,deleteGoalAndSyncScore,renderGoalPanel,buildCard,renderStableMatches,teamById,playerById,playersForTeam,canEditScores,adminUser,current,syncCardScore};
if(!context)try{window.__SWE_NATIVE_RENDER_MATCHES=typeof renderMatches==='function'?renderMatches:null;renderMatches=renderStableMatches}catch(e){console.error('SWÉ V43.02 remplacement renderMatches',e)}
window.SWE_RENDER_MATCHES_4302=renderStableMatches;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>renderStableMatches(true),100),{once:true});else setTimeout(()=>renderStableMatches(true),100);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="matches"]'))setTimeout(()=>renderStableMatches(true),80)},true);
})();

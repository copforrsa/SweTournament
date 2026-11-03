/* SWÉ consolidated runtime R550 — segment 1/3. Original files retained for rollback. */

;
/* SOURCE match-engine-v4300.js */
(()=>{
'use strict';
if(window.__SWE_MATCH_ENGINE_4302)return;
window.__SWE_MATCH_ENGINE_4302=true;

const E=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let hydrating=false;
const selectedMatchByTournament=new Map();
const selectedFinishedMatchByTournament=new Map();
const knownMatchCount=new Map();
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
  .swe4300-round-tabs{display:block!important;overflow:visible!important}
  .swe4300-round{margin:0 0 10px;padding:12px;border:1px solid #d5dce5;border-radius:12px;background:#f7f9fc}
  .swe4300-round h3{margin:0 0 8px;font-size:16px;color:#16283c}
  .swe4300-round-games{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  .swe4300-round-games .swe4300-pitch-tab{white-space:normal;text-align:left;width:100%}
  @media(max-width:650px){.swe4300-round-games{grid-template-columns:1fr}}
  .swe4300-pitch-tabs{display:flex;gap:8px;overflow-x:auto;padding:4px 1px 8px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
  .swe4300-pitch-tab{flex:0 0 auto;min-height:42px;border:1px solid #bfd2e5;border-radius:12px;background:#f5f9fd;color:#17324d;font-weight:900;padding:9px 13px;white-space:nowrap}
  .swe4300-pitch-tab.active{background:linear-gradient(135deg,#1769e0,#10b7c9);border-color:transparent;color:#fff;box-shadow:0 5px 14px rgba(23,105,224,.23)}
  .swe4300-pitch-tab.completed{background:#dcfce7;border-color:#86efac;color:#14532d}
  .swe4300-pitch-tab.completed.active{background:#bbf7d0;border:2px solid #15803d;color:#14532d;box-shadow:0 0 0 2px #dcfce7}
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
    if(t.format==='fast_conquest')return window.SWE_FAST_CONQUEST?.act(m?'delete_match':'reset',m?{matchId:m.format_slot.replace(/^fast:/,'')}:{},true);
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
  const eligible=(state.tournaments||[]).filter(x=>x.status!=='finished'||x.format==='fast_conquest'&&String(x.id)===String(t?.id)).sort((a,b)=>String(a.tournament_date||'').localeCompare(String(b.tournament_date||'')));
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
  // Repeated refreshes with identical data must preserve the score form DOM.
  const signature=JSON.stringify([t,rows,state.teams,state.teamPlayers,state.matchAssignments,state.goals,state.players,state.tPlayers,state.sportsPitches,canEditScores(),adminUser(),canManageDeletion(),selectedMatchByTournament.get(String(t.id)),selectedFinishedMatchByTournament.get(String(t.id)),window.SWE_QUICK_MATCH_UI?.getRevision?.(),window.SWE_FAST_CONQUEST_CONTEXT?.version]);
  if(box.__sweMatchSignature===signature&&box.querySelector('.swe4300-match'))return;
  if(status)status.innerHTML=(t.format==='league'?'Swé de Ligue : ':'Tournoi : ')+safe(t.name||t.tournament_date||'Compétition')+' • '+rows.length+' match'+(rows.length>1?'s':'');
  // Keep document height while replacing the match. Otherwise the browser
  // clamps scrollY to the temporary bottom and anchors to later rounds.
  const scrollXBefore=window.scrollX,scrollYBefore=window.scrollY;
  const minHeightBefore=box.style.minHeight,anchorBefore=box.style.overflowAnchor;
  box.style.minHeight=box.getBoundingClientRect().height+'px';
  box.style.overflowAnchor='none';
  const fastPanel=box.querySelector('#fastConquestPanel');
  box.innerHTML='';
  if(fastPanel)box.appendChild(fastPanel);
  if(canManageDeletion()){
    const controls=document.createElement('div');controls.className='card';controls.dataset.sweMatchAdmin='';
    const label=document.createElement('p');label.textContent='Administration des matchs — '+(t.name||t.tournament_date||'Tournoi');
    controls.append(label,deletionButton(t));box.appendChild(controls);
  }
  if(!rows.length){box.style.minHeight=minHeightBefore;box.style.overflowAnchor=anchorBefore;box.innerHTML='<div class="card"><p class="muted">Chargement des matchs…</p></div>';if(allowHydrate)hydrate(t.id);return}
  if(rows.length){
    const finished=rows.filter(m=>String(m.status)==='finished');
    const active=rows.filter(m=>String(m.status)!=='finished');
    // En Conquête, le championnat est préparé d'un coup : les matchs sans
    // terrain doivent tous rester accessibles, un onglet par match. Dans les
    // autres formats, on conserve un seul match courant par terrain.
    const qualificationPoules=rows.length===15&&rows.every(m=>m.competition_type==='championship_qualification'&&m.format_stage==='qualification');
    const conquest=qualificationPoules||t.format==='fast_conquest'||/conqu[êe]te/i.test([t.name,t.format,t.reservation_reference].filter(Boolean).join(' '));
    let current;
    if(conquest){
      current=rows;
    }else{
      const byPitch=new Map();
      active.forEach(m=>byPitch.set(String(m.pitch||m.round_label||'Terrain'),m));
      current=[...byPitch.values()];
    }
    let previous=selectedMatchByTournament.get(String(t.id));
    const oldCount=knownMatchCount.get(String(t.id));
    if(oldCount!==undefined&&rows.length>oldCount&&(previous==='finished'||rows.find(m=>String(m.id)===String(previous))?.status==='finished'))previous=null;
    knownMatchCount.set(String(t.id),rows.length);
    // Keep the completed-match view selected after its own click. Previously
    // it was immediately replaced by the first active pitch (Carrefour).
    let selectedKey=previous==='finished'&&finished.length?'finished':(current.some(m=>String(m.id)===String(previous))?String(previous):(current.find(m=>m.status!=='finished')?String(current.find(m=>m.status!=='finished').id):(finished.length?'finished':null)));
    selectedMatchByTournament.set(String(t.id),selectedKey);
    const tabs=document.createElement('div');tabs.className='swe4300-pitch-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Matchs par terrain');
    const rounds=new Map();
    // Keep poule numbering from match_order but display each round by terrain.
    const pitchRank=name=>({'carrefour':0,'mercedes':1,'boulogne':2})[String(name||'').trim().toLowerCase()]??3;
    const displayedCurrent=qualificationPoules?[...current].sort((a,b)=>{
      const roundA=Math.floor(rows.indexOf(a)/3),roundB=Math.floor(rows.indexOf(b)/3);
      return roundA-roundB||pitchRank(a.pitch)-pitchRank(b.pitch)||rows.indexOf(a)-rows.indexOf(b);
    }):current;
    displayedCurrent.forEach(m=>{
      const number=rows.indexOf(m)+1,button=document.createElement('button');button.type='button';button.className='swe4300-pitch-tab'+(m.status==='finished'?' completed':'')+(String(m.id)===selectedKey?' active':'');button.setAttribute('role','tab');button.setAttribute('aria-selected',String(m.id)===selectedKey?'true':'false');
      const home=teamById(m.home_team_id),away=teamById(m.away_team_id);
      button.textContent=conquest?(m.rotation_role==='championship'?(m.pitch||m.round_label?.split(' · ')[1]||'Terrain')+' · ':'⚔️ ')+(home?.name||'Équipe 1')+' vs '+(away?.name||'Équipe 2')+(m.status==='finished'?' · '+Number(m.home_score||0)+' – '+Number(m.away_score||0)+' ✓':''):'⚽ '+(m.pitch||m.round_label||'Terrain')+' · Match '+number;
      button.onclick=()=>{selectedMatchByTournament.set(String(t.id),String(m.id));renderStableMatches(false)};
      const qualificationPoule=m.competition_type==='championship_qualification'&&m.format_stage==='qualification'&&rows.length===15;
      if(qualificationPoule)button.style.order=String(pitchRank(m.pitch));
      if(qualificationPoule)button.textContent='⚽ '+(home?.name||'Équipe 1')+' vs '+(away?.name||'Équipe 2')+' · 📍 '+(m.pitch||'Terrain à définir')+(m.status==='finished'?' · '+Number(m.home_score||0)+'-'+Number(m.away_score||0)+' ✓':'');
      const groupTitle=qualificationPoule?'Poule '+Math.ceil(number/3):matchSection(m);
      if(conquest&&groupTitle){
        const round=groupTitle;let group=rounds.get(round);
        if(!group){const section=document.createElement('section');section.className='swe4300-round';const heading=document.createElement('h3');heading.textContent=round;group=document.createElement('div');group.className='swe4300-round-games';section.append(heading,group);tabs.appendChild(section);rounds.set(round,group)}
        group.appendChild(button);
      }else tabs.appendChild(button);
    });
    if(conquest&&t.format!=='fast_conquest')for(const title of ['Barrages','Demi-finales','Finale']){let group=rounds.get(title);if(!group){const section=document.createElement('section');section.className='swe4300-round';const heading=document.createElement('h3');heading.textContent=title;group=document.createElement('div');group.className='swe4300-round-games';const note=document.createElement('p');note.className='muted';note.textContent='Les matchs apparaîtront après qualification.';section.append(heading,group,note);rounds.set(title,group)}tabs.appendChild(group.parentElement)}
    if(rounds.size)tabs.classList.add('swe4300-round-tabs');
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
      const selectedGroup=selected?(qualificationPoules?'Poule '+Math.ceil((rows.indexOf(selected)+1)/3):matchSection(selected)):null;
      const roundGroup=selectedGroup?rounds.get(selectedGroup):null;
      const detailHost=roundGroup?.parentElement||box;
      if(selected)detailHost.appendChild(buildCard(selected,rows.indexOf(selected)));
      if(selected && canManageDeletion())detailHost.appendChild(deletionButton(t,selected));
    }
  }
  box.__sweMatchSignature=JSON.stringify([t,rows,state.teams,state.teamPlayers,state.matchAssignments,state.goals,state.players,state.tPlayers,state.sportsPitches,canEditScores(),adminUser(),canManageDeletion(),selectedMatchByTournament.get(String(t.id)),selectedFinishedMatchByTournament.get(String(t.id)),window.SWE_QUICK_MATCH_UI?.getRevision?.(),window.SWE_FAST_CONQUEST_CONTEXT?.version]);
  box.style.minHeight=minHeightBefore;
  box.style.overflowAnchor=anchorBefore;
  window.scrollTo({left:scrollXBefore,top:scrollYBefore,behavior:'instant'});
  // Targeted and mobile refreshes do not emit the global swe:rendered event.
  // Keep the King-of-the-pitch launch control synchronized anyway.
  setTimeout(()=>window.SWE_MOUNT_MATCH_EXTRAS_4306?.(true),0);
}

function matchSection(m){
  if(m.competition_type==='fast_conquest'){
    if(m.format_stage==='finals')return m.format_slot==='fast:bronze'||/petite finale|3e place/i.test(m.round_label||'')?'Match pour la 3e place':'Finale';
    return ({qualification:m.round_label?.split(' · ')[0],conquest_1:'Conquête 1',conquest_2:'Conquête 2'})[m.format_stage]||null;
  }
  if(/^Tour \d+(?: · .+)?$/.test(m.round_label||''))return m.round_label.split(' · ')[0];
  const label=String(m.round_label||'').toLowerCase();
  if(m.format_stage==='semi_final'||/demi/.test(label))return 'Demi-finales';
  if(m.format_stage==='final'||/finale/.test(label))return 'Finale';
  if(m.format_stage==='playoff'||/barrage/.test(label))return 'Barrages';
  return null;
}

function selectNextMatch(completed){
  const matches=(state.matches||[]).filter(m=>String(m.tournament_id)===String(completed.tournament_id)).sort((a,b)=>Number(a.match_order||0)-Number(b.match_order||0));
  const next=matches.find(m=>m.status!=='finished'&&Number(m.match_order)>Number(completed.match_order))||matches.find(m=>m.status!=='finished');
  selectedMatchByTournament.set(String(completed.tournament_id),next?String(next.id):'finished');
}

window.SWE_MATCH_COMMON_4302={selectNextMatch,kingReign,decorateKingTeam,hydrate,saveScore,deleteGoalAndSyncScore,renderGoalPanel,buildCard,renderStableMatches,teamById,playerById,playersForTeam,canEditScores,adminUser,current,syncCardScore};
if(!context)try{window.__SWE_NATIVE_RENDER_MATCHES=typeof renderMatches==='function'?renderMatches:null;renderMatches=renderStableMatches}catch(e){console.error('SWÉ V43.02 remplacement renderMatches',e)}
window.SWE_RENDER_MATCHES_4302=renderStableMatches;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>renderStableMatches(true),100),{once:true});else setTimeout(()=>renderStableMatches(true),100);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="matches"]'))setTimeout(()=>renderStableMatches(true),80)},true);
})();

;

;
/* SOURCE navigation-spaces.js */
/* One authenticated identity; explicit, independent player and management navigation. */
(()=>{'use strict';
let uid=null,mode=null,playerTab='home',managementView='home',switching=false,restoreEntry=false;
const scroll={player:0,management:0},drafts=new Map();
const state=()=>{try{return S}catch(_){return null}};
const canManage=()=>['admin','coorganizer'].includes(state()?.workspace?.role);
function persist(){try{localStorage.setItem('swe_spaces:'+uid,JSON.stringify({mode,playerTab,managementView}));const url=new URL(location.href);if(url.searchParams.get('space')!==mode){url.searchParams.set('space',mode);url.searchParams.delete('start');history.replaceState({},'',url.pathname+url.search+url.hash)}}catch(_){}}
function ready(){const s=state();if(!s?.spacesReady||!s?.session?.user||s.publicMode||s.isSuperAdmin)return false;
 if(uid!==s.session.user.id){uid=s.session.user.id;let saved={};try{saved=JSON.parse(localStorage.getItem('swe_spaces:'+uid)||'{}')}catch(_){}const explicit=new URL(location.href).searchParams.get('space');const desired=['player','management'].includes(explicit)?explicit:saved.mode;mode=desired==='management'&&canManage()?'management':desired==='player'&&s.playerAccountAccess?'player':canManage()?'management':'player';playerTab=['home','swes','profile','group'].includes(saved.playerTab)?saved.playerTab:'home';managementView=saved.managementView||'home';restoreEntry=true;}
 return true;}
function beforeView(v){if(!ready())return v;if(switching)return v;
 if(mode==='player')return 'myplayer';
 if(v==='myplayer')return managementView;
 managementView=v;persist();return v;}
function rememberDrafts(){for(const el of document.querySelectorAll('.view.active input,.view.active select,.view.active textarea')){if(el.type==='password'||el.type==='file')continue;const key=el.id||el.dataset.fastDraft;if(key)drafts.set(key,{value:el.value,checked:el.checked})}}
function restoreDrafts(){for(const el of document.querySelectorAll('.view.active input,.view.active select,.view.active textarea')){const value=drafts.get(el.id||el.dataset.fastDraft);if(value){el.value=value.value;if(el.type==='checkbox'||el.type==='radio')el.checked=value.checked}}}
async function selectGroup(workspaceId){
 const member=(state()?.memberships||[]).find(m=>String(m.workspace_id)===String(workspaceId)&&['admin','coorganizer'].includes(m.role));if(!member)return;
 rememberDrafts();mode='management';managementView='home';persist();
 const select=document.getElementById('sweSpaceGroup');if(select)select.disabled=true;
 const title=document.querySelector('#sweSpaceBar strong');if(title)title.textContent='Ouverture du groupe…';
 const url=new URL(location.href);url.searchParams.set('workspace',member.workspace_id);url.searchParams.set('space','management');url.searchParams.delete('start');
 try{localStorage.setItem('swe_workspace_id',member.workspace_id);window.SWE_SPACES.navigateGroup(url.toString());}
 catch(e){if(select)select.disabled=false;if(typeof toast==='function')toast(e.message||'Impossible d’ouvrir ce groupe.')}
}

function switchSpace(next){if(!ready()||next===mode||next==='management'&&!canManage())return;rememberDrafts();scroll[mode]=window.scrollY;mode=next;persist();switching=true;try{setView(mode==='player'?'myplayer':managementView)}finally{switching=false}apply();restoreDrafts();window.scrollTo({top:scroll[mode],behavior:'instant'});}
const groups={home:['myPlayerMySwes','myPlayerInvites','myPlayerRequests'],swes:['myPlayerMySwes','myPlayerInvites','myPlayerRequests','myPlayerOpportunities','mySweHistoryCode'],profile:['myPlayerName','myPlayerStats','swe4338Health','myPlayerIdentity'],group:['myPlayerGroups']};
function apply(){if(!ready())return;document.body.classList.toggle('swe-player-space',mode==='player');document.body.classList.toggle('swe-management-space',mode==='management');
 const main=document.querySelector('main')||document.querySelector('.app');if(!main)return;
 let bar=document.getElementById('sweSpaceBar');if(!bar){bar=document.createElement('div');bar.id='sweSpaceBar';bar.innerHTML='<strong></strong><button type="button" data-space-switch></button>';const top=main.querySelector('header');if(top)top.after(bar);else main.prepend(bar);bar.querySelector('button').onclick=()=>switchSpace(mode==='player'?'management':'player')}
 bar.hidden=mode==='player';bar.querySelector('strong').textContent=mode==='player'?'Mon SWÉ · Joueur':'Gestion du groupe · '+(state().workspace?.role==='admin'?'Organisateur':'Co-gestionnaire');const toggle=bar.querySelector('button');toggle.textContent=mode==='player'?'Gérer mes SWÉ':'Retour à mon espace joueur';toggle.hidden=mode==='player'&&!canManage();
 let group=document.getElementById('sweSpaceGroup');if(!group){group=document.createElement('select');group.id='sweSpaceGroup';group.setAttribute('aria-label','Choisir le groupe à gérer');bar.append(group);group.onchange=()=>selectGroup(group.value)}
 const members=(state().memberships||[]).filter(m=>['admin','coorganizer'].includes(m.role));
 const signature=JSON.stringify(members.map(m=>[m.workspace_id,m.workspaces?.name,m.role]));
 if(group.dataset.signature!==signature){group.dataset.signature=signature;group.replaceChildren();for(const m of members){const option=document.createElement('option');option.value=m.workspace_id;option.textContent=(m.workspaces?.name||'Mon groupe')+' · '+(m.role==='coorganizer'?'Co-gestionnaire':'Organisateur');group.append(option)}}
 group.value=state().workspace?.id||'';group.hidden=members.length<2;
 let open=document.getElementById('sweSpaceOpenGroup');if(!open){open=document.createElement('button');open.id='sweSpaceOpenGroup';open.type='button';open.textContent='Ouvrir ce groupe';open.onclick=()=>selectGroup(group.value);bar.append(open)}open.hidden=members.length<2;
 let nav=document.getElementById('swePlayerNav');if(!nav){nav=document.createElement('nav');nav.id='swePlayerNav';nav.setAttribute('aria-label','Navigation joueur');for(const [id,label] of [['home','Accueil'],['swes','Mes SWÉ'],['profile','Mon profil'],['group','Mon groupe']]){const b=document.createElement('button');b.type='button';b.dataset.playerTab=id;b.textContent=label;b.onclick=()=>{rememberDrafts();playerTab=id;persist();apply();restoreDrafts();window.scrollTo({top:0,behavior:'instant'})};nav.append(b)}bar.after(nav)}if(nav.querySelector('[data-player-panel]')){nav.hidden=mode!=='player'}else{nav.hidden=mode!=='player';nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.playerTab===playerTab?'page':'false'))};
 const view=document.getElementById('view-myplayer');if(view&&!document.getElementById('swePlayerHeader')){const cards=[...view.querySelectorAll('.card')];for(const card of cards){const show=(groups[playerTab]||[]).some(id=>{const el=document.getElementById(id);return el&&(card.contains(el)||el===card)});card.classList.toggle('swe-space-card-hidden',mode==='player'&&!show&&card.id!=='myPlayerCreateCard'&&!card.classList.contains('player-hub-hero'));}view.querySelectorAll('.player-hub-grid').forEach(grid=>grid.classList.toggle('swe-space-card-hidden',mode==='player'&&![...grid.children].some(child=>!child.classList.contains('swe-space-card-hidden'))));}
 if(restoreEntry&&mode==='management'){restoreEntry=false;switching=true;try{setView(managementView)}finally{switching=false}}
if(mode==='player'&&state().lastView!=='myplayer'&&state().playerAccountAccess){switching=true;try{setView('myplayer')}finally{switching=false}}
}
window.SWE_SPACES={beforeView,apply,switchSpace,selectGroup,navigateGroup:url=>location.assign(url)};
document.addEventListener('click',e=>{const legacy=e.target.closest?.('[data-view="myplayer"],[data-go="myplayer"]');if(legacy&&e.isTrusted&&ready()){e.preventDefault();e.stopImmediatePropagation();switchSpace('player')}},true);
document.addEventListener('change',e=>{if(e.isTrusted&&e.target.id==='sweCoorgProfileSelect'&&e.target.value==='player'){e.stopImmediatePropagation();switchSpace('player')}},true);
document.addEventListener('swe:rendered',apply);document.addEventListener('swe:coorg-insights-ready',apply);
const style=document.createElement('style');style.textContent='#sweSpaceBar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 16px;margin:12px 0;background:#10243e;color:#fff;border-radius:14px}#sweSpaceGroup{background:#fff;color:#172033;width:auto;max-width:100%;min-height:44px}#sweSpaceGroup[hidden],#sweSpaceOpenGroup[hidden]{display:none!important}#sweSpaceBar button{background:#ffd365;color:#172033;font-weight:800}#swePlayerNav[hidden]{display:none!important}#swePlayerNav{display:flex;gap:8px;margin:12px 0}#swePlayerNav button{flex:1;background:#fff;color:#172033;border:1px solid #98a9bf;padding:12px 6px}#swePlayerNav button[aria-current=page]{background:#075c70;color:#fff}.swe-space-card-hidden{display:none!important}.swe-player-space .tabs,.swe-player-space aside,.swe-player-space #sweCoorgTournamentPicker,.swe-player-space #workspaceSwitcher,.swe-management-space [data-view=myplayer],.swe-management-space #workspaceSwitcher,.swe-management-space #sweCoorgTournamentPicker{display:none!important}.swe-player-space .app{padding-left:0!important}.swe-player-space .player-hub-grid{grid-template-columns:1fr!important}@media(max-width:650px){.swe-player-space{padding-bottom:76px}#swePlayerNav{position:fixed;bottom:0;left:0;right:0;z-index:10000;background:#10243e;padding:8px;margin:0;gap:4px}#swePlayerNav button{font-size:12px;min-height:46px}#sweSpaceBar{position:sticky;top:0;z-index:900}}';document.head.append(style);
document.addEventListener('DOMContentLoaded',apply);setTimeout(apply,0);
})();

;

;
/* SOURCE player-home.js */
/* Player presentation only. Native .tab/.view routing and action handlers stay authoritative. */
(()=>{
'use strict';
if(window.SWEPlayerHome)return;
if(window.__SWE_PLAYER_HOME_R2)return;
window.__SWE_PLAYER_HOME_R2=true;
const E=id=>document.getElementById(id);
const state=()=>{try{return S}catch(_){return null}};
const api=()=>{try{return sb}catch(_){return null}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const panels=['home','registrations','mine','stats','profile','preferences','organizer','discover'];
const labels=['Accueil','Mes inscriptions','Mes SWÉs','Mes stats','Mon profil','Mes préférences','Organiser'];
let selected='home',timer,userId='',generation=0,loadedAt=0,busy=false,community=null,loadError=false,inviteAnchor;
function node(tag,id,html){const n=document.createElement(tag);n.id=id;if(html)n.innerHTML=html;return n}
function group(n,sections,order,half=false){
 if(!n)return;
 n.dataset.playerSections=sections;n.style.setProperty('--player-order',order);
 n.classList.toggle('swe-player-half',half);
}
function shell(n){return n?.closest('.swe-profile-fold')||n}
function card(id){return shell(E(id)?.closest('.card'))}
function choose(panel,focus=false){
 if(!panels.includes(panel))return;selected=panel;paint();if(panel==='organizer')window.SWEOrganizerOffers52?.mount();
 if(focus){const target=E('view-myplayer').querySelector('[data-player-sections]:not(.swe-player-filtered) h2');if(target){target.tabIndex=-1;target.focus({preventScroll:true})}}
}
function nativeView(view){
 const b=document.querySelector('.tabs .tab[data-view="'+view+'"]');
 if(b&&!b.disabled&&!b.classList.contains('disabled-tab'))b.click();
}
function creator(){if(typeof window.openSimpleSweCreator==='function')window.openSimpleSweCreator('private');else E('simpleSweTab')?.click();syncMode()}
function openPlayerCard(){if(typeof window.SWEPlayerCard?.open==='function'){window.SWEPlayerCard.open();return}const native=E('swe4338CardBtn');if(native){native.click();return}if(typeof toast==='function')toast('Ta carte de joueur est encore en cours de chargement.')}
function ensure(view){
 if(E('swePlayerHeader'))return;
 const header=node('header','swePlayerHeader','<a class="swe-player-brand" href="?start=player" aria-label="Accueil joueur SWÉ"><img src="/assets/logo-swe-tournament.png" alt="SWÉ Tournament 5/5"><span>Mon espace joueur</span></a><nav id="swePlayerNav" aria-label="Rubriques de mon espace joueur">'+panels.slice(0,7).map((p,i)=>'<button type="button" data-player-panel="'+p+'">'+labels[i]+'</button>').join('')+'</nav><div id="swePlayerAccount"><button type="button" id="swePlayerAccountToggle" aria-expanded="false" aria-controls="swePlayerAccountMenu"><span id="swePlayerAvatar" aria-hidden="true">●</span><span id="swePlayerName">Mon compte</span><span aria-hidden="true">⌄</span></button><div id="swePlayerAccountMenu" class="swe-player-account-menu hidden"><button type="button" data-player-panel="profile">Mon profil</button><button type="button" id="swePlayerSwitchToggle" aria-expanded="false" aria-controls="swePlayerProfiles">⇄ Changer de profil</button><div id="swePlayerProfiles" class="hidden"></div><button type="button" id="swePlayerLogout">Se déconnecter</button></div></div>');
 view.prepend(header);
 header.querySelector('a').onclick=e=>{e.preventDefault();choose('home')};
 E('swePlayerLogout').onclick=()=>E('logout')?.click();
 E('swePlayerAccountToggle').onclick=e=>{e.stopPropagation();const open=!E('swePlayerAccountMenu').classList.contains('hidden');closeAccount();if(!open){E('swePlayerAccountMenu').classList.remove('hidden');e.currentTarget.setAttribute('aria-expanded','true')}};
 E('swePlayerSwitchToggle').onclick=e=>{e.stopPropagation();const open=E('swePlayerProfiles').classList.toggle('hidden')===false;e.currentTarget.setAttribute('aria-expanded',String(open))};
 const hero=node('section','swePlayerQuick','<div><span class="swe-player-kicker">LE FOOT PLUS SIMPLE, ENTRE NOUS</span><h2>Un SWÉ, et c’est parti.</h2><p>Crée un match rapide ou rejoins tes amis.</p><div class="swe-player-actions"><button type="button" id="swePlayerCreateQuick">＋ Créer un SWÉ rapide</button><button type="button" data-player-panel="discover">Découvrir les SWÉs publics</button></div><small>Match rapide · Sans abonnement organisateur</small></div>');
 view.append(hero);E('swePlayerCreateQuick').onclick=creator;
 const overview=node('section','swePlayerHomeOverview','<div class="swe-dashboard-kicker">TABLEAU DE BORD</div><h2>Tout ton SWÉ en un coup d’œil</h2><div class="swe-dashboard-actions"><button type="button" data-player-panel="registrations">📋 Mes inscriptions</button><button type="button" data-player-panel="mine">📅 Mes prochains SWÉs</button><button type="button" data-player-panel="stats">📈 Mes statistiques</button><button type="button" id="swePlayerHomeAlerts">🔔 Notifications</button></div>');
 overview.className='card';view.append(overview);
 E('swePlayerHomeAlerts').onclick=()=>{const notifications=E('sweOrganizerNotificationsV54');if(notifications){notifications.scrollIntoView({behavior:'smooth',block:'center'});notifications.querySelector('button')?.focus({preventScroll:true})}else{document.dispatchEvent(new Event('swe:rendered'));}};

 const mine=node('section','swePlayerMine','<div class="swe-player-section-head"><h2>Mes SWÉs</h2><button type="button" data-player-panel="mine">Tout voir →</button></div><div id="swePlayerMineRows" aria-live="polite"></div><div class="swe-player-actions"><button type="button" id="swePlayerManage">＋ Créer un SWÉ rapide</button><button type="button" id="swePlayerMineRefresh">Actualiser</button></div>');
 mine.className='card';view.append(mine);
 E('swePlayerManage').onclick=()=>{creator();E('swe4351Mine')?.scrollIntoView({behavior:'smooth',block:'center'})};
 E('swePlayerMineRefresh').onclick=()=>loadCommunity(true);
 const commercial=node('section','swePlayerCommercial','<div><span class="swe-player-kicker">TON GROUPE EST DÉJÀ SUR WHATSAPP ?</span><h2>Garde la discussion. Confie l’organisation à SWÉ.</h2><p>Inscriptions, équipes, scores, classements et rappels réunis au même endroit — WhatsApp reste votre vestiaire.</p></div><button type="button" id="swePlayerOffers">Organiser mon groupe avec SWÉ →</button>');
 view.append(commercial);E('swePlayerOffers').onclick=()=>choose('organizer',true);
 view.addEventListener('click',e=>{const b=e.target.closest('[data-player-panel]');if(!b||!view.contains(b))return;e.preventDefault();choose(b.dataset.playerPanel,true);closeAccount()});
 header.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAccount();E('swePlayerAccountToggle').focus()}});
 document.addEventListener('click',e=>{const account=E('swePlayerAccount');if(account&&!account.contains(e.target))closeAccount()});
 document.addEventListener('click',e=>{const summary=e.target.closest?.('.swe-profile-fold>summary');if(!summary)return;e.preventDefault();const details=summary.parentElement;details.open=!details.open;summary.setAttribute('aria-expanded',String(details.open))},true);
}
function closeAccount(){E('swePlayerAccountMenu')?.classList.add('hidden');E('swePlayerProfiles')?.classList.add('hidden');E('swePlayerAccountToggle')?.setAttribute('aria-expanded','false');E('swePlayerSwitchToggle')?.setAttribute('aria-expanded','false')}
function openPlayerProfile(){closeAccount();if(typeof setView==='function')setView('myplayer');choose('home')}
function openWorkspaceProfile(workspaceId){
 closeAccount();const s=state();if(!workspaceId)return;
 localStorage.setItem('swe_workspace_id',workspaceId);
 if(String(workspaceId)===String(s?.workspace?.id)){if(typeof consumeStartMode==='function')consumeStartMode();document.documentElement.classList.remove('swe-player-home-active');if(window.SWE_SPACES?.switchSpace)window.SWE_SPACES.switchSpace('management');else if(typeof setView==='function')setView('home');return}
 const u=new URL(location.href);u.searchParams.set('workspace',workspaceId);u.searchParams.set('start','home');
 const sw=E('workspaceSwitcher');if(sw&&[...sw.options].some(o=>o.value===String(workspaceId))){history.replaceState({},'',u.pathname+u.search);sw.value=workspaceId;sw.dispatchEvent(new Event('change',{bubbles:true}));return}
 location.assign(u.toString());
}
function offerMode(on){
 document.documentElement.classList.toggle('swe-organizer-setup-active',on);
 if(!on)return;
 const setup=E('workspaceSetup');if(!setup)return;
 let back=E('swePlayerOfferBack');if(!back){back=document.createElement('button');back.id='swePlayerOfferBack';back.type='button';back.textContent='← Retour à mon espace joueur';setup.prepend(back);back.onclick=closeOffers}
 window.scrollTo({top:0,behavior:'smooth'});
}
function openOffers(){const setup=E('workspaceSetup');if(!setup)return;E('accountOnboarding')?.classList.add('hidden');setup.classList.remove('hidden');setup.style.display='block';const radio=setup.querySelector('input[name="organizerType"][value="group"]');if(radio)radio.checked=true;offerMode(true);setup.scrollIntoView({behavior:'smooth',block:'start'});setup.querySelector('#newWorkspace')?.focus({preventScroll:true})}
function closeOffers(){E('workspaceSetup')?.classList.add('hidden');E('workspaceSetup')?.style.removeProperty('display');offerMode(false);if(typeof setView==='function')setView('myplayer');choose('home')}
function updateAccount(){
 const s=state(),p=s?.playerDashboard?.profile||{},name=p.nickname||p.first_name||p.display_name||'Mon compte';
 E('swePlayerName').textContent=name;E('swePlayerAvatar').textContent=name.slice(0,1).toUpperCase();
 const list=E('swePlayerProfiles'),rows=s?.memberships||[],key=JSON.stringify([s?.workspace?.id,rows.map(r=>[r.workspace_id,r.role,r.workspaces?.name])]);
 if(list.dataset.key===key)return;list.dataset.key=key;list.replaceChildren();
 const player=node('button','swePlayerSwitchSelf');player.type='button';player.textContent='⚽ Profil joueur';player.onclick=openPlayerProfile;list.append(player);
 // The existing switcher's change handler keeps workspace persistence and reload semantics.
 rows.forEach(r=>{const b=document.createElement('button');b.type='button';b.textContent=(r.workspaces?.name||'Mon groupe')+' · '+(r.role==='admin'?'Organisateur':'Co-gestionnaire');b.onclick=()=>openWorkspaceProfile(r.workspace_id);list.append(b)});
 if(!rows.length){const hint=document.createElement('small');hint.textContent='Tes autres profils apparaîtront ici après activation.';list.append(hint)}
}
function more(n,panel){
 if(!n||n.querySelector('[data-player-more]'))return;
 const title=n.querySelector('.sectiontitle');if(!title)return;
 const b=document.createElement('button');b.type='button';b.dataset.playerPanel=panel;b.dataset.playerMore='1';b.className='swe-player-more';b.textContent='Tout voir →';title.after(b);
}
function decorate(view){
 group(E('swePlayerQuick'),'home',0);
 group(E('swePlayerHomeOverview'),'home',2);
 group(view.querySelector('.player-hub-hero'),'profile',1);
 group(E('myPlayerCreateCard'),'home profile',1);
 const stats=card('myPlayerStats');group(stats,'home stats',10);more(stats,'stats');
 const title=stats?.querySelector('.sectiontitle');if(title)title.textContent='Mes stats';
 if(stats&&!E('swePlayerCardShortcut')){const b=document.createElement('button');b.id='swePlayerCardShortcut';b.type='button';b.textContent='⭐ Ma carte de joueur';b.onclick=openPlayerCard;(stats.querySelector('.swe4338-stats-head')||title?.parentElement||stats).appendChild(b)}
 const regs=card('myPlayerMySwes');group(regs,'home registrations',20,true);more(regs,'registrations');
 const regTitle=regs?.querySelector('.sectiontitle');if(regTitle)regTitle.textContent='Mes inscriptions';
 group(E('swePlayerMine'),'home mine',21,true);
 const publicCard=card('myPlayerOpportunities');group(publicCard,'home discover',30);more(publicCard,'discover');
 const publicTitle=publicCard?.querySelector('.sectiontitle');if(publicTitle)publicTitle.textContent='SWÉs publics à rejoindre';
 group(card('myPlayerPublic'),'profile',30);
 group(shell(E('swe4338Health')),'profile',40);
 group(shell(view.querySelector('.swe-history-link-card')),'stats',40);
 group(card('myPlayerRequests'),'registrations',35);
 group(shell(E('sweMyReliability')),'stats',45);
 group(card('myPlayerGroups'),'profile',50);
 group(card('myPlayerInvites'),'registrations',31);
 group(E('swePlayerCommercial'),'home mine',70);
 // Keep native invitation nodes and handlers; restore their original location outside player view.
 const inv=E('inviteBox');if(inv){if(!inviteAnchor){inviteAnchor=document.createComment('player-invite-home');inv.before(inviteAnchor)}if(inv.parentNode!==view)view.append(inv);group(inv,'home registrations',-10);let refresh=E('swePlayerInviteRefresh');if(!refresh){refresh=document.createElement('button');refresh.id='swePlayerInviteRefresh';refresh.type='button';refresh.textContent='Actualiser';refresh.onclick=async()=>{refresh.disabled=true;try{if(typeof loadInvites==='function')await loadInvites()}finally{refresh.disabled=false}};inv.querySelector('.sectiontitle')?.after(refresh)}}
 const originalCta=shell(E('playerOrganizerCta'));if(originalCta)group(originalCta,'profile',55);
 const summary=E('swePlayerCommunityRegistrations');
 if(regs&&!summary){const n=node('div','swePlayerCommunityRegistrations');regs.append(n)}
 // Pick the four overview metrics by their labels; keep all eight in Mes stats.
 E('myPlayerStats')?.querySelectorAll(':scope > div').forEach(n=>{const text=n.querySelector('small')?.textContent||'';n.dataset.playerMetric=/joués|victoires|buts|passes/i.test(text)?'overview':'detail'});
}
function renderCommunity(){
 const out=E('swePlayerMineRows');if(!out)return;
 if(!community){E('swePlayerCommunityRegistrations')?.replaceChildren();out.innerHTML=loadError?'<p class="muted" role="status">Tes SWÉs ne sont pas disponibles pour le moment. Tu peux réessayer.</p>':'<p class="muted" role="status">Chargement de tes SWÉs…</p>';return}
 const all=Array.isArray(community.created)?community.created:[];
 const ordered=[...all].sort((a,b)=>(a.status==='finished')-(b.status==='finished')||String(a.start_at).localeCompare(String(b.start_at)));
 const rows=selected==='home'?ordered.slice(0,2):ordered;
 out.innerHTML=rows.length?rows.map(x=>'<article class="swe-player-match"><div><b>'+esc(x.title||'SWÉ rapide')+'</b><div class="muted">'+esc(formatDate(x.start_at))+' · '+esc(x.venue_name||'Lieu à confirmer')+'</div></div><span class="swe-player-pill">'+(x.status==='finished'?'Terminé':esc(Number(x.confirmed||0))+' / '+esc(Number(x.max_players||10))+' joueurs')+'</span></article>').join(''):'<p class="muted">Tu n’as pas encore créé de SWÉ rapide. Lance ton premier match !</p>';
 const regs=E('swePlayerCommunityRegistrations');if(regs){const joins=(Array.isArray(community.participations)?community.participations:[]).filter(x=>!all.some(c=>c.id===x.id));const visible=selected==='home'?joins.slice(0,2):joins;regs.innerHTML=visible.length?'<h3 class="swe-player-small-title">Mes matchs rapides</h3>'+visible.map(x=>'<article class="swe-player-match"><div><b>'+esc(x.title||'SWÉ rapide')+'</b><div class="muted">'+esc(formatDate(x.start_at))+' · '+esc(x.venue_name||'Lieu à confirmer')+'</div></div><span class="swe-player-pill">'+esc(({confirmed:'Inscrit',invited:'Invité',requested:'En attente',declined:'Refusé',cancelled:'Annulé'})[x.status]||x.status||'À confirmer')+'</span></article>').join(''):''}
}
function formatDate(date){if(!date)return 'Date à préciser';const d=new Date(date);return Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{timeZone:'America/Martinique',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Date à préciser'}
async function loadCommunity(force=false){
 const s=state(),c=api();if(!s?.session?.user?.id||!c||busy||(!force&&Date.now()-loadedAt<45000))return;
 busy=true;loadError=false;const ticket=++generation,uid=s.session.user.id;let deadline;
 try{
  const result=await Promise.race([c.rpc('get_my_community_swes_v2'),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('timeout')),10000)})]);
  if(ticket!==generation||state()?.session?.user?.id!==uid)return;
  if(result.error)throw result.error;community=result.data||{created:[],participations:[]};
 }catch(_){if(ticket===generation)loadError=true}
 finally{clearTimeout(deadline);if(ticket===generation){busy=false;loadedAt=Date.now();renderCommunity()}}
}
function syncMode(){
 const s=state(),active=!!s?.session&&!s.publicMode&&!!E('view-myplayer')?.classList.contains('active')&&!E('main')?.classList.contains('hidden');
 document.documentElement.classList.toggle('swe-player-home-active',active);
 if(!active&&inviteAnchor?.parentNode&&E('inviteBox')?.parentNode===E('view-myplayer'))inviteAnchor.after(E('inviteBox'));
 return active;
}
let discoveryLoading=false,discoveryLoadedAt=0;
async function loadPublicDiscovery(){
 const view=E('view-myplayer');if(!view||discoveryLoading||Date.now()-discoveryLoadedAt<30000)return;
 discoveryLoading=true;
 let block=E('sweIndependentDiscovery');
 if(!block){block=node('section','sweIndependentDiscovery','<h2>🏆 SWÉs publics à rejoindre</h2><div id="sweIndependentDiscoveryRows" aria-live="polite">Chargement…</div>');block.className='card';view.append(block);}
 group(block,'home discover',29);
 block.classList.toggle('swe-player-filtered',selected!=='home'&&selected!=='discover');
 const out=E('sweIndependentDiscoveryRows');
 try{
  const [{data,error},{data:details},{data:statuses}] = await Promise.all([sb.rpc('list_swe_discovery_public',{p_limit:60}),sb.rpc('swe_discovery_details_v1'),sb.rpc('my_swe_discovery_status_v1')]);
  if(error)throw error;
  const extra=new Map((Array.isArray(details)?details:[]).map(x=>[String(x.tournament_id),x]));
  const saved=new Map((Array.isArray(statuses)?statuses:[]).map(x=>[String(x.tournament_id),x.status]));
  const records=Array.isArray(data)?data:[];
  const rows=records.filter(t=>t.registration_open&&Number(t.remaining_places)>=0);
  out.replaceChildren();
  if(!rows.length){out.textContent='Aucun SWÉ public ouvert actuellement.';return}
  for(const t of rows){
   const card=document.createElement('article');card.className='swe-player-public-row';
   const title=document.createElement('strong');title.textContent=(t.tournament_name||'SWÉ')+' · '+(t.workspace_name||'');
   const info=extra.get(String(t.tournament_id))||{};
   const details=document.createElement('p');details.textContent=[t.tournament_date,t.start_time?String(t.start_time).slice(0,5):'',t.venue||'Lieu à confirmer',String(t.remaining_places)+' place(s) restante(s)'].filter(Boolean).join(' · ');
   const facts=document.createElement('p');facts.className='swe-player-discovery-facts';
   const format={classic:'Classique',conquest:'Conquête',fast_conquest:'Fast Conquête',king_of_pitch:'Roi du terrain'}[info.format]||'Tournoi';
   const fee=Number(t.entry_fee_cents||0), onsite=Number(info.onsite_entry_fee_cents||0);
   facts.textContent=[format,info.team_size?info.team_size+' joueurs par équipe':'',fee?'Participation : '+(fee/100).toFixed(2)+' €':'',onsite?'Sur place : '+(onsite/100).toFixed(2)+' €':'',info.match_duration_minutes?'Matchs de '+info.match_duration_minutes+' min':'',info.registration_deadline?'Fin des inscriptions : '+new Date(info.registration_deadline).toLocaleString('fr-FR'):''].filter(Boolean).join(' · ');
   const briefing=document.createElement('p');briefing.className='swe-player-discovery-briefing';
   briefing.textContent=info.briefing||'Les modalités seront précisées par l’organisateur.';
   const place=document.createElement('p');place.textContent=info.venue_address?'Adresse : '+info.venue_address:'';
   const status=document.createElement('div');status.className='swe-player-discovery-status';status.setAttribute('role','status');
   const dashboard=state()?.playerDashboard;
   const existing=(dashboard?.requests||[]).find(x=>String(x.tournament_id)===String(t.tournament_id));
   const savedStatus=saved.get(String(t.tournament_id));
   const direct=t.discovery_mode==='public';
   const mustPay=!!info.external_payment_required;
   const button=document.createElement('button');button.type='button';button.className='primary';
   button.textContent=direct?(mustPay?'💳 S’inscrire et payer':'⚡ Je participe'):'🙋 Demander à participer';
   button.dataset[direct?'playerDirectJoin':'playerRequestJoin']=t.tournament_id;
   if(savedStatus==='requested'||existing?.status==='pending'){status.textContent='⏳ Demande envoyée · En attente de validation par l’organisateur';button.disabled=true;button.textContent='Demande en attente';}
   else if(savedStatus==='confirmed'||existing?.status==='approved'||existing?.status==='accepted'){
    status.textContent='✅ Participation acceptée';
    if(direct&&!info.external_payment_required){button.textContent='Se désinscrire';button.className='swe-player-leave-button';delete button.dataset.playerDirectJoin;button.dataset.playerLeavePublicSwe=t.tournament_id;}
    else {button.disabled=true;button.textContent='Acceptée';}
   }
   else if(savedStatus==='waitlist'){status.textContent='🟠 Inscription enregistrée · En liste d’attente';if(direct&&!mustPay){button.textContent='Se désinscrire';button.className='swe-player-leave-button';delete button.dataset.playerDirectJoin;button.dataset.playerLeavePublicSwe=t.tournament_id;}else{button.disabled=true;button.textContent='En attente de place';}}
   else if(!direct){const note=document.createElement('p');note.className='swe-player-discovery-note';note.textContent='Ta demande sera transmise à l’organisateur. L’inscription n’est pas encore confirmée.';card.append(note);}
   card.append(title,details,facts,place,briefing,button,status);out.append(card);
  }
  discoveryLoadedAt=Date.now();
 }catch(e){out.textContent='Impossible de charger les SWÉs publics. Réessaie dans quelques instants.';console.warn('Public SWÉ discovery',e)}
 finally{discoveryLoading=false}
}
function paint(){
 const active=syncMode(),s=state(),view=E('view-myplayer');if(!active||!view)return;
 const uid=s.session.user.id;if(uid!==userId){userId=uid;selected='home';community=null;busy=false;loadedAt=0;generation++}
 ensure(view);updateAccount();decorate(view);if(!E('workspaceSetup')?.classList.contains('hidden'))offerMode(true);view.dataset.playerPanel=selected;
 view.querySelectorAll('[data-player-sections]').forEach(n=>n.classList.toggle('swe-player-filtered',!n.dataset.playerSections.split(' ').includes(selected)));
 view.querySelectorAll('#swePlayerNav button').forEach(b=>{const yes=b.dataset.playerPanel===selected;b.setAttribute('aria-current',yes?'page':'false')});
 renderCommunity();loadCommunity();loadPublicDiscovery();
}
function schedule(){syncMode();clearTimeout(timer);timer=setTimeout(paint,260)}
['swe:rendered','swe:page-view','swe:player-ui-ready','swe:player-profile-updated'].forEach(e=>document.addEventListener(e,schedule));
document.addEventListener('swe:page-view',()=>{if(state()?.lastView==='simple-swe')loadedAt=0});
document.addEventListener('click',e=>{if(e.target.closest?.('.tabs button,[data-swe-go]'))schedule()});
window.addEventListener('pageshow',schedule);
document.addEventListener('swe:discovery-updated',()=>{discoveryLoadedAt=0;loadPublicDiscovery()});
document.addEventListener('click',e=>{if(e.target.closest?.('#cancelWorkspaceSetup')){offerMode(false);setTimeout(()=>{if(state()?.session&&typeof setView==='function')setView('myplayer')},0)}},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
setTimeout(paint,900);setTimeout(paint,2600);
window.SWEPlayerHome={openOffers,closeOffers,openPlayerCard,refreshInvites:()=>{if(typeof loadInvites==='function')loadInvites()}};
})();

;

;
/* SOURCE third-half-creation-assignment-v5067.js */
(()=>{
'use strict';
if(window.__SWE_THIRD_HALF_ASSIGNMENT_5067)return;window.__SWE_THIRD_HALF_ASSIGNMENT_5067=true;
const E=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const supplyOptions=[['cooler','Une glacière'],['ice','Des glaçons'],['beers_3','3 bières'],['beers_5','5 bières'],['beers_6','6 bières'],['ti_punch','Du ti-punch'],['fruits','Des fruits'],['cups','Des gobelets'],['soft_drinks','Des boissons sans alcool'],['snacks','Des amuse-gueules'],['other','Un autre apport']];
function players(){return (window.S?.players||[]).filter(p=>p.active!==false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'fr'))}
function normalizeSupplies(){document.querySelectorAll('select').forEach(select=>{const text=[...select.options].map(o=>o.textContent||'').join(' ');if(!/ti-punch|amuse-gueules/i.test(text))return;const keep=select.value;select.innerHTML=supplyOptions.map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('');select.value=supplyOptions.some(([value])=>value===keep)?keep:'beers_3'})}
function ensurePaymentOwner(){const setup=E('tourThirdHalfSetup'),cooler=E('tourCoolerPlayer');if(!setup||!cooler)return;let grid=cooler.closest('.grid');if(!grid)return;let label=E('tourPaymentPlayer')?.closest('label');if(!label){label=document.createElement('label');label.innerHTML='<span class="muted">ߒӠQui met son lien de paiement ?</span><select id="tourPaymentPlayer"><option value="">À définir après les inscriptions</option></select>';grid.appendChild(label)}const select=E('tourPaymentPlayer'),before=select.value;select.innerHTML='<option value="">À définir après les inscriptions</option>'+players().map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+(p.is_group_member===false?' • Invité':'')+'</option>').join('');select.value=players().some(p=>String(p.id)===String(before))?before:'';
const card=E('tourCoolerLink')?.closest('.player');if(!card)return;const title=card.querySelector('b'),copy=card.querySelector('p');const update=()=>{const p=players().find(x=>String(x.id)===String(select.value));card.classList.toggle('hidden',!p);if(!p)return;if(title)title.textContent='ߒӠLien Glacière de '+(p.name||'ce joueur');if(copy)copy.textContent='Ce lien sera rattaché à '+(p.name||'ce joueur')+'. Le responsable désigné est ajouté automatiquement comme participant de ce Swé.'};select.onchange=update;update();
const intro=setup.previousElementSibling;if(intro&&/lien personnel/i.test(intro.textContent||''))intro.textContent='Désigne le responsable du lien : l’encart de paiement apparaît uniquement après ce choix.';
}
function draft(){return {enabled:!!E('tourThirdHalfActive')?.checked,payment:E('tourPaymentPlayer')?.value||null,cooler:E('tourCoolerPlayer')?.value||null,ice:E('tourIcePlayer')?.value||null,provider:E('tourCoolerLinkProvider')?.value||'',link:E('tourCoolerLink')?.value.trim()||'',amount:Math.round(Number(E('tourCoolerLinkAmount')?.value||0))}}
function wrapCreate(){const btn=E('createTournament');if(!btn||btn.dataset.sweThirdHalfAssignmentWrapped==='1'||typeof btn.onclick!=='function')return false;btn.dataset.sweThirdHalfAssignmentWrapped='1';const original=btn.onclick;btn.onclick=async function(event){const d=draft(),previous=S?.activeTour||null;await original.call(this,event);const tid=S?.activeTour;if(!d.enabled||!tid||String(tid)===String(previous))return;try{const saved=await sb.rpc('admin_save_third_half_assignments_v3',{p_tournament_id:tid,p_payment_player_id:d.payment,p_cooler_player_id:d.cooler,p_ice_player_id:d.ice});if(saved.error)throw saved.error;if(d.link){const link=await sb.rpc('admin_save_third_half_payment_link_v1',{p_tournament_id:tid,p_responsible_player_id:d.payment,p_provider:d.provider,p_payment_link:d.link,p_suggested_amount_cents:d.amount});if(link.error)throw link.error}await loadAll();toast('Glacière : responsables et lien enregistrés ✅')}catch(error){console.error('third half creation assignment',error);toast('Tournoi créé. Affectation Glacière à finaliser : '+(error.message||'erreur'))}};return true}
function apply(){normalizeSupplies();ensurePaymentOwner();if(!wrapCreate())setTimeout(wrapCreate,250)}
document.addEventListener('DOMContentLoaded',apply,{once:true});document.addEventListener('swe:rendered',()=>setTimeout(apply,60));document.addEventListener('change',event=>{if(event.target?.matches?.('[data-admin-contribution-item],#tourThirdHalfActive'))setTimeout(apply,0)});if(document.readyState!=='loading')apply();
})();

;

;
/* SOURCE conquest-format-v5058.js */
(()=>{
'use strict';
if(window.__SWE_CONQUEST_5058)return;window.__SWE_CONQUEST_5058=true;
const E=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const active=()=>typeof currentTour==='function'?currentTour():(S.tournaments||[]).find(t=>String(t.id)===String(S.activeTour));
const can=()=>{try{return typeof hasAdminOps==='function'&&hasAdminOps()}catch(_){return false}};
const matches=()=>((S.matches||[]).filter(m=>String(m.tournament_id)===String(S.activeTour)));
const conquest=()=>matches().filter(m=>['championship_qualification','conquest_playoff','classification'].includes(m.competition_type));
const teams=()=>((S.teams||[]).filter(t=>String(t.tournament_id)===String(S.activeTour)));
const byId=id=>(S.teams||[]).find(t=>String(t.id)===String(id));
const finished=m=>m&&(m.status==='finished'||m.finished_at);
const workflow=()=>active()?.rotation_state?.format_workflow||null;
const rpc=async(name,args)=>{const r=await sb.rpc(name,args);if(r.error)throw r.error;return r.data};
const refresh=async()=>{await loadTournament();if(typeof renderAll==='function')renderAll();else if(typeof renderMatches==='function')renderMatches()};
function installCss(){if(E('sweConquest5058Css'))return;const s=document.createElement('style');s.id='sweConquest5058Css';s.textContent='#sweConquest5058{border:0!important;background:linear-gradient(135deg,#4d1020,#7c1d32 58%,#a52643)!important;color:#fff;box-shadow:0 16px 34px rgba(91,16,36,.28)}#sweConquest5058 .sectiontitle,#sweConquest5058 h2{color:#fff!important;text-shadow:none!important}#sweConquest5058 .muted,#sweConquest5058 p{color:#ffe5eb!important}#sweConquest5058 .cq-state{color:#fff!important}#sweConquest5058 .cq-state{background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.24);border-radius:14px;padding:12px;margin:10px 0;font-weight:800}#sweConquest5058 .cq-bracket{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin:12px 0}.cq-fixture{background:#fff;color:#42101d;border-radius:12px;padding:10px;font-weight:800}.cq-fixture small{display:block;color:#7d3345;margin-bottom:5px}.cq-fixture .lost{color:#98a2b3;text-decoration:line-through}.cq-fixture .pending{color:#8a5d69;font-weight:700}.swe-conquest-tiebreak{margin-top:9px;padding:10px;border:1px solid #e7acb8;background:#fff5f7;border-radius:10px}.swe-conquest-tiebreak b{display:block;color:#7c1d32;margin-bottom:7px}.swe-conquest-tiebreak .row{gap:7px}.swe-conquest-tiebreak button{flex:1;min-height:38px}';document.head.appendChild(s)}
function winner(m){if(!finished(m))return null;return Number(m.home_score)>Number(m.away_score)?m.home_team_id:Number(m.away_score)>Number(m.home_score)?m.away_team_id:m.tie_break_winner_team_id||null}
function fixture(m){const h=byId(m.home_team_id),a=byId(m.away_team_id),w=winner(m);return '<div class="cq-fixture"><small>'+esc(m.round_label||'Conquête')+'</small><div class="'+(w&&String(w)!==String(m.home_team_id)?'lost':'')+'">'+esc(h?.name||'Équipe 1')+'</div><div class="'+(w&&String(w)!==String(m.away_team_id)?'lost':'')+'">'+esc(a?.name||'Équipe 2')+'</div><div class="pending">'+(finished(m)?esc(m.home_score)+' – '+esc(m.away_score):'À jouer')+'</div></div>'}
function render(){installCss();const t=active(),view=E('view-matches');if(!t||t.format!=='conquest'||!view)return;let box=E('sweConquest5058');if(!box){box=document.createElement('section');box.id='sweConquest5058';box.className='card';view.insertAdjacentElement('afterbegin',box)}const w=workflow(),rows=conquest(),quals=rows.filter(m=>m.competition_type==='championship_qualification'),playoffs=rows.filter(m=>m.competition_type!=='championship_qualification'),complete=quals.filter(finished).length,total=teams().length>1?teams().length*(teams().length-1)/2:0,final=playoffs.find(m=>m.format_slot==='final'),fallback=w?.state?.completion_reason==='qualification_only',winnerId=w?.winner_team_id||w?.state?.champion_team_id,winnerText=fallback?'🏆 Vainqueurs du championnat : '+esc(byId(winnerId)?.name||'Équipe victorieuse')+' • phase Conquête non jouée.':w?.phase==='finished'&&winnerId&&finished(final)?'🏆 Conquérants : '+esc(byId(winnerId)?.name||'Équipe victorieuse'):'🏁 Le vainqueur sera révélé après la finale.',state=!w?'Prêt à générer le championnat après la validation des équipes.':w.phase==='qualification'?'Championnat de qualification : '+complete+' / '+total+' matchs terminés.':w.phase==='playoff_ready'?'Les qualifications sont terminées : le tableau est prêt.':w.phase==='playoffs'?'Conquête en cours : chaque résultat crée automatiquement la rencontre suivante.':winnerText,canRecreate=can()&&!!w&&!rows.some(finished);box.innerHTML='<h2 class="sectiontitle">⚔️ Conquête du terrain</h2><p class="muted">Le championnat qualifie les équipes ; les matchs Conquête n’en modifient jamais le classement.</p><div class="cq-state">'+state+'</div>'+(playoffs.length?'<div class="cq-bracket">'+playoffs.map(fixture).join('')+'</div>':'')+'<div class="row">'+(can()&&!w?'<button class="primary" id="cqLeague">Générer le championnat</button>':'')+(can()&&w?.phase==='playoff_ready'?'<button class="primary" id="cqStart">Lancer le tableau Conquête</button>':'')+(canRecreate?'<button id="cqRecreate">Recréer avant le premier score</button>':'')+'</div>';E('cqLeague')?.addEventListener('click',async()=>{try{await rpc('conquest_create_qualification_v2',{p_tournament_id:t.id,p_recreate:false});await refresh();toast('Championnat de qualification généré ✅')}catch(e){toast(e.message||'Impossible de générer le championnat')}});E('cqStart')?.addEventListener('click',async()=>{try{await rpc('conquest_start_playoffs_v2',{p_tournament_id:t.id});await refresh();toast('Tableau Conquête lancé ⚔️')}catch(e){toast(e.message||'Impossible de lancer le tableau')}});E('cqRecreate')?.addEventListener('click',async()=>{if(!confirm('Recréer le championnat et le tableau ? Les inscriptions et les équipes sont conservées.'))return;try{await rpc('conquest_create_qualification_v2',{p_tournament_id:t.id,p_recreate:true});await refresh();toast('Conquête recréée ✅')}catch(e){toast(e.message||'Recréation impossible')}})}
function addTieBreakControls(){const t=active();if(!t||t.format!=='conquest')return;conquest().filter(m=>m.competition_type==='conquest_playoff'&&!finished(m)).forEach(m=>{const card=document.querySelector('[data-match-id="'+CSS.escape(String(m.id))+'"]');if(!card||card.querySelector('.swe-conquest-tiebreak'))return;const h=byId(m.home_team_id),a=byId(m.away_team_id),box=document.createElement('div');box.className='swe-conquest-tiebreak';box.innerHTML='<b>En cas de nul : choisis le vainqueur du départage</b><div class="row"><button type="button" data-winner="'+esc(m.home_team_id)+'">'+esc(h?.name||'Équipe 1')+'</button><button type="button" data-winner="'+esc(m.away_team_id)+'">'+esc(a?.name||'Équipe 2')+'</button></div>';box.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',async()=>{btn.disabled=true;try{await rpc('conquest_finish_match_v2',{p_match_id:m.id,p_tie_break_winner_team_id:btn.dataset.winner});await refresh();toast('Départage enregistré : le tableau avance ✅')}catch(e){btn.disabled=false;toast(e.message||'Impossible d’enregistrer le départage')}}));card.appendChild(box)})}
let queued=false;function schedule(){if(queued)return;queued=true;setTimeout(()=>{queued=false;render();addTieBreakControls()},80)}document.addEventListener('swe:rendered',schedule);document.addEventListener('swe:match-finished',schedule);document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="matches"]'))schedule()},true);window.addEventListener('pageshow',schedule);schedule();
})();

;

;
/* SOURCE conquest-creation-theme-v5062.js */
(()=>{
'use strict';
if(window.__SWE_CONQUEST_CREATION_THEME_5062)return;
window.__SWE_CONQUEST_CREATION_THEME_5062=true;
const E=id=>document.getElementById(id);

function installStyle(){
  if(E('sweConquestCreationThemeCss'))return;
  const style=document.createElement('style');
  style.id='sweConquestCreationThemeCss';
  style.textContent=`
    #tournamentAdminCard.swe-conquest-create-theme{
      background:linear-gradient(145deg,#4a0714 0%,#741126 48%,#9f1d37 100%)!important;
      border:2px solid #e56a7f!important;
      box-shadow:0 20px 48px rgba(96,10,33,.30)!important;
      color:#fff!important;
    }
    #tournamentAdminCard.swe-conquest-create-theme .tour-create-hero,
    #tournamentAdminCard.swe-conquest-create-theme .sweflow-hero{
      background:linear-gradient(120deg,rgba(36,3,12,.62),rgba(127,13,39,.34))!important;
      border-color:rgba(255,205,215,.3)!important;
      box-shadow:none!important;
    }
    #tournamentAdminCard.swe-conquest-create-theme h2,
    #tournamentAdminCard.swe-conquest-create-theme h3,
    #tournamentAdminCard.swe-conquest-create-theme b,
    #tournamentAdminCard.swe-conquest-create-theme .tour-create-copy h2{color:#fff!important}
    #tournamentAdminCard.swe-conquest-create-theme .muted,
    #tournamentAdminCard.swe-conquest-create-theme small,
    #tournamentAdminCard.swe-conquest-create-theme .tour-create-copy p{color:#ffe6eb!important}
    #tournamentAdminCard.swe-conquest-create-theme .player,
    #tournamentAdminCard.swe-conquest-create-theme .sweflow-section .player{
      background:rgba(255,255,255,.94)!important;
      border-color:rgba(255,211,220,.58)!important;
      color:#172131!important;
    }
    #tournamentAdminCard.swe-conquest-create-theme .player b,
    #tournamentAdminCard.swe-conquest-create-theme .player h2,
    #tournamentAdminCard.swe-conquest-create-theme .player h3{color:#172131!important}
    #tournamentAdminCard.swe-conquest-create-theme .player .muted,
    #tournamentAdminCard.swe-conquest-create-theme .player small{color:#5b6677!important}
    #tournamentAdminCard.swe-conquest-create-theme .tour-create-guide>div{
      background:#fff!important;border:1px solid #f7c8d1!important;color:#172131!important;
    }
    #tournamentAdminCard.swe-conquest-create-theme .tour-create-guide>div b{color:#5e1021!important}
    #tournamentAdminCard.swe-conquest-create-theme .tour-create-guide>div small{color:#596579!important}
    #tournamentAdminCard.swe-conquest-create-theme .tour-create-guide>div span{filter:none!important}
    #tournamentAdminCard.swe-conquest-create-theme #tourFormat{
      border:2px solid #ffd5dc!important;
      background:#fff5f7!important;
      color:#720f26!important;
      font-weight:900!important;
    }
    #tournamentAdminCard.swe-conquest-create-theme #createTournament,
    #tournamentAdminCard.swe-conquest-create-theme .sweflow-next{
      background:linear-gradient(135deg,#f7b4c0,#df4662)!important;
      color:#4d0717!important;
      border-color:#ffdce2!important;
      box-shadow:0 9px 22px rgba(31,2,10,.24)!important;
    }
    #tournamentAdminCard.swe-conquest-create-theme:before{
      content:'⚔ PHASE CONQUÊTE';display:block;margin:0 0 12px;padding:8px 12px;
      border-radius:999px;width:max-content;background:rgba(255,255,255,.16);
      border:1px solid rgba(255,255,255,.32);font-size:11px;font-weight:950;letter-spacing:.12em;color:#ffe7ec;
    }
    #tournamentAdminCard.swe-king-create-theme{
      background:linear-gradient(145deg,#08275a 0%,#0b4e98 51%,#1679c4 100%)!important;
      border:2px solid #75c7ff!important;box-shadow:0 20px 48px rgba(8,62,132,.28)!important;color:#fff!important;
    }
    #tournamentAdminCard.swe-king-create-theme .tour-create-hero,
    #tournamentAdminCard.swe-king-create-theme .sweflow-hero{background:linear-gradient(120deg,rgba(2,25,68,.68),rgba(8,100,181,.38))!important;border-color:rgba(208,238,255,.34)!important;box-shadow:none!important}
    #tournamentAdminCard.swe-king-create-theme h2,#tournamentAdminCard.swe-king-create-theme h3,#tournamentAdminCard.swe-king-create-theme b,#tournamentAdminCard.swe-king-create-theme .tour-create-copy h2{color:#fff!important}
    #tournamentAdminCard.swe-king-create-theme .muted,#tournamentAdminCard.swe-king-create-theme small,#tournamentAdminCard.swe-king-create-theme .tour-create-copy p{color:#d8efff!important}
    #tournamentAdminCard.swe-king-create-theme .player,#tournamentAdminCard.swe-king-create-theme .sweflow-section .player,#tournamentAdminCard.swe-king-create-theme .tour-create-guide>div{background:#fff!important;border-color:#b5e0ff!important;color:#172131!important}
    #tournamentAdminCard.swe-king-create-theme .player b,#tournamentAdminCard.swe-king-create-theme .player h2,#tournamentAdminCard.swe-king-create-theme .player h3,#tournamentAdminCard.swe-king-create-theme .tour-create-guide>div b{color:#073b7a!important}
    #tournamentAdminCard.swe-king-create-theme .player .muted,#tournamentAdminCard.swe-king-create-theme .player small,#tournamentAdminCard.swe-king-create-theme .tour-create-guide>div small{color:#526780!important}
    #tournamentAdminCard.swe-king-create-theme #tourFormat{border:2px solid #bce6ff!important;background:#edf8ff!important;color:#064884!important;font-weight:900!important}
    #tournamentAdminCard.swe-king-create-theme #createTournament,#tournamentAdminCard.swe-king-create-theme .sweflow-next{background:linear-gradient(135deg,#a9e4ff,#3b9fe3)!important;color:#063362!important;border-color:#d9f4ff!important;box-shadow:0 9px 22px rgba(2,28,74,.25)!important}
    #tournamentAdminCard.swe-king-create-theme:before{content:'ߑѠROYAUME DU TERRAIN';display:block;margin:0 0 12px;padding:8px 12px;border-radius:999px;width:max-content;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.32);font-size:11px;font-weight:950;letter-spacing:.12em;color:#e8f7ff}
    @media(max-width:620px){#tournamentAdminCard.swe-conquest-create-theme{padding:16px!important}}
  `;
  document.head.appendChild(style);
}

function apply(){
  installStyle();
  const select=E('tourFormat');
  const card=E('tournamentAdminCard');
  if(!select||!card)return;
  card.classList.toggle('swe-conquest-create-theme',select.value==='conquest');
  card.classList.toggle('swe-king-create-theme',select.value==='king_of_pitch');
}

function bind(){
  const select=E('tourFormat');
  if(select&&!select.dataset.sweConquestThemeBound){
    select.dataset.sweConquestThemeBound='1';
    select.addEventListener('change',apply);
  }
  apply();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
document.addEventListener('swe:rendered',()=>setTimeout(bind,30));
document.addEventListener('click',event=>{if(event.target.closest?.('[data-view="tournaments"],#newTournamentToggle'))setTimeout(bind,90)},true);
})();

;

;
/* SOURCE conquest-public-registration-v5064.js */
(()=>{
'use strict';
if(window.__SWE_CONQUEST_PUBLIC_REGISTRATION_5064)return;
window.__SWE_CONQUEST_PUBLIC_REGISTRATION_5064=true;

const E=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));

function installStyle(){
  if(E('sweConquestPublicRegistrationCss'))return;
  const style=document.createElement('style');
  style.id='sweConquestPublicRegistrationCss';
  style.textContent=`
    #publicView.swe-conquest-public-registration #publicWorkspaceName{
      color:#fff!important;
      -webkit-text-fill-color:#fff!important;
      text-shadow:0 2px 14px rgba(31,2,10,.3)!important;
    }
    #publicView.swe-conquest-public-registration #registrationFormat{
      color:#ffd9df!important;
      background:#79152a!important;
      border:1px solid #ee7790;
      border-radius:999px;
      display:inline-flex;
      padding:6px 10px;
      box-shadow:0 8px 18px rgba(66,4,18,.25);
    }
    #publicView.swe-conquest-public-registration .sp-hero{
      background:radial-gradient(circle at 88% 42%,rgba(191,36,68,.55),transparent 32%),linear-gradient(135deg,#2f0610 0%,#681227 57%,#9b2743 100%)!important;
    }
  `;
  document.head.appendChild(style);
}
function rowValue(row){
  const label=row?.querySelector('b')?.textContent?.trim()||'';
  return row?.textContent?.slice(label.length).trim()||'';
}
function shortenVenue(){
  const meta=E('registrationMeta');
  if(!meta)return;
  const rows=[...meta.querySelectorAll('span')];
  const venueRow=rows.find(row=>row.querySelector('b')?.textContent?.trim()==='Lieu');
  const terrainRow=rows.find(row=>row.querySelector('b')?.textContent?.trim()==='Terrains');
  const venue=rowValue(venueRow),terrains=rowValue(terrainRow);
  if(!venueRow||!venue||!terrains)return;
  const venueLower=venue.toLocaleLowerCase('fr-FR'),terrainLower=terrains.toLocaleLowerCase('fr-FR');
  if(!venueLower.endsWith(terrainLower))return;
  const shortened=venue.slice(0,venue.length-terrains.length).replace(/[—–-]\s*$/,'').trim();
  if(shortened)venueRow.innerHTML='<b>Lieu</b>'+esc(shortened);
}
function apply(){
  installStyle();
  const format=E('registrationFormat')?.textContent||'';
  const root=E('publicView');
  if(!root)return;
  const conquest=!root.classList.contains('sp-fast-conquest')&&/conqu[êe]te/i.test(format);
  root.classList.toggle('swe-conquest-public-registration',conquest);
  if(conquest)shortenVenue();
}
function queue(){[0,150,600,1200].forEach(delay=>setTimeout(apply,delay));}
document.addEventListener('swe:page-view',queue);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
})();

;

;
/* SOURCE mobile-coorg-rights-v4362.js */
(()=>{
'use strict';
if(window.__SWE_MOBILE_COORG_RIGHTS_4362)return;window.__SWE_MOBILE_COORG_RIGHTS_4362=true;
const MOBILE='(max-width: 760px)';
const isMobile=()=>matchMedia(MOBILE).matches;
const profileViews=new Set(['profile','player-profile','playerprofile','myplayer','my-profile','my_profile']);
const createViews=new Set(['simple-swe','simple-swe-page','simple_swe','create-swe']);
function css(){
 if(document.getElementById('sweMobileCoorgRights4362Css'))return;
 const s=document.createElement('style');s.id='sweMobileCoorgRights4362Css';s.textContent=`
@media(max-width:760px){
 .tabs button.swe-mobile-right-denied{position:relative!important;opacity:.38!important;filter:grayscale(.85)!important;background:#edf2f7!important;color:#7c8998!important;box-shadow:none!important;cursor:not-allowed!important}
 .tabs button.swe-mobile-right-denied:after{content:'🔒'!important;position:absolute!important;right:5px!important;top:4px!important;font-size:8px!important;margin:0!important}
 .tabs button.swe-mobile-right-denied.active{background:#edf2f7!important;color:#7c8998!important;box-shadow:none!important}
}
`;
 document.head.appendChild(s);
}
function coorg(){try{return typeof isCoorg==='function'?!!isCoorg():S?.workspace?.role==='coorganizer'}catch(_){return false}}
function tempAdmin(){try{return typeof hasTemporaryAdmin==='function'?!!hasTemporaryAdmin():false}catch(_){return false}}
function perms(){try{return S?.myPermissions||{}}catch(_){return {}}}
function viewKey(btn){return String(btn?.dataset?.view||'').trim().toLowerCase()}
function allowed(view){
 if(view==='home'||profileViews.has(view))return true;
 if(tempAdmin())return view!=='permissions';
 const p=perms();
 if(createViews.has(view))return !!p.can_create_tournaments;
 if(view==='players')return !!(p.can_view_players||p.can_add_members||p.can_delete_members||p.can_edit_player_personal_info||p.can_generate_team_codes);
 if(view==='matches')return !!p.can_enter_scores;
 if(view==='tournaments')return !!p.can_create_tournaments;
 if(view==='teams')return !!p.can_generate_teams;
 if(view==='ranking'||view==='rankings')return true;
 if(view==='permissions')return false;
 if(view==='league'||view==='cooler'||view==='third-half'||view==='glaciere')return false;
 return false;
}
function deny(btn){
 btn.classList.add('swe-mobile-right-denied');
 btn.setAttribute('aria-disabled','true');
 btn.title='Non autorisé par l’administrateur';
 /* Keep the button focusable/clickable so touch users get the explanation toast. */
 if(btn.dataset.sweMobileRightsOwnDisabled==='1')delete btn.dataset.sweMobileRightsOwnDisabled;
 btn.disabled=false;
 btn.style.removeProperty('display');
 btn.classList.remove('hidden');
}
function permit(btn){
 btn.classList.remove('swe-mobile-right-denied');
 if(btn.dataset.sweMobileRightsOwnDisabled==='1')delete btn.dataset.sweMobileRightsOwnDisabled;
 if(btn.classList.contains('disabled-tab'))btn.disabled=true;
 else if(!btn.classList.contains('swe-right-disabled')){
   btn.disabled=false;
   btn.setAttribute('aria-disabled','false');
   if(btn.title==='Non autorisé par l’administrateur')btn.removeAttribute('title');
 }
}
function apply(){
 css();
 if(!isMobile())return cleanup();
 if(!coorg())return cleanup();
 document.querySelectorAll('.tabs button[data-view],.tabs .tab[data-view]').forEach(btn=>{
   const view=viewKey(btn);allowed(view)?permit(btn):deny(btn);
 });
 const active=document.querySelector('.tabs button.active[data-view],.tabs .tab.active[data-view]');
 if(active&&!allowed(viewKey(active))){
   const home=document.querySelector('.tabs button[data-view="home"],.tabs .tab[data-view="home"]');
   if(home&&!home.disabled)home.click();
 }
}
function cleanup(){
 document.querySelectorAll('.tabs .swe-mobile-right-denied').forEach(btn=>permit(btn));
}
function toastDenied(){
 let t=document.getElementById('sweMobileRightsToast4362');
 if(!t){
   t=document.createElement('div');t.id='sweMobileRightsToast4362';
   t.style.cssText='position:fixed;z-index:12000;left:50%;top:max(14px,env(safe-area-inset-top));transform:translateX(-50%);padding:10px 14px;border-radius:12px;background:#10213f;color:#fff;font-weight:850;box-shadow:0 10px 28px rgba(0,0,0,.22);display:none;max-width:92vw;text-align:center';
   t.textContent='Cet onglet n’est pas autorisé pour ton profil co-gestionnaire.';document.body.appendChild(t);
 }
 t.style.display='block';clearTimeout(t._timer);t._timer=setTimeout(()=>t.style.display='none',2100);
}
function guard(e){
 if(!isMobile()||!coorg())return;
 const btn=e.target?.closest?.('.tabs button[data-view],.tabs .tab[data-view]');
 if(!btn)return;
 const denied=btn.classList.contains('swe-mobile-right-denied')||!allowed(viewKey(btn));
 if(!denied)return;
 if(e.cancelable)e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();deny(btn);
 if(e.type==='click')toastDenied();
}
['pointerdown','touchstart','click'].forEach(type=>document.addEventListener(type,guard,{capture:true,passive:false}));
let resizeTimer=null;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(apply,90)});
window.addEventListener('pageshow',()=>setTimeout(apply,120));
document.addEventListener('swe:rendered',()=>setTimeout(apply,60));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(apply,120)});
[0,180,450,900,1600,2800,4500].forEach(ms=>setTimeout(apply,ms));
window.SWEApplyMobileCoorgRights=apply;
})();

;

;
/* SOURCE hotfix-v4227.js */
(()=>{
  'use strict';

  const VERSION=(window.SWE_BUILD_VERSION||'42.50');
  const STYLE_ID='swe-v4227-hotfix-style';
  const QUEUE_KEY='swe_offline_queue_v1';
  const SNAP_KEY='swe_offline_snapshot_v1';
  let activityMap=new Map();
  let syncing=false;
  let networkDown=false;

  const css=`
/* V42.24 + V42.27 — mobile, notes, équipes publiques et mode terrain */
.swe-substitutes-card{margin-top:12px}.swe-substitutes-card>summary{cursor:pointer;list-style:none}.swe-substitutes-card>summary::-webkit-details-marker{display:none}.swe-substitutes-head span:first-child{display:flex;flex-direction:column;gap:2px}.swe-substitutes-head small{font-size:11px;font-weight:600;opacity:.78}.swe-substitutes-chevron{font-size:22px;line-height:1;transition:transform .18s ease}.swe-substitutes-card[open] .swe-substitutes-chevron{transform:rotate(180deg)}
.match-scoring-first{margin-top:10px;padding:12px;border:2px solid #dfe8e3;border-radius:14px;background:#fff}.match-scoring-title{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:9px}.match-scoring-title span{font-size:12px;color:#69766f}.match-goal-form{margin-bottom:8px}.match-goal-add{width:100%;margin-bottom:7px}.match-goal-history{border-top:1px solid #edf1ef;padding-top:7px}.match-goal-history .row{padding:4px 0}
.match-ratings-card{margin-top:12px;border:1px solid #dce6e1;border-radius:12px;overflow:hidden;background:#fff}.match-ratings-title{font-weight:800;padding:10px 12px;background:#f6f9f7;border-bottom:1px solid #e6ede9}.match-ratings-table{width:100%}.match-ratings-head,.match-ratings-row{display:grid;grid-template-columns:minmax(120px,1fr) 72px 44px 36px 36px;gap:8px;align-items:center;padding:7px 12px}.match-ratings-head{font-size:11px;font-weight:800;color:#718078;background:#fbfcfb}.match-ratings-row{border-top:1px solid #edf2ef;font-size:13px}.match-ratings-row>span:not(.match-rating-name),.match-ratings-row>strong{text-align:center}.match-rating-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.match-ratings-row strong{font-variant-numeric:tabular-nums}
.swe-offline-banner{max-width:1100px;margin:10px auto 0;padding:10px 14px;border-radius:14px;border:1px solid #f2c96d;background:#fff8df;color:#6f4b00;display:flex;align-items:center;justify-content:space-between;gap:12px}.swe-offline-banner b{white-space:nowrap}.swe-offline-banner span{font-size:12px}.swe-offline-banner.online-pending{border-color:#9dc7ff;background:#eef6ff;color:#174a7a}
.swe-player-activity-tools{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 12px;padding:10px 12px;border:1px solid #e2e8e4;border-radius:14px;background:#fafcfb}.swe-player-activity-tools label{min-width:250px;flex:0 1 360px}.swe-player-activity-tools select{margin-top:5px}.swe-activity-meta{margin-top:2px;font-size:11px;color:#7a6b45}.chien-boul-public{margin:10px 12px 0!important;padding:10px 12px;border-radius:12px;background:#fff4c8!important;border:1px solid #f0d56f;color:#714800}.public-team-fun-comment{margin:8px 12px 0;padding:8px 10px;border-radius:11px;background:#f7f2ff;border:1px dashed #c7a8f3;color:#5b3a87;font-size:12px;font-weight:700;line-height:1.4}
@media(max-width:700px){.match-ratings-head,.match-ratings-row{grid-template-columns:minmax(105px,1fr) 66px 38px 30px 30px;padding-left:9px;padding-right:9px;gap:4px}.match-scoring-title{align-items:flex-start;flex-direction:column;gap:2px}.match-goal-form,.match .grid.g3{grid-template-columns:1fr!important}.match-goal-add{margin-top:0}.match button{min-height:42px}.swe-offline-banner{align-items:flex-start;flex-direction:column}.swe-offline-banner b{white-space:normal}.swe-player-activity-tools{align-items:stretch;flex-direction:column}.swe-player-activity-tools label{min-width:0;width:100%;flex:auto}.swe-player-activity-tools select{width:100%}.public-team-card{min-width:0}.chien-boul-public,.public-team-fun-comment{margin-left:9px!important;margin-right:9px!important}}
`;

  function installStyle(){if(document.getElementById(STYLE_ID))return;const x=document.createElement('style');x.id=STYLE_ID;x.textContent=css;document.head.appendChild(x)}
  function setVersion(){window.SWEApplyBuild?.();}
  function uid(){return crypto?.randomUUID?crypto.randomUUID():'00000000-0000-4000-8000-'+Math.random().toString(16).slice(2).padEnd(12,'0').slice(0,12)}
  function qget(){try{return JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]')||[]}catch(_){return []}}
  function qset(rows){localStorage.setItem(QUEUE_KEY,JSON.stringify(rows||[]));renderOfflineBanner()}
  function offlineMode(){return !navigator.onLine}
  function queue(type,payload){const rows=qget();rows.push({id:uid(),type,payload,user_id:S?.session?.user?.id||null,workspace_id:S?.workspace?.id||null,created_at:new Date().toISOString()});qset(rows);cacheSnapshot()}

  function ensureBanner(){let b=document.getElementById('sweOfflineBanner');if(b)return b;const anchor=document.getElementById('organizerAccessBanner')||document.querySelector('#main .top');if(!anchor)return null;b=document.createElement('div');b.id='sweOfflineBanner';b.className='swe-offline-banner hidden';b.setAttribute('role','status');b.setAttribute('aria-live','polite');anchor.insertAdjacentElement('afterend',b);return b}
  function renderOfflineBanner(){const b=ensureBanner();if(!b)return;const rows=qget().filter(x=>!S?.workspace?.id||String(x.workspace_id)===String(S.workspace.id));if(!offlineMode()&&!rows.length){b.classList.add('hidden');return}b.classList.remove('hidden');b.classList.toggle('online-pending',!offlineMode()&&rows.length>0);b.innerHTML=offlineMode()?'<b>📴 Mode terrain hors connexion</b><span>'+rows.length+' action'+(rows.length>1?'s':'')+' conservée'+(rows.length>1?'s':'')+' sur ce téléphone. Matchs, scores et buts seront synchronisés automatiquement.</span>':'<b>🔄 Synchronisation en attente</b><span>'+rows.length+' action'+(rows.length>1?'s':'')+' à envoyer.</span>'}

  function cacheSnapshot(){try{if(!S?.session?.user?.id||!S?.workspace?.id)return;localStorage.setItem(SNAP_KEY,JSON.stringify({saved_at:new Date().toISOString(),user_id:S.session.user.id,workspace:S.workspace,workspaceFeatures:S.workspaceFeatures,myPermissions:S.myPermissions,players:S.players,tournaments:S.tournaments,activeTour:S.activeTour,tPlayers:S.tPlayers,teams:S.teams,teamPlayers:S.teamPlayers,matches:S.matches,goals:S.goals,matchAssignments:S.matchAssignments,sportsComplexes:S.sportsComplexes,sportsPitches:S.sportsPitches,teamBalanceScores:S.teamBalanceScores}))}catch(_){}}
  window.SWECacheOfflineSnapshot=cacheSnapshot;
  function restoreSnapshot(){try{const z=JSON.parse(localStorage.getItem(SNAP_KEY)||'null');if(!z||!S?.session?.user?.id||String(z.user_id)!==String(S.session.user.id))return false;const selectedWorkspace=S.workspace?.id||localStorage.getItem('swe_workspace_id');if(selectedWorkspace&&String(selectedWorkspace)!==String(z.workspace?.id))return false;if(S.activeTour&&String(S.activeTour)!==String(z.activeTour))return false;S.workspace=z.workspace||S.workspace;S.workspaceFeatures={...S.workspaceFeatures,...(z.workspaceFeatures||{})};S.myPermissions={...S.myPermissions,...(z.myPermissions||{})};['players','tournaments','tPlayers','teams','teamPlayers','matches','goals','matchAssignments','sportsComplexes','sportsPitches','teamBalanceScores'].forEach(k=>S[k]=z[k]||[]);S.activeTour=z.activeTour||S.activeTour;if(S.workspace){localStorage.setItem('swe_workspace_id',S.workspace.id);document.getElementById('workspaceSetup')?.classList.add('hidden');document.getElementById('accountOnboarding')?.classList.add('hidden');const n=document.getElementById('workspaceName');if(n)n.textContent=S.workspace.name+' • Mode hors connexion';try{renderWorkspaceSwitcher();applyPermissions();renderAll()}catch(_){}renderOfflineBanner();return true}}catch(e){console.warn('restore offline',e)}return false}

  async function syncQueue(){if(syncing||offlineMode()||!S?.session)return;const rows=qget();if(!rows.length)return renderOfflineBanner();syncing=true;const remain=[];let sent=0;for(let i=0;i<rows.length;i++){const op=rows[i];if(op.user_id&&String(op.user_id)!==String(S.session.user.id)){remain.push(op);continue}try{let r={error:null},x=op.payload||{};if(op.type==='insert_match')r=await sb.from('matches').insert(x.row);else if(op.type==='update_match_score')r=await sb.from('matches').update(x.patch).eq('id',x.match_id);else if(op.type==='insert_goal')r=await sb.from('goals').insert(x.row);else if(op.type==='delete_goal')r=await sb.from('goals').delete().eq('id',x.goal_id);if(r.error)throw r.error;sent++}catch(e){remain.push(op,...rows.slice(i+1));networkDown=true;break}}qset(remain);syncing=false;if(!remain.length){networkDown=false;if(sent)toast('✅ '+sent+' action'+(sent>1?'s':'')+' terrain synchronisée'+(sent>1?'s':'')+'.');try{await loadTournament();renderAll()}catch(_){}}renderOfflineBanner()}

  function foldSubstitutes(){document.querySelectorAll('.swe-substitutes-card:not(details)').forEach(card=>{const head=card.querySelector('.swe-substitutes-head'),list=card.querySelector('.swe-substitutes-list');if(!head||!list)return;const count=list.children.length,details=document.createElement('details'),summary=document.createElement('summary');details.className=card.className;summary.className='swe-substitutes-head';summary.innerHTML='<span><b>🟠 Remplaçants communs</b><small>'+count+' joueur'+(count>1?'s':'')+' • toucher pour afficher</small></span><span class="swe-substitutes-chevron">⌄</span>';details.append(summary,list.cloneNode(true));card.replaceWith(details)})}
  function formatRatings(){document.querySelectorAll('.card.match').forEach(match=>{match.querySelectorAll('b').forEach(title=>{if(title.textContent.trim()!=='⭐ Notes des joueurs')return;const notes=title.parentElement;if(!notes||notes.classList.contains('match-ratings-card'))return;const source=notes.querySelector('.muted');if(!source)return;const lines=source.innerHTML.split(/<br\s*\/?\s*>/i).map(x=>x.trim()).filter(Boolean),rows=[];for(const line of lines){const t=document.createElement('div');t.innerHTML=line;const m=t.textContent.trim().match(/^(.*?)\s+([0-9]+(?:[.,][0-9]+)?\/10)\s+\((.*?)\s+•\s+⚽\s*(\d+)\s+•\s+🎯\s*(\d+)\)$/);if(m)rows.push({name:m[1],note:m[2].replace(',','.'),result:m[3],goals:m[4],assists:m[5]})}if(!rows.length)return;notes.className='match-ratings-card';notes.removeAttribute('style');notes.innerHTML='<div class="match-ratings-title">⭐ Notes des joueurs</div><div class="match-ratings-table"><div class="match-ratings-head"><span>Joueur</span><span>Note</span><span>Rés.</span><span>⚽</span><span>🎯</span></div>'+rows.map(r=>'<div class="match-ratings-row"><span class="match-rating-name">'+esc(r.name)+'</span><strong>'+r.note+'</strong><span>'+esc(r.result)+'</span><span>'+r.goals+'</span><span>'+r.assists+'</span></div>').join('')+'</div>'})})}
  function moveScoringFirst(){document.querySelectorAll('.card.match').forEach(match=>{if(match.querySelector(':scope > .match-scoring-first'))return;const add=[...match.querySelectorAll(':scope > button')].find(b=>b.textContent.trim()==='+ But');if(!add)return;const form=add.previousElementSibling,hist=add.nextElementSibling;if(!form||!form.matches('.grid.g3')||!hist)return;const wrap=document.createElement('div');wrap.className='match-scoring-first';const title=document.createElement('div');title.className='match-scoring-title';title.innerHTML='<b>⚽ Saisir un but / une passe</b><span>Action rapide pendant le match</span>';form.classList.add('match-goal-form');add.classList.add('match-goal-add');hist.classList.add('match-goal-history');hist.style.marginTop='';wrap.append(title,form,add,hist);match.insertBefore(wrap,match.children[2]||null)})}

  function enhancePublicTeams(){const root=document.getElementById('publicTeams');if(!root)return;root.querySelectorAll('.public-team-card').forEach(card=>{card.querySelector('.public-team-average')?.classList.add('chien-boul-public');if(card.querySelector('.public-team-fun-comment'))return;const guests=card.querySelectorAll('.guest-badge').length;if(!guests)return;const name=card.querySelector('.public-team-head')?.textContent||card.textContent;let h=0;for(const c of name)h=(h*31+c.charCodeAt(0))>>>0;const one=['👀 Guest à jauger : potentiel surprise, adversaires prévenus.','🕵️ Un guest à évaluer : joueur à surveiller 😏','🎲 Guest encore mystérieux : la Chien Boul Academy demande confirmation terrain.'];const many=['🕵️ '+guests+' guests à jauger : équipe mystère, méfiance 😏','👀 '+guests+' guests encore sans verdict complet : ça peut piquer.','🎲 '+guests+' inconnues dans l’équation : Chien Boul Academy garde un œil dessus.'];const d=document.createElement('div');d.className='public-team-fun-comment';d.textContent=(guests>1?many:one)[h%(guests>1?many.length:one.length)];const avg=card.querySelector('.public-team-average');(avg||card.querySelector('.public-team-head'))?.insertAdjacentElement('afterend',d)})}

  function activityDays(a){if(!a?.last_swe_date)return Infinity;return Math.max(0,Math.floor((Date.now()-new Date(a.last_swe_date+'T12:00:00').getTime())/86400000))}
  function activityLabel(a){const n=Number(a?.swe_count||0);if(!n||!a?.last_swe_date)return 'Jamais participé à un Swé enregistré';const d=activityDays(a);return 'Dernier Swé : '+new Date(a.last_swe_date+'T12:00:00').toLocaleDateString('fr-FR')+' • '+n+' participation'+(n>1?'s':'')+(d>=30?' • '+d+' j sans jouer':'')}
  async function loadActivity(){if(!S?.workspace?.id||!isAdmin())return;const r=await sb.rpc('get_workspace_player_activity',{p_workspace_id:S.workspace.id});if(!r.error)activityMap=new Map((r.data||[]).map(x=>[String(x.player_id),x]))}
  function enhancePlayers(){if(!isAdmin())return;const box=document.getElementById('playersList');if(!box)return;let tools=document.getElementById('swePlayerActivityTools');if(!tools){tools=document.createElement('div');tools.id='swePlayerActivityTools';tools.className='swe-player-activity-tools';tools.innerHTML='<label><span class="muted">🕒 Activité des joueurs</span><select id="swePlayerActivityFilter"><option value="all">Tous les joueurs</option><option value="inactive_30">Inactifs depuis 30 jours ou +</option><option value="inactive_60">Inactifs depuis 60 jours ou +</option><option value="inactive_90">Inactifs depuis 90 jours ou +</option><option value="never">Jamais participé à un Swé</option></select></label><div id="swePlayerActivitySummary" class="muted"></div>';box.parentElement.insertBefore(tools,box);tools.querySelector('select').addEventListener('change',applyActivityFilter)}const cards=[...box.children].filter(x=>x.classList.contains('player'));cards.forEach((card,i)=>{const pl=S.players?.[i];if(!pl)return;card.dataset.playerId=pl.id;const a=activityMap.get(String(pl.id));const meta=card.querySelector('.muted');if(meta&&!card.querySelector('.swe-activity-meta')){const x=document.createElement('div');x.className='swe-activity-meta';x.textContent='🕒 '+activityLabel(a);meta.insertAdjacentElement('afterend',x)}});applyActivityFilter()}
  function applyActivityFilter(){const sel=document.getElementById('swePlayerActivityFilter'),box=document.getElementById('playersList');if(!sel||!box)return;const v=sel.value;let shown=0;[...box.children].filter(x=>x.classList.contains('player')).forEach(card=>{const a=activityMap.get(String(card.dataset.playerId)),never=Number(a?.swe_count||0)===0,days=activityDays(a);let ok=v==='all'||(v==='never'&&never)||(v.startsWith('inactive_')&&days>=Number(v.split('_')[1]||0));card.style.display=ok?'':'none';if(ok)shown++});const out=document.getElementById('swePlayerActivitySummary');if(out)out.textContent=shown+' joueur'+(shown>1?'s':'')+' affiché'+(shown>1?'s':'')+' sur '+(S.players?.length||0)}

  function matchFromCard(card){const cards=[...document.querySelectorAll('#matchesList .card.match')],idx=cards.indexOf(card);return idx>=0?S.matches?.[idx]:null}
  document.addEventListener('click',e=>{if(!offlineMode())return;const b=e.target.closest('button');if(!b)return;
    if(['addMatch','roundRobin'].includes(b.id)){const t=currentTour();if(t?.rotation_mode==='king_of_pitch'&&t.rotation_state?.initialized){e.preventDefault();e.stopImmediatePropagation();return toast('Le circuit est actif. Termine les matchs en cours pour créer la suite automatiquement.')}}
    if(b.id==='addMatch'){e.preventDefault();e.stopImmediatePropagation();const t=currentTour(),home=document.getElementById('homeTeam')?.value,away=document.getElementById('awayTeam')?.value,pitch=document.getElementById('pitch')?.value;if(!t||!home||!away||home===away)return toast('Choisis deux équipes différentes');if(t.format==='league'&&!pitch)return toast('Pour un match de Ligue, indique obligatoirement le terrain.');const row={id:uid(),tournament_id:t.id,home_team_id:home,away_team_id:away,match_order:(S.matches?.length||0)+1,pitch:pitch||null,round_label:document.getElementById('roundLabel')?.value.trim()||null,home_score:0,away_score:0,status:'scheduled'};queue('insert_match',{row});S.matches.push(row);renderMatches();toast('📴 Match créé sur ce téléphone.');return}
    if(b.id==='roundRobin'){e.preventDefault();e.stopImmediatePropagation();const t=currentTour();if(!t||S.teams.length<2)return toast('Crée les équipes d’abord');if(t.format==='league')return toast('En Ligue, crée les matchs un par un.');const existing=new Set(S.matches.map(m=>[m.home_team_id,m.away_team_id].sort().join('|'))),rows=[];let n=S.matches.length+1;for(let i=0;i<S.teams.length;i++)for(let j=i+1;j<S.teams.length;j++){const key=[S.teams[i].id,S.teams[j].id].sort().join('|');if(!existing.has(key))rows.push({id:uid(),tournament_id:t.id,home_team_id:S.teams[i].id,away_team_id:S.teams[j].id,match_order:n++,home_score:0,away_score:0,status:'scheduled'})}rows.forEach(row=>queue('insert_match',{row}));S.matches.push(...rows);renderMatches();toast('📴 '+rows.length+' matchs créés hors connexion.');return}
    const card=b.closest('.card.match'),m=card?matchFromCard(card):null;if(!m)return;
    if(b.textContent.trim()==='💾 Score'){e.preventDefault();e.stopImmediatePropagation();const inputs=[...b.parentElement.querySelectorAll('input[type="number"]')];const patch={home_score:Math.max(0,Number(inputs[0]?.value)||0),away_score:Math.max(0,Number(inputs[1]?.value)||0),status:'finished',finished_at:new Date().toISOString()};queue('update_match_score',{match_id:m.id,patch});Object.assign(m,patch);renderMatches();toast('📴 Résultat enregistré sur ce téléphone.');return}
    if(b.textContent.trim()==='+ But'){e.preventDefault();e.stopImmediatePropagation();const scope=b.closest('.match-scoring-first')||card,selects=[...scope.querySelectorAll('select')];const team=selects[0]?.value,scorer=selects[1]?.value,assister=selects[2]?.value;if(!scorer)return toast('Choisis le buteur');if(assister===scorer)return toast('Buteur et passeur différents');const row={id:uid(),match_id:m.id,team_id:team,scorer_player_id:scorer,assister_player_id:assister||null,created_at:new Date().toISOString()};queue('insert_goal',{row});S.goals.push(row);renderMatches();toast('📴 But enregistré sur ce téléphone.');return}
    if(b.textContent.trim()==='Annuler'&&b.closest('.match-goal-history')){e.preventDefault();e.stopImmediatePropagation();const buttons=[...card.querySelectorAll('.match-goal-history button')].filter(x=>x.textContent.trim()==='Annuler'),idx=buttons.indexOf(b),goals=(S.goals||[]).filter(g=>String(g.match_id)===String(m.id));const g=goals[idx];if(!g)return;queue('delete_goal',{goal_id:g.id});S.goals=S.goals.filter(x=>String(x.id)!==String(g.id));renderMatches();toast('📴 But annulé sur ce téléphone.');}
  },true);

  const nativeFetch=window.fetch.bind(window);window.fetch=async(...args)=>{try{const r=await nativeFetch(...args);if(r.ok)networkDown=false;return r}catch(e){renderOfflineBanner();throw e}};
  window.addEventListener('online',()=>{networkDown=false;renderOfflineBanner();setTimeout(syncQueue,300)});
  window.addEventListener('pageshow',()=>{networkDown=false;if(navigator.onLine){setTimeout(()=>{Promise.resolve(loadAll()).catch(()=>{});syncQueue()},350)}});window.addEventListener('offline',()=>{networkDown=true;renderOfflineBanner()});

  try{const originalRenderPlayers=renderPlayers;renderPlayers=function(...a){const r=originalRenderPlayers.apply(this,a);setTimeout(enhancePlayers,0);return r}}catch(_){ }
  try{const originalLoadAll=loadAll;loadAll=async function(...a){if(offlineMode()&&restoreSnapshot())return;const r=await originalLoadAll.apply(this,a);if(!offlineMode()){await loadActivity();cacheSnapshot()}return r}}catch(_){ }
  try{const originalLoadTournament=loadTournament;loadTournament=async function(...a){if(offlineMode()&&restoreSnapshot())return;const r=await originalLoadTournament.apply(this,a);if(!offlineMode())cacheSnapshot();return r}}catch(_){ }
  try{const originalBoot=boot;boot=async function(...a){if(offlineMode()&&restoreSnapshot()){renderOfflineBanner();return}return originalBoot.apply(this,a)}}catch(_){ }

  let scheduled=false;function apply(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;installStyle();setVersion();foldSubstitutes();moveScoringFirst();formatRatings();enhancePublicTeams();enhancePlayers();renderOfflineBanner()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{apply();setTimeout(()=>{loadActivity().then(enhancePlayers);syncQueue()},600)},{once:true});else{apply();setTimeout(()=>{loadActivity().then(enhancePlayers);syncQueue()},600)}
  document.addEventListener('swe:rendered',apply);
})();

;

;
/* SOURCE hotfix-v4228.js */
(()=>{
'use strict';
const STYLE_ID='swe-v4228-style';
const RATE_REASONS=[['progression','Progression constatée'],['different_day','Performance différente aujourd’hui'],['better_known','Je connais maintenant mieux le joueur'],['correction','Première évaluation à corriger'],['role_change','Changement de rôle / profil de jeu'],['return','Retour après une longue absence'],['other','Autre raison']];
const css=`
.swe-live-hero{margin:12px auto;padding:16px;border-radius:18px;background:linear-gradient(135deg,#10213f,#1954a6);color:white;box-shadow:0 12px 28px rgba(16,33,63,.18)}.swe-live-hero h2{margin:0 0 5px}.swe-live-hero small{opacity:.85}.swe-live-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#4ade80;margin-right:6px;box-shadow:0 0 0 5px rgba(74,222,128,.15)}
.swe-rating-banner{border:2px solid #d7b75f;background:#fff7d7}.swe-rating-banner .row{align-items:center;justify-content:space-between}.swe-rating-overlay{position:fixed;inset:0;z-index:10000;background:rgba(7,19,34,.72);overflow:auto;padding:18px}.swe-rating-panel{max-width:980px;margin:auto;background:#f4f8ff;border-radius:22px;padding:18px}.swe-rating-team{border-radius:16px;overflow:hidden;background:#fff;margin:14px 0;border:1px solid #dce7f5}.swe-rating-team-head{padding:12px 14px;font-weight:900}.swe-rating-player{padding:12px 14px;border-top:1px solid #edf2f7}.swe-rating-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.swe-rating-grid label span{display:block;font-size:11px;color:#64748b;margin-bottom:4px}.swe-rating-reason{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.swe-rating-existing{font-size:12px;color:#5b6471;margin:6px 0}.swe-rating-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:10px}.swe-id-card{border:1px solid #c9daf0;background:#f8fbff}.swe-id-row{display:grid;grid-template-columns:minmax(140px,1fr) 145px 115px;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #e9f0f7}.swe-id-row:first-child{border-top:0}.swe-id-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800}.swe-admin-report-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #edf2f7}.swe-admin-report-item:first-child{border-top:0}.swe-modal{position:fixed;inset:0;z-index:10001;background:rgba(7,19,34,.7);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:20px}.swe-modal-card{width:min(900px,100%);background:white;border-radius:20px;padding:18px}.swe-registry-table{width:100%;border-collapse:collapse}.swe-registry-table th,.swe-registry-table td{padding:8px;border-bottom:1px solid #e8eef5;text-align:left;font-size:12px}.swe-registry-table th{position:sticky;top:0;background:#f6f9fd;z-index:1}.swe-registry-wrap{overflow:auto;max-height:65vh}.swe-status-pill{display:inline-block;padding:3px 7px;border-radius:999px;background:#edf5ff;font-size:11px;font-weight:800}
@media(max-width:700px){.swe-rating-overlay{padding:0}.swe-rating-panel{border-radius:0;min-height:100vh;padding:12px}.swe-rating-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.swe-rating-reason{grid-template-columns:1fr}.swe-id-row{grid-template-columns:1fr}.swe-id-row button{width:100%}.swe-admin-report-item{align-items:flex-start;flex-direction:column}.swe-modal{padding:8px}.swe-modal-card{border-radius:15px}.swe-registry-table{min-width:760px}}
`;
function esc2(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function installStyle(){if(document.getElementById(STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent=css;document.head.appendChild(s)}
function setVersion(){window.SWEApplyBuild?.();}
function currentBase(){return location.origin+location.pathname}
function fmtDate(v){try{return new Date(v).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(_){return ''}}
let publicLive=false,liveTimer=null;
function publicRegistrationClosed(){const txt=(document.getElementById('publicView')?.textContent||'').toLowerCase();const reg=document.getElementById('publicRegistration');return txt.includes('inscriptions terminées')||!!reg?.querySelector('button:disabled')}
function activatePublicLive(){return;const pv=document.getElementById('publicView'),teams=document.getElementById('publicTeams');if(!pv||pv.classList.contains('hidden')||!teams||!teams.querySelector('.public-team-card')||!publicRegistrationClosed())return;['publicEntryChoiceCard','publicRegistrationCard','publicTeamBuilderCard'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));let hero=document.getElementById('sweLiveHero');if(!hero){hero=document.createElement('div');hero.id='sweLiveHero';hero.className='swe-live-hero';hero.innerHTML='<h2><span class="swe-live-dot"></span>SWÉ en direct</h2><div>Les équipes sont constituées : le lien d’inscription devient automatiquement le lien de suivi du tournoi.</div><small>Scores et résultats se mettent à jour automatiquement dès qu’une saisie terrain est synchronisée.</small>';pv.querySelector('.top')?.insertAdjacentElement('afterend',hero)}const teamCard=teams.closest('.card');if(teamCard&&hero.nextElementSibling!==teamCard)hero.insertAdjacentElement('afterend',teamCard);const rank=document.getElementById('publicTeamRanking')?.closest('.card');if(rank&&teamCard&&teamCard.nextElementSibling!==rank)teamCard.insertAdjacentElement('afterend',rank);publicLive=true;if(!liveTimer)liveTimer=setInterval(()=>{if(publicLive&&navigator.onLine&&document.visibilityState==='visible'&&!document.querySelector('.swe-modal,.swe-rating-overlay'))location.reload()},20000)}
async function loadMyRatingSessions(){if(!S?.workspace?.id||!S?.session?.user?.id||!(typeof isCoorg==='function'&&isCoorg()))return[];const r=await sb.rpc('get_my_post_tournament_rating_sessions',{p_workspace_id:S.workspace.id});return r.error?[]:(r.data||[])}
function ratingLink(tid){return currentBase()+'?rate='+encodeURIComponent(tid)}
async function ensureRatingBanner(){if(!S?.workspace?.id||!(typeof isCoorg==='function'&&isCoorg()))return;const home=document.getElementById('view-home');if(!home)return;const rows=await loadMyRatingSessions();let box=document.getElementById('sweRatingBanner');if(!rows.length){box?.remove();return}const x=rows[0];if(!box){box=document.createElement('div');box.id='sweRatingBanner';box.className='card swe-rating-banner';home.insertAdjacentElement('afterbegin',box)}box.innerHTML='<div class="row"><div><b>⭐ À vous de jouer, Chien Boul Academy !</b><div class="muted">'+esc2(x.tournament_name)+' • évaluations ouvertes jusqu’au '+esc2(fmtDate(x.closes_at))+'. Tes anciens avis sont préremplis.</div></div><div class="row"><button class="primary" id="sweOpenRating">Noter les joueurs</button><button id="sweCopyRatingLink">Copier le lien</button></div></div>';box.querySelector('#sweOpenRating').onclick=()=>openRatingSheet(x.tournament_id);box.querySelector('#sweCopyRatingLink').onclick=()=>navigator.clipboard?.writeText(ratingLink(x.tournament_id)).then(()=>toast('Lien de notation copié ✅'))}
function selectOptions(from,to,val){let h='';for(let i=from;i<=to;i++)h+='<option value="'+i+'"'+(Number(val)===i?' selected':'')+'>'+i+'</option>';return h}
function roleOptions(val){const roles=[['defenseur','Défenseur'],['metronome','Métronome'],['ratisseur','Ratisseur'],['finisseur','Finisseur'],['dribbleur','Dribbleur'],['frappeur','Frappeur'],['top_player','Top Player']];return '<option value="">Rôle</option>'+roles.map(([v,l])=>'<option value="'+v+'"'+(v===val?' selected':'')+'>'+l+'</option>').join('')}
function reasonOptions(){return '<option value="">Pourquoi la note change ?</option>'+RATE_REASONS.map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('')}
function ratingChanged(card,old){if(!old)return false;return ['cardio','dribble','collectif','frappe'].some(k=>Number(card.querySelector('[data-k="'+k+'"]').value)!==Number(old[k]))||card.querySelector('[data-k="role"]').value!==String(old.preferred_role||'')}
async function openRatingSheet(tid){const r=await sb.rpc('get_post_tournament_rating_sheet',{p_tournament_id:tid});if(r.error)return toast(r.error.message);const data=r.data||{};document.getElementById('sweRatingOverlay')?.remove();const ov=document.createElement('div');ov.id='sweRatingOverlay';ov.className='swe-rating-overlay';const teams=(data.teams||[]).map(team=>'<section class="swe-rating-team"><div class="swe-rating-team-head" style="background:'+esc2(team.color||'#e9eef5')+'">👕 '+esc2(team.team_name)+'</div>'+(team.players||[]).map(pl=>{const o=pl.existing||null;return '<div class="swe-rating-player" data-player="'+pl.player_id+'" data-old="'+encodeURIComponent(JSON.stringify(o||null))+'"><div><b>'+esc2(pl.player_name)+'</b> '+(pl.guest?'<span class="guest-badge">Guest • 👀 à évaluer</span>':'')+' <span class="swe-status-pill">'+esc2(pl.group_player_code||'')+'</span></div><div class="swe-rating-existing">'+(o?'Ton avis actuel : <b>'+(Number(o.rating||0)*2).toFixed(2)+'/10</b> • tu peux le confirmer ou le modifier.':'👀 Première observation : aucune évaluation précédente de ta part.')+'</div><div class="swe-rating-grid"><label><span>Cardio</span><select data-k="cardio"><option value="">—</option>'+selectOptions(1,5,o?.cardio)+'</select></label><label><span>Dribble</span><select data-k="dribble"><option value="">—</option>'+selectOptions(1,5,o?.dribble)+'</select></label><label><span>Collectif</span><select data-k="collectif"><option value="">—</option>'+selectOptions(1,5,o?.collectif)+'</select></label><label><span>Frappe</span><select data-k="frappe"><option value="">—</option>'+selectOptions(1,5,o?.frappe)+'</select></label><label><span>Profil</span><select data-k="role">'+roleOptions(o?.preferred_role)+'</select></label></div><div class="swe-rating-reason hidden"><select data-k="reason">'+reasonOptions()+'</select><input data-k="note" placeholder="Précision si nécessaire"></div><div class="swe-rating-actions"><button class="primary" data-save-rating>💾 '+(o?'Confirmer / modifier':'Enregistrer')+'</button></div></div>'}).join('')+'</section>').join('');ov.innerHTML='<div class="swe-rating-panel"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><div class="sa-eyebrow">BILAN POST-SWÉ</div><h2 style="margin:3px 0">⭐ '+esc2(data.tournament?.name||'Notation')+'</h2><div class="muted">Tes évaluations précédentes sont préremplies. Toute modification exige un motif.</div></div><button id="sweCloseRating">✕</button></div>'+teams+'<div class="swe-rating-actions"><button id="sweCompleteRating" class="primary">✅ J’ai terminé mes évaluations</button></div></div>';document.body.appendChild(ov);ov.querySelector('#sweCloseRating').onclick=()=>ov.remove();ov.querySelectorAll('.swe-rating-player').forEach(card=>{const old=JSON.parse(decodeURIComponent(card.dataset.old));const reason=card.querySelector('.swe-rating-reason');card.querySelectorAll('select[data-k]').forEach(sel=>sel.addEventListener('change',()=>reason.classList.toggle('hidden',!ratingChanged(card,old))));card.querySelector('[data-save-rating]').onclick=async()=>{const vals={};['cardio','dribble','collectif','frappe'].forEach(k=>vals[k]=Number(card.querySelector('[data-k="'+k+'"]').value));vals.role=card.querySelector('[data-k="role"]').value;if(!vals.cardio||!vals.dribble||!vals.collectif||!vals.frappe||!vals.role)return toast('Complète les 4 critères et le rôle.');const changed=ratingChanged(card,old),rr=card.querySelector('[data-k="reason"]').value,note=card.querySelector('[data-k="note"]').value.trim();if(changed&&!rr)return toast('Choisis pourquoi tu modifies ton avis.');if(changed&&rr==='other'&&!note)return toast('Précise la raison du changement.');const b=card.querySelector('[data-save-rating]');b.disabled=true;const q=await sb.rpc('submit_post_tournament_player_review',{p_tournament_id:tid,p_player_id:card.dataset.player,p_cardio:vals.cardio,p_dribble:vals.dribble,p_collectif:vals.collectif,p_frappe:vals.frappe,p_preferred_role:vals.role,p_change_reason:changed?rr:null,p_change_note:changed?note:null});b.disabled=false;if(q.error)return toast(q.error.message);b.textContent='✅ Enregistré';toast('Évaluation enregistrée ✅')}});ov.querySelector('#sweCompleteRating').onclick=async()=>{if(!confirm('Confirmer que tu as terminé tes évaluations pour ce Swé ?'))return;const q=await sb.rpc('complete_post_tournament_rating_session',{p_tournament_id:tid});if(q.error)return toast(q.error.message);toast('Bilan envoyé à l’administrateur ✅');ov.remove();history.replaceState({},'',location.pathname+location.search.replace(/([?&])rate=[^&]+&?/,'$1').replace(/[?&]$/,''));ensureRatingBanner()}}
async function ensureIdentityTools(){if(!S?.workspace?.id)return;const vp=document.getElementById('view-players');if(vp&&typeof isAdmin==='function'&&isAdmin()){let card=document.getElementById('sweIdentityAdminCard');if(!card){card=document.createElement('div');card.id='sweIdentityAdminCard';card.className='card swe-id-card';vp.insertAdjacentElement('afterbegin',card)}const req=await sb.rpc('admin_get_identity_link_requests',{p_workspace_id:S.workspace.id});const pending=req.error?[]:(req.data||[]);const members=(S.players||[]).filter(p=>p.is_group_member!==false&&p.active!==false).sort((a,b)=>String(a.name).localeCompare(String(b.name)));card.innerHTML='<h2 class="sectiontitle">🪪 ID Groupe & rattachement ID SWÉ</h2><p class="muted">Chaque fiche joueur conserve un ID Groupe. Le rattachement à un ID SWÉ personnel n’est effectué qu’après validation de l’administrateur.</p><div class="row" style="margin:10px 0"><input id="sweAddByGlobalId" placeholder="ID SWÉ existant • SWE-…" style="flex:1"><button id="sweAddByGlobalBtn" class="primary">Ajouter au groupe</button></div>'+(pending.length?'<div class="player"><b>🔔 Demandes de rattachement ('+pending.length+')</b>'+pending.map(x=>'<div class="swe-id-row"><span><b>'+esc2(x.player_name)+'</b><small class="muted"> demande '+esc2(x.public_player_id)+'</small></span><span class="swe-id-code">'+esc2(x.group_player_code)+'</span><span><button data-approve="'+x.request_id+'">✅</button> <button data-reject="'+x.request_id+'">✕</button></span></div>').join('')+'</div>':'')+'<details style="margin-top:10px"><summary><b>📋 IDs Groupe des membres ('+members.length+')</b></summary><div style="margin-top:8px">'+members.map(p=>'<div class="swe-id-row"><span><b>'+esc2(p.name)+'</b></span><span class="swe-id-code">'+esc2(p.group_player_code||'—')+'</span><button data-copy-code="'+esc2(p.group_player_code||'')+'">Copier</button></div>').join('')+'</div></details>';card.querySelector('#sweAddByGlobalBtn').onclick=async()=>{const id=card.querySelector('#sweAddByGlobalId').value.trim();if(!id)return;const q=await sb.rpc('admin_add_player_by_swe_id',{p_workspace_id:S.workspace.id,p_public_player_id:id});if(q.error)return toast(q.error.message);toast('Joueur ajouté et identifié ✅');await loadAll()};card.querySelectorAll('[data-approve]').forEach(b=>b.onclick=async()=>{const q=await sb.rpc('admin_decide_identity_link_request',{p_request_id:b.dataset.approve,p_approve:true,p_note:null});if(q.error)return toast(q.error.message);toast('Rattachement validé ✅');ensureIdentityTools()});card.querySelectorAll('[data-reject]').forEach(b=>b.onclick=async()=>{const note=prompt('Motif du refus (facultatif) :')||null;const q=await sb.rpc('admin_decide_identity_link_request',{p_request_id:b.dataset.reject,p_approve:false,p_note:note});if(q.error)return toast(q.error.message);ensureIdentityTools()});card.querySelectorAll('[data-copy-code]').forEach(b=>b.onclick=()=>navigator.clipboard?.writeText(b.dataset.copyCode).then(()=>toast('ID Groupe copié ✅')))}const my=document.getElementById('view-myplayer');if(my&&S?.session?.user){document.querySelector('.swe-history-link-card')?.classList.add('hidden');let c=document.getElementById('sweMyGroupLinkCard');if(!c){c=document.createElement('div');c.id='sweMyGroupLinkCard';c.className='card swe-id-card';const dash=document.getElementById('myPlayerDashboard');(dash||my).insertAdjacentElement('afterbegin',c)}c.innerHTML='<h2 class="sectiontitle">🔗 Rattacher un ancien profil de groupe</h2><p class="muted">Demande à ton admin ton <b>ID Groupe</b> (ex. GRP-12AB34CD), saisis-le ici puis l’admin validera le rattachement à ton ID SWÉ personnel.</p><div class="row"><input id="sweMyGroupCode" placeholder="GRP-XXXXXXXX" style="flex:1;text-transform:uppercase"><button id="sweRequestGroupLink" class="primary">Demander le rattachement</button></div>';c.querySelector('#sweRequestGroupLink').onclick=async()=>{const code=c.querySelector('#sweMyGroupCode').value.trim();if(!code)return;const q=await sb.rpc('request_my_group_player_link',{p_group_player_code:code});if(q.error)return toast(q.error.message);toast(q.data?.status==='already_linked'?'Déjà rattaché ✅':'Demande envoyée à l’administrateur ✅')}}}
function openSimpleModal(html){document.getElementById('sweGenericModal')?.remove();const ov=document.createElement('div');ov.id='sweGenericModal';ov.className='swe-modal';ov.innerHTML='<div class="swe-modal-card"><div style="text-align:right"><button id="sweModalClose">✕</button></div>'+html+'</div>';document.body.appendChild(ov);ov.querySelector('#sweModalClose').onclick=()=>ov.remove();return ov}
async function ensureAdminReports(){if(!(typeof isAdmin==='function'&&isAdmin())||!S?.workspace?.id)return;const view=document.getElementById('view-tournaments');if(!view)return;let c=document.getElementById('sweRatingReportsCard');if(!c){c=document.createElement('div');c.id='sweRatingReportsCard';c.className='card';view.insertAdjacentElement('afterbegin',c)}const fins=(S.tournaments||[]).filter(t=>t.status==='finished').slice(0,6);c.innerHTML='<details><summary style="font-weight:800;cursor:pointer">Inviter les co-gestionnaires à noter</summary><div style="margin-top:14px"><div class="muted">Après « Tournoi terminé », les co-gestionnaires ont 48 h pour confirmer ou ajuster leurs évaluations.</div>'+(fins.length?fins.map(t=>'<div class="swe-admin-report-item"><span><b>'+esc2(t.name||t.tournament_date)+'</b><div class="muted">'+esc2(t.tournament_date||'')+'</div></span><span><button data-copy-rate="'+t.id+'">Copier lien notation</button> <button class="primary" data-report="'+t.id+'">Voir rapport</button></span></div>').join(''):'<p class="muted">Aucun tournoi terminé.</p>')+'</div></details>';c.querySelectorAll('[data-copy-rate]').forEach(b=>b.onclick=()=>navigator.clipboard?.writeText(ratingLink(b.dataset.copyRate)).then(()=>toast('Lien notation copié ✅')));c.querySelectorAll('[data-report]').forEach(b=>b.onclick=async()=>{const q=await sb.rpc('admin_get_tournament_rating_report',{p_tournament_id:b.dataset.report});if(q.error)return toast(q.error.message);const d=q.data||{},evals=d.evaluators||[],changes=d.changes||[];openSimpleModal('<h2>🐶⚽ Rapport de notation</h2><h3>Co-gestionnaires</h3>'+(evals.length?evals.map(x=>'<div class="player"><b>'+esc2(x.email||'Compte')+'</b> • '+(x.completed_at?'✅ Terminé '+esc2(fmtDate(x.completed_at)):'⏳ En attente')+'</div>').join(''):'<p class="muted">Aucun co-gestionnaire assigné.</p>')+'<h3>Évaluations / modifications</h3>'+(changes.length?changes.map(x=>'<div class="player"><b>'+esc2(x.player_name)+'</b> • '+esc2(x.evaluator_email||'')+'<div class="muted">'+(x.change_reason?'Motif : '+esc2(RATE_REASONS.find(r=>r[0]===x.change_reason)?.[1]||x.change_reason)+(x.change_note?' • '+esc2(x.change_note):''):'Nouvelle évaluation / confirmation')+'</div></div>').join(''):'<p class="muted">Aucune évaluation enregistrée pour le moment.</p>'))})}
let registryLoaded=false;
async function ensureSuperRegistry(){if(!S?.isSuperAdmin)return;const tabs=document.querySelector('.sa-admin-tabs'),panel=document.getElementById('superAdminPanel');if(!tabs||!panel)return;let btn=document.getElementById('saGroupRegistryTab');if(!btn){btn=document.createElement('button');btn.id='saGroupRegistryTab';btn.type='button';btn.textContent='🪪 Registre joueurs groupes';tabs.appendChild(btn)}let sec=document.getElementById('saGroupRegistrySection');if(!sec){sec=document.createElement('div');sec.id='saGroupRegistrySection';sec.className='hidden';sec.innerHTML='<div class="card"><div class="sa-section-head"><div><span class="sa-section-icon">🪪</span><div><h2>Registre joueurs par groupe</h2><p>ID Groupe, note locale et ID SWÉ rattaché. Aucune fusion implicite entre groupes.</p></div></div></div><div class="row" style="margin:10px 0"><input id="saRegistrySearch" placeholder="Rechercher nom, groupe, ID Groupe ou ID SWÉ" style="flex:1"><select id="saRegistryFilter"><option value="all">Tous</option><option value="local">Non rattachés</option><option value="linked">Rattachés</option><option value="guest">Guests</option><option value="inactive">Inactifs</option></select></div><div id="saRegistryBody"></div></div>';panel.appendChild(sec)}btn.onclick=async()=>{document.querySelectorAll('.sa-admin-tabs button').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.getElementById('saSpacesSection')?.classList.add('hidden');document.getElementById('saPlayersSection')?.classList.add('hidden');sec.classList.remove('hidden');await loadRegistry()};const orig=[...tabs.querySelectorAll('button')].filter(x=>x!==btn);orig.forEach(b=>{if(!b.dataset.swe4228){b.dataset.swe4228='1';b.addEventListener('click',()=>sec.classList.add('hidden'))}});if(!registryLoaded)registryLoaded=true}
async function loadRegistry(){const body=document.getElementById('saRegistryBody');if(!body)return;body.innerHTML='<p class="muted">Chargement…</p>';const q=await sb.rpc('super_admin_get_group_player_registry');if(q.error){body.textContent=q.error.message;return}const rows=q.data||[];const render=()=>{const s=(document.getElementById('saRegistrySearch')?.value||'').toLowerCase(),f=document.getElementById('saRegistryFilter')?.value||'all';const rr=rows.filter(x=>{const hit=!s||[x.player_name,x.workspace_name,x.group_player_code,x.public_player_id].some(v=>String(v||'').toLowerCase().includes(s));const ok=f==='all'||(f==='local'&&!x.public_player_id)||(f==='linked'&&x.public_player_id)||(f==='guest'&&x.is_group_member===false)||(f==='inactive'&&x.active===false);return hit&&ok});body.innerHTML='<div class="swe-registry-wrap"><table class="swe-registry-table"><thead><tr><th>Joueur</th><th>Groupe</th><th>ID Groupe</th><th>Note groupe</th><th>ID SWÉ</th><th>État</th></tr></thead><tbody>'+rr.map(x=>'<tr><td>'+esc2(x.player_name)+'</td><td>'+esc2(x.workspace_name)+'</td><td class="swe-id-code">'+esc2(x.group_player_code)+'</td><td>'+(x.group_rating==null?'—':(Number(x.group_rating)*2).toFixed(2)+'/10')+'</td><td class="swe-id-code">'+esc2(x.public_player_id||'—')+'</td><td><span class="swe-status-pill">'+(x.public_player_id?'✅ Rattaché':'⏳ Local')+'</span></td></tr>').join('')+'</tbody></table></div><div class="muted" style="margin-top:8px">'+rr.length+' fiche(s)</div>'};document.getElementById('saRegistrySearch').oninput=render;document.getElementById('saRegistryFilter').onchange=render;render()}
let busy=false;async function enhance(){if(busy)return;busy=true;try{installStyle();setVersion();activatePublicLive();if(S?.session){await ensureRatingBanner();await ensureIdentityTools();await ensureAdminReports();await ensureSuperRegistry();const rate=new URLSearchParams(location.search).get('rate');if(rate&&!document.getElementById('sweRatingOverlay')&&typeof isCoorg==='function'&&isCoorg()){const rows=await loadMyRatingSessions();if(rows.some(x=>String(x.tournament_id)===String(rate)))openRatingSheet(rate)}}}catch(e){console.warn('V42.28',e)}finally{busy=false}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();document.addEventListener('swe:rendered',()=>setTimeout(enhance,250));window.addEventListener('pageshow',()=>setTimeout(enhance,900));
})();

;

;
/* SOURCE hotfix-v4229.js */
(()=>{
'use strict';
function setVersion(){window.SWEApplyBuild?.();}
function liveUrl(){try{const t=typeof currentTour==='function'?currentTour():null;if(!t)return '';const u=new URL('./live.html',location.href);if(t.short_code)u.searchParams.set('s',String(t.short_code).toUpperCase());else{if(!S?.workspace?.public_token)return '';u.searchParams.set('public',S.workspace.public_token);u.searchParams.set('tournament',t.id)}return u.toString()}catch(_){return ''}}
function ensureLiveCard(){
  if(typeof S==='undefined'||!S?.workspace||typeof currentTour!=='function')return;
  const t=currentTour(),view=document.getElementById('view-tournaments');
  if(!view||!t)return;
  let card=document.getElementById('sweLiveShareCard');
  if(!card){card=document.createElement('div');card.id='sweLiveShareCard';card.className='card';card.style.border='2px solid #79b7ff';card.style.background='#f4f9ff';card.style.marginBottom='12px';view.insertAdjacentElement('afterbegin',card)}
  const url=liveUrl();
  card.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap"><div style="min-width:240px;flex:1"><div style="font-size:17px;font-weight:900">📡 Suivi Live du tournoi</div><div class="muted" style="margin-top:4px"><b>'+String(t.name||'Tournoi SWÉ').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</b>'+(t.tournament_date?' • '+t.tournament_date:'')+'</div><div class="muted" style="margin-top:5px">Lien séparé de l’inscription : équipes, remplaçants, classement et résultats de ce tournoi uniquement.</div><input id="sweLiveLinkField" readonly value="'+String(url).replace(/"/g,'&quot;')+'" style="margin-top:9px;width:100%;font-size:12px"></div><div class="row" style="flex-wrap:wrap"><button id="sweCopyLiveLink" class="primary">📋 Copier le lien Live</button><button id="sweOpenLiveLink">👁️ Ouvrir le Live</button></div></div>';
  const copy=card.querySelector('#sweCopyLiveLink'),open=card.querySelector('#sweOpenLiveLink'),field=card.querySelector('#sweLiveLinkField');
  copy.disabled=!url;open.disabled=!url;
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(url);toast('Lien Live copié ✅')}catch(_){field?.select();document.execCommand?.('copy');toast('Lien Live copié ✅')}};
  open.onclick=()=>{if(url)window.open(url,'_blank','noopener,noreferrer')};
}
function relabelAcademy(){document.querySelectorAll('#publicView *').forEach(el=>{if(el.children.length)return;const txt=el.textContent||'';if(txt.includes('Chien Boul Academy :')&&!txt.includes('Note équipe évaluée par Chien Boul Academy :'))el.textContent=txt.replace('Chien Boul Academy :','Note équipe évaluée par Chien Boul Academy :')})}
let scheduled=false;function apply(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;setVersion();ensureLiveCard();relabelAcademy()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();document.addEventListener('swe:rendered',apply);
})();

;

;
/* SOURCE hotfix-v4230.js */
(()=>{
'use strict';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const appBase=()=>new URL('./',location.href);
const isTest=t=>/^TEST SWÉ\s*—/i.test(String(t?.name||''));
function makeUrls(t){
  const base=appBase();let reg='';
  try{reg=typeof registrationLink==='function'?registrationLink(t):''}catch(_){}
  if(!reg&&t?.short_code){const u=new URL(base);u.searchParams.set('s',String(t.short_code).toUpperCase());reg=u.toString();}
  const live=new URL('live.html',base);if(t?.short_code)live.searchParams.set('s',String(t.short_code).toUpperCase());else if(S?.workspace?.public_token&&t?.id){live.searchParams.set('public',S.workspace.public_token);live.searchParams.set('tournament',t.id);}
  const pay=new URL(base);if(t?.payment_short_code)pay.searchParams.set('pay',String(t.payment_short_code).toUpperCase());
  return {reg,live:live.toString(),pay:t?.payment_short_code?pay.toString():''};
}
async function copyText(text){if(!text)return false;try{await navigator.clipboard.writeText(text);return true}catch(_){const ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(__){}ta.remove();return ok;}}
let selectedTournamentId='',renderedKey='';
function linkTournaments(){
  return (S?.tournaments||[]).filter(t=>t?.format!=='league'&&t?.status!=='finished')
    .sort((a,b)=>Number(isTest(a))-Number(isTest(b))||String(a.tournament_date).localeCompare(String(b.tournament_date)));
}
function renderLinks(){
  if(typeof S==='undefined'||!S?.workspace)return;
  const view=document.getElementById('view-tournaments'),items=linkTournaments();if(!view||!items.length)return;
  if(!items.some(t=>String(t.id)===String(selectedTournamentId)))selectedTournamentId=currentTour?.()?.id||items[0].id;
  const t=items.find(x=>String(x.id)===String(selectedTournamentId))||items[0],urls=makeUrls(t);
  const key=[t.id,urls.reg,urls.live,urls.pay,items.map(x=>x.id+':'+x.name).join('|'),typeof isAdmin==='function'&&isAdmin()].join('|');
  let card=document.getElementById('sweTournamentLinksCard');if(card&&renderedKey===key)return;
  if(!card){card=document.createElement('div');card.id='sweTournamentLinksCard';card.className='card';card.style.cssText='border:2px solid #79b7ff;background:#f7fbff;margin-bottom:12px';view.insertAdjacentElement('afterbegin',card);}
  renderedKey=key;
  const options=items.map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(t.id)?'selected':'')+'>'+(isTest(x)?'🧪 Test · ':'🏆 Réel · ')+esc(x.name||x.tournament_date)+' · '+esc(x.tournament_date||'')+'</option>').join('');
  const row=(icon,title,desc,url,type)=>'<div class="player" style="margin-top:8px"><div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center"><div><b>'+icon+' '+esc(title)+'</b><div class="muted" style="margin-top:3px">'+esc(desc)+'</div><input readonly value="'+esc(url||'Indisponible')+'" style="margin-top:7px;width:100%;font-size:12px"></div><div class="row" style="flex-wrap:wrap;justify-content:flex-end"><button type="button" data-swe-copy="'+type+'" '+(!url?'disabled':'')+'>📋 Copier</button><a class="button" href="'+esc(url||'#')+'" '+(!url?'aria-disabled="true" tabindex="-1"':'target="_blank" rel="noopener noreferrer"')+'>👁️ Ouvrir</a></div></div></div>';
  card.innerHTML='<div><div class="sa-eyebrow">LIENS DU TOURNOI</div><h2 style="margin:3px 0">🔗 '+esc(t.name||'Tournoi SWÉ')+'</h2><div class="muted">Choisis le tournoi, puis utilise ses trois liens.</div><label style="display:block;margin-top:10px;max-width:520px"><span class="muted">Tournoi à afficher</span><select id="sweTournamentLinkTournament" style="margin-top:4px">'+options+'</select></label></div>'+row('📝','Inscription','Lien à partager avant la clôture des inscriptions.',urls.reg,'reg')+row('📡','Suivi Live','Équipes, classement et résultats en direct du tournoi sélectionné.',urls.live,'live')+row('💶','Suivi des paiements','Feuille privée pour marquer PAYÉ / NON PAYÉ, remplaçants compris.',urls.pay,'pay')+((typeof isAdmin==='function'&&isAdmin())?'<div class="row" style="margin-top:10px;justify-content:flex-end"><button id="sweAdminResetPayments" class="danger" type="button">Réinitialiser la feuille de paiement</button></div>':'');
  card.dataset.reg=urls.reg;card.dataset.live=urls.live;card.dataset.pay=urls.pay;card.dataset.tournamentId=t.id;
  card.querySelector('#sweTournamentLinkTournament').onchange=e=>{selectedTournamentId=e.target.value;renderedKey='';renderLinks();};
  document.getElementById('sweLiveShareCard')?.style.setProperty('display','none','important');document.querySelectorAll('.payment-link-card').forEach(el=>{if(!card.contains(el))el.style.display='none';});
}
document.addEventListener('click',async e=>{
 const b=e.target.closest?.('[data-swe-copy]');if(b){e.preventDefault();const card=document.getElementById('sweTournamentLinksCard'),url=card?.dataset?.[b.dataset.sweCopy]||'';if(typeof toast==='function')toast(await copyText(url)?'Lien copié ✅':'Impossible de copier le lien.');return;}
 if(e.target?.id==='sweAdminResetPayments'){if(!(typeof isAdmin==='function'&&isAdmin()))return;const t=S.tournaments.find(x=>String(x.id)===String(document.getElementById('sweTournamentLinksCard')?.dataset.tournamentId));if(!t)return;if(!confirm('Réinitialiser toute la feuille de paiement de ce tournoi ?'))return;e.target.disabled=true;const r=await sb.rpc('admin_reset_tournament_payment_sheet',{p_tournament_id:t.id});e.target.disabled=false;if(r.error)return toast(r.error.message);toast('Feuille de paiement réinitialisée ✅');}
},true);
function tick(){window.SWEApplyBuild?.();renderLinks();document.getElementById('paymentDeskReset')?.remove();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});else tick();document.addEventListener('swe:rendered',tick);
})();
;

;
/* SOURCE hotfix-v4231.js */
(()=>{
'use strict';
const COLOR_OPTS=[['#111827','Noir'],['#2563eb','Bleu'],['#f8fafc','Blanc'],['#dc2626','Rouge'],['#16a34a','Vert'],['#eab308','Jaune'],['#f97316','Orange'],['#7c3aed','Violet'],['#ec4899','Rose'],['#78350f','Marron'],['#64748b','Gris']];
const esc31=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function setVersion31(){window.SWEApplyBuild?.();}
function stableMention(team,score,guests){if(guests>2)return 'Trop de Guests pour une note fiable';const n=Number(score||0),pool=n>=4.2?['Très costaud','Ça promet','Gros potentiel']:n>=3.5?['Bien équilibrée','Solide sur le papier','Ça se tient']:['À surveiller','Peut surprendre','Équilibre à confirmer'];const seed=String(team?.id||team?.name||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0);return pool[seed%pool.length]}
function teamGuestCount(team){try{const ids=(S.teamPlayers||[]).filter(tp=>String(tp.team_id)===String(team.id)).map(tp=>String(tp.player_id));return (S.players||[]).filter(p=>ids.includes(String(p.id))&&p.is_group_member===false).length}catch(_){return 0}}
function enhanceTeams(){if(typeof S==='undefined'||!Array.isArray(S.teams))return;document.querySelectorAll('.swe-team-card').forEach((card,i)=>{const team=S.teams[i]||S.teams.find(t=>card.textContent.includes(t.name));if(!team)return;const head=card.querySelector('.swe-team-card-head');if(head){head.querySelectorAll('b').forEach(b=>{if(b.textContent.trim().startsWith('👕'))b.textContent=b.textContent.replace(/^👕\s*/,'')});}
 const guests=teamGuestCount(team),score=(S.teamBalanceScores||[]).find(x=>String(x.team_id)===String(team.id));const badge=card.querySelector('.chien-boul-badge');const mention=card.querySelector('.team-mention');if(badge&&score){badge.textContent=guests>2?'🐶⚽ Note équipe évaluée par Chien Boul Academy : ??':'🐶⚽ Note équipe évaluée par Chien Boul Academy : '+(Number(score.team_score||0)*2).toFixed(1)+'/10';}if(mention&&score)mention.textContent=stableMention(team,score.team_score,guests);
 if(typeof isAdmin==='function'&&isAdmin()&&head&&!head.querySelector('[data-quick-team-color]')){const box=document.createElement('div');box.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap';const sel=document.createElement('select');sel.dataset.quickTeamColor=team.id;sel.style.cssText='max-width:125px;padding:6px 8px';sel.innerHTML=COLOR_OPTS.map(([v,l])=>'<option value="'+v+'" '+(String(team.color||'').toLowerCase()===v?'selected':'')+'>'+l+'</option>').join('');const btn=document.createElement('button');btn.type='button';btn.textContent='Couleur';btn.style.padding='6px 9px';btn.onclick=async e=>{e.stopPropagation();btn.disabled=true;const r=await sb.rpc('admin_update_team_color',{p_team_id:team.id,p_color:sel.value});btn.disabled=false;if(r.error)return toast(r.error.message);team.color=sel.value;renderTeams();toast('Couleur mise à jour ✅')};box.append(sel,btn);head.appendChild(box)}
 card.querySelectorAll('.player').forEach(row=>{[...row.querySelectorAll('*')].forEach(el=>{const txt=el.textContent||'';if((txt.includes('/5')||txt.includes('Moyenne')||txt.includes('Verdict'))&&!el.children.length){el.style.display='block';el.style.marginTop='4px';el.style.lineHeight='1.25'}})});
 });
 document.querySelectorAll('.public-team-card').forEach(card=>{card.querySelectorAll('.public-team-head').forEach(h=>{h.innerHTML=h.innerHTML.replace(/👕\s*/g,'')});const guestCount=[...card.querySelectorAll('.guest-badge,.guest-tag')].filter(x=>/guest/i.test(x.textContent)).length;if(guestCount>2){[...card.querySelectorAll('*')].filter(el=>!el.children.length&&/Note équipe évaluée par Chien Boul Academy/i.test(el.textContent)).forEach(el=>el.textContent='🐶⚽ Note équipe évaluée par Chien Boul Academy : ??')}})}
function splitMatchPlayers(){document.querySelectorAll('.player').forEach(wrap=>{const head=[...wrap.querySelectorAll('b')].find(b=>b.textContent.includes('Joueurs de ce match'));if(!head||wrap.dataset.sweSplit==='1')return;const rows=[...wrap.querySelectorAll('.row.small')].filter(r=>r.querySelector('select'));if(!rows.length)return;wrap.dataset.sweSplit='1';head.textContent='🔄 Joueurs des 2 équipes';const desc=head.parentElement?.querySelector('.muted');if(desc)desc.textContent='Uniquement les joueurs appartenant aux deux équipes de ce match.';const list=rows[0].parentElement;const starters=document.createElement('div');const subs=document.createElement('details');subs.open=false;subs.style.marginTop='10px';subs.innerHTML='<summary style="cursor:pointer;font-weight:900">🟠 Remplaçants du tournoi</summary><div data-swe-subs style="margin-top:6px"></div>';const subBox=subs.querySelector('[data-swe-subs]');rows.forEach(r=>{const sel=r.querySelector('select');(sel&&sel.value?starters:subBox).appendChild(r)});list.innerHTML='';list.appendChild(starters);if(subBox.children.length)list.appendChild(subs)})}
function fixTournamentLinks(){const card=document.getElementById('sweTournamentLinksCard');if(!card)return;card.querySelectorAll('a.button').forEach(a=>{if(a.dataset.fixed31)return;a.dataset.fixed31='1';a.style.cssText='display:inline-flex;align-items:center;justify-content:center;padding:10px 13px;border-radius:12px;border:1px solid #d9e4de;background:#eef3f0;color:#071b12;font-weight:800;text-decoration:none;white-space:nowrap';a.addEventListener('click',e=>{const href=a.getAttribute('href');if(!href||href==='#'){e.preventDefault();return}e.preventDefault();location.href=href})});}
let injuryLoaded=false,injuryBusy=false;
async function ensureInjuryCard(){const dash=document.getElementById('myPlayerDashboard'),view=document.getElementById('view-myplayer');if(!dash||dash.classList.contains('hidden')||!view?.classList.contains('active')||injuryBusy)return;let card=document.getElementById('sweInjuryCard');if(!card){card=document.createElement('div');card.id='sweInjuryCard';card.className='card';card.style.border='1px solid #f0c6c6';dash.insertAdjacentElement('afterbegin',card)}if(injuryLoaded)return;injuryBusy=true;const r=await sb.rpc('get_my_player_unavailability');injuryBusy=false;const st=r.error?null:r.data;const today=new Date().toISOString().slice(0,10);card.innerHTML='<h2 class="sectiontitle">🩹 Mon indisponibilité</h2><p class="muted">Déclare une blessure ou une période d’absence pour informer tes organisateurs.</p>'+(st?'<div class="player" style="background:#fff5f5"><b>Indisponible'+(st.reason==='injury'?' • Blessure':'')+'</b><div class="muted">Du '+esc31(st.unavailable_from)+(st.unavailable_until?' au '+esc31(st.unavailable_until):' • durée indéterminée')+(st.note?' • '+esc31(st.note):'')+'</div></div>':'')+'<div class="grid g2" style="margin-top:10px"><label><span class="muted">Début</span><input id="sweUnavailableFrom" type="date" value="'+esc31(st?.unavailable_from||today)+'"></label><label><span class="muted">Jusqu’au</span><input id="sweUnavailableUntil" type="date" value="'+esc31(st?.unavailable_until||'')+'"></label></div><div class="grid g2" style="margin-top:8px"><select id="sweUnavailableReason"><option value="injury">🩹 Blessure</option><option value="personal">Indisponibilité personnelle</option><option value="other">Autre</option></select><input id="sweUnavailableNote" maxlength="120" placeholder="Précision facultative" value="'+esc31(st?.note||'')+'"></div><div class="row" style="margin-top:9px"><button id="sweSaveUnavailable" class="primary">Enregistrer</button>'+(st?'<button id="sweClearUnavailable">Je suis de nouveau disponible</button>':'')+'</div>';if(st)card.querySelector('#sweUnavailableReason').value=st.reason||'injury';card.querySelector('#sweSaveUnavailable').onclick=async()=>{const from=card.querySelector('#sweUnavailableFrom').value,until=card.querySelector('#sweUnavailableUntil').value||null,reason=card.querySelector('#sweUnavailableReason').value,note=card.querySelector('#sweUnavailableNote').value.trim();const q=await sb.rpc('set_my_player_unavailability',{p_unavailable_from:from,p_unavailable_until:until,p_reason:reason,p_note:note||null});if(q.error)return toast(q.error.message);injuryLoaded=false;toast('Indisponibilité enregistrée ✅');ensureInjuryCard()};card.querySelector('#sweClearUnavailable')?.addEventListener('click',async()=>{const q=await sb.rpc('clear_my_player_unavailability');if(q.error)return toast(q.error.message);injuryLoaded=false;toast('Tu es de nouveau disponible ✅');ensureInjuryCard()});injuryLoaded=true}
function tick31(){setVersion31();enhanceTeams();splitMatchPlayers();fixTournamentLinks();ensureInjuryCard();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick31,{once:true});else tick31();document.addEventListener('swe:rendered',tick31);
})();

;

;
/* SOURCE hotfix-v4232.js */
(()=>{
'use strict';
const esc32=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function hash32(s){let h=0;for(const c of String(s||''))h=((h<<5)-h+c.charCodeAt(0))|0;return Math.abs(h)}
function teamGuestCount(team){if(typeof S==='undefined')return 0;const ids=(S.teamPlayers||[]).filter(x=>String(x.team_id)===String(team.id)).map(x=>String(x.player_id));return (S.players||[]).filter(p=>ids.includes(String(p.id))&&p.is_group_member===false).length}
function teamStyleLabel(team,score){
  const n=Number(score||0), choices=n>=4.25?['Dream team','Très complète','Tournée vers l’attaque']:n>=3.7?['Équilibrée','Tournée vers l’attaque','Équipe qui peut surprendre']:n>=3.15?['Équilibrée','Défensive','Équipe qui peut surprendre']:['Défensive','À surveiller','Équipe qui peut surprendre'];
  return choices[hash32(team?.name)%choices.length];
}
function playerAcademyComment(pl){
  if(pl?.is_group_member===false){const a=['Guest à jauger — joueur à surveiller.','Profil encore mystérieux : méfiance sur le terrain.','Guest à évaluer : possible bonne surprise.'];return '🐶 Chien Boul Academy : '+a[hash32(pl?.name)%a.length];}
  let r=null;try{const a=typeof playerSkillAggregate==='function'?playerSkillAggregate(pl.id):null;r=a&&Number(a.voter_count)>0?Number(a.avg_rating):null}catch(_){r=null}
  const choices=r==null?['Encore à jauger sur le terrain.','Profil à confirmer en match.','Peut surprendre selon le contexte.']:r>=4.2?['Très fiable dans son registre.','Peut faire basculer un match.','Référence à surveiller.']:r>=3.5?['Profil équilibré, à suivre.','Apporte de la stabilité.','Peut faire la différence.']:['Évolution à suivre.','Peut surprendre dans un bon jour.','Profil encore irrégulier.'];
  return '🐶 Chien Boul Academy : '+choices[hash32((pl?.name||'')+String(r))%choices.length];
}
function enhanceTeams(){
  if(typeof S==='undefined')return;
  const cards=[...document.querySelectorAll('#teams .swe-team-card, #teamList .swe-team-card, #view-teams .swe-team-card')];
  cards.forEach((card,i)=>{
    const team=(S.teams||[])[i];if(!team)return;
    const guests=teamGuestCount(team);
    const score=(S.teamBalanceScores||[]).find(x=>String(x.team_id)===String(team.id));
    const badge=card.querySelector('.chien-boul-badge');
    const mention=card.querySelector('.team-mention');
    if(guests>2){if(badge)badge.textContent='🐶⚽ Note équipe évaluée par Chien Boul Academy : ??';if(mention)mention.textContent='Trop de Guests pour une note fiable';}
    else if(mention)mention.textContent=teamStyleLabel(team,score?.team_score);
    const members=(S.teamPlayers||[]).filter(tp=>String(tp.team_id)===String(team.id)).map(tp=>(S.players||[]).find(p=>String(p.id)===String(tp.player_id))).filter(Boolean);
    members.forEach(pl=>{
      const candidates=[...card.querySelectorAll('.player, .team-player, li, .row')];
      const row=candidates.find(el=>el.textContent?.includes(pl.name)&&!el.querySelector('.chien-player-comment'));
      if(row){const c=document.createElement('div');c.className='chien-player-comment';c.style.cssText='font-size:11px;color:#64748b;margin-top:3px;line-height:1.35';c.textContent=playerAcademyComment(pl);const holder=row.querySelector('span:first-child,div:first-child')||row;holder.appendChild(c);}
    });
  });
}
function printTeamsNoPopup(){
  const t=typeof currentTour==='function'?currentTour():null;if(!t||typeof S==='undefined')return typeof toast==='function'&&toast('Choisis d’abord un tournoi.');
  if(!(S.teams||[]).length)return toast('Aucune équipe à exporter.');
  const sections=(S.teams||[]).map(team=>{const bg=typeof sweTeamColor==='function'?sweTeamColor(team):(team.color||'#64748b');const fg=typeof sweTeamTextColor==='function'?sweTeamTextColor(bg):'#fff';const guests=teamGuestCount(team);const score=(S.teamBalanceScores||[]).find(x=>String(x.team_id)===String(team.id));const note=guests>2?'??':(score?(Number(score.team_score||0)*2).toFixed(1)+'/10':'—');const label=guests>2?'Trop de Guests pour une note fiable':teamStyleLabel(team,score?.team_score);const members=(S.teamPlayers||[]).filter(tp=>String(tp.team_id)===String(team.id)).map(tp=>(S.players||[]).find(p=>String(p.id)===String(tp.player_id))).filter(Boolean);return '<section class="team"><header style="background:'+esc32(bg)+';color:'+esc32(fg)+'"><strong>'+esc32(team.name)+'</strong><span>'+esc32(typeof sweTeamColorLabel==='function'?sweTeamColorLabel(team):'')+'</span></header><div class="academy">🐶⚽ Note équipe évaluée par Chien Boul Academy : '+note+' • '+esc32(label)+'</div><ol>'+members.map(pl=>'<li><b>'+esc32(pl.name)+'</b>'+(pl.is_group_member===false?' <small>Guest</small>':'')+'<div class="comment">'+esc32(playerAcademyComment(pl))+'</div></li>').join('')+'</ol></section>'}).join('');
  let subs=[];try{subs=typeof tournamentCommonSubstitutes==='function'?tournamentCommonSubstitutes():[]}catch(_){}
  const html='<!doctype html><html><head><meta charset="utf-8"><title>Équipes SWÉ</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17251f}h1{font-size:24px;margin:0 0 5px}.meta{color:#68756f;margin-bottom:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.team{border:1px solid #dbe3df;border-radius:12px;overflow:hidden;break-inside:avoid}.team header{padding:11px 13px;display:flex;justify-content:space-between;gap:10px}.academy{padding:8px 12px;background:#fff8df;font-size:12px;font-weight:700}.team ol{margin:9px 0 12px;padding-left:34px}.team li{padding:4px 0}.comment{font-size:10px;color:#66756e;margin-top:2px}.subs{margin-top:13px;border:2px dashed #f59e0b;border-radius:12px;padding:10px}.subs span{display:inline-block;margin:3px;padding:5px 8px;border:1px solid #f6c65b;border-radius:999px}</style></head><body><h1>⚽ SWÉ TOURNAMENT — Équipes</h1><div class="meta">'+esc32(t.name||'')+' • '+esc32(t.tournament_date||'')+'</div><div class="grid">'+sections+'</div>'+(subs.length?'<div class="subs"><b>🟠 Remplaçants communs</b><div>'+subs.map(p=>'<span>'+esc32(p.name)+'</span>').join('')+'</div></div>':'')+'</body></html>';
  const old=document.getElementById('swePrintFrame');old?.remove();const iframe=document.createElement('iframe');iframe.id='swePrintFrame';iframe.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';document.body.appendChild(iframe);const d=iframe.contentDocument;d.open();d.write(html);d.close();setTimeout(()=>{try{iframe.contentWindow.focus();iframe.contentWindow.print()}catch(e){toast('Impossible d’ouvrir l’impression PDF.')}setTimeout(()=>iframe.remove(),3000)},300);
}
function bindPdf(){const b=document.getElementById('exportTeamsPdf');if(!b||b.dataset.v4232)return;b.dataset.v4232='1';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();printTeamsNoPopup()},true)}
function ensureLateAdminAdd(){
  if(typeof S==='undefined'||typeof currentTour!=='function'||typeof isAdmin!=='function'||!isAdmin())return;
  const t=currentTour(),view=document.getElementById('view-tournaments');if(!t||!view)return;let box=document.getElementById('sweLateAddPlayer');
  if(t.status==='finished'){box?.remove();return}
  if(!box){box=document.createElement('div');box.id='sweLateAddPlayer';box.className='card';box.style.marginBottom='12px';const links=document.getElementById('sweTournamentLinksCard');(links||view.firstElementChild)?.insertAdjacentElement('afterend',box)}
  const present=new Set((S.tPlayers||[]).filter(x=>x.present&&x.registration_status!=='cancelled').map(x=>String(x.player_id)));const choices=(S.players||[]).filter(p=>p.active!==false&&!present.has(String(p.id))).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  box.innerHTML='<b>➕ Ajouter un joueur jusqu’à la fin du tournoi</b><div class="muted" style="margin:4px 0 8px">L’admin peut encore ajouter un membre même si les inscriptions publiques sont fermées. Si les équipes sont déjà faites, il sera ajouté comme remplaçant commun.</div><div class="row" style="gap:8px;flex-wrap:wrap"><select id="sweLatePlayerSelect" style="flex:1;min-width:220px"><option value="">Choisir un joueur…</option>'+choices.map(p=>'<option value="'+esc32(p.id)+'">'+esc32(p.name)+(p.is_group_member===false?' • Guest':'')+'</option>').join('')+'</select><button id="sweLatePlayerAdd" class="primary" '+(!choices.length?'disabled':'')+'>Ajouter</button></div>';
  box.querySelector('#sweLatePlayerAdd')?.addEventListener('click',async()=>{const id=box.querySelector('#sweLatePlayerSelect')?.value;if(!id)return;const generated=(S.teams||[]).length>0;const payload={tournament_id:t.id,player_id:id,present:true,registration_status:'confirmed',registered_at:new Date().toISOString(),is_substitute:generated};const r=await sb.from('tournament_players').upsert(payload,{onConflict:'tournament_id,player_id'});if(r.error)return toast(r.error.message);toast(generated?'Joueur ajouté comme remplaçant ✅':'Joueur ajouté au tournoi ✅');await loadTournament();renderAll();});
}
function ensurePlayerProfileDetails(){
  if(typeof S==='undefined'||!S.playerDashboard?.profile||!S.session?.user)return;const dash=document.getElementById('myPlayerDashboard'),view=document.getElementById('view-myplayer');if(!dash||!view?.classList.contains('active'))return;let box=document.getElementById('swePlayerPersonalDetails');const p=S.playerDashboard.profile;if(!box){box=document.createElement('div');box.id='swePlayerPersonalDetails';box.className='player';box.style.cssText='margin-top:12px;background:#f8fbff';dash.prepend(box)}
  if(box.dataset.uid===String(S.session.user.id)&&box.dataset.age===String(p.age??'')&&box.dataset.avatar===String(p.avatar_url??''))return;box.dataset.uid=String(S.session.user.id);box.dataset.age=String(p.age??'');box.dataset.avatar=String(p.avatar_url??'');
  box.innerHTML='<div class="row" style="gap:12px;align-items:center;flex-wrap:wrap"><div id="sweAvatarPreview" style="width:72px;height:72px;border-radius:50%;overflow:hidden;background:#e8eef5;display:grid;place-items:center;font-size:28px">'+(p.avatar_url?'<img src="'+esc32(p.avatar_url)+'" alt="Photo profil" style="width:100%;height:100%;object-fit:cover">':'👤')+'</div><div style="flex:1;min-width:220px"><b>👤 Mon profil joueur</b><div class="muted">Ajoute ton âge et une photo pour être plus facilement identifié dans tes groupes.</div></div></div><div class="grid g2" style="margin-top:10px"><label><span class="muted">Âge</span><input id="swePlayerAge" type="number" min="5" max="100" inputmode="numeric" value="'+esc32(p.age??'')+'" placeholder="Ex. 32"></label><label><span class="muted">Photo de profil</span><input id="swePlayerAvatarFile" type="file" accept="image/jpeg,image/png,image/webp"></label></div><div class="row" style="margin-top:10px"><button id="sweSavePlayerDetails" class="primary">Enregistrer mon profil</button></div>';
  box.querySelector('#sweSavePlayerDetails').onclick=async()=>{const btn=box.querySelector('#sweSavePlayerDetails');btn.disabled=true;try{let avatar=p.avatar_url||null;const file=box.querySelector('#swePlayerAvatarFile')?.files?.[0];if(file){if(file.size>5*1024*1024)throw new Error('Photo trop lourde (5 Mo maximum).');const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=S.session.user.id+'/avatar-'+Date.now()+'.'+ext;const up=await sb.storage.from('player-avatars').upload(path,file,{upsert:true,cacheControl:'3600'});if(up.error)throw up.error;avatar=sb.storage.from('player-avatars').getPublicUrl(path).data.publicUrl;}const ageRaw=box.querySelector('#swePlayerAge')?.value;const age=ageRaw?Number(ageRaw):null;const r=await sb.rpc('update_my_player_profile_details',{p_age:age,p_avatar_url:avatar});if(r.error)throw r.error;await loadMyPlayerDashboard();toast('Profil joueur mis à jour ✅')}catch(e){toast(e.message||String(e))}finally{btn.disabled=false}};
}
function fixOpenButtons(){document.querySelectorAll('#sweTournamentLinksCard a.button').forEach(a=>{a.style.cssText='display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border:1px solid #cbd5e1;border-radius:12px;padding:10px 14px;background:#fff;color:#17251f;font-weight:800;min-height:42px'});}
function forceVersion(){window.SWEApplyBuild?.();}
let busy=false;function tick(){if(busy)return;busy=true;requestAnimationFrame(()=>{busy=false;forceVersion();enhanceTeams();bindPdf();ensureLateAdminAdd();ensurePlayerProfileDetails();fixOpenButtons()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});else tick();document.addEventListener('swe:rendered',tick);
})();

;

;
/* SOURCE ui-stability-v4234.js */
(()=>{
'use strict';
let renderDispatchTimer=null;
let lastRenderDispatch=0;
function dispatchRendered(){
  // Le tableau de bord co-gestionnaire possède ses propres données et ses
  // propres mises à jour. Relancer tous les modules après un renderAll y
  // reconstruisait la page entière et créait un clignotement visible.
  if(document.body?.classList.contains('swe-coorg-dashboard4399'))return;
  // Plusieurs modules écoutent cet événement et reconstruisent une partie de
  // la page. On le réserve donc à un vrai renderAll et on regroupe les
  // rendus rapprochés : il ne doit jamais être déclenché par un simple clic.
  if(renderDispatchTimer)clearTimeout(renderDispatchTimer);
  renderDispatchTimer=setTimeout(()=>{
    renderDispatchTimer=null;
    const now=Date.now();
    if(now-lastRenderDispatch<250)return;
    lastRenderDispatch=now;
    document.dispatchEvent(new CustomEvent('swe:rendered'));
  },180);
}
function wrapRenderAll(){
  try{
    if(typeof window.renderAll!=='function'||window.renderAll.__sweStable4234)return;
    const original=window.renderAll;
    const wrapped=function(...args){const out=original.apply(this,args);dispatchRendered();return out;};
    wrapped.__sweStable4234=true;
    window.renderAll=wrapped;
  }catch(_){ }
}
// hotfix-v4244.js owns loading these modules, including their order and cache key.
function boot(){wrapRenderAll();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',wrapRenderAll);
})();

;

;
/* SOURCE hotfix-v4235.js */
(()=>{
'use strict';
const WITHDRAW_REASONS=[
  ['late_withdrawal','Désistement de dernière minute'],
  ['injury','Blessure'],
  ['personal_emergency','Urgence personnelle'],
  ['admin_exclusion','Retrait par l’organisateur'],
  ['registration_error','Erreur d’inscription'],
  ['other','Autre motif']
];
let reliabilityCache={workspace:null,loadedAt:0,rows:[]};
let myReliabilityLoaded=false;
let proOptionsCache=new Map();
let catalogLoaded=false,catalogData=null;
const esc35=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money35=c=>(Number(c||0)/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
function setVersion35(){window.SWEApplyBuild?.();}
function viewActive(id){return document.getElementById(id)?.classList.contains('active')}

function openWithdrawModal(team,pl){
  document.getElementById('sweWithdrawModal')?.remove();
  const ov=document.createElement('div');ov.id='sweWithdrawModal';ov.style.cssText='position:fixed;inset:0;z-index:11000;background:rgba(7,19,34,.72);display:flex;align-items:flex-start;justify-content:center;padding:18px;overflow:auto';
  ov.innerHTML='<div class="card" style="width:min(560px,100%);margin:auto"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:10px"><div><div class="sa-eyebrow">GESTION ÉQUIPE</div><h2 class="sectiontitle" style="margin:3px 0">Retirer '+esc35(pl.name)+'</h2><div class="muted">'+esc35(team.name)+' • le motif sera conservé dans l’historique du joueur.</div></div><button id="sweWithdrawClose">✕</button></div><label style="display:block;margin-top:14px"><span class="muted">Motif obligatoire</span><select id="sweWithdrawReason" style="margin-top:5px"><option value="">Choisir…</option>'+WITHDRAW_REASONS.map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('')+'</select></label><label style="display:block;margin-top:10px"><span class="muted">Précision</span><textarea id="sweWithdrawNote" rows="3" maxlength="240" placeholder="Facultatif, sauf pour Autre motif" style="margin-top:5px"></textarea></label><div class="readonly-note" style="margin-top:10px">⚠️ « Désistement de dernière minute » alimente l’indicateur privé de fiabilité SWÉ. Une blessure ou une urgence personnelle n’est pas comptée comme désistement tardif.</div><div class="row" style="justify-content:flex-end;margin-top:12px"><button id="sweWithdrawCancel">Annuler</button><button id="sweWithdrawSave" class="danger">Retirer le joueur</button></div></div>';
  document.body.appendChild(ov);
  const close=()=>ov.remove();ov.querySelector('#sweWithdrawClose').onclick=close;ov.querySelector('#sweWithdrawCancel').onclick=close;
  ov.querySelector('#sweWithdrawSave').onclick=async()=>{const reason=ov.querySelector('#sweWithdrawReason').value,note=ov.querySelector('#sweWithdrawNote').value.trim();if(!reason)return toast('Choisis le motif du retrait.');if(reason==='other'&&!note)return toast('Précise le motif.');const b=ov.querySelector('#sweWithdrawSave');b.disabled=true;const t=typeof currentTour==='function'?currentTour():null;if(!t){b.disabled=false;return toast('Aucun tournoi sélectionné.')}const r=await sb.rpc('admin_withdraw_player_from_tournament',{p_tournament_id:t.id,p_player_id:pl.id,p_reason:reason,p_note:note||null});if(r.error){b.disabled=false;return toast(r.error.message)}close();reliabilityCache.loadedAt=0;proOptionsCache.delete(String(t.id));toast(reason==='late_withdrawal'?'Désistement tardif enregistré ✅':'Joueur retiré ✅');await loadTournament();renderAll();document.dispatchEvent(new CustomEvent('swe:rendered'));};
}
function enhanceTeamWithdraw(){
  if(typeof S==='undefined'||typeof isAdmin!=='function'||!isAdmin()||!viewActive('view-teams'))return;
  const t=typeof currentTour==='function'?currentTour():null;if(!t||t.status==='finished')return;
  document.querySelectorAll('#view-teams .swe-team-card').forEach((card,i)=>{const team=(S.teams||[])[i]||(S.teams||[]).find(x=>card.textContent.includes(x.name));if(!team)return;const members=(S.teamPlayers||[]).filter(tp=>String(tp.team_id)===String(team.id)).map(tp=>(S.players||[]).find(p=>String(p.id)===String(tp.player_id))).filter(Boolean);members.forEach(pl=>{const rows=[...card.querySelectorAll('.player,li,.row')];const row=rows.find(x=>x.textContent?.includes(pl.name));if(!row||row.querySelector('[data-swe-withdraw="'+pl.id+'"]'))return;const b=document.createElement('button');b.type='button';b.dataset.sweWithdraw=pl.id;b.textContent='Retirer';b.className='danger';b.style.cssText='margin-left:auto;padding:5px 8px;font-size:11px;min-height:32px';b.onclick=e=>{e.preventDefault();e.stopPropagation();openWithdrawModal(team,pl)};row.appendChild(b);});});
}
async function loadReliability(){
  if(typeof S==='undefined'||typeof isAdmin!=='function'||!isAdmin()||!S.workspace?.id||!viewActive('view-players'))return;
  if(reliabilityCache.workspace===S.workspace.id&&Date.now()-reliabilityCache.loadedAt<120000)return applyReliability();
  const r=await sb.rpc('admin_get_workspace_player_reliability',{p_workspace_id:S.workspace.id});if(r.error)return console.warn('reliability',r.error);reliabilityCache={workspace:S.workspace.id,loadedAt:Date.now(),rows:r.data||[]};applyReliability();
}
function applyReliability(){
  if(!viewActive('view-players'))return;const box=document.getElementById('playersList');if(!box)return;
  reliabilityCache.rows.forEach(x=>{const player=(S.players||[]).find(p=>String(p.id)===String(x.player_id));if(!player)return;const cards=[...box.children].filter(c=>c.classList?.contains('player'));const card=cards.find(c=>{const b=c.querySelector(':scope > .row > span:first-child > b');return b&&b.textContent.trim()===String(player.name||'').trim()});if(!card)return;let tag=card.querySelector('[data-reliability="'+x.player_id+'"]');if(!tag){tag=document.createElement('div');tag.dataset.reliability=x.player_id;tag.style.cssText='margin-top:5px;font-size:11px;font-weight:700;color:#7c4a03';card.appendChild(tag)}const n=Number(x.linked_late_withdrawals_12m||0),total=Number(x.linked_late_withdrawals_total||0);tag.textContent=n?('⚠️ Fiabilité SWÉ : '+n+' désistement'+(n>1?'s':'')+' tardif'+(n>1?'s':'')+' sur 12 mois'+(x.public_player_id?' • historique ID SWÉ':' • historique du groupe')):(total?'✓ Aucun désistement tardif sur les 12 derniers mois':'✓ Aucun désistement tardif enregistré');});
}
async function ensureMyReliability(){
  if(myReliabilityLoaded||!viewActive('view-myplayer')||!S?.session)return;const dash=document.getElementById('myPlayerDashboard');if(!dash||dash.classList.contains('hidden'))return;myReliabilityLoaded=true;const r=await sb.rpc('get_my_player_reliability');if(r.error){myReliabilityLoaded=false;return}const d=r.data||{},events=d.events||[];let card=document.getElementById('sweMyReliability');if(!card){card=document.createElement('div');card.id='sweMyReliability';card.className='card';dash.appendChild(card)}card.innerHTML='<h2 class="sectiontitle">🛡️ Ma fiabilité SWÉ</h2><p class="muted">Historique personnel. Les organisateurs ne voient qu’un indicateur privé de fiabilité, jamais les noms de tes autres groupes.</p><div class="player"><b>'+Number(d.late_withdrawals_total||0)+' désistement'+(Number(d.late_withdrawals_total||0)>1?'s':'')+' tardif'+(Number(d.late_withdrawals_total||0)>1?'s':'')+' enregistré'+(Number(d.late_withdrawals_total||0)>1?'s':'')+'</b></div>'+(events.length?'<details style="margin-top:9px"><summary style="cursor:pointer;font-weight:800">Voir mon historique</summary><div style="margin-top:7px">'+events.map(e=>'<div class="player"><b>'+esc35(e.tournament_name||e.tournament_date||'Swé')+'</b><div class="muted">'+esc35(e.tournament_date||'')+(e.note?' • '+esc35(e.note):'')+'</div></div>').join('')+'</div></details>':'');document.dispatchEvent(new CustomEvent('swe:player-ui-ready'));
}

async function ensureProTournamentCard(){
  if(typeof isAdmin!=='function'||!isAdmin()||!viewActive('view-cooler'))return;const t=typeof currentTour==='function'?currentTour():null;if(!t)return;const key=String(t.id);let data=proOptionsCache.get(key);if(!data){const r=await sb.rpc('admin_get_tournament_commercial_options',{p_tournament_id:t.id});if(r.error)return;data=r.data||{};proOptionsCache.set(key,data)}if(data.organizer_type!=='pro')return;const view=document.getElementById('view-cooler');let card=document.getElementById('sweProCommercialCard');if(!card){card=document.createElement('div');card.id='sweProCommercialCard';card.className='card';view.insertAdjacentElement('afterbegin',card)}const rates=data.rates||[],packs=data.packages||[],rate=rates[0]||null;card.innerHTML='<div class="sa-eyebrow">SWÉ PRO</div><h2 class="sectiontitle">🏟️ Offre terrain & 3e mi-temps</h2><p class="muted">Données commerciales privées de ton organisation. Le tarif négocié n’est jamais affiché aux joueurs ni aux autres organisateurs.</p><div class="grid g3" style="margin-top:10px"><div class="player"><span class="muted">Paiement en ligne joueur</span><br><b>'+money35(t.entry_fee_cents)+'</b></div><div class="player"><span class="muted">Paiement sur place joueur</span><br><b>'+money35(t.onsite_entry_fee_cents??t.entry_fee_cents)+'</b></div><div class="player"><span class="muted">Terrain • tarif public</span><br><b>'+(rate?money35(rate.public_booking_price_cents):'À renseigner')+'</b></div></div>'+(rate?.negotiated_booking_price_cents!=null?'<div class="readonly-note" style="margin-top:10px"><b>🔒 Accord privé de ce groupe :</b> '+money35(rate.negotiated_booking_price_cents)+' • cette valeur n’est pas une offre SWÉ Tournament.</div>':'')+(data.third_half_enabled?'<div style="margin-top:12px"><b>🍹 Formules disponibles pour ce complexe</b>'+(packs.length?'<div class="grid g2" style="margin-top:8px">'+packs.map(p=>'<div class="player"><b>'+esc35(p.name)+'</b><div class="muted">'+esc35(p.description||'')+'</div><div style="margin-top:5px"><b>'+money35(p.public_price_cents)+'</b> • '+(p.service_moment==='before'?'Avant match':p.service_moment==='after'?'Après match':'Avant / après')+(p.contains_alcohol?' • 🔞 alcool après le jeu':'')+'</div></div>').join('')+'</div>':'<div class="muted" style="margin-top:6px">Aucune formule publiée par le Super Admin pour ce complexe.</div>')+'</div>':'<div class="readonly-note" style="margin-top:10px">Le module 3e mi-temps Pro n’est pas activé sur cet espace.</div>');
}

function ensureSuperCatalogLauncher(){
  if(!S?.isSuperAdmin)return;const venue=document.getElementById('saVenueList');if(!venue)return;let card=document.getElementById('saCommercialCatalogCard');if(card)return;card=document.createElement('div');card.id='saCommercialCatalogCard';card.className='player';card.style.cssText='margin-top:12px;background:#f8fbff;border:1px solid #c9daf0';card.innerHTML='<div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b>💼 Tarifs & formules des complexes</b><div class="muted">Tarifs publics, accords privés par groupe et formules 3e mi-temps Pro. Aucun tarif négocié n’est public.</div></div><button id="saOpenCommercialCatalog">Gérer</button></div><div id="saCommercialCatalogBody" class="hidden" style="margin-top:12px"></div>';venue.insertAdjacentElement('afterend',card);card.querySelector('#saOpenCommercialCatalog').onclick=async()=>{const body=card.querySelector('#saCommercialCatalogBody');body.classList.toggle('hidden');if(!body.classList.contains('hidden'))await loadCommercialCatalog(body)};
}
async function loadCommercialCatalog(body){
  if(!catalogLoaded){body.innerHTML='<p class="muted">Chargement…</p>';const r=await sb.rpc('super_admin_get_complex_commercial_catalog');if(r.error){body.textContent=r.error.message;return}catalogData=r.data||{rates:[],packages:[]};catalogLoaded=true}renderCommercialCatalog(body);
}
function complexOpts(){return (S.sportsComplexes||[]).map(c=>'<option value="'+c.id+'">'+esc35(c.name)+' • '+esc35(c.city||'')+'</option>').join('')}
function workspaceOpts(){return '<option value="">Aucun accord privé</option>'+(S.superWorkspaces||[]).map(w=>'<option value="'+esc35(w.workspace_id||w.id)+'">'+esc35(w.workspace_name||w.name||w.owner_email||'Espace')+'</option>').join('')}
function renderCommercialCatalog(body){
  const rates=catalogData?.rates||[],packs=catalogData?.packages||[];
  body.innerHTML='<div class="player"><b>🏟️ Ajouter un tarif de réservation</b><div class="grid g3" style="margin-top:8px"><select id="saRateComplex">'+complexOpts()+'</select><select id="saRateDay"><option value="0">Dimanche</option><option value="1">Lundi</option><option value="2">Mardi</option><option value="3">Mercredi</option><option value="4">Jeudi</option><option value="5">Vendredi</option><option value="6">Samedi</option></select><div class="grid g2"><input id="saRateStart" type="time" value="09:00"><input id="saRateEnd" type="time" value="11:00"></div></div><div class="grid g3" style="margin-top:8px"><input id="saRateDuration" type="number" min="30" step="30" value="120" placeholder="Durée min"><input id="saRatePitches" type="number" min="1" value="1" placeholder="Terrains"><input id="saRatePublic" type="number" min="0" step="0.5" placeholder="Tarif public terrain €"></div><div class="grid g2" style="margin-top:8px"><input id="saRateNegotiated" type="number" min="0" step="0.5" placeholder="Tarif négocié privé €"><select id="saRateWorkspace">'+workspaceOpts()+'</select></div><input id="saRateNote" style="margin-top:8px" placeholder="Note interne"><button id="saSaveRate" class="primary" style="margin-top:8px">Enregistrer le tarif</button></div><div class="player" style="margin-top:10px"><b>🍹 Ajouter une formule 3e mi-temps</b><div class="grid g3" style="margin-top:8px"><select id="saPackComplex">'+complexOpts()+'</select><input id="saPackName" placeholder="Nom de la formule"><select id="saPackMoment"><option value="before">Avant match</option><option value="after" selected>Après match</option><option value="both">Avant / après</option></select></div><textarea id="saPackDescription" rows="2" style="margin-top:8px" placeholder="Contenu : eau, jus, seau de bières…"></textarea><div class="grid g3" style="margin-top:8px"><input id="saPackPublic" type="number" min="0" step="0.5" placeholder="Prix public €"><input id="saPackCost" type="number" min="0" step="0.5" placeholder="Coût interne €"><label class="row" style="justify-content:flex-start"><input id="saPackAlcohol" type="checkbox" style="width:auto"> <span>Contient alcool 🔞</span></label></div><button id="saSavePack" class="primary" style="margin-top:8px">Enregistrer la formule</button></div><details style="margin-top:10px"><summary style="cursor:pointer;font-weight:800">Catalogue actuel • '+rates.length+' tarif(s), '+packs.length+' formule(s)</summary><div style="margin-top:8px">'+rates.map(r=>'<div class="player"><b>'+esc35((S.sportsComplexes||[]).find(c=>c.id===r.complex_id)?.name||'Complexe')+' • '+money35(r.public_booking_price_cents)+'</b><div class="muted">'+String(r.start_time||'').slice(0,5)+'-'+String(r.end_time||'').slice(0,5)+' • '+r.duration_minutes+' min • '+r.pitch_count+' terrain(s)'+(r.negotiated_booking_price_cents!=null?' • 🔒 accord privé '+money35(r.negotiated_booking_price_cents):'')+'</div></div>').join('')+packs.map(p=>'<div class="player"><b>'+esc35(p.name)+' • '+money35(p.public_price_cents)+'</b><div class="muted">'+esc35(p.description||'')+(p.contains_alcohol?' • 🔞':'')+'</div></div>').join('')+'</div></details>';
  body.querySelector('#saSaveRate').onclick=async()=>{const pub=Number(body.querySelector('#saRatePublic').value);if(!Number.isFinite(pub))return toast('Indique le tarif public.');const negRaw=body.querySelector('#saRateNegotiated').value;const r=await sb.rpc('super_admin_save_complex_booking_rate',{p_id:null,p_complex_id:body.querySelector('#saRateComplex').value,p_weekday:Number(body.querySelector('#saRateDay').value),p_start_time:body.querySelector('#saRateStart').value||null,p_end_time:body.querySelector('#saRateEnd').value||null,p_duration_minutes:Number(body.querySelector('#saRateDuration').value||120),p_pitch_count:Number(body.querySelector('#saRatePitches').value||1),p_public_booking_price_cents:Math.round(pub*100),p_negotiated_booking_price_cents:negRaw?Math.round(Number(negRaw)*100):null,p_negotiated_workspace_id:body.querySelector('#saRateWorkspace').value||null,p_active:true,p_note:body.querySelector('#saRateNote').value.trim()||null});if(r.error)return toast(r.error.message);catalogLoaded=false;toast('Tarif enregistré ✅');await loadCommercialCatalog(body)};
  body.querySelector('#saSavePack').onclick=async()=>{const price=Number(body.querySelector('#saPackPublic').value),name=body.querySelector('#saPackName').value.trim();if(!name||!Number.isFinite(price))return toast('Nom et prix requis.');const costRaw=body.querySelector('#saPackCost').value;const r=await sb.rpc('super_admin_save_complex_package',{p_id:null,p_complex_id:body.querySelector('#saPackComplex').value,p_name:name,p_description:body.querySelector('#saPackDescription').value.trim()||null,p_service_moment:body.querySelector('#saPackMoment').value,p_public_price_cents:Math.round(price*100),p_internal_cost_cents:costRaw?Math.round(Number(costRaw)*100):null,p_contains_alcohol:body.querySelector('#saPackAlcohol').checked,p_active:true,p_sort_order:100});if(r.error)return toast(r.error.message);catalogLoaded=false;toast('Formule enregistrée ✅');await loadCommercialCatalog(body)};
}

let queued=false;function apply35(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;setVersion35();enhanceTeamWithdraw();ensureSuperCatalogLauncher();if(viewActive('view-players'))loadReliability();if(viewActive('view-myplayer'))ensureMyReliability();if(viewActive('view-cooler'))ensureProTournamentCard();})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply35,{once:true});else apply35();document.addEventListener('swe:rendered',apply35);window.addEventListener('pageshow',()=>setTimeout(apply35,500));
})();

;

;
/* SOURCE hotfix-v4236.js */
(()=>{
'use strict';
function setVersion(){window.SWEApplyBuild?.();}
function resolveContext(btn){
  if(typeof S==='undefined'||typeof currentTour!=='function')return null;
  const card=btn.closest('.swe-team-card,.team');
  const row=btn.closest('.player,li,.row');
  if(!card||!row)return null;
  const team=(S.teams||[]).find(t=>card.textContent?.includes(t.name));
  if(!team)return null;
  const members=(S.teamPlayers||[]).filter(tp=>String(tp.team_id)===String(team.id)).map(tp=>(S.players||[]).find(p=>String(p.id)===String(tp.player_id))).filter(Boolean);
  const pl=members.find(p=>row.textContent?.includes(p.name));
  return pl?{team,pl}:null;
}
function protectLegacyButtons(){
  if(typeof isAdmin!=='function'||!isAdmin())return;
  const view=document.getElementById('view-teams');if(!view)return;
  view.querySelectorAll('button').forEach(b=>{
    const txt=(b.textContent||'').trim();
    if(/^Retirer$/i.test(txt)&&!b.dataset.sweWithdraw){
      b.dataset.sweLegacyRemove='1';
      b.title='Le retrait nécessite maintenant un motif';
    }
    if(b.dataset.sweWithdraw){b.textContent='⚠️ Retirer du tournoi';b.title='Retirer avec motif obligatoire';}
  });
}
document.addEventListener('click',e=>{
  const b=e.target.closest?.('#view-teams button');if(!b)return;
  const txt=(b.textContent||'').trim();
  if(!(b.dataset.sweLegacyRemove==='1'||(/^Retirer$/i.test(txt)&&!b.dataset.sweWithdraw)))return;
  const ctx=resolveContext(b);if(!ctx)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  if(typeof openWithdrawModal==='function')openWithdrawModal(ctx.team,ctx.pl);
  else if(typeof toast==='function')toast('Recharge la page : le retrait motivé est en cours d’activation.');
},true);
function apply(){setVersion();protectLegacyButtons()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
document.addEventListener('swe:rendered',apply);
window.addEventListener('pageshow',apply);
})();

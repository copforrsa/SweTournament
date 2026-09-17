/* SWÉ v4458 — rafraîchissement ciblé des matchs et notifications co-gestionnaires. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const key=()=>`swe-coorg-accepted:${window.S?.workspace?.id||''}`;
  let initializedWorkspace='';

  function acceptedInvites(){
    return (window.S?.invites||[]).filter(i=>i.role==='coorganizer'&&i.accepted_at&&i.id);
  }
  function updateCoorgNotification(){
    if(!window.isAdmin?.()||!window.S?.workspace?.id)return;
    const workspace=String(window.S.workspace.id);
    const ids=acceptedInvites().map(i=>String(i.id));
    if(initializedWorkspace!==workspace){
      initializedWorkspace=workspace;
      const stored=localStorage.getItem(key());
      if(stored===null)localStorage.setItem(key(),JSON.stringify(ids));
    }
    let seen=[];
    try{seen=JSON.parse(localStorage.getItem(key())||'[]')}catch(e){}
    const fresh=ids.filter(id=>!seen.includes(id));
    const badge=$('coorgAcceptedBadge');
    if(badge){
      badge.classList.toggle('hidden',!fresh.length);
      badge.textContent=fresh.length>9?'9+':String(fresh.length);
      badge.style.cssText='margin-left:5px;display:inline-flex;min-width:18px;height:18px;padding:0 5px;align-items:center;justify-content:center;border-radius:999px;background:#e11d48;color:#fff;font-size:11px;font-weight:900;vertical-align:middle';
    }
    if(fresh.length)document.querySelector('.tab[data-view="coorganizers"]')?.setAttribute('title',fresh.length+' nouvelle'+(fresh.length>1?'s':'')+' invitation'+(fresh.length>1?'s':'')+' acceptée'+(fresh.length>1?'s':''));
  }
  function markCoorgNotificationRead(){
    if(!window.S?.workspace?.id)return;
    localStorage.setItem(key(),JSON.stringify(acceptedInvites().map(i=>String(i.id))));
    updateCoorgNotification();
  }
  async function refreshMatches(btn){
    const S=window.S, tournament=window.currentTour?.();
    if(!S||!tournament||!window.sb)return window.toast?.('Choisis d’abord une compétition.');
    const label=btn.textContent;
    btn.disabled=true;btn.textContent='Actualisation…';
    try{
      const tId=tournament.id;
      const [matchesRes,teamsRes,playersRes]=await Promise.all([
        window.sb.from('matches').select('*').eq('tournament_id',tId).order('match_order'),
        window.sb.from('teams').select('*').eq('tournament_id',tId).order('created_at'),
        window.sb.from('tournament_players').select('*').eq('tournament_id',tId)
      ]);
      if(matchesRes.error)throw matchesRes.error;
      if(teamsRes.error)throw teamsRes.error;
      if(playersRes.error)throw playersRes.error;
      S.matches=matchesRes.data||[];S.teams=teamsRes.data||[];S.tPlayers=playersRes.data||[];
      const teamIds=S.teams.map(t=>t.id),matchIds=S.matches.map(m=>m.id);
      const [teamPlayersRes,goalsRes,assignmentsRes]=await Promise.all([
        teamIds.length?window.sb.from('team_players').select('*').in('team_id',teamIds):Promise.resolve({data:[],error:null}),
        matchIds.length?window.sb.from('goals').select('*').in('match_id',matchIds).order('created_at'):Promise.resolve({data:[],error:null}),
        matchIds.length?window.sb.from('match_player_assignments').select('*').in('match_id',matchIds):Promise.resolve({data:[],error:null})
      ]);
      if(teamPlayersRes.error||goalsRes.error||assignmentsRes.error)throw(teamPlayersRes.error||goalsRes.error||assignmentsRes.error);
      S.teamPlayers=teamPlayersRes.data||[];S.goals=goalsRes.data||[];S.matchAssignments=assignmentsRes.data||[];
      window.renderMatches?.();
      window.renderTeams?.();
      window.toast?.('Matchs actualisés ✅');
    }catch(error){
      console.warn('targeted match refresh',error);
      window.toast?.('Actualisation impossible. Réessaie dans un instant.');
    }finally{btn.disabled=false;btn.textContent=label;}
  }
  function installMatchRefresh(){
    const host=$('matchCompetitionSelectorCard');
    if(!host||$('refreshCurrentMatches'))return;
    const row=document.createElement('div');row.style.cssText='display:flex;justify-content:flex-end;margin-top:8px';
    row.innerHTML='<button id="refreshCurrentMatches" type="button" class="secondary" style="padding:6px 10px;font-size:12px" title="Actualiser uniquement les matchs de cette compétition">↻ Actualiser les matchs</button>';
    row.querySelector('button').addEventListener('click',e=>refreshMatches(e.currentTarget));
    host.appendChild(row);
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('.tab[data-view="coorganizers"]'))markCoorgNotificationRead();
  });
  document.addEventListener('swe:rendered',()=>{installMatchRefresh();updateCoorgNotification();});
  const wait=()=>{
    installMatchRefresh();updateCoorgNotification();
    if(!window.S||!window.sb)return setTimeout(wait,250);
  };
  wait();
})();

/* Makes pending team proposals visible without changing registration data. */
(()=>{
  'use strict';
  const URL='https://fbppesfxkvledwjemwsn.supabase.co';
  const KEY='sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp';
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const query=new URLSearchParams(location.search);
  const token=query.get('public');
  const tournamentId=query.get('tournament');
  if(!token||!tournamentId||!window.supabase?.createClient)return;

  const client=window.supabase.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  let proposals=[];
  let renderedKey='';

  function decorateList(){
    const list=$('#publicRegisteredList');
    if(!list||!proposals.length)return;
    list.querySelectorAll('.player.row').forEach(row=>{
      const text=row.textContent||'';
      const proposal=proposals.find(item=>item.status==='pending'&&text.includes(item.playerName));
      if(!proposal||row.querySelector('[data-team-proposal-badge]'))return;
      const target=row.querySelector('span[style*="flex"]')||row.querySelector('span');
      if(!target)return;
      const badge=document.createElement('span');
      badge.dataset.teamProposalBadge='1';
      badge.className='guest-badge';
      badge.style.cssText='display:inline-block;margin:4px 0 0 4px;background:#fff7ed;border-color:#fdba74;color:#9a3412';
      badge.textContent='⏳ Proposition : '+proposal.teamName;
      target.appendChild(badge);
    });
  }

  function renderPanel(){
    const host=$('#registrationTeams')||$('#publicRegistrationCard')||$('#publicRegistration');
    if(!host)return;
    const key=proposals.map(item=>item.teamId+'|'+item.playerId+'|'+item.status).join(',');
    if(renderedKey===key){decorateList();return;}
    renderedKey=key;
    $('#swePendingTeamProposals')?.remove();
    if(!proposals.length)return;
    const grouped=new Map();
    proposals.forEach(item=>{
      const group=grouped.get(item.teamId)||{name:item.teamName,creator:item.creatorName,players:[]};
      group.players.push(item);grouped.set(item.teamId,group);
    });
    const panel=document.createElement('section');
    panel.id='swePendingTeamProposals';
    panel.className='card';
    panel.style.cssText='border:1px solid #f6c76a;background:#fffaf0;margin:14px 0';
    panel.innerHTML='<h2 class="sectiontitle">⏳ Propositions d’équipe à confirmer</h2><p class="muted" style="margin-top:0">Les joueurs concernés doivent sélectionner leur nom ci-dessus pour accepter ou refuser la proposition. Ils restent inscrits tant qu’ils n’ont pas répondu.</p>'+[...grouped.values()].map(group=>
      '<div class="player" style="margin-top:8px"><b>'+esc(group.name)+'</b><div class="muted" style="margin-top:3px">Composition proposée</div><div style="margin-top:6px">'+
        (group.creator?'<span class="guest-badge" style="margin:2px;background:#ecfdf5;border-color:#86efac;color:#166534">✅ '+esc(group.creator)+' · créateur</span>':'')+
        group.players.map(item=>'<span class="guest-badge" style="margin:2px;'+(item.status==='accepted'?'background:#ecfdf5;border-color:#86efac;color:#166534':item.status==='rejected'?'background:#fef2f2;border-color:#fecaca;color:#991b1b':'')+'">'+(item.status==='accepted'?'✅ '+esc(item.playerName)+' · confirmé':item.status==='rejected'?'❌ '+esc(item.playerName)+' · a refusé, place libérée pour l’équipe aléatoire':'⏳ '+esc(item.playerName)+' · en attente')+'</span>').join('')+
      '</div></div>'
    ).join('');
    host.before(panel);
    decorateList();
    // The main registration list can finish its own stable render just after
    // this module. Decorate it once more without observing or rebuilding it.
    setTimeout(decorateList,350);
    setTimeout(decorateList,1200);
  }

  async function load(){
    const result=await client.rpc('get_public_workspace_snapshot',{p_token:token});
    if(result.error)return;
    const snapshot=result.data||{};
    const players=new Map((snapshot.players||[]).map(player=>[String(player.id),player]));
    const teams=new Map((snapshot.teams||[]).map(team=>[String(team.id),team]));
    proposals=(snapshot.team_player_invitations||[])
      .filter(invitation=>String(invitation.tournament_id)===String(tournamentId))
      .map(invitation=>({
        playerId:String(invitation.player_id),
        playerName:players.get(String(invitation.player_id))?.name||'Joueur',
        teamId:String(invitation.team_id),
        teamName:teams.get(String(invitation.team_id))?.name||'Équipe',
        creatorName:players.get(String(invitation.invited_by_player_id))?.name||'',
        status:invitation.status||'pending'
      }));
    renderPanel();
  }

  document.addEventListener('swe:rendered',()=>{renderedKey='';renderPanel();});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(load,350),{once:true});
  if(document.readyState!=='loading')setTimeout(load,350);
})();

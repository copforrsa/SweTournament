/* Keeps the registered-player team action aligned with the real invitation. */
(()=>{
  'use strict';
  const URL='https://fbppesfxkvledwjemwsn.supabase.co';
  const KEY='sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp';
  const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const token=params.get('public'),tournamentId=params.get('tournament');
  if(!token||!tournamentId||!window.supabase?.createClient)return;
  const client=window.supabase.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  let invitation=null,players=new Map(),teams=new Map(),loading=null;
  const teamButton=()=>document.querySelector('[data-registered-action="team"]');
  function paint(){
    const button=teamButton(); if(!button)return;
    const available=!!invitation;
    button.disabled=!available;
    button.title=available?'Ouvrir ta proposition d’équipe':'Aucune proposition d’équipe en attente.';
    button.setAttribute('aria-disabled',String(!available));
    button.style.opacity=available?'1':'.48'; button.style.cursor=available?'pointer':'not-allowed';
  }
  async function load(){
    const pid=$('#publicPlayerSelect')?.value||''; invitation=null; paint();
    if(!pid)return;
    const request=client.rpc('get_public_workspace_snapshot',{p_token:token});loading=request;
    const {data,error}=await request;if(loading!==request||error)return;
    const snapshot=data||{}; players=new Map((snapshot.players||[]).map(p=>[String(p.id),p]));teams=new Map((snapshot.teams||[]).map(t=>[String(t.id),t]));
    invitation=(snapshot.team_player_invitations||[]).find(item=>String(item.tournament_id)===String(tournamentId)&&String(item.player_id)===String(pid)&&item.status==='pending')||null;
    paint();
  }
  function renderProposal(){
    const box=$('#publicTeamInvitationDecision'); if(!box||!invitation)return;
    const team=teams.get(String(invitation.team_id)),captain=players.get(String(invitation.invited_by_player_id));
    box.hidden=false;box.className='player';box.style.display='block';box.style.background='#fff8e8';box.style.border='1px solid #f2d18a';
    box.innerHTML='<b>👥 Ta proposition d’équipe</b><div class="muted" style="margin-top:5px;line-height:1.6"><b>'+esc(captain?.name||'Le capitaine')+'</b> te propose de rejoindre <b>'+esc(team?.name||'cette équipe')+'</b>. Si tu refuses, tu restes inscrit et participeras au tirage en équipe aléatoire.</div><div class="row" style="margin-top:10px"><button type="button" data-proposal-accept class="primary">✅ Accepter l’équipe</button><button type="button" data-proposal-decline>🎲 Refuser / équipe aléatoire</button></div>';
    box.querySelector('[data-proposal-accept]').onclick=()=>respond(true);
    box.querySelector('[data-proposal-decline]').onclick=()=>respond(false);
  }
  async function respond(accept){
    const button=$('[data-proposal-'+(accept?'accept':'decline')+']');if(button)button.disabled=true;
    const pid=$('#publicPlayerSelect')?.value||'';
    const {error}=await client.rpc('public_respond_team_invitation',{p_token:token,p_tournament_id:tournamentId,p_player_id:pid,p_accept:accept});
    if(error){if(button)button.disabled=false;return;}
    location.reload();
  }
  document.addEventListener('change',event=>{if(event.target.id==='publicPlayerSelect')load();});
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-registered-action="team"]');if(!button)return;
    if(!invitation){event.preventDefault();event.stopImmediatePropagation();return;}
    setTimeout(renderProposal,0);
  },true);
  document.addEventListener('swe:rendered',()=>setTimeout(load,120));
  document.addEventListener('DOMContentLoaded',()=>setTimeout(load,500),{once:true});
  if(document.readyState!=='loading')setTimeout(load,500);
})();

/* Public, stable summary of preformed teams and their proposal states. */
(()=>{
  'use strict';
  const URL='https://fbppesfxkvledwjemwsn.supabase.co';
  const KEY='sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp';
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const query=new URLSearchParams(location.search);
  const token=query.get('public'),tournamentId=query.get('tournament');
  if(!token||!tournamentId||!window.supabase?.createClient)return;
  const client=window.supabase.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  let groups=[],renderedKey='';

  function badge(text,style){return '<span class="guest-badge" style="margin:2px;'+(style||'')+'">'+text+'</span>';}
  function decorateList(){
    const list=$('#publicRegisteredList'); if(!list)return;
    list.querySelectorAll('.player.row').forEach(row=>{
      const text=row.textContent||'';
      const captain=groups.find(group=>group.creatorName&&text.includes(group.creatorName));
      const invitation=groups.flatMap(group=>group.invitations.map(item=>({...item,teamName:group.name}))).find(item=>item.status==='pending'&&text.includes(item.name));
      if((!captain&&!invitation)||row.querySelector('[data-team-roster-badge]'))return;
      const target=row.querySelector('span[style*="flex"]')||row.querySelector('span'); if(!target)return;
      const item=document.createElement('span'); item.dataset.teamRosterBadge='1'; item.className='guest-badge';
      if(captain){
        const complete=captain.confirmed.length>=captain.teamSize;
        item.style.cssText='display:inline-block;margin:4px 0 0 4px;'+(complete?'background:#ecfdf5;border-color:#86efac;color:#166534':'background:#eff6ff;border-color:#93c5fd;color:#1d4ed8');
        item.textContent=complete?'⚽ Équipe complète : '+captain.name:'👥 Équipe en préparation : '+captain.confirmed.length+'/'+captain.teamSize;
      }else{
        item.style.cssText='display:inline-block;margin:4px 0 0 4px;background:#fff7ed;border-color:#fdba74;color:#9a3412';
        item.textContent='⏳ Proposition : '+invitation.teamName;
      }
      target.appendChild(item);
    });
  }

  // A refusal frees a slot, but the player is only selected during the final
  // draw.  Make that future slot visible in the actual team card as well as
  // in the proposal summary, without counting it as a confirmed player.
  function decorateTeamCards(){
    document.querySelectorAll('#registrationTeamGrid .sp-team').forEach(card=>{
      const name=card.querySelector('h3')?.textContent?.trim();
      const group=groups.find(item=>item.name===name);
      const refusals=group?.invitations.filter(item=>item.status==='declined'||item.status==='rejected').length||0;
      // The final draw may already have filled the freed slot.  In that case
      // the card must show only the real player, never an obsolete placeholder.
      const randomSlots=group?Math.min(refusals,Math.max(0,group.teamSize-group.confirmed.length)):0;
      if(!randomSlots)return;
      const roster=card.querySelector('ol'); if(!roster)return;
      if(!roster.querySelector('[data-random-team-slot]')){
        for(let index=0;index<randomSlots;index++){
          const slot=document.createElement('li');
          slot.dataset.randomTeamSlot='1';
          slot.style.cssText='border:1px dashed #a78bfa;background:#f5f3ff;color:#5b21b6';
          slot.textContent='🎲 Joueur aléatoire · attribué au tirage final';
          roster.appendChild(slot);
        }
      }
      const strength=card.querySelector('.sp-team-strength');
      if(strength){
        strength.textContent=group.confirmed.length+' / '+group.teamSize+' joueurs confirmés · '+randomSlots+' joueur'+(randomSlots>1?'s':'')+' aléatoire'+(randomSlots>1?'s':'')+' au tirage';
      }
    });
  }

  function decorate(){
    decorateList();
    decorateTeamCards();
  }

  function renderPanel(){
    const host=$('#registrationTeams')||$('#publicRegistrationCard')||$('#publicRegistration'); if(!host)return;
    const key=groups.map(group=>group.id+'|'+group.confirmed.join(',')+'|'+group.invitations.map(item=>item.id+'-'+item.status).join(',')).join(';');
    if(renderedKey===key){decorate();return;} renderedKey=key;
    $('#swePendingTeamProposals')?.remove(); if(!groups.length)return;
    const panel=document.createElement('section'); panel.id='swePendingTeamProposals'; panel.className='card';
    panel.style.cssText='border:1px solid #f6c76a;background:#fffaf0;margin:14px 0';
    panel.innerHTML='<h2 class="sectiontitle">👥 Équipes en préparation</h2><p class="muted" style="margin-top:0">Une équipe est confirmée lorsque ses '+groups[0].teamSize+' joueurs le sont. Au tirage final, un joueur aléatoire sera attribué à chaque place libérée après un refus.</p>'+groups.map(group=>{
      const complete=group.confirmed.length>=group.teamSize;
      const rejected=group.invitations.filter(item=>item.status==='rejected'||item.status==='declined');
      const pending=group.invitations.filter(item=>item.status==='pending');
      const randomSlots=Math.min(rejected.length,Math.max(0,group.teamSize-group.confirmed.length));
      return '<div class="player" style="margin-top:8px"><b>'+esc(group.name)+'</b> '+badge(complete?'✅ Équipe confirmée':'👥 Équipe en préparation · '+group.confirmed.length+'/'+group.teamSize,complete?'background:#ecfdf5;border-color:#86efac;color:#166534':'background:#eff6ff;border-color:#93c5fd;color:#1d4ed8')+
        '<div class="muted" style="margin-top:5px">Composition</div><div style="margin-top:6px">'+
        group.confirmed.map(name=>badge('✅ '+esc(name)+' · confirmé','background:#ecfdf5;border-color:#86efac;color:#166534')).join('')+
        pending.map(item=>badge('⏳ '+esc(item.name)+' · en attente')).join('')+
        rejected.map((item,index)=>badge('❌ '+esc(item.name)+' · a refusé','background:#fef2f2;border-color:#fecaca;color:#991b1b')+(index<randomSlots?badge('🎲 Joueur aléatoire attribué au tirage','background:#f5f3ff;border-color:#c4b5fd;color:#5b21b6'):'' )).join('')+
        '</div></div>';
    }).join('');
    host.before(panel); decorate(); setTimeout(decorate,350); setTimeout(decorate,1200); setTimeout(decorate,2600);
  }

  async function load(){
    const result=await client.rpc('get_public_workspace_snapshot',{p_token:token}); if(result.error)return;
    const snapshot=result.data||{},players=new Map((snapshot.players||[]).map(player=>[String(player.id),player]));
    const tour=(snapshot.tournaments||[]).find(item=>String(item.id)===String(tournamentId))||{};
    const teamSize=Math.max(2,Math.min(11,Number(tour.team_size)||5));
    const rosterByTeam=new Map();
    (snapshot.team_players||[]).forEach(row=>{const list=rosterByTeam.get(String(row.team_id))||[];list.push(String(row.player_id));rosterByTeam.set(String(row.team_id),list);});
    const invitationsByTeam=new Map();
    (snapshot.team_player_invitations||[]).filter(row=>String(row.tournament_id)===String(tournamentId)).forEach(row=>{const list=invitationsByTeam.get(String(row.team_id))||[];list.push(row);invitationsByTeam.set(String(row.team_id),list);});
    groups=(snapshot.teams||[]).filter(team=>String(team.tournament_id)===String(tournamentId)&&team.is_preformed&&team.created_by_player_id).map(team=>{
      const direct=rosterByTeam.get(String(team.id))||[];
      const invitations=invitationsByTeam.get(String(team.id))||[];
      const confirmedIds=new Set(direct);
      invitations.filter(item=>item.status==='accepted').forEach(item=>confirmedIds.add(String(item.player_id)));
      const creatorName=players.get(String(team.created_by_player_id))?.name||'';
      return {id:String(team.id),name:team.name||'Équipe',creatorName,teamSize,confirmed:[...confirmedIds].map(id=>players.get(id)?.name||'Joueur'),invitations:invitations.filter(item=>item.status!=='accepted').map(item=>({id:String(item.id||item.player_id),name:players.get(String(item.player_id))?.name||'Joueur',status:item.status||'pending'}))};
    });
    renderPanel();
  }
  document.addEventListener('swe:rendered',()=>{renderedKey='';renderPanel();});
  // The registered-player list can be expanded after its first render.  Decorate
  // those additional rows once, without observing or rebuilding the page.
  document.addEventListener('click',()=>setTimeout(decorate,80));
  document.addEventListener('DOMContentLoaded',()=>setTimeout(load,350),{once:true});
  if(document.readyState!=='loading')setTimeout(load,350);
})();

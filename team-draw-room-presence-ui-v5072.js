/* SWÉ v50.72 — décompte et suivi des présences/votes dans le salon. */
(()=>{
  'use strict';
  if(window.__SWEDrawRoomPresence5072)return;
  window.__SWEDrawRoomPresence5072=true;
  let tournamentId=null, lastSignature='';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const api=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};
  const room=()=>document.getElementById('sweDrawRoomV2');
  const formatTime=value=>{
    const left=new Date(value||0).getTime()-Date.now();
    if(!Number.isFinite(left)||left<=0)return 'Vote terminé';
    const sec=Math.floor(left/1000),hours=Math.floor(sec/3600),min=Math.floor((sec%3600)/60),seconds=sec%60;
    return hours>0?hours+' h '+String(min).padStart(2,'0')+' min':String(min).padStart(2,'0')+':'+String(seconds).padStart(2,'0');
  };
  function addStyle(){
    if(document.getElementById('sweDrawPresenceStyle5072'))return;
    const style=document.createElement('style');style.id='sweDrawPresenceStyle5072';
    style.textContent='.swe-v2-live-clock{font-variant-numeric:tabular-nums;font-weight:950;color:#b45309}.swe-v2-presence{display:flex!important;align-items:flex-start;justify-content:space-between;gap:8px}.swe-v2-presence small{display:block;margin-top:3px;color:#64748b;font-weight:650}.swe-v2-presence b{font-size:12px;text-align:right}.swe-v2-online{color:#047857}.swe-v2-offline{color:#64748b}.swe-v2-proposal.leader{box-shadow:0 0 0 2px #34d399,0 12px 24px rgba(5,150,105,.12)}';document.head.append(style);
  }
  function updateClock(data){
    room()?.querySelectorAll('.swe-v2-countdown').forEach(node=>{
      node.classList.add('swe-v2-live-clock');node.dataset.sweDeadline=data.deadline||'';node.textContent=formatTime(data.deadline);
    });
  }
  function renderAdmin(data){
    if(!data.can_admin)return;
    const side=room()?.querySelector('.swe-v2-side');if(!side)return;
    const proposal=data.proposals||[];
    const number=id=>proposal.find(item=>String(item.id)===String(id))?.sequence||'—';
    const voters=(data.voters||[]).map(voter=>{
      const status=voter.online?'🟢 Connecté':voter.connected?'⚪ Déconnecté':'⚪ Pas encore connecté';
      const detail=voter.final_choice?'Vote : proposition '+number(voter.final_choice):voter.feedback==='redraw'?'Avis : nouveau tirage demandé':voter.feedback==='keep'?'Avis : garder le tirage':'Vote : en attente';
      return '<div class="swe-v2-voter swe-v2-presence"><span>'+esc(voter.name)+'</span><b class="'+(voter.online?'swe-v2-online':'swe-v2-offline')+'">'+status+'<small>'+esc(detail)+'</small></b></div>';
    }).join('')||'<p class="muted">Mode solo : aucun votant sélectionné.</p>';
    const signature=JSON.stringify(data.voters||[]);
    if(lastSignature===signature)return;
    lastSignature=signature;
    side.innerHTML='<b>Présence et votes</b><p class="muted">Visible uniquement par l’administrateur.</p>'+voters;
  }
  function hideCountsForVoter(data){
    if(data.can_admin)return;
    room()?.querySelectorAll('.swe-v2-proposal-head span').forEach(node=>{
      node.textContent=node.closest('.leader')?'✓ Proposition en tête du vote':'Proposition disponible';
    });
  }
  // The room already loads this server state. Reuse it instead of an extra RPC every second.
  document.addEventListener('swe:draw-room-state',event=>{
    const data=event.detail;
    if(!data||!room())return;
    if(String(tournamentId)!==String(data.tournament_id)){
      tournamentId=data.tournament_id;
      lastSignature='';
    }
    addStyle();
    updateClock(data);
    renderAdmin(data);
    hideCountsForVoter(data);
  });
  // The countdown is a local clock and never touches Supabase.
  setInterval(()=>{
    if(document.visibilityState!=='visible'||!room())return;
    room().querySelectorAll('[data-swe-deadline]').forEach(node=>{
      node.textContent=formatTime(node.dataset.sweDeadline);
    });
  },1000);
})();

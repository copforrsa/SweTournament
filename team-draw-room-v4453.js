/* Private team-draw room: deliberate actions only, no polling or automatic redraw. */
(()=>{
  'use strict';
  const E=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const appState=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
  const isAdminUser=()=>{try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}};
  const api=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};
  const asArray=v=>Array.isArray(v)?v:[];
  const readableDate=v=>{const d=new Date(v||'');return Number.isNaN(d.getTime())?'—':d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})};
  let latest=null, selected=null, opening=false;

  function css(){
    if(E('sweDrawRoomCss4453'))return;
    const style=document.createElement('style');style.id='sweDrawRoomCss4453';
    style.textContent='#sweDrawRoom4453{position:fixed;z-index:10020;inset:0;display:grid;place-items:center;padding:18px;background:rgba(5,20,35,.62)}#sweDrawRoom4453 .swe-room{width:min(1040px,100%);max-height:min(88vh,900px);overflow:auto;background:#f7fbff;border-radius:20px;border:1px solid #bcd3ed;box-shadow:0 22px 65px rgba(2,18,35,.35);padding:22px}#sweDrawRoom4453 .swe-room-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}#sweDrawRoom4453 .swe-room-grid{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:16px;margin-top:16px}#sweDrawRoom4453 .swe-proposal{border:1px solid #c9dceb;border-radius:16px;background:#fff;padding:14px;margin-bottom:12px;cursor:pointer}#sweDrawRoom4453 .swe-proposal.selected{border:2px solid #1472dc;background:#f2f8ff}#sweDrawRoom4453 .swe-teams{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px;margin-top:10px}#sweDrawRoom4453 .swe-team{border-radius:11px;background:#eef5fb;padding:10px}#sweDrawRoom4453 .swe-team b{display:block;margin-bottom:5px}#sweDrawRoom4453 .swe-voters{border-radius:15px;background:#fff;padding:14px;border:1px solid #d5e3ef}#sweDrawRoom4453 .swe-voter{display:flex;justify-content:space-between;gap:7px;padding:8px 0;border-bottom:1px solid #edf1f5}#sweDrawRoom4453 .swe-voter:last-child{border:0}#sweDrawRoom4453 .swe-room-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}#sweDrawRoom4453 .swe-room-note{border-radius:11px;padding:10px 12px;background:#e9f7ef;color:#165a3d;margin-top:12px}#sweDrawRoom4453 .swe-room-error{background:#fff0f1;color:#ab1f32}#sweDrawRoom4453 button{min-height:40px}@media(max-width:720px){#sweDrawRoom4453{padding:8px}#sweDrawRoom4453 .swe-room{padding:15px;border-radius:14px;max-height:94vh}#sweDrawRoom4453 .swe-room-grid{grid-template-columns:1fr}}';
    document.head.append(style);
  }
  function modal(){css();let root=E('sweDrawRoom4453');if(root)return root;root=document.createElement('div');root.id='sweDrawRoom4453';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');document.body.append(root);return root}
  function close(){E('sweDrawRoom4453')?.remove();latest=null;selected=null;}
  async function call(name,args){const client=api();if(!client)throw new Error('Connexion indisponible. Recharge la page puis réessaie.');const {data,error}=await client.rpc(name,args);if(error)throw error;return data}
  function teams(snapshot){return asArray(snapshot?.teams).map(team=>'<div class="swe-team"><b>'+esc(team.name||'Équipe')+'</b><small>'+asArray(team.players).map(p=>esc(p.name)).join(' · ')+'</small></div>').join('')||'<span class="muted">Aucune équipe dans cette proposition.</span>'}
  function render(message='',error=false){
    const root=modal(), state=latest||{}, proposals=asArray(state.proposals), current=selected||state.current_proposal_id||proposals[0]?.id;
    selected=current;
    const deadline=state.deadline?'<div class="muted">⏱ Fin des avis : <b>'+readableDate(state.deadline)+'</b></div>':'<div class="muted">L’administrateur peut publier dès qu’il le souhaite.</div>';
    const proposalHtml=proposals.map(p=>'<article class="swe-proposal '+(p.id===current?'selected':'')+'" data-swe-proposal="'+esc(p.id)+'"><div style="display:flex;justify-content:space-between;gap:8px"><b>Proposition '+esc(p.sequence)+'</b><span class="muted">👍 '+esc(p.keep_votes||0)+' · 🔄 '+esc(p.redraw_votes||0)+'</span></div><div class="swe-teams">'+teams(p.snapshot)+'</div></article>').join('')||'<div class="swe-room-note">La première composition est en préparation. Actualise dans quelques secondes.</div>';
    const voterHtml=asArray(state.voters).map(v=>'<div class="swe-voter"><span>'+esc(v.name)+'</span><b>'+(!v.decision?'En attente':v.decision==='keep'?'Conserver':'Nouveau tirage')+'</b></div>').join('')||'<span class="muted">Aucun co-gestionnaire inscrit n’est éligible à cet avis.</span>';
    const voteActions=state.can_vote?'<button type="button" class="primary" data-swe-vote="keep">👍 Conserver cette proposition</button><button type="button" data-swe-vote="redraw">🔄 Demander un nouveau tirage</button>':'';
    const adminActions=state.can_admin?'<button type="button" data-swe-redraw '+(Number(state.redraws_used||0)>=Number(state.max_redraws||0)?'disabled':'')+'>🎲 Lancer un nouveau tirage</button><button type="button" class="primary" data-swe-publish="'+esc(current||'')+'">✓ Choisir et publier cette composition</button>':'';
    root.innerHTML='<section class="swe-room"><div class="swe-room-head"><div><div style="font-size:11px;letter-spacing:.08em;font-weight:900;color:#1762bf">SALON PRIVÉ DE TIRAGE</div><h2 class="sectiontitle" style="margin:4px 0">🗳️ '+esc(state.tournament_name||'Composition des équipes')+'</h2>'+deadline+'</div><button type="button" aria-label="Fermer" data-swe-close>×</button></div>' +(message?'<div class="swe-room-note '+(error?'swe-room-error':'')+'">'+esc(message)+'</div>':'')+'<div class="swe-room-grid"><div><p class="muted">Les propositions ne sont pas visibles par les joueurs tant que l’administrateur ne les publie pas.</p>'+proposalHtml+'<div class="swe-room-actions">'+voteActions+adminActions+'<button type="button" data-swe-refresh>Actualiser les avis</button></div>'+ (state.can_admin?'<p class="muted" style="margin:10px 0 0">Nouveaux tirages : '+esc(state.redraws_used||0)+' / '+esc(state.max_redraws||0)+'. Les matchs déjà créés bloquent volontairement tout nouveau tirage.</p>':'')+'</div><aside class="swe-voters"><b>Co-gestionnaires inscrits</b><p class="muted" style="margin:5px 0 8px">Leur avis éclaire la décision de l’administrateur.</p>'+voterHtml+'</aside></div></section>';
  }
  async function refresh(tid,open){try{latest=await call(open?'team_draw_room_open_v1':'team_draw_room_state_v1',{p_tournament_id:tid});render()}catch(err){render(err.message||'Le salon ne peut pas être ouvert.',true)}}
  async function open(tid){if(!tid||opening)return;opening=true;latest=null;selected=null;modal().innerHTML='<section class="swe-room"><b>Ouverture du salon…</b></section>';await refresh(tid,isAdminUser());opening=false}
  async function action(button){const root=E('sweDrawRoom4453'), tid=latest?.tournament_id;if(!tid)return;button.disabled=true;try{
    if(button.dataset.sweVote){latest=await call('team_draw_room_vote_v1',{p_tournament_id:tid,p_proposal_id:selected,p_decision:button.dataset.sweVote});render('Ton avis est enregistré.');}
    else if(button.dataset.sweRedraw){latest=await call('team_draw_room_redraw_v1',{p_tournament_id:tid});selected=latest.current_proposal_id;render('Nouvelle proposition créée : les joueurs ne la voient pas encore.');}
    else if(button.dataset.swePublish){await call('team_draw_room_publish_v1',{p_tournament_id:tid,p_proposal_id:button.dataset.swePublish});close();const s=appState();if(s){s.activeTour=tid;s.teamCompetitionId=tid;}Promise.resolve(typeof loadTournament==='function'?loadTournament():null);alert('Composition publiée : les équipes sont maintenant visibles.');}
  }catch(err){render(err.message||'Action impossible.',true)}}
  document.addEventListener('click',event=>{
    const target=event.target.closest?.('[data-swe-open-draw-room],[data-coorg-action="team"],[data-swe-close],[data-swe-proposal],[data-swe-vote],[data-swe-redraw],[data-swe-publish],[data-swe-refresh]');if(!target)return;
    if(target.matches('[data-swe-open-draw-room]')){event.preventDefault();event.stopImmediatePropagation();open(target.dataset.sweOpenDrawRoom);return;}
    if(target.matches('[data-coorg-action="team"]')){const s=appState(),tid=s?.teamCompetitionId||s?.activeTour;if(tid){event.preventDefault();event.stopImmediatePropagation();open(tid)}return;}
    if(target.matches('[data-swe-close]')){close();return;}
    if(target.matches('[data-swe-proposal]')){selected=target.dataset.sweProposal;render();return;}
    if(target.matches('[data-swe-refresh]')){refresh(latest?.tournament_id,false);return;}
    action(target);
  },true);
})();

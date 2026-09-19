/* Private team-draw room: deliberate actions only, isolated readiness updates; no automatic redraw. */
(()=>{
  'use strict';
  const E=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const appState=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
  const isAdminUser=()=>{try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}};
  const api=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};
  const asArray=v=>Array.isArray(v)?v:[];
  const readableDate=v=>{const d=new Date(v||'');return Number.isNaN(d.getTime())?'—':d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})};
  let latest=null, selected=null, opening=false,acting=false,refreshing=false,generation=0,readyState=null,readyBusy=false,readyTimer=null;

  function css(){
    if(E('sweDrawRoomCss4453'))return;
    const style=document.createElement('style');style.id='sweDrawRoomCss4453';
    style.textContent='#sweDrawRoom4453{position:fixed;z-index:10020;inset:0;display:grid;place-items:center;padding:18px;background:rgba(5,20,35,.62)}#sweDrawRoom4453 .swe-room{width:min(1180px,100%);max-height:min(88vh,900px);overflow:auto;background:#f7fbff;border-radius:20px;border:1px solid #bcd3ed;box-shadow:0 22px 65px rgba(2,18,35,.35);padding:22px}#sweDrawRoom4453 .swe-room-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}#sweDrawRoom4453 .swe-room-grid{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:16px;margin-top:16px}#sweDrawRoom4453 .swe-proposal{border:1px solid #c9dceb;border-radius:16px;background:#fff;padding:14px;margin-bottom:12px;cursor:pointer}#sweDrawRoom4453 .swe-proposal.selected{border:2px solid #1472dc;background:#f2f8ff}#sweDrawRoom4453 .swe-teams{display:grid;grid-template-columns:repeat(4,minmax(190px,1fr));gap:9px;margin-top:10px;overflow-x:auto;padding-bottom:4px;align-items:stretch}#sweDrawRoom4453 .swe-team{border-radius:11px;background:#eef5fb;padding:10px;min-height:96px}#sweDrawRoom4453 .swe-team b{display:block;margin-bottom:5px}#sweDrawRoom4453 .swe-voters{border-radius:15px;background:#fff;padding:14px;border:1px solid #d5e3ef}#sweDrawRoom4453 .swe-voter{display:flex;justify-content:space-between;gap:7px;padding:8px 0;border-bottom:1px solid #edf1f5}#sweDrawRoom4453 .swe-voter:last-child{border:0}#sweDrawRoom4453 .swe-room-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}#sweDrawRoom4453 .swe-room-note{border-radius:11px;padding:10px 12px;background:#e9f7ef;color:#165a3d;margin-top:12px}#sweDrawRoom4453 .swe-room-error{background:#fff0f1;color:#ab1f32}#sweDrawRoom4453 .swe-redraw{background:#16834f!important;border-color:#16834f!important;color:#fff!important}#sweDrawRoom4453 button{min-height:40px}@media(max-width:720px){#sweDrawRoom4453{padding:8px}#sweDrawRoom4453 .swe-room{padding:15px;border-radius:14px;max-height:94vh}#sweDrawRoom4453 .swe-room-grid{grid-template-columns:1fr}#sweDrawRoom4453 .swe-teams{grid-template-columns:repeat(4,minmax(175px,1fr))}}';
    style.textContent+=' #sweDrawRoom4453 .swe-teams{grid-template-columns:repeat(auto-fit,minmax(160px,1fr));overflow:visible}#sweDrawRoom4453 .swe-room{box-sizing:border-box;max-width:100%}#sweDrawRoom4453.swe-drawing .swe-room-note{animation:sweShuffle 700ms ease-in-out infinite alternate}#sweDrawRoom4453.swe-drawing [data-swe-redraw]{animation:sweShuffle 700ms ease-in-out infinite alternate}#sweDrawRoom4453.swe-reveal .swe-team{animation:sweReveal 400ms ease-out both}#sweDrawRoom4453.swe-reveal .swe-team:nth-child(2){animation-delay:80ms}#sweDrawRoom4453.swe-reveal .swe-team:nth-child(3){animation-delay:160ms}#sweDrawRoom4453.swe-reveal .swe-team:nth-child(4){animation-delay:240ms}@keyframes sweShuffle{from{transform:translateY(0)}to{transform:translateY(-4px)}}@keyframes sweReveal{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){#sweDrawRoom4453 *{animation:none!important;transition:none!important}}';
    document.head.append(style);
  }
  function modal(){css();let root=E('sweDrawRoom4453');if(root)return root;root=document.createElement('div');root.id='sweDrawRoom4453';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');document.body.append(root);return root}
  function close(){const tid=latest?.tournament_id;clearTimeout(readyTimer);if(tid&&readyState?.mine)call('team_draw_room_ready_v1',{p_tournament_id:tid,p_ready:false}).catch(()=>{});readyState=null;generation++;E('sweDrawRoom4453')?.remove();latest=null;selected=null;document.dispatchEvent(new CustomEvent('swe:draw-room-closed'));}
  async function call(name,args){const client=api();if(!client)throw new Error('Connexion indisponible. Recharge la page puis réessaie.');const {data,error}=await client.rpc(name,args);if(error)throw error;return data}
  function renderReadiness(){
    const host=E('sweRoomReadiness');if(!host)return;
    const data=readyState||{};
    const people=latest?.can_admin?asArray(data.participants).map(p=>'<div><span>'+esc(p.name)+'</span> : <b style="color:'+(p.ready?'#087f5b':'#64748b')+'">'+(p.ready?'● Prêt':'○ Pas prêt')+'</b></div>').join(''):'';
    const html='<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><button type="button" data-swe-ready '+(readyBusy?'disabled':'')+' style="background:'+(data.mine?'#087f5b':'#1762bf')+';color:white" aria-pressed="'+Boolean(data.mine)+'">'+(data.mine?'✓ Prêt — me retirer':'Je suis prêt')+'</button><b style="color:'+(data.admin_ready?'#087f5b':'#64748b')+'">Admin : '+(data.admin_ready?'● Prêt':'○ Pas prêt')+'</b></div><small>Disponibilité déclarée · statut actualisé toutes les 15 secondes.</small>'+people;
    if(host.innerHTML!==html)host.innerHTML=html;
  }
  async function syncReadiness(value=null){
    const tid=latest?.tournament_id,epoch=generation;if(!tid||readyBusy||acting)return;
    readyBusy=true;renderReadiness();
    try{const data=await call('team_draw_room_ready_v1',{p_tournament_id:tid,p_ready:value});if(epoch===generation&&E('sweDrawRoom4453'))readyState=data;}
    catch(err){if(epoch===generation){readyState={...readyState,mine:false,admin_ready:false,participants:[]};const host=E('sweRoomReadiness');if(host)host.title='Statut indisponible : '+(err.message||'connexion interrompue');}}
    finally{readyBusy=false;if(epoch===generation)renderReadiness();}
  }
  function scheduleReadiness(){
    clearTimeout(readyTimer);
    readyTimer=setTimeout(async()=>{if(!E('sweDrawRoom4453'))return;if(document.visibilityState!=='hidden')await syncReadiness(readyState?.mine?true:null);if(E('sweDrawRoom4453'))scheduleReadiness();},15000);
  }
  const rating=v=>Number(v).toFixed(2).replace('.',',');
  function teams(snapshot){return asArray(snapshot?.teams).map(team=>'<div class="swe-team"><b>'+esc(team.name||'Équipe')+'</b>'+(team.average_rating!=null?'<div style="color:#1762bf;font-weight:800">Moyenne : '+rating(team.average_rating)+' / 5</div>':'')+'<small>'+asArray(team.players).map(p=>'<div>'+esc(p.name)+(p.locked?' 🔒':'')+(p.rating_is_estimate?'<span style="display:block;color:#865b12">Invité · estimation 2,5/5</span>':'')+'</div>').join('')+'</small></div>').join('')||'<span class="muted">Aucune équipe dans cette proposition.</span>'}
  function render(message='',error=false){
    const root=modal(),scroll=root.querySelector('.swe-room')?.scrollTop||0, state=latest||{}, proposals=asArray(state.proposals), current=proposals.some(p=>p.id===selected)?selected:state.current_proposal_id||proposals[0]?.id;
    const sequence=proposals.find(p=>p.id===current)?.sequence||'';
    root.classList.remove('swe-reveal');
    selected=current;
    const deadline=state.deadline?'<div class="muted">⏱ Avis attendus avant : <b>'+readableDate(state.deadline)+'</b></div>':'<div class="muted">L’administrateur peut publier dès qu’il le souhaite.</div>';
    const proposalHtml=proposals.map(p=>'<article class="swe-proposal '+(p.id===current?'selected':'')+'" data-swe-proposal="'+esc(p.id)+'"><div style="display:flex;justify-content:space-between;gap:8px"><b>Proposition '+esc(p.sequence)+'</b><span class="muted">👍 '+esc(p.keep_votes||0)+' · 🔄 '+esc(p.redraw_votes||0)+'</span></div><div class="swe-teams">'+teams(p.snapshot)+'</div></article>').join('')||'<div class="swe-room-note">Le salon est prêt. L’administrateur lance le premier tirage ici, quand tout le monde est prêt.</div>';
    const visibleVoters=asArray(state.can_admin?state.voters:[]).map((v,index)=>({v,index})).sort((a,b)=>Number(Boolean(b.v.decision))-Number(Boolean(a.v.decision))||a.index-b.index).map(x=>x.v);
    const voterHtml=visibleVoters.map(v=>'<div class="swe-voter"><span>'+esc(v.name)+'</span><b>'+(!v.decision?'En attente':v.decision==='keep'?'Conserver la proposition '+esc(v.proposal_sequence||''):'Nouveau tirage')+'</b></div>').join('')||'<span class="muted">Aucun co-gestionnaire inscrit n’est éligible à cet avis.</span>';
    const voteActions=state.can_vote&&current?'<button type="button" class="primary" data-swe-vote="keep">👍 Conserver la proposition '+esc(sequence)+'</button><button type="button" data-swe-vote="redraw">🔄 Demander un nouveau tirage</button>':'';
    const adminActions=state.can_admin&&state.first_draw_pending?'<button type="button" class="primary" data-swe-redraw>🎲 Lancer le premier tirage</button>':state.can_admin?'<button type="button" class="swe-redraw" data-swe-redraw '+(Number(state.redraws_used||0)>=Number(state.max_redraws||0)?'disabled':'')+'>🎲 Lancer un nouveau tirage</button><button type="button" class="primary" data-swe-publish="'+esc(current||'')+'">✓ Publier la proposition '+esc(sequence)+'</button>':'';
    const redrawLimit=Math.max(0,Number(state.max_redraws||0)),redrawsUsed=Math.max(0,Number(state.redraws_used||0)),totalDraws=1+redrawLimit;
    const instructions='<section class="swe-room-note" style="background:#eef6ff;color:#123f78"><b>📌 Consignes pour les co-gestionnaires</b><ol style="margin:7px 0 0;padding-left:20px"><li>Clique sur <b>« Je suis prêt »</b> lorsque tu es disponible.</li><li>Attends le premier tirage lancé par l’administrateur.</li><li>Regarde la proposition puis choisis <b>« Conserver »</b> ou <b>« Demander un nouveau tirage »</b>.</li><li>Les joueurs ne voient rien avant la publication finale.</li></ol><small style="display:block;margin-top:7px">'+totalDraws+' propositions possibles : 1 premier tirage + '+redrawLimit+' tirage'+(redrawLimit>1?'s':'')+' supplémentaire'+(redrawLimit>1?'s':'')+'.</small></section>';
    const drawCounter=state.can_admin?'<p class="muted" style="margin:10px 0 0"><b>Tirages supplémentaires utilisés : '+esc(redrawsUsed)+' / '+esc(redrawLimit)+'.</b> Total possible : '+esc(totalDraws)+' propositions. Les matchs déjà créés bloquent volontairement tout nouveau tirage.</p>':'';
    root.innerHTML='<section class="swe-room"><div class="swe-room-head"><div><div style="font-size:11px;letter-spacing:.08em;font-weight:900;color:#1762bf">SALON PRIVÉ DE TIRAGE</div><h2 class="sectiontitle" style="margin:4px 0">🗳️ '+esc(state.tournament_name||'Composition des équipes')+'</h2>'+deadline+'</div><button type="button" aria-label="Fermer" data-swe-close>×</button></div>' +(message?'<div class="swe-room-note '+(error?'swe-room-error':'')+'">'+esc(message)+'</div>':'')+instructions+'<div class="swe-room-grid"><div><p class="muted">Les propositions ne sont pas visibles par les joueurs tant que l’administrateur ne les publie pas.</p>'+proposalHtml+'<div class="swe-room-actions">'+voteActions+adminActions+'<button type="button" data-swe-refresh-teams>↻ Actualiser les équipes</button><button type="button" data-swe-refresh>Actualiser les avis</button></div>'+drawCounter+'</div><aside class="swe-voters"><b>'+(state.can_admin?'Co-gestionnaires inscrits':'Avis anonymes')+'</b><p class="muted" style="margin:5px 0 8px">Les totaux figurent sur chaque proposition.</p>'+(state.can_admin?voterHtml:'<p>Les identités des votants sont réservées à l’administrateur.</p>')+'</aside></div></section>';
    const ready=document.createElement('div');ready.id='sweRoomReadiness';ready.className='swe-room-note';root.querySelector('.swe-room-head').after(ready);renderReadiness();
    root.querySelector('.swe-room').scrollTop=scroll;
    if(state.my_final_choice){const n=document.createElement('p');n.className='swe-room-note';n.textContent='Ton choix enregistré : '+(state.my_final_choice.decision==='keep'?'conserver la proposition '+state.my_final_choice.sequence:'demander un nouveau tirage')+'. Tu peux modifier ce choix avant publication.';root.querySelector('.swe-room-actions').before(n);}
  }
  async function refresh(tid,initial=false){if(!tid||refreshing||acting)return;refreshing=true;const epoch=generation;try{const data=await call(initial?(isAdminUser()?'team_draw_room_open_v1':'team_draw_room_join_v1'):'team_draw_room_state_v1',{p_tournament_id:tid});if(epoch!==generation||!E('sweDrawRoom4453'))return;latest=data;render()}catch(err){if(epoch===generation&&E('sweDrawRoom4453'))render(err.message||'Le salon ne peut pas être ouvert.',true)}finally{refreshing=false}}
  async function open(tid){if(!tid||opening||refreshing)return;generation++;opening=true;latest=null;selected=null;modal().innerHTML='<section class="swe-room"><b>Ouverture du salon…</b></section>';readyState=null;await refresh(tid,true);opening=false;if(E('sweDrawRoom4453')){syncReadiness();scheduleReadiness()}}
  async function action(button){const root=E('sweDrawRoom4453'), tid=latest?.tournament_id;if(!tid||acting||refreshing)return;acting=true;root?.querySelectorAll('button').forEach(b=>b.disabled=true);try{
    if(button.dataset.sweVote){latest=await call('team_draw_room_vote_v1',{p_tournament_id:tid,p_proposal_id:selected,p_decision:button.dataset.sweVote});render('Ton avis est enregistré.');}
    else if(button.hasAttribute('data-swe-redraw')){button.textContent='🎲 Composition des équipes…';root.classList.add('swe-drawing');root.setAttribute('aria-busy','true');latest=await call('team_draw_room_redraw_v1',{p_tournament_id:tid});selected=latest.current_proposal_id;render('Proposition créée : les joueurs ne la voient pas encore.');root.classList.add('swe-reveal');}
    else if(button.dataset.swePublish){await call('team_draw_room_publish_v1',{p_tournament_id:tid,p_proposal_id:button.dataset.swePublish});close();const s=appState();if(s){s.activeTour=tid;s.teamCompetitionId=tid;}Promise.resolve(typeof loadTournament==='function'?loadTournament():null);alert('Composition publiée : les équipes sont maintenant visibles.');}
  }catch(err){render(err.message||'Action impossible.',true)}finally{acting=false;root?.classList.remove('swe-drawing');root?.removeAttribute('aria-busy')}}
  document.addEventListener('click',event=>{
    const target=event.target.closest?.('[data-swe-open-draw-room],[data-coorg-action="team"],[data-swe-close],[data-swe-ready],[data-swe-proposal],[data-swe-vote],[data-swe-redraw],[data-swe-publish],[data-swe-refresh],[data-swe-refresh-teams],#smartAutoTeams,#applyTeamRedraw');if(!target)return;
    if(target.matches('#smartAutoTeams,#applyTeamRedraw')){const s=appState(),t=(s?.tournaments||[]).find(x=>String(x.id)===String(s?.teamCompetitionId||s?.activeTour));if(t?.draw_room_first_enabled){event.preventDefault();event.stopImmediatePropagation();open(t.id)}return;}
    if(acting||(refreshing&&!target.matches('[data-swe-close]'))){event.preventDefault();event.stopImmediatePropagation();return;}
    if(target.matches('[data-swe-open-draw-room]')){event.preventDefault();event.stopImmediatePropagation();open(target.dataset.sweOpenDrawRoom);return;}
    if(target.matches('[data-coorg-action="team"]')){const s=appState(),tid=s?.teamCompetitionId||s?.activeTour;if(tid){event.preventDefault();event.stopImmediatePropagation();open(tid)}return;}
    if(target.matches('[data-swe-close]')){close();return;}
    if(target.matches('[data-swe-ready]')){event.preventDefault();event.stopImmediatePropagation();syncReadiness(!readyState?.mine);return;}
    if(target.matches('[data-swe-proposal]')){selected=target.dataset.sweProposal;render();return;}
    if(target.matches('[data-swe-refresh],[data-swe-refresh-teams]')){event.preventDefault();event.stopImmediatePropagation();refresh(latest?.tournament_id);return;}
    event.preventDefault();event.stopImmediatePropagation();action(target);
  },true);
  try{const original=userIsEditing;userIsEditing=function(){return !!E('sweDrawRoom4453')||original.apply(this,arguments)}}catch(_){}
  function lockGenerator(){
    const s=appState(),t=(s?.tournaments||[]).find(x=>String(x.id)===String(s?.teamCompetitionId||s?.activeTour));
    const button=E('smartAutoTeams');
    if(!button||!t)return;
    const locked=['pending','redraw_requested'].includes(String(t.team_review_status||''));
    if(t.draw_room_first_enabled&&t.status!=='finished'){button.disabled=false;button.title='Le tirage se déroule dans le salon privé.';button.textContent='🎲 Ouvrir le salon de tirage';return;}
    if(locked){button.disabled=true;button.title='Le vote sur le tirage est en cours.';button.textContent='🗳️ Vote sur le tirage en cours';}
  }
  ['DOMContentLoaded','swe:rendered','swe:page-view'].forEach(name=>document.addEventListener(name,()=>setTimeout(lockGenerator,0)));
  setTimeout(lockGenerator,700);
})();

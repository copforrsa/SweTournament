/*
 * Salon de validation des équipes — v2
 * Ce fichier remplace les anciennes entrées de salon. Le serveur reste
 * l'autorité : votants choisis, délai d'une heure et maximum de 5 propositions.
 */
(()=>{
  'use strict';

  const E=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const list=value=>Array.isArray(value)?value:[];
  const appState=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
  const client=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};
  const isAdminUser=()=>{try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}};
  const isCoorgUser=()=>{try{return typeof isCoorg==='function'&&isCoorg()}catch(_){return false}};
  const roomIsActive=t=>Boolean(t?.draw_room_first_enabled)&&['pending','redraw_requested'].includes(String(t?.team_review_status||''));
  const readableDate=value=>{const date=new Date(value||'');return Number.isNaN(date.getTime())?'—':date.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});};

  let latest=null;
  let setupTournamentId=null;
  let selectedProposalId=null;
  let busy=false;
  let refreshTimer=0;
  let mountTimer=0;
  let directLinkDone=false;
  let coorgMountBusy=false;
  const accessCache=new Map();

  async function rpc(name,args){
    const api=client();
    if(!api)throw new Error('Connexion indisponible. Recharge la page puis réessaie.');
    const {data,error}=await api.rpc(name,args);
    if(error)throw error;
    return data;
  }

  function ensureStyle(){
    if(E('sweDrawRoomV2Style'))return;
    const style=document.createElement('style');
    style.id='sweDrawRoomV2Style';
    style.textContent=`
      #sweDrawRoomV2{position:fixed;z-index:10050;inset:0;display:grid;place-items:center;padding:16px;background:rgba(5,20,35,.66)}
      #sweDrawRoomV2 *{box-sizing:border-box}#sweDrawRoomV2 .swe-v2-shell{width:min(1180px,100%);max-height:min(90vh,920px);overflow:auto;background:#f7fbff;border:1px solid #bcd3ed;border-radius:20px;box-shadow:0 25px 70px rgba(2,18,35,.36);padding:22px}
      #sweDrawRoomV2 .swe-v2-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}#sweDrawRoomV2 h2{margin:4px 0;font-size:24px}#sweDrawRoomV2 .swe-v2-kicker{font-size:11px;letter-spacing:.09em;font-weight:900;color:#1d4ed8}
      #sweDrawRoomV2 .swe-v2-close{border:0;border-radius:10px;background:#e8eff6;color:#183551;font-size:26px;line-height:34px;width:36px;height:36px;cursor:pointer}
      #sweDrawRoomV2 .swe-v2-note{border-radius:12px;padding:12px 14px;background:#eef6ff;color:#163f75;margin:13px 0}#sweDrawRoomV2 .swe-v2-note.error{background:#fff0f1;color:#a51f33}#sweDrawRoomV2 .swe-v2-note.success{background:#e9f8ef;color:#12613e}
      #sweDrawRoomV2 .swe-v2-grid{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:16px;margin-top:16px}#sweDrawRoomV2 .swe-v2-proposal{border:1px solid #c9dceb;border-radius:16px;background:#fff;padding:14px;margin-bottom:12px;cursor:pointer}#sweDrawRoomV2 .swe-v2-proposal.selected{border:2px solid #1d72dc;background:#f2f8ff}
      #sweDrawRoomV2 .swe-v2-proposal-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}#sweDrawRoomV2 .swe-v2-teams{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:9px;margin-top:11px}#sweDrawRoomV2 .swe-v2-team{border-radius:11px;background:#eef5fb;padding:10px;min-height:84px}#sweDrawRoomV2 .swe-v2-team b{display:block;margin-bottom:5px}
      #sweDrawRoomV2 .swe-v2-side{border:1px solid #d5e3ef;background:#fff;border-radius:15px;padding:14px;height:max-content}#sweDrawRoomV2 .swe-v2-voter{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #edf1f5;font-size:13px}#sweDrawRoomV2 .swe-v2-voter:last-child{border:0}
      #sweDrawRoomV2 .swe-v2-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}#sweDrawRoomV2 button{min-height:40px;cursor:pointer}#sweDrawRoomV2 button.primary{background:#1762bf;color:#fff;border-color:#1762bf}#sweDrawRoomV2 button.swe-v2-redraw{background:#16834f;color:#fff;border-color:#16834f}#sweDrawRoomV2 button:disabled{opacity:.55;cursor:not-allowed}
      #sweDrawRoomV2 .swe-v2-setup-list{display:grid;gap:8px;margin:14px 0}#sweDrawRoomV2 .swe-v2-voter-choice{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fff;border:1px solid #d7e3ef;border-radius:11px}#sweDrawRoomV2 .swe-v2-voter-choice input{width:18px;height:18px}#sweDrawRoomV2 .swe-v2-voter-choice small{color:#64748b;margin-left:auto}
      #sweDrawRoomV2 .swe-v2-progress{display:flex;gap:6px;margin:12px 0 0}#sweDrawRoomV2 .swe-v2-progress i{height:7px;flex:1;border-radius:999px;background:#dce9f7}#sweDrawRoomV2 .swe-v2-progress i.on{background:#1d72dc}#sweDrawRoomV2 .swe-v2-countdown{font-weight:800;color:#1259af}
      @media(max-width:760px){#sweDrawRoomV2{padding:8px}#sweDrawRoomV2 .swe-v2-shell{padding:15px;border-radius:14px;max-height:94vh}#sweDrawRoomV2 .swe-v2-grid{grid-template-columns:1fr}#sweDrawRoomV2 h2{font-size:20px}}
    `;
    document.head.append(style);
  }

  function modal(){
    ensureStyle();
    let root=E('sweDrawRoomV2');
    if(root)return root;
    root=document.createElement('div');
    root.id='sweDrawRoomV2';
    root.setAttribute('role','dialog');
    root.setAttribute('aria-modal','true');
    document.body.append(root);
    return root;
  }

  function close(){
    clearTimeout(refreshTimer);
    latest=null;
    selectedProposalId=null;
    E('sweDrawRoomV2')?.remove();
  }

  function tournament(id){
    return (appState()?.tournaments||[]).find(item=>String(item.id)===String(id))||null;
  }

  function teamHtml(snapshot){
    return list(snapshot?.teams).map(team=>{
      const average=team.average_rating==null?'':'<div style="font-weight:800;color:#1762bf">Moyenne : '+esc(Number(team.average_rating).toFixed(2).replace('.',','))+' / 5</div>';
      const players=list(team.players).map(player=>'<div>'+esc(player.name)+(player.locked?' 🔒':'')+'</div>').join('');
      return '<div class="swe-v2-team"><b>'+esc(team.name||'Équipe')+'</b>'+average+'<small>'+players+'</small></div>';
    }).join('')||'<span class="muted">Aucune équipe dans cette proposition.</span>';
  }

  function proposalNumber(data,id){
    return list(data?.proposals).find(proposal=>String(proposal.id)===String(id))?.sequence||'—';
  }

  function renderSetup(setup,message='',isError=false){
    setupTournamentId=setup?.tournament_id||null;
    const root=modal();
    const voters=list(setup?.voters);
    const ready=Boolean(setup?.can_start);
    const teamsExist=Boolean(setup?.has_generated_teams);
    const voterRows=voters.map(voter=>'<label class="swe-v2-voter-choice"><input data-swe-v2-voter type="checkbox" value="'+esc(voter.user_id)+'" '+(voter.selected&&voter.registered?'checked':'')+' '+(!voter.registered?'disabled':'')+'><span><b>'+esc(voter.name||'Co-gestionnaire')+'</b></span><small>'+((voter.registered?'Inscrit · précoché':'Non inscrit · ne peut pas voter'))+'</small></label>').join('')||'<p class="muted">Aucun co-gestionnaire à sélectionner. Tu peux utiliser le mode solo.</p>';
    const condition=ready?'<div class="swe-v2-note success"><b>Conditions réunies :</b> '+esc(setup.confirmed_players)+' / '+esc(setup.max_players)+' inscrits. L’ouverture fermera les inscriptions et démarrera le délai d’une heure.</div>':'<div class="swe-v2-note"><b>Salon en attente :</b> '+esc(setup.confirmed_players)+' / '+esc(setup.max_players)+' inscrits. Il pourra s’ouvrir lorsque le quota sera atteint ou après fermeture des inscriptions.</div>';
    const existing=teamsExist?'<div class="swe-v2-note error">Une composition existe encore. Annule la création des équipes avant de recommencer le salon.</div>':'';
    root.innerHTML='<section class="swe-v2-shell"><div class="swe-v2-head"><div><div class="swe-v2-kicker">SALON DE VALIDATION DES ÉQUIPES</div><h2>🗳️ Préparer '+esc(setup?.tournament_name||'le tournoi')+'</h2><p class="muted">Choisis les co-gestionnaires qui voteront. Les personnes déjà inscrites sont précochées ; décoche tout pour le mode solo.</p></div><button class="swe-v2-close" type="button" data-swe-v2-close aria-label="Fermer">×</button></div>' +(message?'<div class="swe-v2-note '+(isError?'error':'success')+'">'+esc(message)+'</div>':'')+condition+existing+'<div class="swe-v2-setup-list">'+voterRows+'</div><div class="swe-v2-note"><b>Règles appliquées :</b> 1 h de vote, jusqu’à 5 propositions. Avant la cinquième, les votants peuvent demander un nouveau tirage ; à la cinquième, ils choisissent une proposition.</div><div class="swe-v2-actions"><button type="button" class="primary" data-swe-v2-start '+((!ready||teamsExist)?'disabled':'')+'>Ouvrir le salon de validation →</button></div></section>';
  }

  function renderRoom(data,message='',isError=false){
    latest=data;
    const root=modal();
    const proposals=list(data.proposals);
    const defaultSelection=data.my_final_choice||data.final_vote_leader_id||data.current_proposal_id||proposals[proposals.length-1]?.id||null;
    if(!proposals.some(proposal=>String(proposal.id)===String(selectedProposalId)))selectedProposalId=defaultSelection;
    const currentNumber=proposalNumber(data,data.current_proposal_id);
    const selectedNumber=proposalNumber(data,selectedProposalId);
    const isFinal=data.room_phase==='final_choice';
    const isSolo=data.room_phase==='solo';
    const deadline=data.deadline?readableDate(data.deadline):'—';
    const deadlineLine=isSolo?'<div class="swe-v2-note success"><b>Mode solo :</b> tu peux générer jusqu’à cinq propositions, puis publier celle de ton choix.</div>':data.expired?'<div class="swe-v2-note"><b>Fenêtre de vote terminée.</b> L’administrateur peut publier la composition retenue.</div>':'<div class="swe-v2-note"><b>Fenêtre de vote :</b> jusqu’au <span class="swe-v2-countdown">'+esc(deadline)+'</span>. Les équipes restent invisibles des joueurs jusque-là.</div>';
    const progress='<div class="swe-v2-progress" aria-label="'+esc(proposals.length)+' propositions sur 5">'+[1,2,3,4,5].map(step=>'<i class="'+(step<=proposals.length?'on':'')+'"></i>').join('')+'</div><small>'+esc(proposals.length)+' / 5 propositions</small>';
    const cards=proposals.map(proposal=>{
      const selected=String(proposal.id)===String(selectedProposalId);
      const current=String(proposal.id)===String(data.current_proposal_id);
      const feedback=isFinal?'🏁 '+esc(proposal.final_votes||0)+' choix':'👍 '+esc(proposal.keep_votes||0)+' · 🔄 '+esc(proposal.redraw_votes||0);
      const voteButton=data.can_vote&&!data.expired&&isFinal?'<button type="button" class="'+(String(data.my_final_choice)===String(proposal.id)?'primary':'')+'" data-swe-v2-select="'+esc(proposal.id)+'">'+(String(data.my_final_choice)===String(proposal.id)?'✓ Mon choix':'Choisir cette proposition')+'</button>':'';
      return '<article class="swe-v2-proposal '+(selected?'selected':'')+'" data-swe-v2-proposal="'+esc(proposal.id)+'"><div class="swe-v2-proposal-head"><b>Proposition '+esc(proposal.sequence)+(current?' · en cours':'')+'</b><span class="muted">'+feedback+'</span></div><div class="swe-v2-teams">'+teamHtml(proposal.snapshot)+'</div>'+voteButton+'</article>';
    }).join('')||'<div class="swe-v2-note">Le salon est ouvert. L’administrateur peut lancer la première proposition.</div>';
    const feedbackActions=data.can_vote&&!data.expired&&!isFinal&&data.current_proposal_id?'<div class="swe-v2-actions"><button type="button" class="'+(data.my_feedback==='keep'?'primary':'')+'" data-swe-v2-feedback="keep">👍 Conserver la proposition '+esc(currentNumber)+'</button><button type="button" class="'+(data.my_feedback==='redraw'?'swe-v2-redraw':'')+'" data-swe-v2-feedback="redraw">🔄 Demander une nouvelle proposition</button></div>':'';
    let adminActions='';
    if(data.can_admin){
      if(data.first_draw_pending)adminActions+='<button type="button" class="primary" data-swe-v2-generate>🎲 Lancer la proposition 1</button>';
      else if(data.can_generate)adminActions+='<button type="button" class="swe-v2-redraw" data-swe-v2-generate>🎲 Générer la proposition '+esc(Number(data.proposal_count)+1)+'</button>';
      else if(!data.expired&&Number(data.proposal_count)<5&&!isSolo)adminActions+='<span class="muted">Une demande de nouveau tirage est nécessaire pour créer la proposition suivante.</span>';
      if(data.can_publish&&selectedProposalId)adminActions+='<button type="button" class="primary" data-swe-v2-publish="'+esc(selectedProposalId)+'">✓ Publier la proposition '+esc(selectedNumber)+'</button>';
    }
    const byId=id=>proposalNumber(data,id);
    const voters=list(data.voters).map(voter=>'<div class="swe-v2-voter"><span>'+esc(voter.name)+'</span><b>'+ (isFinal?(voter.final_choice?'Proposition '+esc(byId(voter.final_choice)):'En attente'):(voter.feedback==='keep'?'Conserver':voter.feedback==='redraw'?'Nouveau tirage':'En attente'))+'</b></div>').join('')||'<p class="muted">Mode solo : aucun votant sélectionné.</p>';
    const sideTitle=data.can_admin?'Votants sélectionnés':'Ton accès au salon';
    const phaseText=isFinal?'<div class="swe-v2-note"><b>Vote final :</b> la cinquième proposition est atteinte. Les votants choisissent une seule des cinq compositions.</div>':'';
    root.innerHTML='<section class="swe-v2-shell"><div class="swe-v2-head"><div><div class="swe-v2-kicker">SALON DE VALIDATION DES ÉQUIPES</div><h2>🗳️ '+esc(data.tournament_name||'Composition des équipes')+'</h2>'+progress+'</div><button class="swe-v2-close" type="button" data-swe-v2-close aria-label="Fermer">×</button></div>'+(message?'<div class="swe-v2-note '+(isError?'error':'success')+'">'+esc(message)+'</div>':'')+deadlineLine+phaseText+'<div class="swe-v2-grid"><div>'+cards+feedbackActions+'<div class="swe-v2-actions">'+adminActions+'<button type="button" data-swe-v2-refresh>↻ Actualiser</button></div></div><aside class="swe-v2-side"><b>'+esc(sideTitle)+'</b><p class="muted">'+(isFinal?'Choix final visible à l’administrateur.':'Les avis concernent la proposition en cours.')+'</p>'+voters+'</aside></div></section>';
    scheduleRefresh();
  }

  function showError(title,error){
    const root=modal();
    root.innerHTML='<section class="swe-v2-shell"><div class="swe-v2-head"><div><div class="swe-v2-kicker">SALON DE VALIDATION</div><h2>'+esc(title)+'</h2></div><button class="swe-v2-close" type="button" data-swe-v2-close aria-label="Fermer">×</button></div><div class="swe-v2-note error">'+esc(error?.message||error||'Action impossible.')+'</div></section>';
  }

  async function refreshRoom(message='',isError=false){
    if(!latest?.tournament_id)return;
    try{renderRoom(await rpc('team_draw_room_state_v2',{p_tournament_id:latest.tournament_id}),message,isError);}
    catch(error){showError('Salon indisponible',error);}
  }

  function scheduleRefresh(){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(()=>{if(E('sweDrawRoomV2')&&!busy&&latest?.tournament_id)refreshRoom();},15000);
  }

  async function openRoom(tournamentId){
    if(!tournamentId||busy)return;
    busy=true;
    modal().innerHTML='<section class="swe-v2-shell"><b>Ouverture du salon…</b></section>';
    try{
      const t=tournament(tournamentId);
      if(isAdminUser()&&(!t||roomIsActive(t))){
        try{renderRoom(await rpc('team_draw_room_state_v2',{p_tournament_id:tournamentId}));return;}
        catch(error){if(t&&roomIsActive(t))throw error;}
      }
      if(isAdminUser())renderSetup(await rpc('team_draw_room_setup_v2',{p_tournament_id:tournamentId}));
      else renderRoom(await rpc('team_draw_room_state_v2',{p_tournament_id:tournamentId}));
    }catch(error){showError('Salon indisponible',error);}
    finally{busy=false;}
  }

  async function handleAction(target){
    if(target.matches('[data-swe-v2-close]')){close();return;}
    if(target.matches('[data-swe-v2-proposal]')){selectedProposalId=target.dataset.sweV2Proposal;renderRoom(latest);return;}
    if(target.matches('[data-swe-v2-open]')){await openRoom(target.dataset.sweV2Open);return;}
    if(busy)return;
    busy=true;
    try{
      if(target.matches('[data-swe-v2-start]')){
        const ids=[...document.querySelectorAll('#sweDrawRoomV2 [data-swe-v2-voter]:checked')].map(input=>input.value);
        const data=await rpc('team_draw_room_start_v2',{p_tournament_id:setupTournamentId,p_voter_user_ids:ids});
        selectedProposalId=null;renderRoom(data,'Salon ouvert : la fenêtre de vote est active pendant une heure.');scheduleMount();return;
      }
      if(target.matches('[data-swe-v2-generate]')){
        const data=await rpc('team_draw_room_generate_v2',{p_tournament_id:latest.tournament_id});
        selectedProposalId=data.current_proposal_id;renderRoom(data,'Nouvelle proposition créée.');scheduleMount();return;
      }
      if(target.matches('[data-swe-v2-feedback]')){
        const data=await rpc('team_draw_room_feedback_v2',{p_tournament_id:latest.tournament_id,p_proposal_id:latest.current_proposal_id,p_decision:target.dataset.sweV2Feedback});
        renderRoom(data,'Ton avis est enregistré.');return;
      }
      if(target.matches('[data-swe-v2-select]')){
        const data=await rpc('team_draw_room_select_v2',{p_tournament_id:latest.tournament_id,p_proposal_id:target.dataset.sweV2Select});
        selectedProposalId=target.dataset.sweV2Select;renderRoom(data,'Ton choix final est enregistré.');return;
      }
      if(target.matches('[data-swe-v2-publish]')){
        const choice=target.dataset.sweV2Publish;
        if(!window.confirm('Publier définitivement la proposition '+proposalNumber(latest,choice)+' ?'))return;
        const tournamentId=latest.tournament_id;
        await rpc('team_draw_room_publish_v2',{p_tournament_id:tournamentId,p_proposal_id:choice});
        close();
        const s=appState();if(s){s.activeTour=tournamentId;s.teamCompetitionId=tournamentId;}
        await Promise.resolve(typeof loadAll==='function'?loadAll():null);
        if(typeof toast==='function')toast('Composition publiée ✅');else window.alert('Composition publiée.');
        scheduleMount();return;
      }
      if(target.matches('[data-swe-v2-refresh]')){await refreshRoom();return;}
    }catch(error){
      if(latest)renderRoom(latest,error?.message||'Action impossible.',true);else showError('Action impossible',error);
    }finally{busy=false;}
  }

  function eligibleAdminTournaments(){
    return (appState()?.tournaments||[]).filter(t=>t.format!=='league'&&t.status!=='finished'&&Boolean(t.draw_room_first_enabled)&&t.team_review_status!=='approved');
  }

  function adminCard(t){
    const active=roomIsActive(t);
    const title=active?'Salon de validation en cours':'Préparer le salon de validation';
    const text=active?'Accède aux propositions, aux avis et à la publication finale.':'Choisis les co-gestionnaires votants puis ouvre le salon lorsque le quota est atteint ou les inscriptions fermées.';
    return '<section class="card" data-swe-v2-admin-card="'+esc(t.id)+'" style="border:2px solid #60a5fa;background:linear-gradient(135deg,#eff6ff,#f0fdfa);margin-bottom:14px"><div class="row" style="justify-content:space-between;gap:12px;align-items:center"><div><div style="font-size:11px;font-weight:900;letter-spacing:.08em;color:#1d4ed8">SALON DE VALIDATION</div><h2 class="sectiontitle" style="margin:4px 0">🗳️ '+esc(t.name||'Tournoi')+'</h2><p class="muted" style="margin:0"><b>'+esc(title)+'</b> · '+esc(text)+'</p></div><button type="button" class="primary" data-swe-v2-open="'+esc(t.id)+'">'+(active?'Ouvrir le salon →':'Préparer →')+'</button></div></section>';
  }

  function mountAdminCards(){
    const home=E('view-home');
    const items=eligibleAdminTournaments();
    const ids=new Set(items.map(t=>String(t.id)));
    document.querySelectorAll('[data-swe-v2-admin-card]').forEach(node=>{if(!ids.has(String(node.dataset.sweV2AdminCard)))node.remove();});
    if(!isAdminUser()||!home)return;
    items.slice().reverse().forEach(t=>{
      if(!home.querySelector('[data-swe-v2-admin-card="'+t.id+'"]'))home.insertAdjacentHTML('afterbegin',adminCard(t));
    });
  }

  async function eligibleCoorgRoom(t){
    const cached=accessCache.get(String(t.id));
    if(cached&&Date.now()-cached.at<10000)return cached.data;
    try{
      const data=await rpc('team_draw_room_state_v2',{p_tournament_id:t.id});
      accessCache.set(String(t.id),{at:Date.now(),data});
      return data;
    }catch(_){
      accessCache.set(String(t.id),{at:Date.now(),data:null});
      return null;
    }
  }

  function coorgCard(t,data){
    const phase=data.room_phase==='final_choice'?'Choix final parmi les cinq propositions':'Ton avis est attendu sur la proposition en cours';
    return '<article class="swe-coorg-action active" data-swe-v2-coorg-card="'+esc(t.id)+'" style="border:2px solid #60a5fa;background:linear-gradient(135deg,#eff6ff,#f0fdfa)"><div class="swe-coorg-action-top"><span class="swe-coorg-action-icon">🗳️</span><div><h3>Salon de validation</h3><p>'+esc(phase)+'.</p></div></div><div class="swe-coorg-progress-label"><span>🏆 '+esc(t.name||'Tournoi')+'</span><b>Action requise</b></div><div class="swe-coorg-progress"><span style="width:100%"></span></div><button type="button" class="primary" data-swe-v2-open="'+esc(t.id)+'">Ouvrir le salon →</button></article>';
  }

  async function mountCoorgCards(){
    if(!isCoorgUser()||coorgMountBusy)return;
    const root=E('sweCoorgDashboard4399');if(!root)return;
    coorgMountBusy=true;
    try{
      const candidates=(appState()?.tournaments||[]).filter(t=>roomIsActive(t));
      const accessible=(await Promise.all(candidates.map(async t=>({t,data:await eligibleCoorgRoom(t)})))).filter(item=>item.data?.can_vote);
      const ids=new Set(accessible.map(item=>String(item.t.id)));
      document.querySelectorAll('[data-swe-v2-coorg-card]').forEach(node=>{if(!ids.has(String(node.dataset.sweV2CoorgCard)))node.remove();});
      const actions=root.querySelector('.swe-coorg-actions');
      if(actions)accessible.slice().reverse().forEach(({t,data})=>{if(!actions.querySelector('[data-swe-v2-coorg-card="'+t.id+'"]'))actions.insertAdjacentHTML('afterbegin',coorgCard(t,data));});
      if(!actions&&accessible.length){const empty=root.querySelector('.swe-coorg-section .muted');if(empty?.textContent.includes('Aucune action'))empty.outerHTML='<div class="swe-coorg-actions">'+accessible.map(({t,data})=>coorgCard(t,data)).join('')+'</div>';}
      if(candidates.length)root.querySelectorAll('[data-coorg-action="team"]').forEach(button=>button.closest('.swe-coorg-action')?.remove());
    }finally{coorgMountBusy=false;}
  }

  function updateGeneratorButton(){
    const s=appState();
    const t=(s?.tournaments||[]).find(item=>String(item.id)===String(s?.teamCompetitionId||s?.activeTour));
    if(!t||!t.draw_room_first_enabled)return;
    const button=E('smartAutoTeams');
    if(button&&t.team_review_status!=='approved'){
      button.disabled=false;
      button.title='Le tirage et la validation se font dans le salon.';
      button.textContent='🗳️ Ouvrir le salon de validation';
    }
    const oldPanel=E('teamReviewPanel');
    if(oldPanel){oldPanel.classList.add('hidden');oldPanel.innerHTML='';}
  }

  function openFromDirectLink(){
    const id=new URLSearchParams(location.search).get('draw_room');
    if(!id||directLinkDone||!appState()?.session)return;
    directLinkDone=true;
    openRoom(id);
  }

  function scheduleMount(){
    clearTimeout(mountTimer);
    mountTimer=setTimeout(()=>{
      mountAdminCards();
      updateGeneratorButton();
      mountCoorgCards().catch(()=>{});
      openFromDirectLink();
    },110);
  }

  document.addEventListener('click',event=>{
    const target=event.target.closest?.('[data-swe-v2-open],[data-swe-v2-close],[data-swe-v2-start],[data-swe-v2-proposal],[data-swe-v2-generate],[data-swe-v2-feedback],[data-swe-v2-select],[data-swe-v2-publish],[data-swe-v2-refresh],[data-swe-open-draw-room],[data-coorg-action="team"],#smartAutoTeams');
    if(!target)return;
    if(target.matches('#smartAutoTeams')){
      const s=appState(),t=(s?.tournaments||[]).find(item=>String(item.id)===String(s?.teamCompetitionId||s?.activeTour));
      if(!t?.draw_room_first_enabled)return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if(target.matches('[data-swe-open-draw-room],[data-coorg-action="team"],#smartAutoTeams')){const s=appState(),t=(s?.tournaments||[]).find(item=>String(item.id)===String(target.dataset.sweOpenDrawRoom||s?.teamCompetitionId||s?.activeTour));openRoom(target.dataset.sweOpenDrawRoom||t?.id);return;}
    handleAction(target);
  },true);

  ['DOMContentLoaded','swe:rendered','swe:page-view','swe:dashboard-ready'].forEach(name=>document.addEventListener(name,scheduleMount));
  window.addEventListener('pageshow',scheduleMount);
  if(document.body)new MutationObserver(scheduleMount).observe(document.body,{childList:true,subtree:true});
  else document.addEventListener('DOMContentLoaded',()=>new MutationObserver(scheduleMount).observe(document.body,{childList:true,subtree:true}),{once:true});
  [250,800,1800,3500].forEach(delay=>setTimeout(scheduleMount,delay));

  window.SWETeamDrawSalonV2={open:openRoom};
})();

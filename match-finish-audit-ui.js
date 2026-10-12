// SWÉ Tournament — clôture visible des matchs et auteur de clôture pour l'administrateur.
(function setupMatchFinishAuditUI(){
  'use strict';
  let scheduled=false,loading=false,auditKey='',auditRecords=new Map();

  const current=()=>typeof currentTour==='function'?currentTour():null;
  const allowed=()=>typeof canEditCurrentMatches==='function'&&canEditCurrentMatches();
  const isAdministrator=()=>typeof isAdmin==='function'&&(isAdmin()||!!S.isSuperAdmin);
  const matchesRoot=()=>document.getElementById('matchesList');
  const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();

  function cardMatch(card){
    if(!card||!card.isConnected)return null;
    const explicit=card.dataset.matchId;
    if(explicit)return S.matches.find(m=>String(m.id)===String(explicit))||null;
    const root=matchesRoot();
    const cards=[...(root?.querySelectorAll(':scope > .match')||[])];
    const idx=cards.indexOf(card);
    if(idx>=0&&S.matches[idx])return S.matches[idx];
    const title=normalize(card.textContent).slice(0,190);
    const matchNumber=title.match(/(?:^|\s|⚽)\s*match\s*(\d+)\b/i);
    const index=matchNumber?Number(matchNumber[1])-1:-1;
    if(index>=0&&S.matches[index])return S.matches[index];
    return null;
  }

  function cards(){
    const root=matchesRoot();
    if(!root)return [];
    const primary=[...root.querySelectorAll(':scope > .match,[data-match-id].match')];
    if(primary.length)return [...new Set(primary)];
    const explicit=[...root.querySelectorAll('[data-match-id]')].filter(x=>x.closest('#matchesList'));
    if(explicit.length)return explicit;
    // Compatibilité avec les fiches de saisie rapide des anciennes versions.
    const found=[];
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let textNode;
    while((textNode=walker.nextNode())){
      if(!/saisie rapide/i.test(textNode.nodeValue||''))continue;
      for(let parent=textNode.parentElement,depth=0;parent&&parent!==root&&depth<9;parent=parent.parentElement,depth++){
        const text=normalize(parent.textContent);
        const indices=[...text.matchAll(/\bmatch\s*(\d+)\b/gi)].map(x=>Number(x[1]));
        if(indices.length!==1||parent.querySelectorAll('button').length<4)continue;
        const match=S.matches[indices[0]-1];
        if(!match)continue;
        parent.dataset.matchId=match.id;
        found.push(parent);
        break;
      }
    }
    return [...new Set(found)];
  }

  function quickHeading(card){
    const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);
    let n;
    while((n=walker.nextNode())){
      if(/saisie rapide/i.test(n.nodeValue||''))return n.parentElement;
    }
    return null;
  }

  function visible(el){
    if(!el||!el.isConnected)return false;
    return el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
  }

  async function finish(match,button){
    if(!allowed())return toast('Saisie non autorisée.');
    const tour=current();
    if(!tour||tour.id!==match.tournament_id)return toast('Tournoi non sélectionné.');
    if(tour.format==='fast_conquest'){
      return toast('Termine ce match depuis les commandes Fast Conquête.');
    }
    button.disabled=true;
    try{
      const fetched=await sb.from('matches').select('id,status,home_score,away_score,competition_type,home_team_id,away_team_id,match_order,pitch,rotation_role').eq('id',match.id).single();
      if(fetched.error)throw fetched.error;
      const fresh=fetched.data;
      if(fresh.status==='finished'){toast('Ce match est déjà terminé.');await loadTournament();renderMatches();return;}
      const home=S.teams.find(t=>t.id===fresh.home_team_id)?.name||'Équipe 1';
      const away=S.teams.find(t=>t.id===fresh.away_team_id)?.name||'Équipe 2';
      const score=Number(fresh.home_score||0)+' - '+Number(fresh.away_score||0);
      let response;
      let tieDecision=null;
      if(tour.format==='king_of_pitch'){
        if(typeof window.SWEKingResolveTie!=='function')throw Error('Module Roi du terrain non chargé : actualise la page.');
        tieDecision=window.SWEKingResolveTie(fresh,home,away,fresh.home_score,fresh.away_score);
        if(!tieDecision)return;
      }
      if(tour.format!=='conquest'||fresh.competition_type!=='conquest_playoff'){
        const winnerName=String(tieDecision?.tie_break_winner_team_id||'')===String(fresh.home_team_id)?home:
          String(tieDecision?.tie_break_winner_team_id||'')===String(fresh.away_team_id)?away:null;
        if(!confirm('Terminer ce match ?\\n'+home+' '+score+' '+away+
          (winnerName?'\\nVainqueur du départage : '+winnerName:'')+
          '\\n\\nLa clôture sera enregistrée avec ton compte et son heure.'))return;
      }
      if(tour.format==='conquest'&&fresh.competition_type==='conquest_playoff'){
        let winner=null;
        if(Number(fresh.home_score)===Number(fresh.away_score)){
          const choice=prompt('Match nul : qui remporte le départage ?\n1 = '+home+'\n2 = '+away+'\nAnnuler = garder le match en cours');
          if(choice===null)return;
          if(choice!=='1'&&choice!=='2')return toast('Choisis 1 ou 2.');
          winner=choice==='1'?fresh.home_team_id:fresh.away_team_id;
        }
        if(!confirm('Terminer ce match ?\\n'+home+' '+score+' '+away+
          (winner?'\\nVainqueur du départage : '+(String(winner)===String(fresh.home_team_id)?home:away):'')+
          '\\n\\nLa clôture sera enregistrée avec ton compte et son heure.'))return;
        response=await sb.rpc('conquest_finish_match_v2',{p_match_id:fresh.id,p_tie_break_winner_team_id:winner});
      }else{
        const finishFields={status:'finished',finished_at:new Date().toISOString()};
        if(tour.format==='king_of_pitch')Object.assign(finishFields,tieDecision);
        response=await sb.from('matches')
          .update(finishFields)
          .eq('id',fresh.id).neq('status','finished').select('id');
        if(!response.error&&Array.isArray(response.data)&&!response.data.length)
          throw Error('Le match a été clôturé par un autre utilisateur.');
      }
      if(response.error)throw response.error;
      auditKey='';
      if(tour.format==='king_of_pitch')await loadAll();
      else {await loadTournament();renderAll();}
      toast('Match terminé et clôture tracée ✅');
    }catch(error){
      toast(error?.message||'Impossible de terminer le match.');
    }finally{button.disabled=false;}
  }

  function addFinish(card,match){
    if(!allowed()||match.status==='finished'||card.querySelector('.swe-quick-finish'))return;
    if(current()?.format==='fast_conquest')return;
    const heading=quickHeading(card);
    const existing=[...card.querySelectorAll('button')].find(button=>/terminer le match/i.test(button.textContent||'')&&visible(button));
    // L'ancien bouton, présent ailleurs sur la fiche, ne remplace pas celui de la saisie rapide.
    if(!heading&&existing)return;
    const row=document.createElement('div');row.className='swe-quick-finish';
    row.style.cssText='margin-top:12px;display:flex;justify-content:flex-end;gap:8px;';
    const button=document.createElement('button');
    button.type='button';button.textContent='✅ Terminer le match';button.className='primary';
    button.style.cssText='min-height:42px;min-width:170px;';
    button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();finish(match,button)});
    row.append(button);

    const controls=[...card.querySelectorAll('.swe-quick-csc')];
    if(heading&&controls.length>=2){
      let grid=controls[0].parentElement;
      while(grid&&grid!==card&&!grid.contains(controls[1]))grid=grid.parentElement;
      if(grid&&grid!==card){grid.after(row);return;}
    }
    if(heading){
      // Place le contrôle avant le rappel des buts enregistrés, et non dans une équipe.
      const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);
      let n;
      while((n=walker.nextNode())){
        if(!/buts enregistrés/i.test(n.nodeValue||''))continue;
        const label=n.parentElement;
        const line=label?.closest('.row,.small,.muted')||label;
        if(line&&line!==card&&line.parentElement){line.before(row);return;}
      }
    }
    const manager=card.querySelector('.match-player-manager');
    if(manager&&manager.parentElement){manager.after(row);return;}
    card.append(row);
  }

  function renderAudit(){
    if(!isAdministrator())return;
    for(const card of cards()){
      const match=cardMatch(card);
      if(!match||match.status!=='finished')continue;
      const record=auditRecords.get(String(match.id));
      if(!record)continue;
      let line=card.querySelector('.swe-match-finish-audit');
      if(!line){
        line=document.createElement('div');line.className='swe-match-finish-audit';
        line.style.cssText='margin-top:8px;font-size:12px;color:var(--muted,#526b64);';
        const badge=[...card.querySelectorAll('.guest-badge')].find(x=>/match terminé/i.test(x.textContent||''));
        if(badge)badge.after(line);else card.append(line);
      }
      const when=record.finished_at?new Date(record.finished_at).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):'date inconnue';
      const who=record.finished_by_name||'Auteur non identifié';
      line.textContent='🔎 Clôture : '+who+' · '+when;
      line.title='Journal de clôture réservé à l’administrateur, utile en cas de réclamation.';
    }
  }

  async function fetchAudit(){
    if(!isAdministrator()||loading)return;
    const tour=current();if(!tour?.id)return;
    const fingerprint=tour.id+':'+S.matches.filter(m=>m.status==='finished').map(m=>m.id).join(',');
    if(auditKey===fingerprint)return;
    auditKey=fingerprint;loading=true;
    try{
      const {data,error}=await sb.rpc('admin_get_match_finish_audit_v1',{p_tournament_id:tour.id});
      if(error)throw error;
      if(current()?.id!==tour.id)return;
      auditRecords=new Map((data||[]).map(item=>[String(item.match_id),item]));
      renderAudit();
    }catch(error){
      auditKey='';
      console.warn('Historique de clôture inaccessible :',error?.message||error);
    }finally{loading=false;}
  }


  // Historique accessible même après la clôture du tournoi (contestations ultérieures).
  let historicalPanelRequest=0;
  function ensureAdminHistory(){
    if(!isAdministrator())return;
    const host=document.getElementById('view-matches');
    if(!host)return;
    let panel=document.getElementById('sweMatchClosureHistory');
    if(!panel){
      panel=document.createElement('details');
      panel.id='sweMatchClosureHistory';panel.className='card';
      panel.style.cssText='margin-top:16px;padding:12px;';
      const summary=document.createElement('summary');
      summary.textContent='🔎 Historique des matchs terminés · administrateur';
      summary.style.cssText='cursor:pointer;font-weight:700;';
      const intro=document.createElement('p');
      intro.className='small muted';
      intro.textContent='Retrouve la personne qui a clôturé un match, la date et le score, même pour les anciens tournois.';
      const picker=document.createElement('select');
      picker.id='sweMatchClosureTournament';picker.setAttribute('aria-label','Tournoi à auditer');
      picker.style.cssText='max-width:100%;margin:8px 0;';
      const refresh=document.createElement('button');
      refresh.type='button';refresh.textContent='Actualiser';refresh.className='smallbtn';
      refresh.style.marginLeft='8px';
      const results=document.createElement('div');results.id='sweMatchClosureResults';results.className='small';
      panel.append(summary,intro,picker,refresh,results);
      host.append(panel);
      const load=async()=>{
        const tournamentId=picker.value;
        if(!tournamentId)return;
        const request=++historicalPanelRequest;
        results.textContent='Chargement des clôtures…';
        refresh.disabled=true;
        try{
          const [audit,matches,teams]=await Promise.all([
            sb.rpc('admin_get_match_finish_audit_v1',{p_tournament_id:tournamentId}),
            sb.from('matches').select('id,match_order,home_team_id,away_team_id,home_score,away_score').eq('tournament_id',tournamentId),
            sb.from('teams').select('id,name').eq('tournament_id',tournamentId)
          ]);
          if(request!==historicalPanelRequest||!panel.isConnected)return;
          if(audit.error)throw audit.error;
          if(matches.error)throw matches.error;
          if(teams.error)throw teams.error;
          const matchMap=new Map((matches.data||[]).map(m=>[String(m.id),m]));
          const teamMap=new Map((teams.data||[]).map(t=>[String(t.id),t.name]));
          results.replaceChildren();
          const entries=audit.data||[];
          if(!entries.length){results.textContent='Aucun match terminé pour ce tournoi.';return;}
          for(const item of entries){
            const m=matchMap.get(String(item.match_id));
            const row=document.createElement('div');row.className='player';
            row.style.cssText='margin:7px 0;padding:9px;';
            const head=document.createElement('b');
            head.textContent=m?'Match '+m.match_order+' · '+(teamMap.get(String(m.home_team_id))||'Équipe')+' '+m.home_score+' – '+m.away_score+' '+(teamMap.get(String(m.away_team_id))||'Équipe'):'Match '+String(item.match_id).slice(0,8);
            const info=document.createElement('div');info.className='muted';
            const when=item.finished_at?new Date(item.finished_at).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):'date inconnue';
            info.textContent='Clôturé par : '+(item.finished_by_name||'Auteur inconnu')+' · '+when;
            row.append(head,info);results.append(row);
          }
        }catch(error){if(request===historicalPanelRequest)results.textContent='Historique indisponible : '+(error?.message||'erreur');}
        finally{refresh.disabled=false;}
      };
      picker.addEventListener('change',()=>{if(panel.open)load()});
      refresh.addEventListener('click',load);
      panel.addEventListener('toggle',()=>{if(panel.open)load()});
    }
    const picker=panel.querySelector('#sweMatchClosureTournament');
    const signature=S.tournaments.map(t=>t.id+':'+t.name).join(';');
    if(picker.dataset.signature!==signature){
      const selected=picker.value||S.activeTour;
      picker.replaceChildren();
      for(const t of S.tournaments){
        const option=document.createElement('option');option.value=t.id;
        option.textContent=(t.name||t.tournament_date||'Tournoi')+(t.status==='finished'?' · terminé':'');
        picker.append(option);
      }
      picker.value=[...picker.options].some(o=>o.value===selected)?selected:(S.activeTour||'');
      picker.dataset.signature=signature;
    }
  }

  function mount(){
    if(!S.session||!S.activeTour)return;
    for(const card of cards()){
      const match=cardMatch(card);
      if(!match)continue;
      if(match.status!=='finished')addFinish(card,match);
    }
    renderAudit();
    ensureAdminHistory();
    if(isAdministrator()&&S.matches.some(m=>m.status==='finished'))fetchAudit();
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    setTimeout(()=>{scheduled=false;try{mount()}catch(e){console.warn('Actions des matchs',e)}},180);
  }
  function boot(){
    if(!document.body)return;
    const observer=new MutationObserver(records=>{
      if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.closest?.('.swe-quick-finish')&&!n.closest?.('.swe-match-finish-audit'))))schedule();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    schedule();
  }
  document.addEventListener('swe:rendered',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();

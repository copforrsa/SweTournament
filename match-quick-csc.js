// CSC : ajout de deux raccourcis sous les joueurs, sans recréer la saisie rapide.
(function installQuickScoringCSC(){
  'use strict';
  let queued=false;
  const normalize=value=>String(value||'').normalize('NFC').toLocaleLowerCase('fr').replace(/\s+/g,' ').trim();
  const nameOnButton=(button,name)=>{
    const label=normalize(button.textContent),wanted=normalize(name);
    return !!wanted&&(label===wanted||label.endsWith(' '+wanted)||label.includes(' '+wanted+' '));
  };
  const cscBallSvg=()=>'<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="19" height="19" style="vertical-align:-3px;flex:none;margin-right:3px"><circle cx="12" cy="12" r="10.4" fill="#d6283f" stroke="#921328" stroke-width="1.2"/><path d="m12 6 4.1 3-1.55 4.8h-5.1L7.9 9Z" fill="#fff"/><path d="M12 6V1.8M7.9 9 3.15 7.4M16.1 9l4.75-1.6M9.45 13.8 6.3 19.4M14.55 13.8l3.15 5.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>';
  const assignedIds=(matchId,teamId)=>[...new Set(matchTeamPlayerIds(matchId,teamId).filter(id=>p(id)))];
  const playerButtons=(panel,ids)=>{
    const names=ids.flatMap(id=>{const raw=p(id)?.name||'';const display=playerDisplayName(p(id));return [raw,display,raw.replace(/^\[[^\]]+\]\s*/,''),display.replace(/^\[[^\]]+\]\s*/,'')]}).filter(Boolean);
    return [...panel.querySelectorAll('button')].filter(button=>
      !button.closest('.swe-quick-csc')&&names.some(name=>nameOnButton(button,name))
    );
  };
  const findLocation=heading=>{
    // La saisie Roi du terrain n'utilise pas toujours la même structure
    // que la fiche "Matchs" classique. Utiliser le vrai match dans S.matches,
    // jamais la position d'un élément HTML dans la liste.
    const roots=[];
    for(let el=heading.parentElement,depth=0;el&&el!==document.body&&depth<13;el=el.parentElement,depth++){
      roots.push(el);
      if(el.id==='matchesList')break;
    }
    const active=S.matches.filter(m=>m.status!=='finished');
    for(const root of roots){
      const buttons=root.querySelectorAll('button');
      if(buttons.length<4)continue;
      const assigned=root.closest('[data-match-id]');
      const matchId=assigned?.getAttribute('data-match-id')||root.getAttribute('data-match-id')||'';
      // Lire le titre situé au-dessus de "⚡ Saisie rapide", et non
      // le texte d'une autre rencontre se trouvant après la carte.
      const prefix=(root.textContent||'').split(/saisie rapide/i)[0];
      const numberMatch=prefix.match(/\bmatch\s*(\d+)\b/i);
      const matchNumber=numberMatch?Number(numberMatch[1]):null;
      const candidates=[];
      for(const match of active){
        if(matchId&&String(matchId)!==String(match.id))continue;
        if(matchNumber!==null&&Number(match.match_order)!==matchNumber)continue;
        const homeIds=assignedIds(match.id,match.home_team_id);
        const awayIds=assignedIds(match.id,match.away_team_id);
        if(!homeIds.length||!awayIds.length)continue;
        const home=playerButtons(root,homeIds);
        const away=playerButtons(root,awayIds);
        if(home.length<Math.min(2,homeIds.length)||away.length<Math.min(2,awayIds.length))continue;
        // Si deux matchs affichent les mêmes joueurs, refuser de les confondre.
        candidates.push({match,homeIds,awayIds,home,away,scope:root});
      }
      if(candidates.length===1)return candidates[0];
    }
    return null;
  };
  function columnAnchor(buttons,otherButtons,scope){
    const last=buttons[buttons.length-1];
    if(!last)return null;
    // Chercher la colonne commune aux joueurs de cette équipe,
    // sans englober également la colonne adverse.
    for(let parent=last.parentElement;parent&&parent!==scope;parent=parent.parentElement){
      if(!buttons.every(b=>parent.contains(b)))continue;
      if(otherButtons.some(b=>parent.contains(b)))continue;
      const direct=[...parent.children].find(child=>child.contains(last));
      if(direct)return {anchor:direct,teamColumn:parent};
    }
    // Mise en page alternative : chaque joueur possède sa propre rangée.
    const row=last.closest('.quick-player-row,.scorer-row,.match-scorer-row,.row');
    if(row&&row!==scope&&!otherButtons.some(b=>row.contains(b)))
      return {anchor:row,teamColumn:row.parentElement};
    return {anchor:last.parentElement,teamColumn:last.parentElement};
  }
  function appendControl(buttons,otherButtons,playerIds,match,beneficiaryTeamId,scope){
    const last=buttons[buttons.length-1];
    if(!last)return;
    const insertion=columnAnchor(buttons,otherButtons,scope);
    const anchor=insertion?.anchor;
    if(!anchor?.parentElement)return;
    if(insertion.teamColumn?.querySelector('.swe-quick-csc[data-csc-team="'+beneficiaryTeamId+'"]'))return;
    if(anchor.nextElementSibling?.matches?.('.swe-quick-csc[data-csc-team="'+beneficiaryTeamId+'"]'))return;
    const control=document.createElement('div');
    control.className='swe-quick-csc';
    control.dataset.cscTeam=beneficiaryTeamId;
    control.style.cssText='margin-top:8px;width:100%;';
    const trigger=document.createElement('button');
    trigger.type='button';trigger.innerHTML=cscBallSvg()+' <span>CSC</span>';trigger.className='ghost smallbtn';
    trigger.setAttribute('aria-expanded','false');
    trigger.style.cssText='width:100%;min-height:38px;';
    const choices=document.createElement('div');
    choices.style.cssText='display:none;margin-top:6px;max-height:220px;overflow-y:auto;';
    choices.setAttribute('aria-label','Choisir le responsable du CSC');
    const label=document.createElement('div');
    label.className='small muted';label.textContent='Joueur responsable du CSC :';
    choices.appendChild(label);
    for(const id of playerIds){
      const player=p(id);if(!player)continue;
      const choice=document.createElement('button');
      choice.type='button';choice.className='smallbtn';
      choice.textContent=playerDisplayName(player)||player.name||'Joueur';
      choice.style.cssText='display:block;width:100%;text-align:left;margin-top:4px;';
      choice.addEventListener('click',async event=>{
        event.preventDefault();event.stopPropagation();
        if(!canEditCurrentMatches())return toast('Saisie non autorisée.');
        if(!S.matches.some(m=>String(m.id)===String(match.id)&&m.status!=='finished'))return toast('Ce match est terminé.');
        trigger.disabled=true;
        [...choices.querySelectorAll('button')].forEach(b=>b.disabled=true);
        try{
          const {error}=await sb.from('goals').insert({
            match_id:match.id,
            team_id:beneficiaryTeamId,
            scorer_player_id:id,
            assister_player_id:null,
            is_own_goal:true,
            assist_decided:true
          });
          if(error)throw error;
          await loadTournament();renderAll();toast('CSC enregistré pour l’équipe adverse ✅');
        }catch(error){
          toast(error?.message||'Impossible d’enregistrer le CSC.');
          trigger.disabled=false;
          [...choices.querySelectorAll('button')].forEach(b=>b.disabled=false);
        }
      });
      choices.appendChild(choice);
    }
    trigger.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      const opening=choices.style.display==='none';
      document.querySelectorAll('.swe-quick-csc').forEach(other=>{
        const list=other.querySelector('[aria-label="Choisir le responsable du CSC"]');
        const btn=other.querySelector('button');
        if(list)list.style.display='none';
        btn?.setAttribute('aria-expanded','false');
      });
      choices.style.display=opening?'block':'none';
      trigger.setAttribute('aria-expanded',String(opening));
    });
    control.append(trigger,choices);
    anchor.insertAdjacentElement('afterend',control);
  }
  // Affiche la vraie nature des buts contre leur camp dans le suivi des buteurs.
  // Les informations viennent de goals.is_own_goal, jamais d'une déduction sur le score.

  // Les CSC sont portés au score de l'adversaire : le responsable est
  // obligatoirement choisi dans l'équipe opposée à celle créditée du but.
  function protectOwnGoalEntry(entry,editButton,goal,match){
    if(entry.dataset.sweOwnGoalControls===String(goal.id))return;
    const offenderTeamId=String(goal.team_id)===String(match.home_team_id)
      ?match.away_team_id
      :String(goal.team_id)===String(match.away_team_id)
        ?match.home_team_id:null;
    if(!offenderTeamId)return;
    entry.dataset.sweOwnGoalControls=String(goal.id);

    for(const select of entry.querySelectorAll('select')){
      select.value='';
      select.disabled=true;
      const label=select.closest('label');
      if(label&&label!==entry&&!label.querySelector('button'))label.hidden=true;
      else select.hidden=true;
    }
    for(const button of entry.querySelectorAll('button')){
      if(/enregistrer le passeur/i.test(button.textContent||'')){
        button.disabled=true;button.hidden=true;
      }
    }
    // Le formulaire de passe décisive disparaît pour ce CSC uniquement.
    for(const node of entry.querySelectorAll('label,div,span,p,small')){
      if(node===entry||node.children.length)continue;
      if(/^(passeur|passeur à compléter|aucun passeur)$/i.test((node.textContent||'').trim()))
        node.hidden=true;
    }
    if(!entry.querySelector('.swe-csc-assist-info')){
      const info=document.createElement('div');
      info.className='swe-csc-assist-info small';
      info.style.cssText='margin:7px 0;color:#bc1d36;font-weight:700;';
      info.textContent='CSC · Aucune passe décisive';
      const actions=editButton.parentElement;
      if(actions&&actions!==entry)actions.before(info);
      else entry.appendChild(info);
    }

    if(editButton.dataset.sweCscCorrectionBound)return;
    editButton.dataset.sweCscCorrectionBound='true';
    editButton.addEventListener('click',event=>{
      // Neutralise l'éditeur classique, qui utilise l'équipe bénéficiaire.
      event.preventDefault();event.stopImmediatePropagation();
      if(!canEditCurrentMatches()&&!S.isSuperAdmin)
        return toast('Tu ne peux pas modifier ce match.');
      let box=entry.querySelector('.swe-csc-correction');
      if(box){box.remove();return;}
      box=document.createElement('div');
      box.className='swe-csc-correction';
      box.style.cssText='margin-top:10px;padding:10px;border:1px solid #e4adbb;border-radius:12px;background:#fff9fb;';
      const title=document.createElement('b');
      title.textContent='Corriger le responsable du CSC · '+(tm(offenderTeamId)?.name||'Équipe fautive');
      box.append(title);
      const hint=document.createElement('div');
      hint.className='small muted';
      hint.textContent='Le but reste attribué à '+(tm(goal.team_id)?.name||"l’équipe adverse")+'.';
      box.append(hint);

      const roster=[...new Set(matchTeamPlayerIds(match.id,offenderTeamId))]
        .filter(id=>p(id));
      const choices=document.createElement('div');
      choices.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px;margin-top:10px;';
      const feedback=document.createElement('div');
      feedback.className='small';
      feedback.setAttribute('role','status');
      feedback.style.cssText='margin-top:8px;color:#a11737;';
      if(!roster.length)feedback.textContent='Aucun joueur trouvé dans l’équipe fautive.';
      const close=document.createElement('button');
      close.type='button';close.className='ghost smallbtn';
      close.textContent='Annuler la correction';
      close.style.marginTop='9px';
      close.addEventListener('click',e=>{e.preventDefault();box.remove()});

      for(const id of roster){
        const choice=document.createElement('button');
        choice.type='button';choice.className='smallbtn';
        choice.textContent=playerDisplayName(p(id))||p(id)?.name||'Joueur';
        if(String(id)===String(goal.scorer_player_id))
          choice.title='Responsable actuel du CSC';
        choice.addEventListener('click',async e=>{
          e.preventDefault();e.stopPropagation();
          for(const btn of choices.querySelectorAll('button'))btn.disabled=true;
          close.disabled=true;
          feedback.textContent='Enregistrement du CSC…';
          try{
            const read=await sb.from('goals')
              .select('id,match_id,team_id,is_own_goal')
              .eq('id',goal.id).single();
            if(read.error)throw read.error;
            if(!read.data?.is_own_goal||
               String(read.data.match_id)!==String(match.id)||
               String(read.data.team_id)!==String(goal.team_id))
              throw Error('Ce but a changé. Actualise les matchs avant de corriger.');
            const result=await sb.from('goals').update({
              scorer_player_id:id,
              assister_player_id:null,
              assist_decided:true,
              is_own_goal:true
            }).eq('id',goal.id).eq('match_id',match.id)
              .eq('team_id',goal.team_id).eq('is_own_goal',true).select('id');
            if(result.error)throw result.error;
            if(!result.data?.length)throw Error('Modification non enregistrée : vérifie tes autorisations.');
            await loadTournament();renderAll();
            toast('Responsable du CSC corrigé ✅');
          }catch(error){
            feedback.textContent=error?.message||'Correction du CSC impossible.';
            for(const btn of choices.querySelectorAll('button'))btn.disabled=false;
            close.disabled=false;
          }
        });
        choices.append(choice);
      }
      box.append(choices,feedback,close);
      entry.append(box);
    },true);
  }

  function annotateOwnGoals(){
    const host=document.getElementById('matchesList');
    if(!host||!Array.isArray(S.goals)||!Array.isArray(S.matches))return;
    const ownGoals=S.goals.filter(goal=>goal.is_own_goal);
    if(!ownGoals.length)return;
    const normalise=value=>normalize(value).replace(/^[⚽🏐🔵\s]+/,'');
    const actionButtons=[...host.querySelectorAll('button')].filter(button=>/modifier le buteur/i.test(button.textContent||''));
    for(const action of actionButtons){
      const matchCard=action.closest('[data-match-id],.match,.match-card');
      if(!matchCard)continue;
      const explicit=matchCard.getAttribute('data-match-id');
      const topText=(matchCard.textContent||'').slice(0,260);
      const numberMatch=topText.match(/\bmatch\s*(\d+)\b/i);
      const order=numberMatch?Number(numberMatch[1]):null;
      const matches=S.matches.filter(m=>explicit?String(m.id)===String(explicit):order!==null&&Number(m.match_order)===order);
      if(matches.length!==1)continue;
      const match=matches[0];
      const candidates=ownGoals.filter(goal=>String(goal.match_id)===String(match.id));
      if(!candidates.length)continue;

      // Remonter du bouton d'édition vers UNE fiche de but (et non toute la liste).
      let entry=null;
      for(let node=action.parentElement;node&&node!==matchCard;node=node.parentElement){
        const text=node.textContent||'';
        if(!/annuler ce but/i.test(text))continue;
        if([...node.querySelectorAll('button')].filter(b=>/modifier le buteur/i.test(b.textContent||'')).length!==1)continue;
        const heading=normalise(text.split(/\b(?:passeur|aucun passeur)\b/i)[0]);
        if(heading.length>230||!heading)continue;
        if(!candidates.some(goal=>{
          const person=p(goal.scorer_player_id)?.name||'';
          const team=tm(goal.team_id)?.name||'';
          return person&&team&&heading.includes(normalise(person))&&heading.includes(normalise(team));
        }))continue;
        entry=node;break;
      }
      if(!entry)continue;
      const headingText=normalise((entry.textContent||'').split(/\b(?:passeur|aucun passeur)\b/i)[0]);
      const matched=candidates.filter(goal=>{
        const person=p(goal.scorer_player_id)?.name||'';
        const team=tm(goal.team_id)?.name||'';
        return person&&team&&headingText.includes(normalise(person))&&headingText.includes(normalise(team));
      });
      if(!matched.length)continue;
      // N'annoter qu'une ligne identifiable. Si un but normal et un CSC portent
      // exactement le même joueur et l'équipe créditée, ne pas deviner.
      const possible=S.goals.filter(goal=>String(goal.match_id)===String(match.id)&&
        String(goal.scorer_player_id)===String(matched[0].scorer_player_id)&&
        String(goal.team_id)===String(matched[0].team_id));
      if(possible.some(goal=>!goal.is_own_goal))continue;

      if(!entry.querySelector('.swe-csc-history-label')){
      const person=normalise(p(matched[0].scorer_player_id)?.name||'');
      const team=normalise(tm(matched[0].team_id)?.name||'');
      const headingElements=[...entry.querySelectorAll('strong,b')];
      let header=headingElements.find(el=>{
        const label=normalise(el.textContent||'');
        return label.includes(person)&&label.includes(team);
      });
      if(!header)header=headingElements.find(el=>normalise(el.textContent).includes(person));
      if(!header){
        // Le titre peut être un simple élément avec font-weight, sans <b>.
        header=[...entry.querySelectorAll('div,span,p')]
          .filter(el=>!el.querySelector('button'))
          .find(el=>{
            const label=normalise(el.textContent||'');
            return label.length<160&&label.includes(person)&&label.includes(team);
          });
      }
      if(!header)continue;
      // Supprimer uniquement l'emoji de tête s'il est dans un nœud texte isolé.
      const first=header.firstChild;
      if(first?.nodeType===Node.TEXT_NODE){
        const changed=(first.nodeValue||'').replace(/^\s*⚽\s*/,'');
        if(changed!==first.nodeValue)first.nodeValue=changed;
      }
      // Certains thèmes placent le ballon bleu dans un span ou juste avant le titre.
      const inlineIcon=header.firstElementChild;
      if(inlineIcon&&/^\s*⚽\s*$/.test(inlineIcon.textContent||''))inlineIcon.remove();
      const sibling=header.previousSibling;
      if(sibling?.nodeType===Node.TEXT_NODE){
        const clean=(sibling.nodeValue||'').replace(/^\s*⚽\s*/,'');
        if(clean!==sibling.nodeValue)sibling.nodeValue=clean;
      }else if(sibling?.nodeType===Node.ELEMENT_NODE&&/^\s*⚽\s*$/.test(sibling.textContent||'')){
        sibling.remove();
      }
      const label=document.createElement('span');
      label.className='swe-csc-history-label';
      label.style.cssText='display:inline-flex;align-items:center;gap:3px;color:#bc1d36;font-weight:800;margin-right:5px;';
      label.innerHTML=cscBallSvg()+' CSC ·';
      label.title='Contre son camp : le but est attribué à '+(tm(matched[0].team_id)?.name||"l'équipe adverse");
      header.prepend(label);
      }
      protectOwnGoalEntry(entry,action,matched[0],match);
    }
  }

  function mount(){
    if(!S.session||!S.activeTour)return;
    annotateOwnGoals();
    if(!canEditCurrentMatches())return;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      if(!/saisie rapide/i.test(node.nodeValue||''))continue;
      const heading=node.parentElement;
      if(!heading||heading.closest('.swe-quick-csc'))continue;
      const found=findLocation(heading);
      if(!found)continue;
      appendControl(found.home,found.away,found.homeIds,found.match,found.match.away_team_id,found.scope);
      appendControl(found.away,found.home,found.awayIds,found.match,found.match.home_team_id,found.scope);
    }
  }
  function schedule(){
    if(queued)return;
    queued=true;
    window.setTimeout(()=>{queued=false;try{mount()}catch(error){console.warn('CSC quick scoring',error)}},80);
  }
  function start(){
    if(!document.body)return;
    const observer=new MutationObserver(records=>{
      if(records.some(record=>[...record.addedNodes].some(node=>
        node.nodeType===1&&!node.closest?.('.swe-quick-csc')
      )))schedule();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    schedule();
  }
  document.addEventListener('swe:rendered',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

// CSC : ajout de deux raccourcis sous les joueurs, sans recréer la saisie rapide.
(function installQuickScoringCSC(){
  'use strict';
  let queued=false;
  const normalize=value=>String(value||'').normalize('NFC').toLocaleLowerCase('fr').replace(/\s+/g,' ').trim();
  const nameOnButton=(button,name)=>{
    const label=normalize(button.textContent),wanted=normalize(name);
    return !!wanted&&(label===wanted||label.endsWith(' '+wanted)||label.includes(' '+wanted+' '));
  };
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
    trigger.type='button';trigger.textContent='⚽ CSC';trigger.className='ghost smallbtn';
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
  function mount(){
    if(!S.session||!S.activeTour||!canEditCurrentMatches())return;
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

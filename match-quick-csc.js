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
    const root=heading.closest('.match,[data-match-id],.match-card');
    const hintedId=root?.getAttribute('data-match-id');
    const indexedCard=root?.matches('.match')&&root.closest('#matchesList')
      ?[...root.parentElement.querySelectorAll(':scope > .match')].indexOf(root):-1;
    for(let node=heading.parentElement,depth=0;node&&node!==document.body&&depth<9;node=node.parentElement,depth++){
      if(!node.querySelectorAll('button').length)continue;
      const prefix=(node.textContent||'').split(/saisie rapide/i)[0];
      const matchLabel=prefix.match(/\bmatch\s*(\d+)\b/i);
      const displayedIndex=matchLabel?Number(matchLabel[1])-1:-1;
      const candidates=S.matches.map((match,index)=>{
        if(match.status==='finished')return null;
        if(hintedId&&String(hintedId)!==String(match.id))return null;
        if(indexedCard>=0&&index!==indexedCard)return null;
        if(displayedIndex>=0&&index!==displayedIndex)return null;
        const homeIds=assignedIds(match.id,match.home_team_id);
        const awayIds=assignedIds(match.id,match.away_team_id);
        if(!homeIds.length||!awayIds.length)return null;
        const home=playerButtons(node,homeIds),away=playerButtons(node,awayIds);
        if(home.length<Math.min(2,homeIds.length)||away.length<Math.min(2,awayIds.length))return null;
        return {match,homeIds,awayIds,home,away};
      }).filter(Boolean);
      if(candidates.length!==1)continue;
      return candidates[0];
    }
    return null;
  };
  function appendControl(buttons,playerIds,match,beneficiaryTeamId){
    const last=buttons[buttons.length-1];
    if(!last)return;
    let anchor=last.closest('.quick-player-row,.scorer-row,.match-scorer-row,.row')||last.parentElement;
    if(anchor.querySelectorAll('button').filter(button=>buttons.includes(button)).length>1){
      anchor=last.parentElement;
    }
    if(!anchor.parentElement||anchor.parentElement.closest('.swe-quick-csc'))return;
    const following=anchor.nextElementSibling;
    if(following?.classList?.contains('swe-quick-csc'))return;
    const control=document.createElement('div');
    control.className='swe-quick-csc';
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
      appendControl(found.home,found.homeIds,found.match,found.match.away_team_id);
      appendControl(found.away,found.awayIds,found.match,found.match.home_team_id);
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

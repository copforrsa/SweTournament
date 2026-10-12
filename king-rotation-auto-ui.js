/* Roi du terrain — activation explicite du circuit et suivi des trois terrains. */
(function(){
'use strict';
let pending=false,scheduled=false;
const roles=[
  {key:'king',title:'👑 Terrain du Roi',param:'p_king_pitch_id'},
  {key:'middle',title:'⚔️ Terrain des Conquérants',param:'p_middle_pitch_id'},
  {key:'stream',title:'🛡️ Terres des Bannis',param:'p_stream_pitch_id'}
];
const tour=()=>{try{return currentTour()}catch(_){return null}};
const admin=()=>typeof isAdmin==='function'&&(isAdmin()||!!S.isSuperAdmin);
const make=(tag,txt)=>{const el=document.createElement(tag);if(txt!==undefined)el.textContent=txt;return el};

function resolveTie(match,home,away,homeScore,awayScore){
  if(Number(homeScore)!==Number(awayScore))
    return {tie_break_winner_team_id:null,tie_break_method_used:null};
  const t=tour();
  if(t?.format!=='king_of_pitch')return null;
  const role=match.rotation_role||
    (String(match.pitch||'').toLocaleLowerCase('fr').includes('carrefour')?'king':
     String(match.pitch||'').toLocaleLowerCase('fr').includes('mercedes')?'middle':
     String(match.pitch||'').toLocaleLowerCase('fr').includes('boulogne')?'stream':
     Number(match.match_order)===1?'king':Number(match.match_order)===2?'middle':'stream');
  const active=!!t.rotation_state?.initialized&&t.rotation_mode==='king_of_pitch';
  const round=active?Number(t.rotation_state?.round||1):1;
  if(role==='king'&&round>1){
    const holder=String(t.rotation_state?.king_holder_team_id||'');
    if(![match.home_team_id,match.away_team_id].some(id=>String(id)===holder)){
      toast('Roi en titre inconnu : actualise le circuit avant de terminer le match.');
      return null;
    }
    const name=String(match.home_team_id)===holder?home:away;
    if(!confirm('Match nul sur Carrefour : le Roi en titre '+name+' conserve la couronne.\nLe prétendant descend à Mercedes.\nConfirmer la clôture ?'))return null;
    return {tie_break_winner_team_id:holder,tie_break_method_used:'king_retains'};
  }
  let method='penalties_3',description='tirs au but obligatoires avec 3 tireurs (pas de Shifumi)';
  if(role!=='king'){
    method=t.tie_break_method||'shifumi_1';
    description={shifumi_1:'Shifumi · 1 manche',shifumi_3:'Shifumi · 3 manches',penalties:'tirs au but (TAB)'}[method]||'départage prévu pour le tournoi';
  }
  const choice=prompt('Match nul · '+(role==='king'?'Carrefour (premier Roi)':role==='middle'?'Terrain des Conquérants':'Terres des Bannis')+
    '\nDépartage : '+description+
    '\n\nAprès le départage, indique le vainqueur :\n1 = '+home+'\n2 = '+away+
    '\nAnnuler = ne pas clôturer');
  if(choice===null)return null;
  if(choice!=='1'&&choice!=='2'){
    toast('Choisis 1 ou 2 après le départage.');
    return null;
  }
  return {tie_break_winner_team_id:choice==='1'?match.home_team_id:match.away_team_id,tie_break_method_used:method};
}
window.SWEKingResolveTie=resolveTie;

const refresh=async()=>{await loadAll();renderMatches();};

function mount(){
  const current=tour();
  let panel=document.getElementById('sweKingCircuit');
  if(!current||current.format!=='king_of_pitch'||S.publicMode){
    panel?.remove();return;
  }
  const anchor=document.getElementById('matchCompetitionStatus');
  if(!anchor)return;
  if(!panel){
    panel=make('section');panel.id='sweKingCircuit';
    panel.className='player';
    panel.style.cssText='margin:10px 0 16px;padding:14px;border:2px solid #d4a64a;border-radius:14px;background:#fffcf3;';
    anchor.after(panel);
  }
  const active=current.rotation_mode==='king_of_pitch'&&!!current.rotation_state?.initialized;
  const round=Number(current.rotation_state?.round||1);
  const matches=(S.matches||[]).slice().sort((a,b)=>Number(a.match_order)-Number(b.match_order));
  const currentRound=active?matches.filter(m=>Number(m.match_order)>3*(round-1)&&Number(m.match_order)<=3*round):matches.slice(0,3);
  const finished=currentRound.filter(m=>m.status==='finished').length;
  const signature=JSON.stringify([current.id,active,round,current.rotation_state?.stop_after_round,matches.map(m=>[m.id,m.match_order,m.status,m.pitch]),current.reserved_pitch_ids,(S.sportsPitches||[]).map(x=>[x.id,x.name])]);
  if(panel.dataset.signature===signature)return;
  panel.dataset.signature=signature;
  panel.replaceChildren();
  panel.append(make('h3','👑 Roi du terrain · Circuit automatique'));
  if(active&&Number(current.rotation_state?.version||0)<2){
    panel.append(make('p','Circuit historique : les matchs et rotations de cette ancienne version sont conservés sans changement.'));
    return;
  }

  const hint=make('p');
  hint.className='muted';
  hint.textContent='👑 Vainqueur du Roi : reste au Roi · Vainqueur des Conquérants : monte au Roi · Vainqueur des Bannis : monte aux Conquérants. Les perdants descendent ou restent sur les Bannis.';
  panel.append(hint);

  if(active){
    const stop=!!current.rotation_state?.stop_after_round;
    const state=make('p');
    state.style.cssText='font-weight:700;margin:8px 0;';
    state.textContent='✅ Circuit actif · Tour '+round+' · '+finished+' / 3 matchs terminés'+(stop?' · arrêt prévu après ce tour':'');
    panel.append(state);
    const next=make('p');
    next.className='muted';
    next.textContent=stop?'Les rotations sont en pause. Aucun tour supplémentaire ne sera créé avant la reprise.':
      'Les trois matchs du tour '+round+' doivent être terminés : les trois rencontres du tour '+(round+1)+' seront alors créées automatiquement sur les mêmes terrains.';
    panel.append(next);
    const list=make('div');list.style.cssText='display:flex;gap:7px;flex-wrap:wrap;';
    for(const role of roles){
      const m=currentRound.find(x=>x.rotation_role===role.key);
      if(!m)continue;
      const pill=make('span',role.title+' · '+(m.pitch||'Terrain')+' · '+(m.status==='finished'?'✓ terminé':'en attente'));
      pill.style.cssText='padding:6px 10px;border:1px solid #d8b970;border-radius:9px;background:#fff;font-size:12px;';
      list.append(pill);
    }
    panel.append(list);
    if(admin()){
      const control=make('button',stop?'▶️ Reprendre les rotations':'⏹️ Arrêter après ce tour');
      control.type='button';control.className='smallbtn';
      control.style.marginTop='10px';control.disabled=pending;
      control.onclick=async()=>{
        if(pending)return;
        if(!stop&&!confirm('Arrêter la génération automatique après le tour en cours ? Les résultats et les matchs existants seront conservés.'))return;
        pending=true;control.disabled=true;
        try{
          const {error}=await sb.rpc('swe_king_set_stop_v1',{p_tournament_id:current.id,p_stop:!stop});
          if(error)throw error;
          await refresh();
          toast(stop?'Rotations relancées ✅':'Arrêt après ce tour programmé ✅');
        }catch(error){toast(error.message||'Modification des rotations impossible');control.disabled=false}
        finally{pending=false}
      };
      panel.append(control);
    }
  }else{
    const info=make('p');
    info.style.cssText='font-weight:700;margin:8px 0;';
    info.textContent=matches.length===3?'3 matchs initiaux détectés · '+finished+' / 3 terminés · rotations non activées.':
      matches.length+' matchs enregistrés · le circuit attend trois matchs initiaux.';
    panel.append(info);
    if(!admin()){
      panel.append(make('p','L’administrateur doit activer les rotations automatiques.'));
      return;
    }
    const eligible=matches.length===3&&(S.teams||[]).length===6;
    if(!eligible){
      const note=make('p','Pour activer le circuit, crée trois matchs avec six équipes distinctes (deux par terrain).');
      note.className='muted';panel.append(note);return;
    }
    const pitched=(current.reserved_pitch_ids||[]).map(id=>(S.sportsPitches||[]).find(x=>String(x.id)===String(id))).filter(Boolean);
    const byPitchName=name=>pitched.find(x=>String(x.name||'').trim().toLocaleLowerCase('fr')===String(name||'').trim().toLocaleLowerCase('fr'));
    const ordered=matches.slice().sort((a,b)=>a.match_order-b.match_order);
    const row=make('div');row.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;';
    const selects={};
    for(let i=0;i<roles.length;i++){
      const role=roles[i],label=make('label');
      label.style.cssText='display:flex;flex-direction:column;gap:4px;min-width:0;font-weight:700;';
      label.append(make('span',role.title));
      const select=make('select');
      select.style.minHeight='42px';
      select.append(new Option('Choisir le terrain',''));
      for(const pitch of pitched)select.append(new Option(pitch.name,pitch.id));
      select.value=byPitchName(ordered[i]?.pitch)?.id||'';
      selects[role.key]=select;label.append(select);row.append(label);
    }
    panel.append(row);
    const breakLabel=make('label');
    breakLabel.style.cssText='display:flex;flex-direction:column;gap:4px;margin:12px 0;font-weight:700;';
    breakLabel.append(make('span','Départage des matchs nuls sur Mercedes et Boulogne'));
    const breakSelect=make('select');
    breakSelect.style.cssText='min-height:42px;max-width:430px;';
    for(const [value,label] of [
      ['shifumi_1','Shifumi · 1 manche'],
      ['shifumi_3','Shifumi · 3 manches'],
      ['penalties','Tirs au but (TAB)']
    ])breakSelect.append(new Option(label,value));
    breakSelect.value=current.tie_break_method||'shifumi_1';
    breakLabel.append(breakSelect);
    panel.append(breakLabel);
    const noteKing=make('p','Carrefour : première égalité départagée obligatoirement aux TAB à 3 tireurs ; ensuite le Roi en titre reste en cas de nul.');
    noteKing.className='muted';panel.append(noteKing);
    const explanation=make('p','Choisis le terrain du Roi, des Conquérants et des Bannis. Tu gardes les trois matchs, leurs scores et leurs buteurs. La rotation démarrera après la clôture du troisième match.');
    explanation.className='muted';explanation.style.marginTop='8px';panel.append(explanation);
    const activate=make('button','👑 Activer les rotations automatiques');
    activate.type='button';activate.className='primary';
    activate.disabled=pending||pitched.length!==3;
    const feedback=make('p');feedback.className='muted';feedback.setAttribute('role','status');
    if(pitched.length!==3)feedback.textContent='Impossible de retrouver les trois terrains réservés : vérifie les réglages du tournoi.';
    activate.onclick=async()=>{
      if(pending)return;
      const values=roles.map(role=>selects[role.key].value);
      if(values.some(v=>!v)||new Set(values).size!==3){feedback.textContent='Choisis trois terrains différents.';return}
      const summary=roles.map(role=>role.title+' : '+selects[role.key].selectedOptions[0]?.textContent).join('\n')+'\nDépartage Mercedes/Boulogne : '+breakSelect.selectedOptions[0]?.textContent;
      if(!confirm('Activer les rotations automatiques du Roi du terrain ?\n\n'+summary+'\n\nLes matchs et résultats déjà saisis sont conservés.'))return;
      pending=true;activate.disabled=true;feedback.textContent='Activation du circuit…';
      try{
        const params={p_tournament_id:current.id,p_tie_break_method:breakSelect.value};
        for(const role of roles)params[role.param]=selects[role.key].value;
        const {error}=await sb.rpc('swe_king_start_with_tie_v1',params);
        if(error)throw error;
        await refresh();
        toast('Circuit Roi du terrain activé ✅');
      }catch(error){feedback.textContent=error.message||'Activation impossible';activate.disabled=false;}
      finally{pending=false}
    };
    panel.append(activate,feedback);
  }
}
function schedule(){
  if(scheduled)return;scheduled=true;
  setTimeout(()=>{scheduled=false;try{mount()}catch(error){console.warn('Roi du terrain',error)}},110);
}
function start(){
  const host=document.getElementById('matchesList');
  if(host){const observer=new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length||r.removedNodes.length))schedule()});
    observer.observe(host,{childList:true,subtree:false});}
  document.addEventListener('swe:rendered',schedule);
  schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
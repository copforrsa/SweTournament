/* Shared PC/mobile match entry. Drafts belong to records, never to transient DOM. */
(()=>{
'use strict';
if(window.SWE_QUICK_MATCH_UI)return;
const drafts=new Map(),pending=new Set();
const key=(m,suffix)=>String(m.id)+':'+suffix;
const draft=(m,suffix,initial)=>{const k=key(m,suffix);if(!drafts.has(k))drafts.set(k,{...initial});return drafts.get(k)};
const eq=(a,b)=>String(a)===String(b);
const player=id=>(S.players||[]).find(p=>eq(p.id,id));
const name=id=>player(id)?.name||'Joueur';
const teamName=id=>(S.teams||[]).find(t=>eq(t.id,id))?.name||'Équipe';
const teamTone=id=>{const n=teamName(id).toLowerCase();if(n.includes('rouge'))return 'red';if(n.includes('bleu'))return 'blue';if(n.includes('jaune'))return 'yellow';if(n.includes('vert'))return 'green';if(n.includes('noir'))return 'black';if(n.includes('blanc'))return 'white';return 'neutral'};
const rows=m=>(S.goals||[]).filter(g=>eq(g.match_id,m.id));
const tour=m=>(S.tournaments||[]).find(t=>eq(t.id,m.tournament_id));
const superAdmin=()=>S?.isSuperAdmin===true;
const groupAdmin=()=>{try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}};
const editable=m=>{
  const t=tour(m);
  if(superAdmin())return true;
  if(!t||t.status==='finished')return false;
  if(String(m.status)==='finished')return groupAdmin()||(typeof canEditCurrentMatches==='function'&&canEditCurrentMatches());
  return typeof canEditCurrentMatches==='function'&&canEditCurrentMatches();
};
function roster(m,tid,history=false){
  const assignments=(S.matchAssignments||[]).filter(a=>eq(a.match_id,m.id));
  let ids=(assignments.length?assignments:S.teamPlayers||[]).filter(a=>eq(a.team_id,tid)).map(a=>a.player_id);
  if(history){ids.push(...(S.teamPlayers||[]).filter(a=>eq(a.team_id,tid)).map(a=>a.player_id));for(const r of m.substitutions||[])if(eq(r.team_id,tid))ids.push(r.in_id,r.out_id)}
  return [...new Set(ids)].filter(id=>player(id));
}
const isSub=(m,id)=>(m.substitutions||[]).some(s=>eq(s.in_id,id))||(S.tPlayers||[]).some(p=>eq(p.tournament_id,m.tournament_id)&&eq(p.player_id,id)&&p.is_substitute);
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function button(text,fn,disabled=false){const b=node('button',text);b.type='button';b.disabled=disabled;b.onclick=fn;return b}
function choose(label,options,value,change){
  const wrap=node('label',label),s=node('select');s.setAttribute('aria-label',label);
  for(const [id,text] of options){const o=node('option',text);o.value=id;s.append(o)}
  s.value=value??'';s.onchange=()=>change(s.value);wrap.append(s);return wrap;
}
function redraw(){if(typeof renderMatches==='function')renderMatches(false);window.SWE_MOUNT_MATCH_EXTRAS_4306?.(true)}
async function action(m,type,payload,success){
  if(pending.has(String(m.id)))return;
  if(!editable(m))return toast('Tournoi terminé ou droit de saisie manquant.');
  pending.add(String(m.id));redraw();
  try{
    const {data,error}=await sb.rpc('quick_match_action_v1',{p_match_id:m.id,p_action:type,p_payload:payload});
    if(error)throw error;
    if(!data?.match)throw new Error('Enregistrement non confirmé. Actualise le match.');
    // Do not inject a previous tournament response after navigation.
    if(eq(S.activeTour,m.tournament_id)){
      const i=S.matches.findIndex(x=>eq(x.id,m.id));if(i>=0)S.matches[i]=data.match;
      S.goals=[...(S.goals||[]).filter(g=>!eq(g.match_id,m.id)),...data.goals];
      S.matchAssignments=[...(S.matchAssignments||[]).filter(a=>!eq(a.match_id,m.id)),...data.assignments];
    }
    success?.();toast('Enregistré ✓');
  }catch(e){toast(e.message||'Enregistrement impossible. Ta saisie est conservée.')}
  finally{pending.delete(String(m.id));redraw()}
}
function summary(m,root){
  for(const r of m.substitutions||[]){
    const g=rows(m),goals=g.filter(x=>eq(x.scorer_player_id,r.in_id)).length,assists=g.filter(x=>eq(x.assister_player_id,r.in_id)).length;
    root.append(node('p','🔁 '+name(r.in_id)+' remplace '+name(r.out_id)+' · '+teamName(r.team_id)+' · '+goals+' but(s), '+assists+' passe(s)','swe4460-sub'));
  }
}
function render(panel,m){
  panel.replaceChildren();panel.classList.add('swe4460');
  const can=editable(m),busy=pending.has(String(m.id)),goals=rows(m);
  if(can){
    panel.append(node('h4','⚡ Saisie rapide · clique sur le buteur'));
    const teams=node('div',undefined,'swe4460-teams');
    for(const tid of [m.home_team_id,m.away_team_id]){
      const col=node('section');col.append(node('h4',teamName(tid)));
      const score=Number(eq(tid,m.home_team_id)?m.home_score:m.away_score),missing=Math.max(0,score-goals.filter(g=>eq(g.team_id,tid)).length);
      const mode=draft(m,'mode:'+tid,{attach:false});
      if(missing)col.append(button((mode.attach?'✓ ':'')+'Compléter '+missing+' but(s) déjà au score',()=>{mode.attach=!mode.attach;redraw()},busy));
      else mode.attach=false;
      for(const id of roster(m,tid)){
        const row=node('div',undefined,'swe4460-player-row');
        const b=button('⚽ '+name(id)+(isSub(m,id)?' · Remplaçant':''),()=>action(m,mode.attach?'attach':'add',{team_id:tid,scorer_id:id}),busy);
        b.className='swe4460-scorer'+(isSub(m,id)?' swe4460-sub':'');row.append(b);
        row.append(button('🔁',()=>{const d=draft(m,'sub',{});d.out=id;d.open=true;redraw()},busy));row.lastChild.setAttribute('aria-label','Remplacer '+name(id));
        col.append(row);
      }
      teams.append(col);
    }
    panel.append(teams);
  }
  const sub=draft(m,'sub',{open:false,out:'',incoming:''});
  if(can&&sub.open){
    const form=node('section',undefined,'swe4460-subform');
    form.append(node('b','Remplacer '+name(sub.out)+' pour ce match'));
    const options=(S.tPlayers||[]).filter(p=>eq(p.tournament_id,m.tournament_id)&&p.present&&p.is_substitute&&p.registration_status!=='waitlist'&&!roster(m,m.home_team_id).concat(roster(m,m.away_team_id)).some(id=>eq(id,p.player_id)));
    form.append(choose('Remplaçant déclaré',[['','Choisir…'],...options.map(p=>[p.player_id,name(p.player_id)])],sub.incoming,v=>{sub.incoming=v}));
    form.append(button('Confirmer le remplacement',()=>{if(!sub.incoming)return toast('Choisis un remplaçant.');action(m,'substitute',{out_id:sub.out,in_id:sub.incoming},()=>{sub.open=false;sub.incoming=''})},busy));
    form.append(button('Annuler',()=>{sub.open=false;redraw()},busy));panel.append(form);
  }
  panel.append(node('h4','Buts enregistrés · passeurs modifiables'));
  if(!goals.length)panel.append(node('p','Aucun buteur enregistré.'));
  for(const g of goals){
    const line=node('section',undefined,'swe4460-goal swe4460-goal-'+teamTone(g.team_id));line.dataset.goalId=g.id;
    line.append(node('b','⚽ '+name(g.scorer_player_id)+(isSub(m,g.scorer_player_id)?' · Remplaçant':'')+' · '+teamName(g.team_id)));
    line.append(node('p',g.assister_player_id?'🎯 '+name(g.assister_player_id)+(isSub(m,g.assister_player_id)?' · Remplaçant':''):g.assist_decided?'Aucun passeur':'Passeur à compléter'));
    if(can){
      const d=draft(m,'goal:'+g.id,{scorer:g.scorer_player_id,assist:g.assister_player_id||'',modify:false});
      // Undirtied inputs follow remote edits. Dirty selections survive every render.
      if(!d.dirty){d.scorer=g.scorer_player_id;d.assist=g.assister_player_id||''}
      const form=node('div',undefined,'swe4460-fields'),people=roster(m,g.team_id,true);
      if(d.modify)form.append(choose('Buteur',people.map(id=>[id,name(id)]),d.scorer,v=>{d.scorer=v;d.dirty=true;if(eq(v,d.assist))d.assist='';redraw()}));
      form.append(choose('Passeur',[['','Aucun passeur'],...people.filter(id=>!eq(id,d.scorer)).map(id=>[id,name(id)+(isSub(m,id)?' · Remplaçant':'')])],d.assist,v=>{d.assist=v;d.dirty=true}));
      form.append(button('Enregistrer le passeur',()=>action(m,'edit',{goal_id:g.id,scorer_id:d.scorer,assister_id:d.assist||null},()=>drafts.delete(key(m,'goal:'+g.id))),busy));
      form.append(button(d.modify?'Masquer le buteur':'Modifier le buteur',()=>{d.modify=!d.modify;redraw()},busy));
      form.append(button('Annuler ce but',()=>{if(confirm('Annuler ce but et diminuer le score ?'))action(m,'delete',{goal_id:g.id},()=>drafts.delete(key(m,'goal:'+g.id)))},busy));
      form.querySelectorAll('select').forEach(s=>s.disabled=busy);line.append(form);
    }
    panel.append(line);
  }
  summary(m,panel);
  if(can){
    const d=draft(m,'score',{open:false,home:m.home_score,away:m.away_score});
    const det=node('details');det.open=d.open;det.append(node('summary','Corriger le score'));det.ontoggle=()=>{d.open=det.open};
    const row=node('div',undefined,'swe4460-fields');
    for(const [field,tid] of [['home',m.home_team_id],['away',m.away_team_id]]){
      const lab=node('label',teamName(tid)),input=node('input');input.type='number';input.min=0;input.step=1;input.value=d.dirty?d[field]:(field==='home'?m.home_score:m.away_score);input.setAttribute('aria-label','Score '+teamName(tid));
      input.oninput=()=>{if(!d.dirty){d.home=m.home_score;d.away=m.away_score}d[field]=input.value;d.dirty=true};input.disabled=busy;lab.append(input);row.append(lab);
    }
    row.append(button('Enregistrer le score',()=>{const home=Number(d.dirty?d.home:m.home_score),away=Number(d.dirty?d.away:m.away_score);if(!Number.isInteger(home)||!Number.isInteger(away)||home<0||away<0)return toast('Saisis deux scores entiers positifs ou nuls.');action(m,'score',{home,away},()=>drafts.delete(key(m,'score')))},busy));
    det.append(row);panel.append(det);
  }else panel.append(node('p',tour(m)?.status==='finished'?'Tournoi terminé · résultats verrouillés':String(m.status)==='finished'?'Match terminé · correction réservée à l’administrateur':'Consultation seule'));
}
const css=node('style');css.textContent='.swe4460{font-size:16px}.swe4460-teams{display:grid;grid-template-columns:1fr 1fr;gap:12px}.swe4460-player-row{display:flex;gap:6px;margin:8px 0}.swe4460-scorer{flex:1;text-align:left;min-width:0;font-weight:900}.swe4460 button,.swe4460 select,.swe4460 input{min-height:44px;font-size:14px}.swe4460-fields{display:flex;gap:8px;flex-wrap:wrap;align-items:end}.swe4460-fields label{display:grid;gap:4px;flex:1;min-width:140px}.swe4460-goal{padding:12px;border:2px solid #b5cce0;border-radius:12px;margin:10px 0}.swe4460-goal p{margin:6px 0}.swe4460-goal-red{background:#fff0f0;border-color:#dc2626}.swe4460-goal-blue{background:#eff6ff;border-color:#2563eb}.swe4460-goal-yellow{background:#fffbeb;border-color:#d97706}.swe4460-goal-green{background:#f0fdf4;border-color:#16a34a}.swe4460-goal-black{background:#e5e7eb;border-color:#111827}.swe4460-goal-white{background:#fff;border-color:#94a3b8}.swe4460-goal-neutral{background:#f0f9ff;border-color:#0284c7}.swe4460-sub,.swe4460-subform{background:#fff0d7!important;color:#683900!important;border:1px solid #bf7200!important;border-radius:8px;padding:8px}.swe4460 details{margin-top:12px}.swe4460 summary{cursor:pointer;padding:10px}.swe4460 input{width:100%;min-width:0}@media(max-width:600px){.swe4460-teams{grid-template-columns:1fr}.swe4460-fields>*{flex:1 1 100%}}#matchesList .swe4300-match.finished{opacity:1}';document.head.append(css);
window.SWE_QUICK_MATCH_UI={render,roster,action};
document.addEventListener('swe:match-remote-final',()=>{if(!pending.size)redraw()});
document.addEventListener('swe:substitution',redraw);
redraw();
})();

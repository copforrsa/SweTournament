from pathlib import Path
import re

# app.js: make players from the two teams and substitutes compact, both collapsed by default.
p=Path('app.js')
s=p.read_text()
start=s.index('function buildMatchPlayerManager(match,home,away){')
end=s.index('\nfunction renderMatches(){', start)
old=s[start:end]
new=r'''function buildMatchPlayerManager(match,home,away){
  const wrap=document.createElement('div');
  wrap.className='player match-player-manager';
  wrap.style.marginTop='12px';
  wrap.style.background='#f8fbf9';
  const canMove=canEditCurrentMatches();
  const rows=S.matchAssignments.filter(a=>String(a.match_id)===String(match.id));
  const assignedMap=new Map(rows.map(a=>[a.player_id,a.team_id||'']));
  const homeBase=new Set(teamPlayerIds(home.id).map(String));
  const awayBase=new Set(teamPlayerIds(away.id).map(String));
  const tournamentPlayers=S.tPlayers.filter(tp=>tp.present&&tp.registration_status!=='waitlist')
    .map(tp=>({tp,pl:p(tp.player_id)})).filter(x=>x.pl)
    .sort((a,b)=>String(a.pl.name).localeCompare(String(b.pl.name)));
  const starters=tournamentPlayers.filter(({pl})=>homeBase.has(String(pl.id))||awayBase.has(String(pl.id))||[home.id,away.id].map(String).includes(String(assignedMap.get(pl.id)||'')));
  const substitutes=tournamentPlayers.filter(({pl})=>!starters.some(x=>String(x.pl.id)===String(pl.id)));

  wrap.innerHTML='<div class="row" style="justify-content:space-between"><div><b>🔄 Composition du match</b><div class="muted">Les listes sont repliées pour garder la page lisible pendant la saisie des scores.</div></div></div>';
  const formula=document.createElement('div');formula.className='muted';formula.style.marginTop='6px';
  if(S.workspaceFeatures.player_ratings_enabled)formula.innerHTML='⭐ Note automatique : victoire 6 • nul 5 • défaite 4 • +1/but • +0,5/passe • maximum 10.';
  wrap.appendChild(formula);

  const makePlayerRow=({tp,pl})=>{
    const currentTeam=assignedMap.has(pl.id)?assignedMap.get(pl.id):(homeBase.has(String(pl.id))?home.id:(awayBase.has(String(pl.id))?away.id:''));
    const row=document.createElement('div');row.className='row small match-player-row';row.style.padding='7px 0';row.style.borderBottom='1px solid #edf2ef';
    const name=document.createElement('span');name.style.flex='1';name.innerHTML='<b>'+esc(pl.name)+'</b>'+(tp.is_substitute?' <span class="guest-badge">Remplaçant commun</span>':'');
    const sel=document.createElement('select');sel.className='match-player-team-select';sel.disabled=!canMove;
    sel.innerHTML='<option value="">Hors match / remplaçant</option><option value="'+home.id+'">'+esc(home.name)+'</option><option value="'+away.id+'">'+esc(away.name)+'</option>';
    sel.value=currentTeam||'';
    const future=document.createElement('label');future.className='row match-future-label';future.style.justifyContent='flex-start';future.style.gap='4px';future.style.fontSize='11px';
    const cb=document.createElement('input');cb.type='checkbox';cb.style.width='auto';cb.disabled=!canMove;future.append(cb,document.createTextNode(' matchs suivants'));
    const save=document.createElement('button');save.textContent='Déplacer';save.className='smallbtn';save.disabled=!canMove;
    save.onclick=async()=>{save.disabled=true;const {error}=await sb.rpc('set_match_player_assignment',{p_match_id:match.id,p_player_id:pl.id,p_team_id:sel.value||null,p_apply_future:cb.checked});if(error){save.disabled=false;return toast(error.message)}await loadTournament();renderMatches();toast(cb.checked?'Joueur déplacé pour ce match et les suivants ✅':'Joueur déplacé pour ce match ✅');};
    row.append(name,sel,future,save);return row;
  };
  const makeDetails=(title,items,cls)=>{
    const det=document.createElement('details');det.className='match-player-details '+cls;
    const sum=document.createElement('summary');sum.innerHTML='<b>'+title+'</b><span class="muted">'+items.length+' joueur'+(items.length>1?'s':'')+'</span>';det.appendChild(sum);
    const list=document.createElement('div');list.className='match-player-list';items.forEach(x=>list.appendChild(makePlayerRow(x)));det.appendChild(list);return det;
  };
  wrap.appendChild(makeDetails('👥 Joueurs des 2 équipes',starters,'match-starters-details'));
  if(substitutes.length)wrap.appendChild(makeDetails('🟠 Remplaçants du tournoi',substitutes,'match-subs-details'));

  if(S.workspaceFeatures.player_ratings_enabled){
    const notes=document.createElement('details');notes.className='match-player-details match-notes-details';
    const rated=S.matchAssignments.filter(a=>a.match_id===match.id&&a.team_id).map(a=>{const pl=p(a.player_id),rr=ratingForMatchPlayer(match,a.player_id,a.team_id,S.goals);return pl&&rr?{pl,rr,team:a.team_id}:null;}).filter(Boolean).sort((a,b)=>b.rr.rating-a.rr.rating||a.pl.name.localeCompare(b.pl.name));
    notes.innerHTML='<summary><b>⭐ Notes des joueurs</b><span class="muted">'+rated.length+' évalué'+(rated.length>1?'s':'')+'</span></summary><div class="muted" style="padding:8px 2px">'+(rated.length?rated.map(x=>esc(x.pl.name)+' <b>'+x.rr.rating.toFixed(1)+'/10</b> ('+x.rr.result+' • ⚽ '+x.rr.goals+' • 🎯 '+x.rr.assists+')').join('<br>'):'Aucune note calculable pour le moment.')+'</div>';
    wrap.appendChild(notes);
  }
  return wrap;
}
'''
s=s[:start]+new+s[end:]
p.write_text(s)

# styles.css: compact match details and stable, uniformly aligned mobile nav.
p=Path('styles.css'); css=p.read_text()
css += r'''

/* V42.38 — terrain mobile : composition compacte + barre d'onglets stable */
.match-player-details{margin-top:8px;border:1px solid #dce7e0;border-radius:12px;background:#fff;overflow:hidden}
.match-player-details>summary{cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;min-height:42px}
.match-player-details>summary::-webkit-details-marker{display:none}
.match-player-details>summary:after{content:'⌄';font-size:16px;font-weight:900;color:#64748b;margin-left:5px}
.match-player-details[open]>summary:after{content:'⌃'}
.match-player-list{padding:0 10px 8px}
.match-player-team-select{max-width:190px}
@media(max-width:650px){
  .tabs{align-items:stretch!important;padding-left:8px!important;padding-right:8px!important;gap:4px!important;scroll-padding:0 8px}
  .tabs button,.tabs button.active{flex:0 0 76px!important;width:76px!important;min-width:76px!important;max-width:76px!important;min-height:54px!important;height:54px!important;padding:4px 3px!important;margin:0!important;line-height:1.05!important;text-align:center!important;white-space:normal!important;overflow:hidden}
  .tabs button:before{flex:0 0 auto;margin:0!important;line-height:20px!important}
  .match-player-manager{padding:10px!important}
  .match-player-row{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(118px,145px)!important;gap:6px!important;align-items:center!important}
  .match-player-row>span{min-width:0!important;overflow-wrap:anywhere}
  .match-player-team-select{max-width:none!important;min-height:40px!important;padding:7px!important}
  .match-future-label{grid-column:1/2!important;margin:0!important}
  .match-player-row>button{grid-column:2/3!important;min-height:38px!important;padding:6px 8px!important}
}
'''
p.write_text(css)

# Version and cache references.
p=Path('index.html'); html=p.read_text()
html=re.sub(r'V42\.\d+','V42.38',html)
html=re.sub(r'MAJ 42\.\d+','MAJ 42.38',html)
html=re.sub(r'styles\.css\?v=\d+','styles.css?v=4238',html)
html=re.sub(r'app\.js\?v=\d+','app.js?v=4238',html)
for n in ['4227','4228','4229','4230','4231','4232','4235','4236','4237']:
    html=re.sub(fr'(hotfix-v{n}\.js\?v=)\d+',fr'\g<1>4238',html)
html=re.sub(r'(ui-stability-v4234\.js\?v=)\d+',r'\g<1>4238',html)
p.write_text(html)

sw=Path('sw.js').read_text()
sw=re.sub(r"const CACHE='[^']+';","const CACHE='swe-tournament-5v5-v42-38';",sw,1)
Path('sw.js').write_text(sw)

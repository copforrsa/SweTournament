(()=>{
'use strict';
const VERSION='42.38';
function setVersion(){
  document.title=document.title.replace(/V42\.\d+/g,'V'+VERSION);
  document.querySelectorAll('h1 span').forEach(x=>{if(/^V42\./.test((x.textContent||'').trim()))x.textContent='V'+VERSION});
  document.querySelectorAll('.build-badge').forEach(x=>x.textContent='MAJ '+VERSION);
}
function installCss(){
  if(document.getElementById('swe4238css'))return;
  const st=document.createElement('style');st.id='swe4238css';st.textContent=`
  #matchesList details[data-swe-team-players],#matchesList details[data-swe-other-players]{margin-top:8px;border:1px solid #e4ebe7;border-radius:11px;background:#fff;overflow:hidden}
  #matchesList details[data-swe-team-players]>summary,#matchesList details[data-swe-other-players]>summary{cursor:pointer;font-weight:900;padding:9px 10px;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:8px}
  #matchesList details[data-swe-team-players]>summary::-webkit-details-marker,#matchesList details[data-swe-other-players]>summary::-webkit-details-marker{display:none}
  #matchesList details[data-swe-team-players]>summary:after,#matchesList details[data-swe-other-players]>summary:after{content:'＋';font-size:16px;color:#64748b}
  #matchesList details[open][data-swe-team-players]>summary:after,#matchesList details[open][data-swe-other-players]>summary:after{content:'−'}
  #matchesList .swe-match-player-rows{padding:0 10px 6px}
  @media(max-width:650px){
    .tabs{align-items:stretch!important;padding-left:8px!important;padding-right:8px!important;gap:4px!important}
    .tabs button{flex:0 0 76px!important;min-width:76px!important;max-width:76px!important;min-height:54px!important;height:54px!important;padding:5px 4px!important;line-height:1.05!important;justify-content:center!important;text-align:center!important}
    .tabs button.active{flex-basis:76px!important}
    .tabs button:before{height:20px!important;display:flex!important;align-items:center!important;justify-content:center!important;line-height:20px!important;margin:0!important}
  }`;
  document.head.appendChild(st);
}
function splitPlayerPanel(card){
  const outer=card.querySelector('details[data-swe-compact-players]');
  const panel=outer?.querySelector('.player');
  if(!panel||panel.dataset.split4238==='1')return;
  const rowCandidates=[...panel.querySelectorAll('.row.small')].filter(r=>r.querySelector('select'));
  if(!rowCandidates.length)return;
  panel.dataset.split4238='1';
  const list=rowCandidates[0].parentElement;
  if(!list)return;
  const teamRows=[],otherRows=[];
  rowCandidates.forEach(r=>{
    const sel=r.querySelector('select');
    const current=sel?.value||'';
    (current?teamRows:otherRows).push(r);
  });
  const make=(kind,label,rows)=>{
    if(!rows.length)return null;
    const d=document.createElement('details');d.dataset[kind]='1';
    const s=document.createElement('summary');s.textContent=label+' ('+rows.length+')';d.appendChild(s);
    const body=document.createElement('div');body.className='swe-match-player-rows';rows.forEach(r=>body.appendChild(r));d.appendChild(body);return d;
  };
  const teamDetails=make('sweTeamPlayers','👥 Joueurs des 2 équipes',teamRows);
  const otherDetails=make('sweOtherPlayers','🟠 Remplaçants / autres joueurs',otherRows);
  if(teamDetails)list.insertAdjacentElement('beforebegin',teamDetails);
  if(otherDetails)(teamDetails||list).insertAdjacentElement('afterend',otherDetails);
  list.remove();
  const summary=outer.querySelector(':scope > summary');
  if(summary)summary.textContent='🔄 Gestion des joueurs du match';
}
function apply(){
  setVersion();installCss();
  if(!document.getElementById('view-matches')?.classList.contains('active'))return;
  document.querySelectorAll('#matchesList .match').forEach(splitPlayerPanel);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
document.addEventListener('swe:rendered',apply);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="matches"],.tab'))setTimeout(apply,120)},true);
})();

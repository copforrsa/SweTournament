/* Consult standings without rebuilding the match editor. */
(()=>{
 'use strict';
 const E=id=>document.getElementById(id);
 let dialog,content,signature='',timer;
 function standings(t){
  const rows=(S.teams||[]).filter(x=>String(x.tournament_id)===String(t.id)).map(x=>({id:String(x.id),name:x.name,mj:0,pts:0,bp:0,bc:0})),map=new Map(rows.map(x=>[x.id,x]));
  for(const m of S.matches||[]){
   if(String(m.tournament_id)!==String(t.id)||m.status!=='finished'||m.rotation_role==='conquest'||m.competition_type==='conquest_playoff')continue;
   const h=map.get(String(m.home_team_id)),a=map.get(String(m.away_team_id));if(!h||!a)continue;
   const hs=Number(m.home_score||0),as=Number(m.away_score||0);h.mj++;a.mj++;h.bp+=hs;h.bc+=as;a.bp+=as;a.bc+=hs;
   if(hs>as)h.pts+=3;else if(as>hs)a.pts+=3;else{h.pts++;a.pts++}
  }
  return rows.sort((a,b)=>b.pts-a.pts||(b.bp-b.bc)-(a.bp-a.bc)||b.bp-a.bp||String(a.name).localeCompare(String(b.name)));
 }
 function update(){
  if(!dialog?.open)return;
  const t=typeof currentTour==='function'?currentTour():null,rows=t?standings(t):[],next=JSON.stringify([t?.id,t?.name,rows]);if(next===signature)return;signature=next;content.replaceChildren();
  const title=document.createElement('h3');title.textContent=t?.name||'Choisis un tournoi';content.append(title);
  const note=document.createElement('p');note.className='muted';note.textContent='Matchs terminés uniquement · 3 points par victoire, 1 par nul. Les barrages, demi-finales et finale ne modifient pas le classement.';content.append(note);
  if(!rows.length){const empty=document.createElement('p');empty.textContent='Aucune équipe disponible.';content.append(empty);return}
  const table=document.createElement('table');table.innerHTML='<thead><tr><th>Rang</th><th>Équipe</th><th>MJ</th><th>Diff.</th><th>Pts</th></tr></thead>';const body=document.createElement('tbody');
  rows.forEach((r,i)=>{const tr=document.createElement('tr');for(const value of [i+1,r.name,r.mj,(r.bp-r.bc>0?'+':'')+(r.bp-r.bc),r.pts]){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}body.append(tr)});table.append(body);content.append(table);
 }
 function mount(){
  const select=E('matchCompetitionSelect');if(!select)return;
  if(!dialog){
   const style=document.createElement('style');style.textContent='#sweStandingsDialog{box-sizing:border-box;position:fixed;inset:0 0 0 auto;margin:0;width:min(480px,100vw);height:100dvh;max-height:100dvh;max-width:100vw;border:0;border-radius:16px 0 0 16px;padding:22px;background:#fff;color:#17324d;overflow:auto;box-shadow:-8px 0 35px #0003}#sweStandingsDialog::backdrop{background:#071d3166}#sweStandingsDialog header{display:flex;align-items:center;justify-content:space-between;gap:12px}#sweStandingsDialog h2{font-size:21px;margin:0}#sweStandingsDialog table{width:100%;border-collapse:collapse;font-size:14px}#sweStandingsDialog th,#sweStandingsDialog td{padding:12px 5px;border-bottom:1px solid #dfe7ef;text-align:center}#sweStandingsDialog th:nth-child(2),#sweStandingsDialog td:nth-child(2){text-align:left}#sweStandingsDialog td:last-child{font-weight:900}#sweStandingsDialog .muted{font-size:13px;line-height:1.5}#sweMatchStandingsButton{margin:8px 0;min-height:44px}#sweStandingsDialog button{min-height:44px}@media(max-width:650px){#sweStandingsDialog{inset:auto 0 0;margin:0;width:100%;height:auto;max-height:82dvh;border-radius:18px 18px 0 0;padding:18px}}';document.head.append(style);
   dialog=document.createElement('dialog');dialog.id='sweStandingsDialog';dialog.setAttribute('aria-labelledby','sweStandingsTitle');dialog.innerHTML='<header><h2 id="sweStandingsTitle">📊 Classement</h2><button type="button" aria-label="Fermer le classement">✕ Fermer</button></header>';dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}};content=document.createElement('div');dialog.append(content);document.body.append(dialog);
  }
  if(!E('sweMatchStandingsButton')){const button=document.createElement('button');button.id='sweMatchStandingsButton';button.type='button';button.textContent='📊 Classement';button.onclick=()=>{signature='';dialog.showModal();update()};select.insertAdjacentElement('afterend',button)}
  update();
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(mount,80)}
 document.addEventListener('swe:rendered',schedule);document.addEventListener('swe:match-remote-final',schedule);document.addEventListener('DOMContentLoaded',mount);
 const observe=()=>{const box=E('matchesList');if(box)new MutationObserver(schedule).observe(box,{subtree:true,childList:true})};observe();mount();
 window.SWE_MATCH_STANDINGS={standings,update};
})();

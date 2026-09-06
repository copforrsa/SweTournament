(()=>{
'use strict';
const VERSION='42.37';
function setVersion(){document.title=document.title.replace(/V42\.\d+/g,'V'+VERSION);document.querySelectorAll('h1 span').forEach(x=>{if(/^V42\./.test(x.textContent.trim()))x.textContent='V'+VERSION});document.querySelectorAll('.build-badge').forEach(x=>x.textContent='MAJ '+VERSION)}
function resolveContext(btn){
  if(typeof S==='undefined'||typeof currentTour!=='function')return null;
  const card=btn.closest('.swe-team-card,.team');
  const row=btn.closest('.player,li,.row');
  if(!card||!row)return null;
  const team=(S.teams||[]).find(t=>card.textContent?.includes(t.name));
  if(!team)return null;
  const members=(S.teamPlayers||[]).filter(tp=>String(tp.team_id)===String(team.id)).map(tp=>(S.players||[]).find(p=>String(p.id)===String(tp.player_id))).filter(Boolean);
  const pl=members.find(p=>row.textContent?.includes(p.name));
  return pl?{team,pl}:null;
}
function protectLegacyButtons(){
  if(typeof isAdmin!=='function'||!isAdmin())return;
  const view=document.getElementById('view-teams');if(!view)return;
  view.querySelectorAll('button').forEach(b=>{
    const txt=(b.textContent||'').trim();
    if(/^Retirer$/i.test(txt)&&!b.dataset.sweWithdraw){
      b.dataset.sweLegacyRemove='1';
      b.title='Le retrait nécessite maintenant un motif';
    }
    if(b.dataset.sweWithdraw){b.textContent='⚠️ Retirer du tournoi';b.title='Retirer avec motif obligatoire';}
  });
}
document.addEventListener('click',e=>{
  const b=e.target.closest?.('#view-teams button');if(!b)return;
  const txt=(b.textContent||'').trim();
  if(!(b.dataset.sweLegacyRemove==='1'||(/^Retirer$/i.test(txt)&&!b.dataset.sweWithdraw)))return;
  const ctx=resolveContext(b);if(!ctx)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  if(typeof openWithdrawModal==='function')openWithdrawModal(ctx.team,ctx.pl);
  else if(typeof toast==='function')toast('Recharge la page : le retrait motivé est en cours d’activation.');
},true);
function apply(){setVersion();protectLegacyButtons()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
document.addEventListener('swe:rendered',apply);
window.addEventListener('pageshow',apply);
})();

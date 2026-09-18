/* Ratings and real match relations in Joueurs / Notes; no reconstruction of its forms. */
(()=>{
'use strict';
if(window.SWE_PLAYER_PROGRESS_4462)return;
const E=id=>document.getElementById(id),num=v=>Number(v).toLocaleString('fr-FR',{maximumFractionDigits:2}),signed=v=>(Number(v)>0?'+':'')+num(v);
const state=()=>typeof S==='undefined'?null:S,client=()=>typeof sb==='undefined'?null:sb;
let info=null,key='',loadedAt=0,busy=false,filter='all';
function textRating(r){
 if(!r||r.avg_rating==null)return 'Pas encore noté';
 return num(r.avg_rating)+'/5 · '+signed(r.rating_delta||0)+' d’évolution cumulée'+(r.has_pending?' · '+signed(r.pending_delta||0)+' provisoire (vote en cours)':'');
}
function apply(){
 const box=E('playersList'),s=state();if(!box||!s?.workspace?.id)return;
 if(key!==s.workspace.id+':'+(s.session?.user?.id||''))return;
 let bar=E('swePlayerRelations4462');
 if(!bar){
  bar=document.createElement('div');bar.id='swePlayerRelations4462';bar.className='swe-player-relations';
  for(const [value,label] of [['all','Tous les joueurs'],['with','Ont joué avec moi'],['against','Ont joué contre moi']]){
   const b=document.createElement('button');b.type='button';b.dataset.relation=value;b.textContent=label;b.onclick=()=>{filter=value;apply()};bar.append(b);
  }
  const summary=document.createElement('p');summary.setAttribute('role','status');bar.append(summary);box.before(bar);
 }
 const rows=[...box.children].filter(n=>n.classList.contains('player'));
 // renderPlayers builds one direct child per player in this order.
 rows.forEach((row,i)=>{if(!row.dataset.ratingPlayer&&s.players[i])row.dataset.ratingPlayer=s.players[i].id});
 const byId=new Map((info?.players||[]).map(p=>[String(p.player_id),p]));let shown=0;
 rows.forEach(row=>{
  const p=byId.get(row.dataset.ratingPlayer);
  row.classList.toggle('swe-relation-hidden',filter!=='all'&&!(filter==='with'?p?.played_with:p?.played_against));
  if(!row.classList.contains('swe-relation-hidden'))shown++;
  if(!p?.rating)return;
  let badge=row.querySelector('.swe-rating-evolution');
  if(!badge){badge=document.createElement('div');badge.className='swe-rating-evolution';row.firstElementChild?.after(badge)}
  const label=textRating(p.rating);if(badge.textContent!==label)badge.textContent=label;
  badge.classList.toggle('negative',Number(p.rating.rating_delta)<0);
 });
 bar.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.relation===filter));b.disabled=b.dataset.relation!=='all'&&!info?.profile_linked});
 const message=!info?'Chargement de l’historique…':!info.profile_linked?'Relie ton profil joueur pour filtrer tes coéquipiers et adversaires.':shown+' joueur(s) · matchs terminés du groupe, remplacements compris';
 if(bar.querySelector('p').textContent!==message)bar.querySelector('p').textContent=message;
}
async function load(force=false){
 const s=state(),c=client();if(!s?.workspace?.id||!c||!['admin','coorganizer'].includes(s.workspace.role))return;
 const next=s.workspace.id+':'+(s.session?.user?.id||'');
 if(busy)return;
 if(next!==key){key=next;info=null;filter='all';loadedAt=0;E('swePlayerRelations4462')?.remove()}
 if(!force&&info&&Date.now()-loadedAt<60000){apply();return}
 busy=true;apply();
 try{const r=await c.rpc('get_workspace_player_progress_v4462',{p_workspace_id:s.workspace.id});if(r.error)throw r.error;if(next!==state()?.workspace?.id+':'+(state()?.session?.user?.id||''))return;info=r.data;loadedAt=Date.now();}
 catch(e){const p=E('swePlayerRelations4462')?.querySelector('p');if(p)p.textContent='Historique indisponible. Rouvre Joueurs / Notes pour réessayer.';}
 finally{busy=false;if(info)apply()}
}
const css=document.createElement('style');css.textContent='.swe-player-relations{padding:12px;border:1px solid #bdd7ee;border-radius:14px;background:#f0f7ff;margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap}.swe-player-relations button{min-height:44px;background:#fff;color:#173963;border:1px solid #91b8dd;border-radius:22px;padding:9px 14px}.swe-player-relations button[aria-pressed=true]{background:#1465c0;color:#fff}.swe-player-relations p{flex:1 1 100%;margin:0;color:#304e70}.swe-rating-evolution{margin:8px 0;padding:8px 12px;background:#e4f5ec;color:#165a38;border-radius:10px;font-weight:700}.swe-rating-evolution.negative{background:#fff0df;color:#80430b}.swe-relation-hidden{display:none!important}@media(max-width:600px){.swe-player-relations button{flex:1 1 100%}}';document.head.append(css);
const original=window.renderPlayers;
if(typeof original==='function')window.renderPlayers=function(...args){const result=original.apply(this,args);apply();return result};
document.addEventListener('swe:rendered',()=>load());
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="players"]'))load(true)});
window.SWE_PLAYER_PROGRESS_4462={apply,load,textRating};load();
})();

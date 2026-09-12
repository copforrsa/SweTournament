(()=>{
'use strict';
const VERSION='42.40';
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
function setVersion(){window.SWEApplyBuild?.();}
function decoratePlayers(){
  if(typeof S==='undefined'||!document.getElementById('view-players')?.classList.contains('active'))return;
  const box=document.getElementById('playersList');if(!box)return;
  let legend=document.getElementById('sweGuestLegend40');
  if(!legend){legend=document.createElement('div');legend.id='sweGuestLegend40';legend.className='readonly-note';legend.style.marginBottom='10px';legend.innerHTML='👥 <b>Lecture de la liste :</b> les fiches grisées sont des <b>invités</b> et ne font pas partie du groupe. Les membres du groupe restent affichés normalement.';box.insertAdjacentElement('beforebegin',legend)}
  const cards=[...box.children].filter(c=>c.classList?.contains('player'));
  (S.players||[]).forEach(pl=>{const card=cards.find(c=>c.querySelector(':scope > .row > span:first-child > b')?.textContent.trim()===String(pl.name||'').trim());if(!card)return;card.style.opacity=pl.is_group_member===false?'.58':'1';card.style.background=pl.is_group_member===false?'#f1f3f2':'';let badge=card.querySelector('[data-group-state40]');if(!badge){badge=document.createElement('div');badge.dataset.groupState40='1';badge.style.cssText='margin-top:4px;font-size:11px;font-weight:800';card.querySelector(':scope > .row > span:first-child')?.appendChild(badge)}badge.textContent=pl.is_group_member===false?'Invité • ne fait pas partie du groupe':'Membre du groupe';badge.style.color=pl.is_group_member===false?'#6b7280':'#15803d';});
}
function joinedNewcomers(){
  if(typeof S==='undefined')return;
  const ids=new Set((S.players||[]).filter(p=>p.is_group_member!==false).map(p=>String(p.id)));
  document.querySelectorAll('[id*="new" i],[class*="new" i]').forEach(root=>{if(!/nouve/i.test(root.textContent||''))return;root.querySelectorAll('.player,.rank,li').forEach(row=>{const pl=(S.players||[]).find(p=>ids.has(String(p.id))&&row.textContent?.includes(p.name));if(!pl||row.querySelector('[data-joined40]'))return;row.style.opacity='.58';const tag=document.createElement('span');tag.dataset.joined40='1';tag.textContent=' • A rejoint le groupe';tag.style.cssText='font-size:11px;font-weight:800;color:#15803d';row.appendChild(tag)});});
}
function apply(){setVersion();decoratePlayers();joinedNewcomers()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();document.addEventListener('swe:rendered',apply);document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="players"],.tab'))setTimeout(apply,150)},true);
})();
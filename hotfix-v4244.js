(()=>{
'use strict';
const VERSION='42.44';
let membershipFlags=new Map();
let membershipLoadedFor=null;
let membershipLoading=null;
function setVersion44(){
  document.title=document.title.replace(/V42\.\d+/g,'V'+VERSION);
  document.querySelectorAll('h1 span').forEach(x=>{if(/^V42\./.test(x.textContent.trim()))x.textContent='V'+VERSION});
  document.querySelectorAll('.build-badge').forEach(x=>x.textContent='MAJ '+VERSION);
}
function playersViewActive(){return document.getElementById('view-players')?.classList.contains('active')}
function topPlayerCards(){const box=document.getElementById('playersList');return box?[...box.children].filter(x=>x.classList?.contains('player')):[]}
function playerCardName(card){return card?.querySelector(':scope > .row > span:first-child > b')?.textContent?.trim()||''}
function findPlayerCard(pl){return topPlayerCards().find(c=>playerCardName(c)===String(pl?.name||'').trim())||null}
async function loadMembershipFlags(force=false){
  if(typeof S==='undefined'||!S.workspace?.id)return;
  if(!force&&membershipLoadedFor===String(S.workspace.id))return;
  if(membershipLoading)return membershipLoading;
  membershipLoading=(async()=>{
    const r=await sb.rpc('get_player_membership_history_flags',{p_workspace_id:S.workspace.id});
    if(!r.error){
      membershipFlags=new Map((r.data||[]).map(x=>[String(x.player_id),x]));
      membershipLoadedFor=String(S.workspace.id);
      (S.players||[]).forEach(pl=>{const f=membershipFlags.get(String(pl.id));if(f){pl.was_guest=!!f.was_guest;pl.joined_group_at=f.joined_group_at||null;}});
    }
  })();
  try{await membershipLoading}finally{membershipLoading=null}
}
function cleanReliabilityNoise(){
  if(!playersViewActive())return;
  document.querySelectorAll('#playersList [data-reliability]').forEach(tag=>{
    const txt=(tag.textContent||'').trim();
    if(!txt||/Aucun désistement tardif/i.test(txt))tag.remove();
  });
  // sécurité contre les anciennes lignes injectées sans attribut
  topPlayerCards().forEach(card=>{
    [...card.querySelectorAll('div,span')].forEach(el=>{if(/^✓\s*Aucun désistement tardif/i.test((el.textContent||'').trim())&&el.children.length===0)el.remove();});
  });
}
function decoratePlayers44(){
  if(typeof S==='undefined'||!playersViewActive())return;
  const box=document.getElementById('playersList');if(!box)return;
  let legend=document.getElementById('sweGuestLegend44');
  document.getElementById('sweGuestLegend40')?.remove();
  if(!legend){legend=document.createElement('div');legend.id='sweGuestLegend44';legend.className='readonly-note';legend.style.marginBottom='10px';box.insertAdjacentElement('beforebegin',legend)}
  legend.innerHTML='👥 <b>Lecture de la liste :</b> une fiche grisée correspond à un <b>invité</b> qui ne fait pas partie du groupe. Lorsqu’un invité devient membre, sa fiche redevient normale.';
  (S.players||[]).forEach(pl=>{
    const card=findPlayerCard(pl);if(!card)return;
    const guest=pl.is_group_member===false;
    card.style.opacity=guest?'.58':'1';
    card.style.background=guest?'#f1f3f2':'';
    let badge=card.querySelector('[data-group-state44]');
    card.querySelector('[data-group-state40]')?.remove();
    if(!badge){badge=document.createElement('div');badge.dataset.groupState44='1';badge.style.cssText='margin-top:4px;font-size:11px;font-weight:800';card.querySelector(':scope > .row > span:first-child')?.appendChild(badge)}
    badge.textContent=guest?'Invité • ne fait pas partie du groupe':'Membre du groupe';
    badge.style.color=guest?'#6b7280':'#15803d';
    let joined=card.querySelector('[data-joined-member44]');
    const f=membershipFlags.get(String(pl.id));
    if(!guest&&(f?.was_guest||pl.was_guest)&& (f?.joined_group_at||pl.joined_group_at)){
      if(!joined){joined=document.createElement('div');joined.dataset.joinedMember44='1';joined.style.cssText='margin-top:3px;font-size:11px;font-weight:800;color:#15803d';badge.insertAdjacentElement('afterend',joined)}
      joined.textContent='✓ A rejoint le groupe';
    }else joined?.remove();
  });
  cleanReliabilityNoise();
}
function cardForButton(btn){let n=btn;const root=document.getElementById('playersList');while(n&&n.parentElement!==root)n=n.parentElement;return n&&n.parentElement===root?n:null}
function controlsForCard(card){
  const inputs=[...card.querySelectorAll('input')];
  const name=inputs.find(i=>i.type!=='tel'&&i.type!=='number'&&i.type!=='checkbox'&&i.type!=='radio');
  const phone=inputs.find(i=>i.type==='tel');
  const selects=[...card.querySelectorAll('select')];
  const status=selects.find(s=>[...s.options].some(o=>o.value==='member')&&[...s.options].some(o=>o.value==='guest'));
  const host=selects.find(s=>s!==status&&[...s.options].some(o=>/Guest de/i.test(o.textContent||'')));
  return {name,phone,status,host};
}
async function savePlayerInfo44(btn){
  const card=cardForButton(btn);if(!card)return;
  const currentName=playerCardName(card);const pl=(S.players||[]).find(p=>String(p.name||'').trim()===currentName);if(!pl)return toast('Joueur introuvable.');
  const {name,phone,status,host}=controlsForCard(card);if(!name||!status)return toast('Formulaire joueur incomplet.');
  const newName=name.value.trim(),isMember=status.value==='member',wasGuest=pl.is_group_member===false;
  if(newName.length<2)return toast('Nom invalide.');
  btn.disabled=true;const old=btn.textContent;btn.textContent='Enregistrement…';
  const r=await sb.rpc('manager_update_player_personal_info',{p_player_id:pl.id,p_name:newName,p_is_group_member:isMember,p_guest_of_player_id:isMember?null:(host?.value||null),p_phone_number:phone?.value.trim()||null});
  if(r.error){btn.disabled=false;btn.textContent=old;return toast(r.error.message)}
  pl.name=newName;pl.is_group_member=isMember;pl.guest_of_player_id=isMember?null:(host?.value||null);
  if(wasGuest&&isMember){pl.was_guest=true;pl.joined_group_at=pl.joined_group_at||new Date().toISOString();membershipFlags.set(String(pl.id),{player_id:pl.id,was_guest:true,joined_group_at:pl.joined_group_at});}
  if(typeof S.contacts!=='undefined'&&phone){const found=(S.contacts||[]).find(c=>String(c.player_id)===String(pl.id));if(found)found.phone_number=phone.value.trim()||null;else S.contacts.push({player_id:pl.id,phone_number:phone.value.trim()||null});}
  btn.textContent='✓ Enregistré';
  if(typeof renderPlayers==='function')renderPlayers();
  decoratePlayers44();
  toast('Informations enregistrées ✅');
  await loadMembershipFlags(true);decoratePlayers44();
}
document.addEventListener('click',e=>{
  const btn=e.target.closest?.('#playersList .player-action-save');
  if(!btn)return;
  e.preventDefault();e.stopImmediatePropagation();
  savePlayerInfo44(btn).catch(err=>{btn.disabled=false;btn.textContent='Enregistrer les infos';toast(err?.message||'Impossible d’enregistrer.');});
},true);
async function apply44(){setVersion44();if(!playersViewActive())return;await loadMembershipFlags();decoratePlayers44();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>apply44(),{once:true});else apply44();
document.addEventListener('swe:rendered',()=>apply44());
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="players"],.tab'))setTimeout(()=>apply44(),100)},true);
})();

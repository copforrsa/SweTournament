/* SWÉ v50.72 — accès salon intégré aux actions co-gestionnaire et au lien public. */
(()=>{
  'use strict';
  if(window.__SWEDrawRoomAccess5072)return;
  window.__SWEDrawRoomAccess5072=true;

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const state=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
  const client=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};
  const isCoorg=()=>{try{return typeof isCoorganizer==='function'&&isCoorganizer()}catch(_){return false}};
  const isAdmin=()=>{try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}};
  let refreshTimer=0;

  function activeTournament(){
    const s=state();
    const list=s?.tournaments||[];
    const id=s?.teamCompetitionId||s?.activeTour;
    return list.find(t=>String(t.id)===String(id)) || list.find(t=>t.draw_room_first_enabled) || null;
  }
  function roomCountdown(deadline){
    const remaining=new Date(deadline||0).getTime()-Date.now();
    if(!Number.isFinite(remaining)||remaining<=0)return 'Vote terminé';
    const seconds=Math.floor(remaining/1000), h=Math.floor(seconds/3600), m=Math.floor((seconds%3600)/60), s=seconds%60;
    return h>0 ? h+' h '+String(m).padStart(2,'0')+' min' : String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  }
  function style(){
    if(document.getElementById('sweDrawRoomAccessStyle5072'))return;
    const node=document.createElement('style'); node.id='sweDrawRoomAccessStyle5072';
    node.textContent=`
      .swe-draw-inline{border:1px solid #cbd5e1;background:#f8fafc}.swe-draw-inline.active{border-color:#34d399;background:linear-gradient(135deg,#ecfdf5,#eff6ff)}
      .swe-draw-inline.locked,.swe-draw-inline.waiting{background:#f1f5f9;color:#64748b;filter:none}.swe-draw-inline .swe-draw-status{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;margin-top:4px}
      .swe-draw-inline.active .swe-draw-status{color:#047857}.swe-draw-inline .swe-draw-countdown{font-variant-numeric:tabular-nums;font-weight:950}.swe-draw-inline button{margin-top:8px;width:100%}
      .swe-draw-public-access{margin-top:12px;padding:12px;border-radius:14px;border:1px solid rgba(30,64,175,.2);background:linear-gradient(135deg,#eff6ff,#f8fafc);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.swe-draw-public-access b{display:block;color:#173b67}.swe-draw-public-access small{display:block;margin-top:3px;color:#52677f;line-height:1.4}.swe-draw-public-access a{white-space:nowrap;text-decoration:none}
    `; document.head.append(node);
  }
  function getActionContainer(){
    const root=document.getElementById('sweCoorgDashboard4399');
    if(!root)return null;
    const section=[...root.querySelectorAll('.swe-coorg-section')].find(node=>/Actions à réaliser/i.test(node.textContent||''));
    if(!section)return null;
    let actions=section.querySelector('.swe-coorg-actions');
    if(!actions){
      actions=document.createElement('div'); actions.className='swe-coorg-actions';
      const empty=[...section.querySelectorAll('.muted')].find(node=>/Aucune action/i.test(node.textContent||''));
      if(empty)empty.remove();
      section.append(actions);
    }
    return actions;
  }
  function card(t,data){
    const open=Boolean(data?.can_vote&&!data?.expired);
    const copy=open
      ? 'Ton accès est ouvert. Entre dans le salon pour voter parmi les compositions proposées.'
      : 'Le salon apparaîtra ici dès que l’administrateur ouvrira la fenêtre de vote.';
    const time=open?'<span class="swe-draw-countdown" data-swe-room-countdown="'+esc(data.deadline)+'">'+roomCountdown(data.deadline)+'</span> restantes':'';
    return '<article class="swe-coorg-action swe-draw-inline '+(open?'active':'waiting')+'" data-swe-draw-inline="'+esc(t.id)+'"><div class="swe-coorg-action-icon">🗳️</div><div class="swe-coorg-action-body"><b>Salon des équipes</b><div class="swe-coorg-action-copy">'+esc(copy)+'</div><div class="swe-draw-status">'+(open?'● '+time:'○ Accès verrouillé')+'</div><button type="button" '+(open?'data-swe-v2-open="'+esc(t.id)+'"':'disabled')+'>'+ (open?'Accéder au salon →':'Vote indisponible')+'</button></div></article>';
  }
  async function rpcState(t){
    const api=client(); if(!api||!t)return null;
    const {data,error}=await api.rpc('team_draw_room_state_v2',{p_tournament_id:t.id});
    return error?null:data;
  }
  async function refreshDashboard(){
    if(!(isCoorg()||isAdmin()))return;
    const actions=getActionContainer(),t=activeTournament();
    if(!actions||!t)return;
    style();
    const data=await rpcState(t);
    const node=actions.querySelector('[data-swe-draw-inline]');
    const html=card(t,data);
    if(node)node.outerHTML=html; else actions.insertAdjacentHTML('afterbegin',html);
    updateCountdowns();
  }
  function updateCountdowns(){document.querySelectorAll('[data-swe-room-countdown]').forEach(node=>node.textContent=roomCountdown(node.dataset.sweRoomCountdown));}
  async function openRoom(id){
    for(let attempt=0;attempt<25;attempt+=1){
      if(window.SWETeamDrawSalonV2?.open){window.SWETeamDrawSalonV2.open(id);return;}
      await new Promise(resolve=>setTimeout(resolve,120));
    }
    if(typeof toast==='function')toast('Le salon se charge encore. Actualise la page puis réessaie.');
  }
  function publicAccess(){
    style();
    const box=document.querySelector('.sp-team-callout, .sp-next');
    const t=activeTournament();
    if(!box||!t||t.format!=='conquest'||box.querySelector('[data-swe-draw-public-access]'))return;
    const url=new URL('./',window.location.href); url.searchParams.set('draw_room',t.id);
    const access=document.createElement('div'); access.className='swe-draw-public-access'; access.dataset.sweDrawPublicAccess='1';
    access.innerHTML='<div><b>🔒 Accès co-gestionnaires</b><small>Connexion obligatoire. Le salon est réservé aux co-gestionnaires sélectionnés pour le vote.</small></div><a class="primary" href="'+esc(url.toString())+'">Ouvrir le salon</a>';
    box.append(access);
  }
  function schedule(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{refreshDashboard().catch(()=>{});publicAccess();},180);}
  document.addEventListener('click',event=>{const button=event.target.closest?.('[data-swe-v2-open]');if(!button)return;event.preventDefault();openRoom(button.dataset.sweV2Open);},true);
  ['DOMContentLoaded','swe:rendered','swe:page-view','swe:dashboard-ready'].forEach(name=>document.addEventListener(name,schedule));
  window.addEventListener('pageshow',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  [250,900,2200,4200].forEach(delay=>setTimeout(schedule,delay));
  setInterval(()=>{updateCountdowns();refreshDashboard().catch(()=>{});publicAccess();},15000);
})();
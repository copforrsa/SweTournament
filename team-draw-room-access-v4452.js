/* Clear entry points for the private team draw room, without changing a draw. */
(()=>{
  'use strict';
  const E=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const state=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
  const admin=()=>{try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}};
  const coorg=()=>{try{return typeof isCoorg==='function'&&isCoorg()}catch(_){return false}};
  const date=value=>{const d=new Date(value||'');return Number.isNaN(d.getTime())?'le délai indiqué par l’administrateur':d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})};
  let timer=0;

  function openRoom(id){
    const s=state();if(!s||!id)return;
    s.activeTour=id;s.teamCompetitionId=id;
    Promise.resolve(typeof loadTournament==='function'?loadTournament():null).finally(()=>{
      if(typeof setView==='function')setView('teams');
      setTimeout(()=>E('teamReviewPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),120);
    });
  }

  function renderAdmin(){
    const home=E('view-home');if(!home)return;
    const old=E('sweDrawRoomAdminAccess4452');
    const s=state();
    if(!admin()||!s){old?.remove();return;}
    const open=(s.tournaments||[]).filter(t=>t.format!=='league'&&['pending','redraw_requested'].includes(String(t.team_review_status||'')));
    if(!open.length){old?.remove();return;}
    const card=old||document.createElement('section');
    card.id='sweDrawRoomAdminAccess4452';card.className='card';
    card.style.cssText='border:1px solid #8db7f4;background:linear-gradient(135deg,#f5faff,#edf7ff);margin-bottom:14px';
    card.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap"><div><div style="font-size:11px;font-weight:900;letter-spacing:.08em;color:#1d4ed8">SALON DE TIRAGE</div><h2 class="sectiontitle" style="margin:4px 0">📋 Actions à réaliser — salon de tirage</h2><p class="muted" style="margin:0">Ouvre le salon pour lancer le tirage, consulter les avis et publier les équipes.</p></div></div><div style="display:grid;gap:8px;margin-top:12px">'+open.map(t=>'<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 12px;border-radius:12px;background:#fff"><span><b>'+esc(t.name||'Tournoi')+'</b><small style="display:block;color:#526478">'+(t.team_review_deadline?'⏱ Avis attendus avant '+date(t.team_review_deadline):'Premier tirage à lancer dans le salon')+'</small></span><button type="button" class="primary" data-swe-open-draw-room="'+t.id+'">Ouvrir le salon →</button></div>').join('')+'</div>';
    if(home.firstElementChild!==card)home.prepend(card);
  }

  function renderCoorg(){
    if(!coorg())return;
    const root=E('sweCoorgDashboard4399');if(!root)return;
    const team=root.querySelector('[data-coorg-action="team"]')?.closest('.swe-coorg-action');
    if(team){
      const title=team.querySelector('h3'),copy=team.querySelector('p'),button=team.querySelector('[data-coorg-action="team"]'),deadline=team.querySelector('.swe-coorg-deadline');
      if(title)title.textContent='Salon de tirage';
      if(copy)copy.textContent='Rejoins le salon. Dès le premier tirage, conserve la proposition ou demande un nouveau tirage.';
      if(button&&!button.disabled)button.textContent=button.textContent.includes('Modifier')?'Modifier mon avis':'Ouvrir le salon';
      if(deadline)deadline.textContent=deadline.textContent.replace('Avant le','Jusqu’au');
    }
    const rating=root.querySelector('[data-coorg-action="rating"]')?.closest('.swe-coorg-action');
    if(rating){
      const title=rating.querySelector('h3'),copy=rating.querySelector('p'),button=rating.querySelector('[data-coorg-action="rating"]');
      if(title)title.textContent='Notation après match';
      if(copy)copy.textContent='Retrouve ici les joueurs à noter après les matchs.';
      if(button&&!button.disabled)button.textContent='Ouvrir la notation';
    }
  }

  function render(){renderAdmin();renderCoorg();}
  function schedule(){clearTimeout(timer);timer=setTimeout(render,100)}
  document.addEventListener('click',event=>{const button=event.target.closest?.('[data-swe-open-draw-room]');if(button){event.preventDefault();openRoom(button.dataset.sweOpenDrawRoom);}});
  ['DOMContentLoaded','swe:rendered','swe:page-view','swe:dashboard-ready'].forEach(event=>document.addEventListener(event,schedule));
  window.addEventListener('pageshow',schedule);
  [300,900,1800].forEach(delay=>setTimeout(render,delay));
})();

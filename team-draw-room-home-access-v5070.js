/* SWÉ v50.70 — accès au salon de composition avant toute génération. */
(()=>{
  'use strict';
  if(window.__SWEDrawRoomHomeAccess5070)return;
  window.__SWEDrawRoomHomeAccess5070=true;

  const E=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const state=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
  const client=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};
  const admin=()=>{try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}};
  const regular=t=>t&&t.format!=='league'&&t.status!=='finished'&&t.team_review_status!=='approved';
  const teamsExist=t=>{
    const s=state();
    return (s?.teams||[]).some(team=>String(team.tournament_id)===String(t?.id)&&!team.is_preformed);
  };
  const canPrepare=t=>regular(t)&&!teamsExist(t);
  const cache=new Map();
  let timer=0;

  function style(){
    if(E('sweDrawRoomHomeAccessStyle'))return;
    const node=document.createElement('style');
    node.id='sweDrawRoomHomeAccessStyle';
    node.textContent=`
      .swe-draw-home-card{border:2px solid #60a5fa!important;background:linear-gradient(135deg,#eff6ff,#ecfdf5)!important;margin-bottom:14px}
      .swe-draw-home-card .swe-draw-kicker{font-size:11px;font-weight:950;letter-spacing:.1em;color:#1d4ed8}
      .swe-draw-home-card .swe-draw-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    `;
    document.head.append(node);
  }

  async function setup(t){
    const cached=cache.get(String(t.id));
    if(cached&&Date.now()-cached.at<30000)return cached.data;
    const api=client();
    if(!api||!admin())return null;
    try{
      const {data,error}=await api.rpc('team_draw_room_setup_v2',{p_tournament_id:t.id});
      if(error)throw error;
      cache.set(String(t.id),{at:Date.now(),data});
      return data;
    }catch(_){
      cache.set(String(t.id),{at:Date.now(),data:null});
      return null;
    }
  }

  async function open(tournamentId){
    for(let attempt=0;attempt<20;attempt+=1){
      if(window.SWETeamDrawSalonV2?.open){
        window.SWETeamDrawSalonV2.open(tournamentId);
        return;
      }
      await new Promise(resolve=>setTimeout(resolve,120));
    }
    if(typeof toast==='function')toast('Le salon se charge. Actualise la page puis réessaie.');
  }

  function card(t,data){
    const ready=Boolean(data?.can_start);
    const count=Number(data?.confirmed_players||0);
    const limit=Number(data?.max_players||t.max_players||0);
    const text=ready
      ? 'Les inscriptions sont closes ou le quota est atteint. Choisis les co-gestionnaires votants, puis ouvre la fenêtre d’une heure.'
      : 'Prépare dès maintenant les co-gestionnaires qui voteront. Le salon pourra démarrer dès la clôture des inscriptions ou le quota atteint.';
    const countText=limit?count+' / '+limit+' inscrits':'Préparation du tirage';
    return '<section class="card swe-draw-home-card" data-swe-draw-home-card="'+esc(t.id)+'"><div class="swe-draw-kicker">COMPOSITION COLLABORATIVE</div><h2 class="sectiontitle" style="margin:4px 0">🗳️ Salon des équipes</h2><p class="muted" style="margin:0">'+esc(t.name||'Tournoi')+' · <b>'+esc(countText)+'</b><br>'+esc(text)+'</p><div class="swe-draw-actions"><button type="button" class="primary" data-swe-draw-home-open="'+esc(t.id)+'">'+(ready?'Ouvrir le salon →':'Préparer le salon →')+'</button></div></section>';
  }

  async function mountHome(){
    const home=E('view-home');
    if(!home||!admin())return;
    style();
    const items=(state()?.tournaments||[]).filter(canPrepare);
    const ids=new Set(items.map(t=>String(t.id)));
    home.querySelectorAll('[data-swe-draw-home-card]').forEach(node=>{if(!ids.has(String(node.dataset.sweDrawHomeCard)))node.remove();});
    const checked=await Promise.all(items.map(async t=>({t,data:await setup(t)})));
    checked.forEach(({t,data})=>{
      if(!data||data.has_generated_teams)return;
      const previous=home.querySelector('[data-swe-draw-home-card="'+String(t.id)+'"]');
      if(previous)previous.remove();
      home.insertAdjacentHTML('afterbegin',card(t,data));
    });
  }

  function updateTeamsButton(){
    const s=state();
    const id=s?.teamCompetitionId||s?.activeTour;
    const t=(s?.tournaments||[]).find(item=>String(item.id)===String(id));
    if(!admin()||!canPrepare(t))return;
    const button=E('smartAutoTeams');
    if(!button)return;
    button.disabled=false;
    button.textContent='🗳️ '+((t.registration_open)?'Préparer le salon de composition':'Ouvrir le salon de composition');
    button.title='Le tirage se fait dans le salon, avant toute création d’équipe.';
  }

  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(()=>{mountHome().catch(()=>{});updateTeamsButton();},140);
  }

  document.addEventListener('click',event=>{
    const target=event.target.closest?.('[data-swe-draw-home-open],#smartAutoTeams');
    if(!target)return;
    const s=state();
    const id=target.dataset.sweDrawHomeOpen||s?.teamCompetitionId||s?.activeTour;
    const t=(s?.tournaments||[]).find(item=>String(item.id)===String(id));
    if(!canPrepare(t))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(t.id);
  },true);

  ['DOMContentLoaded','swe:rendered','swe:page-view','swe:dashboard-ready'].forEach(name=>document.addEventListener(name,schedule));
  window.addEventListener('pageshow',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  [300,900,2200,4000].forEach(delay=>setTimeout(schedule,delay));
})();

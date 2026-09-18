/* Alphabetical player directory for the Joueurs / Notes view. */
(()=>{
  'use strict';
  if(window.__SWE_PLAYERS_DIRECTORY_4477)return;
  window.__SWE_PLAYERS_DIRECTORY_4477=true;
  const E=id=>document.getElementById(id);
  const state=()=>{try{return typeof S==='undefined'?null:S}catch(_){return null}};
  const initial=name=>{
    const letter=String(name||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').charAt(0).toUpperCase();
    return /^[A-Z]$/.test(letter)?letter:'#';
  };
  function avatar(player){
    const photo=String(player?.avatar_url||'').trim(),el=document.createElement(photo?'img':'span');
    el.className='swe4477-avatar'+(photo?'':' fallback');
    if(photo){el.src=photo;el.alt='Photo de '+(player?.name||'joueur');el.loading='lazy';el.decoding='async'}else{el.textContent='⚽';el.setAttribute('aria-hidden','true')}
    return el;
  }
  function apply(){
    const box=E('playersList'),s=state();
    if(!box||!Array.isArray(s?.players))return;
    const cards=[...box.children].filter(x=>x.classList.contains('player'));
    const letters=new Set();
    cards.forEach((card,index)=>{
      const player=s.players[index];if(!player)return;
      const letter=initial(player.name);letters.add(letter);card.dataset.playerId=player.id;card.dataset.playerInitial=letter;card.classList.add('swe4477-player-card');
      const top=card.firstElementChild,info=top?.querySelector(':scope > span');if(!top||!info)return;
      info.classList.add('swe4477-player-info');
      const name=info.querySelector('b');if(name)name.classList.add('swe4477-player-name');
      if(!top.querySelector('.swe4477-avatar'))top.prepend(avatar(player));
    });
    let nav=E('swe4477PlayerAlphabet');
    if(!nav){nav=document.createElement('nav');nav.id='swe4477PlayerAlphabet';nav.className='swe4477-player-alphabet';nav.setAttribute('aria-label','Accès alphabétique aux joueurs');(E('swePlayerRelations4462')||box).before(nav)}
    const ordered=[...letters].sort((a,b)=>a.localeCompare(b,'fr'));
    nav.replaceChildren();
    const label=document.createElement('b');label.textContent='Trouver un joueur :';nav.append(label);
    ordered.forEach(letter=>{const b=document.createElement('button');b.type='button';b.textContent=letter;b.setAttribute('aria-label','Aller aux joueurs commençant par '+letter);b.onclick=()=>{const target=[...box.children].find(card=>card.classList.contains('player')&&card.dataset.playerInitial===letter&&card.style.display!=='none');if(!target)return;target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.remove('swe4477-flash');void target.offsetWidth;target.classList.add('swe4477-flash')};nav.append(b)});
  }
  const style=document.createElement('style');style.textContent=`
    .swe4477-player-alphabet{display:flex;gap:7px;align-items:center;flex-wrap:wrap;padding:11px 12px;margin:0 0 12px;border:1px solid #bcd5ef;border-radius:14px;background:linear-gradient(135deg,#edf7ff,#f4fbf7)}
    .swe4477-player-alphabet b{color:#123b65;margin-right:2px}.swe4477-player-alphabet button{width:36px;min-height:36px;padding:4px;border:1px solid #8ab6de;border-radius:9px;background:#fff;color:#164d82;font-weight:950}.swe4477-player-alphabet button:hover,.swe4477-player-alphabet button:focus-visible{background:#1465c0;color:#fff;outline:none}
    #playersList .swe4477-player-card>.row{align-items:center;gap:10px}.swe4477-avatar{width:48px;height:48px;min-width:48px;border-radius:50%;object-fit:cover;border:2px solid #fff;box-shadow:0 3px 9px rgba(15,44,76,.18);background:#dbeafe}.swe4477-avatar.fallback{display:grid;place-items:center;color:#0f477c;font-size:22px}.swe4477-player-name{font-size:20px;line-height:1.15;color:#102f50}.swe4477-player-info{min-width:0}.swe4477-flash{animation:swe4477Flash 1.7s ease-out}@keyframes swe4477Flash{0%,45%{box-shadow:0 0 0 4px #1d8ff2;background:#e9f6ff}100%{}}
    @media(max-width:620px){.swe4477-player-alphabet{gap:5px}.swe4477-player-alphabet b{flex-basis:100%}.swe4477-player-alphabet button{width:32px;min-height:32px}.swe4477-avatar{width:42px;height:42px;min-width:42px}.swe4477-player-name{font-size:18px}}
  `;document.head.appendChild(style);
  const original=window.renderPlayers;
  if(typeof original==='function')window.renderPlayers=function(...args){const result=original.apply(this,args);apply();return result};
  document.addEventListener('swe:rendered',()=>setTimeout(apply,60));
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="players"]'))setTimeout(apply,100)},true);
  setTimeout(apply,350);
})();

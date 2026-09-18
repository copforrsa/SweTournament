/* Search, sorting and alphabetical navigation for the Joueurs / Notes view. */
(()=>{
  'use strict';
  if(window.__SWE_PLAYERS_DIRECTORY_4477)return;
  window.__SWE_PLAYERS_DIRECTORY_4477=true;
  const E=id=>document.getElementById(id);
  const state=()=>{try{return typeof S==='undefined'?null:S}catch(_){return null}};
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();
  const initial=name=>{const letter=normalize(name).charAt(0).toUpperCase();return /^[A-Z]$/.test(letter)?letter:'#'};
  function avatar(player){
    const photo=String(player?.avatar_url||'').trim(),el=document.createElement(photo?'img':'span');
    el.className='swe4477-avatar'+(photo?'':' fallback');
    if(photo){el.src=photo;el.alt='Photo de '+(player?.name||'joueur');el.loading='lazy';el.decoding='async'}else{el.textContent='⚽';el.setAttribute('aria-hidden','true')}
    return el;
  }
  function filterAndSort(){
    const box=E('playersList'),s=state();if(!box||!Array.isArray(s?.players))return;
    const query=normalize(E('swe4477PlayerSearch')?.value),direction=E('swe4477PlayerSort')?.value==='desc'?-1:1;
    const byId=new Map(s.players.map(player=>[String(player.id),player]));
    const cards=[...box.children].filter(card=>card.classList.contains('player'));
    cards.forEach(card=>{const player=byId.get(String(card.dataset.playerId||card.dataset.ratingPlayer||''));card.classList.toggle('swe4477-search-hidden',!!query&&!normalize(player?.name||card.querySelector('.swe4477-player-name')?.textContent).includes(query))});
    cards.sort((a,b)=>direction*String(byId.get(String(a.dataset.playerId))?.name||'').localeCompare(String(byId.get(String(b.dataset.playerId))?.name||''),'fr',{sensitivity:'base'})).forEach(card=>box.append(card));
  }
  function apply(){
    const box=E('playersList'),s=state();if(!box||!Array.isArray(s?.players))return;
    const cards=[...box.children].filter(x=>x.classList.contains('player')),letters=new Set();
    cards.forEach((card,index)=>{
      const knownId=card.dataset.playerId||card.dataset.ratingPlayer;
      const player=(knownId&&s.players.find(item=>String(item.id)===String(knownId)))||s.players[index];if(!player)return;
      const letter=initial(player.name);letters.add(letter);card.dataset.playerId=player.id;card.dataset.playerInitial=letter;card.classList.add('swe4477-player-card');
      const top=card.firstElementChild,info=top?.querySelector(':scope > span');if(!top||!info)return;
      info.classList.add('swe4477-player-info');const name=info.querySelector('b');if(name)name.classList.add('swe4477-player-name');
      if(!top.querySelector('.swe4477-avatar'))top.prepend(avatar(player));
    });
    let tools=E('swe4477PlayerTools');
    if(!tools){
      tools=document.createElement('section');tools.id='swe4477PlayerTools';tools.className='swe4477-player-tools';tools.setAttribute('aria-label','Recherche et filtres des joueurs');
      tools.innerHTML='<div class="swe4477-player-search"><label><span>Rechercher un joueur</span><input id="swe4477PlayerSearch" type="search" placeholder="Nom du joueur…" autocomplete="off"></label><label><span>Trier</span><select id="swe4477PlayerSort"><option value="asc">Nom : A à Z</option><option value="desc">Nom : Z à A</option></select></label></div>';
      box.before(tools);E('swe4477PlayerSearch').addEventListener('input',filterAndSort);E('swe4477PlayerSort').addEventListener('change',filterAndSort);
    }
    let nav=E('swe4477PlayerAlphabet');
    if(!nav){nav=document.createElement('nav');nav.id='swe4477PlayerAlphabet';nav.className='swe4477-player-alphabet';nav.setAttribute('aria-label','Accès alphabétique aux joueurs');tools.append(nav)}else if(nav.parentElement!==tools)tools.append(nav);
    nav.replaceChildren();const label=document.createElement('b');label.textContent='Trouver un joueur :';nav.append(label);
    [...letters].sort((a,b)=>a.localeCompare(b,'fr')).forEach(letter=>{const button=document.createElement('button');button.type='button';button.textContent=letter;button.setAttribute('aria-label','Aller aux joueurs commençant par '+letter);button.onclick=()=>{const target=[...box.children].find(card=>card.classList.contains('player')&&card.dataset.playerInitial===letter&&!card.classList.contains('swe4477-search-hidden')&&!card.classList.contains('swe-relation-hidden'));if(!target)return;target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.remove('swe4477-flash');void target.offsetWidth;target.classList.add('swe4477-flash')};nav.append(button)});
    const relations=E('swePlayerRelations4462');if(relations&&relations.parentElement!==tools)tools.append(relations);
    filterAndSort();
  }
  const style=document.createElement('style');style.textContent=`
    .swe4477-player-tools{position:sticky;top:10px;z-index:35;margin:0 0 12px;padding:12px;background:#f8fbff;border:1px solid #bcd5ef;border-radius:16px;box-shadow:0 8px 24px rgba(15,47,80,.16);isolation:isolate}
    .swe4477-player-search{display:grid;grid-template-columns:minmax(180px,1fr) minmax(160px,.38fr);gap:9px}.swe4477-player-search label{display:grid;gap:4px;color:#123b65;font-size:12px;font-weight:900}.swe4477-player-search input,.swe4477-player-search select{min-height:42px;background:#fff}
    .swe4477-player-alphabet{display:flex;gap:7px;align-items:center;flex-wrap:wrap;padding:10px 0 0;margin:0;background:#f8fbff}.swe4477-player-alphabet b{color:#123b65;margin-right:2px}.swe4477-player-alphabet button{width:36px;min-height:36px;padding:4px;border:1px solid #8ab6de;border-radius:9px;background:#fff;color:#164d82;font-weight:950}.swe4477-player-alphabet button:hover,.swe4477-player-alphabet button:focus-visible{background:#1465c0;color:#fff;outline:none}
    .swe4477-player-tools .swe-player-relations{margin:10px 0 0;background:#f0f7ff}.swe4477-search-hidden{display:none!important}
    #playersList .swe4477-player-card>.row{align-items:center;gap:10px}.swe4477-avatar{width:48px;height:48px;min-width:48px;border-radius:50%;object-fit:cover;border:2px solid #fff;box-shadow:0 3px 9px rgba(15,44,76,.18);background:#dbeafe}.swe4477-avatar.fallback{display:grid;place-items:center;color:#0f477c;font-size:22px}.swe4477-player-name{font-size:20px;line-height:1.15;color:#102f50}.swe4477-player-info{min-width:0}.swe4477-flash{animation:swe4477Flash 1.7s ease-out}@keyframes swe4477Flash{0%,45%{box-shadow:0 0 0 4px #1d8ff2;background:#e9f6ff}100%{}}
    @media(max-width:620px){.swe4477-player-tools{top:max(6px,env(safe-area-inset-top));margin-left:-5px;margin-right:-5px;padding:9px;border-radius:14px}.swe4477-player-search{grid-template-columns:minmax(0,1fr) 126px}.swe4477-player-search label span{font-size:11px}.swe4477-player-alphabet{gap:5px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.swe4477-player-alphabet::-webkit-scrollbar{display:none}.swe4477-player-alphabet b{position:sticky;left:0;flex:0 0 auto;background:#f8fbff;padding-right:4px}.swe4477-player-alphabet button{flex:0 0 32px;width:32px;min-height:32px}.swe4477-player-tools .swe-player-relations{flex-wrap:nowrap;overflow-x:auto;padding:8px;scrollbar-width:none}.swe4477-player-tools .swe-player-relations button{flex:0 0 auto;min-height:40px;white-space:nowrap}.swe4477-player-tools .swe-player-relations p{display:none}.swe4477-avatar{width:42px;height:42px;min-width:42px}.swe4477-player-name{font-size:18px}}
  `;document.head.appendChild(style);
  const original=window.renderPlayers;if(typeof original==='function')window.renderPlayers=function(...args){const result=original.apply(this,args);apply();return result};
  document.addEventListener('swe:rendered',()=>setTimeout(apply,60));document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="players"]'))setTimeout(apply,100)},true);setTimeout(apply,350);
})();

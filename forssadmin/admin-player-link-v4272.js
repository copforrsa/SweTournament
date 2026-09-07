(()=>{
'use strict';
if(window.__SWE_SA_PLAYER_LINK_4272)return;
window.__SWE_SA_PLAYER_LINK_4272=true;

function addLinkButtons(){
  const tbody=document.getElementById('playersBody');
  if(!tbody||typeof cache==='undefined')return;
  [...tbody.querySelectorAll('tr')].forEach(tr=>{
    const edit=tr.querySelector('[data-action="player-edit"]');
    if(!edit)return;
    const playerId=edit.dataset.id;
    const p=(cache.players||[]).find(x=>String(x.player_id)===String(playerId));
    if(!p||p.linked_account||tr.querySelector('[data-sa-link-account]'))return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='btn ghost mini';
    btn.dataset.saLinkAccount='1';
    btn.textContent='Rattacher un compte';
    btn.onclick=async()=>{
      const email=prompt('Email du compte SWÉ à rattacher à '+(p.player_name||'ce joueur')+' :','');
      if(!email)return;
      btn.disabled=true;btn.textContent='Rattachement…';
      try{
        await sb.rpc('super_admin_link_player_account_v1',{p_player_id:p.player_id,p_user_email:String(email).trim()}).then(r=>{if(r.error)throw r.error;return r.data});
        await refreshAll();
      }catch(e){alert(e.message||String(e));btn.disabled=false;btn.textContent='Rattacher un compte';}
    };
    const actions=tr.querySelector('td.actions');
    if(actions)actions.appendChild(btn);
  });
}

try{
  const original=renderPlayers;
  renderPlayers=function(){original();setTimeout(addLinkButtons,0)};
}catch(e){console.warn('SWÉ SA player link',e)}

setTimeout(()=>{if(typeof active!=='undefined'&&active==='players')addLinkButtons()},500);
})();
/* Administrator attribution, read from the immutable creation journal. */
(()=>{'use strict';
let key='',rows=[],busy=false,timer;
const admin=()=>{try{return typeof isAdmin==='function'&&isAdmin()}catch(_){return false}};
function apply(){if(!admin()||key!==S.workspace?.id+'|'+S.players.map(p=>p.id).join(','))return;const byId=new Map(rows.map(r=>[r.player_id,r]));
 document.querySelectorAll('#playersList > .player').forEach(card=>{const name=card.querySelector('.row > span > b')?.textContent;const player=S.players.find(p=>p.name===name);const source=byId.get(player?.id);if(!source)return;let label=card.querySelector('[data-player-creation-source]');if(!label){label=document.createElement('div');label.dataset.playerCreationSource='';label.className='muted';label.style.cssText='margin:6px 0;font-size:12px';card.querySelector('.row')?.after(label)}const text='Ajouté par '+source.added_by+' · '+new Date(source.added_at).toLocaleString('fr-FR',{timeZone:'America/Martinique',dateStyle:'short',timeStyle:'short'});if(label.textContent!==text)label.textContent=text;});}
async function load(){if(!admin()||!S.workspace?.id||busy)return;const next=S.workspace.id+'|'+S.players.map(p=>p.id).join(',');if(key===next){apply();return}busy=true;try{const r=await sb.rpc('admin_get_player_creation_sources_v1',{p_workspace_id:S.workspace.id});if(r.error)throw r.error;if(next!==S.workspace?.id+'|'+S.players.map(p=>p.id).join(','))return;key=next;rows=r.data||[];apply()}catch(e){console.warn('Attribution des membres',e)}finally{busy=false}}
function schedule(){clearTimeout(timer);timer=setTimeout(load,80)}
function boot(){const list=document.getElementById('playersList');if(list)new MutationObserver(schedule).observe(list,{childList:true});schedule()}
document.addEventListener('swe:rendered',schedule);document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="players"]'))schedule()});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

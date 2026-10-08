/* One authenticated identity; explicit, independent player and management navigation. */
(()=>{'use strict';
let uid=null,mode=null,playerTab='home',managementView='home',switching=false,restoreEntry=false;
const scroll={player:0,management:0},drafts=new Map();
const state=()=>{try{return S}catch(_){return null}};
const canManage=()=>['admin','coorganizer'].includes(state()?.workspace?.role);
function persist(){try{localStorage.setItem('swe_spaces:'+uid,JSON.stringify({mode,playerTab,managementView}));const url=new URL(location.href);if(url.searchParams.get('space')!==mode){url.searchParams.set('space',mode);url.searchParams.delete('start');history.replaceState({},'',url.pathname+url.search+url.hash)}}catch(_){}}
function ready(){const s=state();if(!s?.spacesReady||!s?.session?.user||s.publicMode||s.isSuperAdmin)return false;
 if(uid!==s.session.user.id){uid=s.session.user.id;let saved={};try{saved=JSON.parse(localStorage.getItem('swe_spaces:'+uid)||'{}')}catch(_){}const explicit=new URL(location.href).searchParams.get('space');const desired=['player','management'].includes(explicit)?explicit:saved.mode;mode=desired==='management'&&canManage()?'management':desired==='player'&&s.playerAccountAccess?'player':canManage()?'management':'player';playerTab=['home','swes','profile','group'].includes(saved.playerTab)?saved.playerTab:'home';managementView=saved.managementView||'home';restoreEntry=true;}
 return true;}
function beforeView(v){if(!ready())return v;if(switching)return v;
 if(mode==='player')return 'myplayer';
 if(v==='myplayer')return managementView;
 managementView=v;persist();return v;}
function rememberDrafts(){for(const el of document.querySelectorAll('.view.active input,.view.active select,.view.active textarea')){if(el.type==='password'||el.type==='file')continue;const key=el.id||el.dataset.fastDraft;if(key)drafts.set(key,{value:el.value,checked:el.checked})}}
function restoreDrafts(){for(const el of document.querySelectorAll('.view.active input,.view.active select,.view.active textarea')){const value=drafts.get(el.id||el.dataset.fastDraft);if(value){el.value=value.value;if(el.type==='checkbox'||el.type==='radio')el.checked=value.checked}}}
async function selectGroup(workspaceId){
 const member=(state()?.memberships||[]).find(m=>String(m.workspace_id)===String(workspaceId)&&['admin','coorganizer'].includes(m.role));if(!member)return;
 rememberDrafts();mode='management';managementView='home';persist();
 const select=document.getElementById('sweSpaceGroup');if(select)select.disabled=true;
 const title=document.querySelector('#sweSpaceBar strong');if(title)title.textContent='Ouverture du groupe…';
 const url=new URL(location.href);url.searchParams.set('workspace',member.workspace_id);url.searchParams.set('space','management');url.searchParams.delete('start');
 try{localStorage.setItem('swe_workspace_id',member.workspace_id);window.SWE_SPACES.navigateGroup(url.toString());}
 catch(e){if(select)select.disabled=false;if(typeof toast==='function')toast(e.message||'Impossible d’ouvrir ce groupe.')}
}

function switchSpace(next){if(!ready()||next===mode||next==='management'&&!canManage())return;rememberDrafts();scroll[mode]=window.scrollY;mode=next;persist();switching=true;try{setView(mode==='player'?'myplayer':managementView)}finally{switching=false}apply();restoreDrafts();window.scrollTo({top:scroll[mode],behavior:'instant'});}
const groups={home:['myPlayerMySwes','myPlayerInvites','myPlayerRequests'],swes:['myPlayerMySwes','myPlayerInvites','myPlayerRequests','myPlayerOpportunities','mySweHistoryCode'],profile:['myPlayerName','myPlayerStats','swe4338Health','myPlayerIdentity'],group:['myPlayerGroups']};
function apply(){if(!ready())return;document.body.classList.toggle('swe-player-space',mode==='player');document.body.classList.toggle('swe-management-space',mode==='management');
 const main=document.querySelector('main')||document.querySelector('.app');if(!main)return;
 let bar=document.getElementById('sweSpaceBar');if(!bar){bar=document.createElement('div');bar.id='sweSpaceBar';bar.innerHTML='<strong></strong><button type="button" data-space-switch></button>';const top=main.querySelector('header');if(top)top.after(bar);else main.prepend(bar);bar.querySelector('button').onclick=()=>switchSpace(mode==='player'?'management':'player')}
 bar.querySelector('strong').textContent=mode==='player'?'Mon SWÉ · Joueur':'Gestion du groupe · '+(state().workspace?.role==='admin'?'Organisateur':'Co-gestionnaire');const toggle=bar.querySelector('button');toggle.textContent=mode==='player'?'Gérer mes SWÉ':'Retour à mon espace joueur';toggle.hidden=mode==='player'&&!canManage();
 let group=document.getElementById('sweSpaceGroup');if(!group){group=document.createElement('select');group.id='sweSpaceGroup';group.setAttribute('aria-label','Choisir le groupe à gérer');bar.append(group);group.onchange=()=>selectGroup(group.value)}
 const members=(state().memberships||[]).filter(m=>['admin','coorganizer'].includes(m.role));
 const signature=JSON.stringify(members.map(m=>[m.workspace_id,m.workspaces?.name,m.role]));
 if(group.dataset.signature!==signature){group.dataset.signature=signature;group.replaceChildren();for(const m of members){const option=document.createElement('option');option.value=m.workspace_id;option.textContent=(m.workspaces?.name||'Mon groupe')+' · '+(m.role==='coorganizer'?'Co-gestionnaire':'Organisateur');group.append(option)}}
 group.value=state().workspace?.id||'';group.hidden=members.length<2;
 let open=document.getElementById('sweSpaceOpenGroup');if(!open){open=document.createElement('button');open.id='sweSpaceOpenGroup';open.type='button';open.textContent='Ouvrir ce groupe';open.onclick=()=>selectGroup(group.value);bar.append(open)}open.hidden=members.length<2;
 let nav=document.getElementById('swePlayerNav');if(!nav){nav=document.createElement('nav');nav.id='swePlayerNav';nav.setAttribute('aria-label','Navigation joueur');for(const [id,label] of [['home','Accueil'],['swes','Mes SWÉ'],['profile','Mon profil'],['group','Mon groupe']]){const b=document.createElement('button');b.type='button';b.dataset.playerTab=id;b.textContent=label;b.onclick=()=>{rememberDrafts();playerTab=id;persist();apply();restoreDrafts();window.scrollTo({top:0,behavior:'instant'})};nav.append(b)}bar.after(nav)}nav.hidden=mode!=='player';nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.playerTab===playerTab?'page':'false'));
 const view=document.getElementById('view-myplayer');if(view){const cards=[...view.querySelectorAll('.card')];for(const card of cards){const show=(groups[playerTab]||[]).some(id=>{const el=document.getElementById(id);return el&&(card.contains(el)||el===card)});card.classList.toggle('swe-space-card-hidden',mode==='player'&&!show&&card.id!=='myPlayerCreateCard'&&!card.classList.contains('player-hub-hero'));}view.querySelectorAll('.player-hub-grid').forEach(grid=>grid.classList.toggle('swe-space-card-hidden',mode==='player'&&![...grid.children].some(child=>!child.classList.contains('swe-space-card-hidden'))));}
 if(restoreEntry&&mode==='management'){restoreEntry=false;switching=true;try{setView(managementView)}finally{switching=false}}
if(mode==='player'&&state().lastView!=='myplayer'&&state().playerAccountAccess){switching=true;try{setView('myplayer')}finally{switching=false}}
}
window.SWE_SPACES={beforeView,apply,switchSpace,selectGroup,navigateGroup:url=>location.assign(url)};
document.addEventListener('click',e=>{const legacy=e.target.closest?.('[data-view="myplayer"],[data-go="myplayer"]');if(legacy&&ready()){e.preventDefault();e.stopImmediatePropagation();switchSpace('player')}},true);
document.addEventListener('change',e=>{if(e.target.id==='sweCoorgProfileSelect'&&e.target.value==='player'){e.stopImmediatePropagation();switchSpace('player')}},true);
document.addEventListener('swe:rendered',apply);document.addEventListener('swe:coorg-insights-ready',apply);
const style=document.createElement('style');style.textContent='#sweSpaceBar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 16px;margin:12px 0;background:#10243e;color:#fff;border-radius:14px}#sweSpaceGroup{background:#fff;color:#172033;width:auto;max-width:100%;min-height:44px}#sweSpaceGroup[hidden],#sweSpaceOpenGroup[hidden]{display:none!important}#sweSpaceBar button{background:#ffd365;color:#172033;font-weight:800}#swePlayerNav[hidden]{display:none!important}#swePlayerNav{display:flex;gap:8px;margin:12px 0}#swePlayerNav button{flex:1;background:#fff;color:#172033;border:1px solid #98a9bf;padding:12px 6px}#swePlayerNav button[aria-current=page]{background:#075c70;color:#fff}.swe-space-card-hidden{display:none!important}.swe-player-space .tabs,.swe-player-space aside,.swe-player-space #sweCoorgTournamentPicker,.swe-player-space #workspaceSwitcher,.swe-management-space [data-view=myplayer],.swe-management-space #workspaceSwitcher,.swe-management-space #sweCoorgTournamentPicker{display:none!important}.swe-player-space .app{padding-left:0!important}.swe-player-space .player-hub-grid{grid-template-columns:1fr!important}@media(max-width:650px){.swe-player-space{padding-bottom:76px}#swePlayerNav{position:fixed;bottom:0;left:0;right:0;z-index:10000;background:#10243e;padding:8px;margin:0;gap:4px}#swePlayerNav button{font-size:12px;min-height:46px}#sweSpaceBar{position:sticky;top:0;z-index:900}}';document.head.append(style);
document.addEventListener('DOMContentLoaded',apply);setTimeout(apply,0);
})();

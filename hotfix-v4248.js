(()=>{
'use strict';
const VERSION=(window.SWE_BUILD_VERSION||'42.50');
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let activeView='overview';

function setVersion48(){
  document.title=document.title.replace(/V42\.\d+/g,'V'+VERSION);
  document.querySelectorAll('h1 span').forEach(x=>{if(/^V42\./.test((x.textContent||'').trim()))x.textContent='V'+VERSION});
  document.querySelectorAll('.build-badge').forEach(x=>x.textContent='MAJ '+VERSION);
}

function injectStyles48(){
  if($('sweSuper48Style'))return;
  const st=document.createElement('style');st.id='sweSuper48Style';st.textContent=`
  body.swe-super48 #main>.tabs{display:none!important}
  body.swe-super48 .app{max-width:none;padding-left:244px}
  body.swe-super48 #main{max-width:none}
  body.swe-super48 #superAdminPanel{margin:0;padding:12px 18px 24px}
  body.swe-super48 #superAdminPanel>.sa-hero{padding:16px 18px;margin-bottom:10px;border-radius:16px}
  body.swe-super48 .sa-stats-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}
  body.swe-super48 .sa-stat{min-height:72px;padding:10px 12px;border-radius:14px}
  body.swe-super48 .sa-stat span{font-size:20px}body.swe-super48 .sa-stat b{font-size:20px}
  body.swe-super48 .card{border-radius:15px;padding:14px;margin-bottom:10px}
  body.swe-super48 .sa-create-card,.sa-commercial-create{padding:13px}
  body.swe-super48 #saWorkspaceList .sa-workspace-card{padding:12px!important;margin-bottom:9px!important}
  body.swe-super48 .sa-admin-tabs{display:none!important}
  .sa48-sidebar{position:fixed;left:0;top:0;bottom:0;width:228px;z-index:950;background:linear-gradient(180deg,#071b16 0%,#0b1514 100%);color:#eef7f2;padding:16px 11px;overflow:auto;box-shadow:12px 0 35px rgba(0,0,0,.08)}
  .sa48-brand{display:flex;align-items:center;gap:10px;padding:4px 8px 12px}.sa48-brand img{width:44px;height:44px;border-radius:50%}.sa48-brand b{display:block;font-size:16px}.sa48-brand small{opacity:.68}
  .sa48-mode{margin:2px 4px 14px;padding:10px 11px;border:1px solid rgba(68,214,136,.36);background:rgba(17,122,75,.18);border-radius:12px;font-size:12px}.sa48-mode b{display:block;color:#74e5a6;font-size:13px;margin-bottom:2px}
  .sa48-section{font-size:10px;letter-spacing:.13em;text-transform:uppercase;opacity:.55;margin:15px 9px 6px}.sa48-nav{display:grid;gap:3px}.sa48-nav button{width:100%;border:0;background:transparent;color:#e7f0eb;text-align:left;padding:9px 10px;border-radius:10px;font-size:13px;font-weight:750;display:flex;align-items:center;gap:9px;cursor:pointer}.sa48-nav button:hover{background:rgba(255,255,255,.07)}.sa48-nav button.active{background:linear-gradient(90deg,#11814f,#0d6e45);color:#fff;box-shadow:0 5px 14px rgba(8,91,55,.25)}.sa48-nav button span:first-child{width:20px;text-align:center;font-size:16px}
  .sa48-divider{height:1px;background:rgba(255,255,255,.1);margin:12px 7px}
  .sa48-view{display:none}.sa48-view.active{display:block}.sa48-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:4px 0 10px}.sa48-head h2{margin:0;font-size:20px}.sa48-head p{margin:4px 0 0}
  .sa48-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.sa48-toolbar input,.sa48-toolbar select{max-width:330px}
  .sa48-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.sa48-mini{border:1px solid #dce7e1;background:#fff;border-radius:13px;padding:12px}.sa48-mini b{font-size:17px}.sa48-mini small{display:block;color:#6b7b72;margin-top:3px}
  .sa48-table{width:100%;border-collapse:collapse;font-size:12px}.sa48-table th{text-align:left;color:#66776e;background:#f6f9f7;padding:8px}.sa48-table td{padding:9px 8px;border-bottom:1px solid #e8efeb;vertical-align:middle}.sa48-pill{display:inline-flex;border-radius:999px;padding:3px 7px;font-weight:850;font-size:10px;background:#edf7f1;color:#10683f}.sa48-pill.free{background:#eef1f0;color:#65716b}.sa48-pill.warn{background:#fff3df;color:#925b00}
  .sa48-actions{display:flex;gap:6px;flex-wrap:wrap}.sa48-actions button{padding:7px 9px;font-size:11px}
  .sa48-overview-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:10px}.sa48-quick{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.sa48-quick button{text-align:left;padding:12px;border-radius:12px;border:1px solid #dbe7e0;background:#fff;font-weight:800;cursor:pointer}.sa48-quick button:hover{border-color:#8fc9ab;background:#f7fbf8}
  .sa48-empty{padding:18px;text-align:center;color:#6a7971;border:1px dashed #ccd9d1;border-radius:13px;background:#fbfdfc}
  @media(max-width:1000px){body.swe-super48 .app{padding-left:0}.sa48-sidebar{position:relative;width:auto;inset:auto;margin:0 10px 10px;border-radius:16px}.sa48-nav{grid-template-columns:repeat(2,minmax(0,1fr))}.sa48-section{grid-column:1/-1}body.swe-super48 .sa-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sa48-overview-grid{grid-template-columns:1fr}}
  @media(max-width:650px){.sa48-nav{grid-template-columns:1fr}.sa48-grid{grid-template-columns:1fr}.sa48-quick{grid-template-columns:1fr}}
  `;document.head.appendChild(st);
}

function workspaces(){return Array.isArray(window.S?.superWorkspaces)?window.S.superWorkspaces:(typeof S!=='undefined'&&Array.isArray(S.superWorkspaces)?S.superWorkspaces:[])}
function normPlan(w){return String(w?.subscription_plan||w?.plan||w?.commercial_plan||'free').toLowerCase()}
function ownerLabel(w){return w?.owner_name||[w?.owner_first_name,w?.owner_last_name].filter(Boolean).join(' ')||w?.owner_email||w?.admin_email||'Organisateur'}
function isActive(w){return w?.suspended!==true&&w?.active!==false&&w?.status!=='suspended'}
function spaceCountText(){return workspaces().length}

function makeSidebar48(){
  if($('sa48Sidebar'))return;
  const side=document.createElement('aside');side.id='sa48Sidebar';side.className='sa48-sidebar';
  side.innerHTML=`<div class="sa48-brand"><img src="./favicon.png?v=4248" alt="SWÉ"><div><b>SWÉ TOURNAMENT</b><small>Administration globale</small></div></div>
  <div class="sa48-mode"><b>♛ Mode Super Admin</b>Vue dédiée au pilotage de la plateforme</div>
  <div class="sa48-section">Plateforme</div><div class="sa48-nav">
    <button data-sa48="overview"><span>⌂</span>Vue d’ensemble</button>
    <button data-sa48="spaces"><span>▦</span>Espaces clients</button>
    <button data-sa48="organizers"><span>👥</span>Organisateurs</button>
    <button data-sa48="players"><span>👤</span>Joueurs SWÉ</button>
    <button data-sa48="subscriptions"><span>▣</span>Abonnements & modules</button>
    <button data-sa48="venues"><span>⌖</span>Complexes & terrains</button>
    <button data-sa48="visuals"><span>▧</span>Visuels publics</button>
    <button data-sa48="payments"><span>◫</span>Paiements & suivi</button>
    <button data-sa48="settings"><span>⚙</span>Paramètres plateforme</button>
  </div><div class="sa48-divider"></div><div class="sa48-section">Sécurité & support</div><div class="sa48-nav">
    <button data-sa48="security"><span>🛡</span>Logs & sécurité</button>
    <button data-sa48="support"><span>◉</span>Support</button>
  </div>`;
  document.body.appendChild(side);
  side.addEventListener('click',e=>{const b=e.target.closest('[data-sa48]');if(b)showView48(b.dataset.sa48)});
}

function ensureViews48(){
  const panel=$('superAdminPanel');if(!panel||$('sa48Views'))return;
  const views=document.createElement('div');views.id='sa48Views';
  ['overview','organizers','subscriptions','payments','security','support'].forEach(v=>{const d=document.createElement('section');d.id='sa48-'+v;d.className='sa48-view';views.appendChild(d)});
  panel.insertBefore(views,panel.firstChild?.nextSibling||null);
}

function renderOverview48(){
  const box=$('sa48-overview');if(!box)return;const ws=workspaces(),active=ws.filter(isActive),paid=ws.filter(w=>normPlan(w)!=='free');
  const recent=ws.slice(0,6);
  box.innerHTML=`<div class="sa48-head"><div><h2>Vue d’ensemble</h2><p class="muted">L’essentiel de la plateforme en un coup d’œil.</p></div><span class="sa48-pill">${ws.length} espaces</span></div>
  <div class="sa48-overview-grid"><div class="card"><h3 style="margin-top:0">Espaces récents</h3>${recent.length?`<table class="sa48-table"><thead><tr><th>Espace</th><th>Offre</th><th>Statut</th><th></th></tr></thead><tbody>${recent.map(w=>`<tr><td><b>${esc(w.name||'Espace SWÉ')}</b><br><small>${esc(ownerLabel(w))}</small></td><td><span class="sa48-pill ${normPlan(w)==='free'?'free':''}">${esc(normPlan(w).toUpperCase())}</span></td><td>${isActive(w)?'🟢 Actif':'🔴 Suspendu'}</td><td><button data-open-space48="${esc(w.id)}">Gérer</button></td></tr>`).join('')}</tbody></table>`:'<div class="sa48-empty">Aucun espace client.</div>'}</div>
  <div class="card"><h3 style="margin-top:0">Accès rapide</h3><div class="sa48-quick"><button data-sa48-go="spaces">▦ Gérer les espaces<small>${ws.length} au total</small></button><button data-sa48-go="subscriptions">▣ Offres & modules<small>${paid.length} payants</small></button><button data-sa48-go="visuals">▧ Contrôler les visuels<small>Pages publiques</small></button><button data-sa48-go="venues">⌖ Complexes<small>Terrains référencés</small></button></div></div></div>`;
}

function renderOrganizers48(){
  const box=$('sa48-organizers');if(!box)return;const ws=workspaces();const map=new Map();
  ws.forEach(w=>{const key=String(w.owner_user_id||w.owner_email||w.admin_email||ownerLabel(w));if(!map.has(key))map.set(key,{name:ownerLabel(w),email:w.owner_email||w.admin_email||'',spaces:[],paid:0});const x=map.get(key);x.spaces.push(w);if(normPlan(w)!=='free')x.paid++});const rows=[...map.values()];
  box.innerHTML=`<div class="sa48-head"><div><h2>Organisateurs</h2><p class="muted">Vue consolidée des comptes qui administrent un ou plusieurs espaces.</p></div><span class="sa48-pill">${rows.length} organisateurs</span></div><div class="card">${rows.length?`<table class="sa48-table"><thead><tr><th>Organisateur</th><th>Espaces</th><th>Payants</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(x.name)}</b><br><small>${esc(x.email)}</small></td><td>${x.spaces.length}</td><td>${x.paid}</td><td><button data-sa48-go="spaces">Voir les espaces</button></td></tr>`).join('')}</tbody></table>`:'<div class="sa48-empty">Aucun organisateur trouvé.</div>'}</div>`;
}

function renderSubscriptions48(){
  const box=$('sa48-subscriptions');if(!box)return;const ws=workspaces();
  box.innerHTML=`<div class="sa48-head"><div><h2>Abonnements & modules</h2><p class="muted">Contrôle les offres commerciales et ouvre directement l’espace concerné pour modifier ses options.</p></div></div><div class="card">${ws.length?`<table class="sa48-table"><thead><tr><th>Espace</th><th>Offre</th><th>Accès spécial</th><th>Joueurs</th><th></th></tr></thead><tbody>${ws.map(w=>`<tr><td><b>${esc(w.name||'Espace')}</b></td><td><span class="sa48-pill ${normPlan(w)==='free'?'free':''}">${esc(normPlan(w).toUpperCase())}</span></td><td>${w.special_access_enabled?'✅ Oui':'—'}</td><td>${esc(w.player_count??w.active_players??'—')}</td><td><button data-open-space48="${esc(w.id)}">Configurer</button></td></tr>`).join('')}</tbody></table>`:'<div class="sa48-empty">Aucun espace.</div>'}</div>`;
}

function renderPayments48(){
  const box=$('sa48-payments');if(!box)return;const ws=workspaces();
  box.innerHTML=`<div class="sa48-head"><div><h2>Paiements & suivi</h2><p class="muted">Accède rapidement aux espaces pour contrôler leurs fonctions de paiement et leurs liens de suivi.</p></div></div><div class="card"><div class="sa48-grid">${ws.slice(0,12).map(w=>`<div class="sa48-mini"><b>${esc(w.name||'Espace')}</b><small>Offre ${esc(normPlan(w).toUpperCase())}</small><div class="sa48-actions" style="margin-top:9px"><button data-open-space48="${esc(w.id)}">Ouvrir l’espace</button></div></div>`).join('')||'<div class="sa48-empty">Aucun espace disponible.</div>'}</div></div>`;
}

function renderSecurity48(){
  const box=$('sa48-security');if(!box)return;const email=(typeof S!=='undefined'&&S.session?.user?.email)||'';
  box.innerHTML=`<div class="sa48-head"><div><h2>Logs & sécurité</h2><p class="muted">État de la session Super Admin et contrôles de sécurité disponibles dans l’interface.</p></div></div><div class="sa48-grid"><div class="sa48-mini"><b>Session Super Admin</b><small>${esc(email||'Session active')}</small></div><div class="sa48-mini"><b>Version applicative</b><small>V${VERSION}</small></div><div class="sa48-mini"><b>Consentement</b><small>Géré dans Paramètres plateforme</small></div></div><div class="card" style="margin-top:10px"><b>Journal technique complet</b><p class="muted">Cet écran n’invente pas de logs inexistants : il centralise uniquement les contrôles réellement disponibles aujourd’hui. Un journal serveur détaillé pourra être ajouté ultérieurement.</p></div>`;
}
function renderSupport48(){
  const box=$('sa48-support');if(!box)return;box.innerHTML=`<div class="sa48-head"><div><h2>Support</h2><p class="muted">Point d’entrée pour le diagnostic fonctionnel des espaces clients.</p></div></div><div class="card"><div class="sa48-quick"><button data-sa48-go="spaces">▦ Vérifier un espace client</button><button data-sa48-go="visuals">▧ Vérifier un lien public</button><button data-sa48-go="subscriptions">▣ Vérifier une offre</button><button data-sa48-go="venues">⌖ Vérifier un complexe</button></div></div>`;
}

function venueCard(){const list=$('saVenueList');return list?.closest('.card')||null}
function settingsCards(){return [$('saConsentControl'),document.querySelector('.sa-footer-editor')].filter(Boolean)}

function hideAll48(){
  document.querySelectorAll('.sa48-view').forEach(x=>x.classList.remove('active'));
  const spaces=$('saSpacesSection'),players=$('saPlayersSection'),previews=$('saPreviewSection47');
  [spaces,players,previews].forEach(x=>x&&x.classList.add('hidden'));
  const vc=venueCard();if(vc)vc.classList.add('hidden');settingsCards().forEach(x=>x.classList.add('hidden'));
}
function showView48(view){
  if(typeof S==='undefined'||!S.isSuperAdmin)return;
  activeView=view;hideAll48();
  document.querySelectorAll('[data-sa48]').forEach(b=>b.classList.toggle('active',b.dataset.sa48===view));
  if(view==='spaces'){$('saSpacesSection')?.classList.remove('hidden');if(typeof renderSuperAdminWorkspaces==='function')renderSuperAdminWorkspaces()}
  else if(view==='players'){$('saPlayersSection')?.classList.remove('hidden');if(typeof renderSuperAdminPlayers==='function')renderSuperAdminPlayers()}
  else if(view==='venues'){const vc=venueCard();if(vc)vc.classList.remove('hidden');if(typeof renderSuperAdminVenues==='function')renderSuperAdminVenues()}
  else if(view==='visuals'){
    const tab=$('saPreviewTab47');if(tab)tab.click();
    setTimeout(()=>{$('saPreviewSection47')?.classList.remove('hidden')},50);
  }
  else if(view==='settings'){settingsCards().forEach(x=>x.classList.remove('hidden'))}
  else {const box=$('sa48-'+view);box?.classList.add('active');if(view==='overview')renderOverview48();if(view==='organizers')renderOrganizers48();if(view==='subscriptions')renderSubscriptions48();if(view==='payments')renderPayments48();if(view==='security')renderSecurity48();if(view==='support')renderSupport48()}
  window.scrollTo({top:0,behavior:'smooth'});
}

function openSpace48(id){
  const sw=$('workspaceSwitcher');if(sw&&[...sw.options].some(o=>String(o.value)===String(id))){sw.value=id;sw.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>showView48('spaces'),500);return}
  showView48('spaces');const input=$('saWorkspaceFilter');if(input){input.value=workspaces().find(w=>String(w.id)===String(id))?.name||'';input.dispatchEvent(new Event('change',{bubbles:true}))}
}

function wire48(){
  document.addEventListener('click',e=>{
    const go=e.target.closest('[data-sa48-go]');if(go){showView48(go.dataset.sa48Go);return}
    const open=e.target.closest('[data-open-space48]');if(open){openSpace48(open.dataset.openSpace48);return}
  },true);
}

function compactLegacy48(){
  // Keep legacy super-admin hero/stats, but remove duplicated top tab bar and oversized marketing spacing.
  const hero=document.querySelector('#superAdminPanel>.sa-hero');if(hero)hero.querySelector('p')?.replaceChildren(document.createTextNode('Pilote les espaces, les offres, les modules et les visuels publics depuis une vue unique.'));
}

function boot48(){
  setVersion48();injectStyles48();
  if(typeof S==='undefined'||!S.isSuperAdmin)return;
  document.body.classList.add('swe-super48');makeSidebar48();ensureViews48();compactLegacy48();wire48();
  setTimeout(()=>showView48(activeView),80);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot48,500),{once:true});else setTimeout(boot48,500);
document.addEventListener('swe:rendered',()=>setTimeout(()=>{setVersion48();if(typeof S!=='undefined'&&S.isSuperAdmin){if(!$('sa48Sidebar'))boot48();else showView48(activeView)}},120));
window.addEventListener('pageshow',()=>setTimeout(boot48,250));
})();
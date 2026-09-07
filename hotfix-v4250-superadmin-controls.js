(()=>{
'use strict';
const E=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
function isSA(){try{return typeof S!=='undefined'&&S.isSuperAdmin===true}catch(_){return false}}
function activeView(){return E('sweSa4250Side')?.querySelector('[data-sa50].active')?.dataset.sa50||sessionStorage.getItem('SWE_SA_ACTIVE_VIEW')||'overview'}
function syncViewClass(){if(!isSA())return;const v=activeView();document.body.classList.toggle('swe-sa-not-overview',v!=='overview');document.body.dataset.sweSaView=v;}
function injectCss(){if(E('sweSaControlsStyle'))return;const s=document.createElement('style');s.id='sweSaControlsStyle';s.textContent=`
body.swe-sa-not-overview #sa48-overview{display:none!important}
body.swe-sa-not-overview #sweSaActionCenter{display:none!important}
body.swe-sa-not-overview #saSummaryCards{display:none!important}
body.swe-sa-not-overview .sa-stats-grid#saSummaryCards{display:none!important}
#sweSaSubsHead{margin-bottom:10px}
.swe-sa-settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:12px}
.swe-sa-setting{border:1px solid #dce7e1;background:#fff;border-radius:15px;padding:14px}
.swe-sa-setting .swe-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.swe-sa-setting input[type=checkbox]{width:22px;height:22px}
.swe-sa-setting .state{font-weight:900}
.swe-sa-modules{display:flex;gap:5px;flex-wrap:wrap}.swe-sa-module{font-size:10px;font-weight:850;padding:4px 7px;border-radius:999px;background:#edf7f1;color:#11663f}.swe-sa-module.off{background:#f0f2f1;color:#7b847f}
@media(max-width:800px){.swe-sa-settings-grid{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
function workspaces(){return Array.isArray(window.S?.superWorkspaces)?window.S.superWorkspaces:(typeof S!=='undefined'&&Array.isArray(S.superWorkspaces)?S.superWorkspaces:[])}
function plan(w){return String(w?.subscription_plan||w?.plan||w?.commercial_plan||w?.plan_code||'free').toLowerCase()}
function status(w){if(w?.suspended===true||w?.active===false||w?.status==='suspended')return 'Suspendu';return String(w?.subscription_status||w?.status||'Actif')}
function coLimit(w){const vals=[w?.co_manager_limit,w?.coorganizer_limit,w?.coorganizer_quota,w?.included_co_managers,w?.co_managers_included,w?.max_coorganizers];const v=vals.find(x=>x!==undefined&&x!==null&&x!=='');return v??'—'}
function modulesFor(w){const p=plan(w);const defs=[
 ['Top Player',w?.top_players_enabled??w?.top_player_enabled??(p==='standard'||p==='pro')],
 ['3e mi-temps',w?.third_half_enabled??w?.third_half_module_enabled??(p==='pro')],
 ['Notation',w?.ratings_enabled??w?.rating_enabled??w?.player_rating_enabled],
 ['Équipes auto',w?.auto_teams_enabled??w?.balanced_teams_enabled??w?.auto_team_balance_enabled],
 ['Ligue',w?.league_enabled??true]
];return defs.filter(([,v])=>v===true).map(([n])=>n)}
function goSpacesFor(id){if(!isSA()||!id)return;const btn=E('sweSa4250Side')?.querySelector('[data-sa50="spaces"]');if(btn)btn.click();setTimeout(()=>{try{const all=workspaces();const w=all.find(x=>String(x.id||x.workspace_id)===String(id));const search=E('saSearchWorkspace'),filter=E('saWorkspaceFilter');if(filter)filter.value='all';if(search)search.value=w?.workspace_name||w?.name||'';if(typeof renderSuperAdminWorkspaces==='function')renderSuperAdminWorkspaces();const card=E('saWorkspaceList')?.querySelector('.sa-workspace-card');if(card){card.scrollIntoView({behavior:'smooth',block:'start'});card.style.outline='2px solid #20a36a';setTimeout(()=>card.style.outline='',1800)}}catch(e){console.warn('open workspace manager',e)}},180)}
async function getSettings(){try{return await sb.rpc('super_admin_get_platform_settings')}catch(_){return {error:true}}}
async function renderSubscriptions(){if(!isSA()||activeView()!=='subscriptions')return;const box=E('sa48-subscriptions');if(!box)return;const ws=workspaces();box.innerHTML=`<div id="sweSaSubsHead" class="sa48-head"><div><h2>Abonnements & modules</h2><p class="muted">Pilotage global des offres, modules et règles de création de compte.</p></div><span class="sa48-pill">${ws.length} espace${ws.length>1?'s':''}</span></div>
<div class="swe-sa-settings-grid">
 <div id="sweSaConsentQuick" class="swe-sa-setting"><div class="swe-toggle-row"><div><h3 style="margin:0">🛡️ Consentement à la création de compte</h3><p class="muted" style="margin:4px 0 0">Si désactivé, aucune case d’acceptation n’est imposée à la création d’un compte, y compris via une invitation co-gestionnaire.</p></div><label style="display:flex;align-items:center;gap:9px"><input id="sweConsentQuickToggle" type="checkbox"><span class="state" id="sweConsentQuickState">Chargement…</span></label></div><div id="sweConsentQuickMsg" class="muted" style="margin-top:8px"></div></div>
 <div id="sweSaWelcomeQuick" class="swe-sa-setting"><div class="swe-toggle-row"><div><h3 style="margin:0">🎁 Offre de bienvenue 60 jours</h3><p class="muted" style="margin:4px 0 0">Active ou désactive l’offre de bienvenue pour les prochains nouveaux espaces.</p></div><label style="display:flex;align-items:center;gap:9px"><input id="sweWelcomeQuickToggle" type="checkbox"><span class="state" id="sweWelcomeQuickState">Chargement…</span></label></div><div id="sweWelcomeQuickMsg" class="muted" style="margin-top:8px"></div></div>
</div>
<div class="card"><div style="overflow:auto"><table class="sa48-table" style="min-width:900px"><thead><tr><th>Espace</th><th>Offre</th><th>Statut</th><th>Co-gestionnaires inclus</th><th>Modules actifs</th><th>Accès spécial</th><th></th></tr></thead><tbody>${ws.length?ws.map(w=>{const mods=modulesFor(w);return `<tr><td><b>${esc(w.workspace_name||w.name||'Espace SWÉ')}</b><br><small>${esc(w.owner_email||w.admin_email||'')}</small></td><td><span class="sa48-pill ${plan(w)==='free'?'free':''}">${esc(plan(w).toUpperCase())}</span></td><td>${esc(status(w))}</td><td>${esc(coLimit(w))}</td><td><div class="swe-sa-modules">${mods.length?mods.map(m=>`<span class="swe-sa-module">${esc(m)}</span>`).join(''):'<span class="muted">Aucun module premium</span>'}</div></td><td>${w.special_access_enabled?'✅ Oui':'—'}</td><td><button type="button" data-open-space48="${esc(w.id||w.workspace_id)}">Configurer</button></td></tr>`}).join(''):'<tr><td colspan="7"><div class="sa48-empty">Aucun espace.</div></td></tr>'}</tbody></table></div></div>`;
 const r=await getSettings();if(r.error)return;const data=r.data||{};
 const consent=E('sweConsentQuickToggle'),cs=E('sweConsentQuickState');if(consent){consent.checked=data.consent_gate_enabled===true;cs.textContent=consent.checked?'Activé':'Désactivé';consent.onchange=async()=>{const wanted=consent.checked, msg=E('sweConsentQuickMsg');consent.disabled=true;cs.textContent='Enregistrement…';const q=await sb.rpc('super_admin_set_consent_gate',{p_enabled:wanted});consent.disabled=false;if(q.error){consent.checked=!wanted;cs.textContent=consent.checked?'Activé':'Désactivé';msg.textContent='Erreur : modification non enregistrée.';return}cs.textContent=wanted?'Activé':'Désactivé';msg.textContent=wanted?'Les nouveaux comptes devront accepter les conditions.':'Aucune acceptation ne sera demandée tant que ce réglage reste désactivé.';const old=E('saConsentGateEnabled');if(old)old.checked=wanted;const oldLab=E('saConsentGateLabel');if(oldLab)oldLab.textContent=wanted?'Actif':'Masqué';}}
 const welcome=E('sweWelcomeQuickToggle'),wsState=E('sweWelcomeQuickState');if(welcome){welcome.checked=data.welcome_60_days_enabled!==false;wsState.textContent=welcome.checked?'Activée':'Désactivée';welcome.onchange=async()=>{const wanted=welcome.checked,msg=E('sweWelcomeQuickMsg');welcome.disabled=true;wsState.textContent='Enregistrement…';const q=await sb.rpc('super_admin_set_welcome_60_days',{p_enabled:wanted});welcome.disabled=false;if(q.error){welcome.checked=!wanted;wsState.textContent=welcome.checked?'Activée':'Désactivée';msg.textContent='Erreur : modification non enregistrée.';return}wsState.textContent=wanted?'Activée':'Désactivée';msg.textContent=wanted?'Les prochains nouveaux espaces auront 60 jours de bienvenue.':'Les prochains nouveaux espaces n’auront pas l’offre de bienvenue.';}}
}
function bind(){if(window.__SWE_SA_CONTROLS_V3)return;window.__SWE_SA_CONTROLS_V3=true;document.addEventListener('click',e=>{const open=e.target.closest?.('[data-open-space48]');if(open&&isSA()){e.preventDefault();e.stopImmediatePropagation();goSpacesFor(open.dataset.openSpace48)}},true);const refresh=()=>{syncViewClass();if(activeView()==='subscriptions')setTimeout(renderSubscriptions,20)};const mo=new MutationObserver(refresh);setTimeout(()=>{const side=E('sweSa4250Side');if(side)mo.observe(side,{subtree:true,attributes:true,attributeFilter:['class']});refresh()},300);document.addEventListener('swe:rendered',()=>setTimeout(refresh,60));window.addEventListener('pageshow',()=>setTimeout(refresh,80));}
function boot(){if(!isSA())return;injectCss();bind();syncViewClass();if(activeView()==='subscriptions')setTimeout(renderSubscriptions,80)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900),{once:true});else setTimeout(boot,900);
})();

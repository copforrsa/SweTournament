(()=>{
'use strict';
const E=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
function isSA(){try{return typeof S!=='undefined'&&S.isSuperAdmin===true}catch(_){return false}}
function activeView(){return E('sweSa4250Side')?.querySelector('[data-sa50].active')?.dataset.sa50||sessionStorage.getItem('SWE_SA_ACTIVE_VIEW')||'overview'}
function syncViewClass(){
 if(!isSA())return;
 const v=activeView();
 document.body.classList.toggle('swe-sa-not-overview',v!=='overview');
 document.body.dataset.sweSaView=v;
}
function injectCss(){
 if(E('sweSaControlsStyle'))return;
 const s=document.createElement('style');s.id='sweSaControlsStyle';s.textContent=`
 body.swe-sa-not-overview #sa48-overview{display:none!important}
 body.swe-sa-not-overview #sweSaActionCenter{display:none!important}
 #sweSaWelcomeQuick{margin-bottom:12px}
 #sweSaWelcomeQuick .swe-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
 #sweSaWelcomeQuick input[type=checkbox]{width:22px;height:22px}
 #sweSaWelcomeQuick .state{font-weight:900}
 `;document.head.appendChild(s)
}
function goSpacesFor(id){
 if(!isSA()||!id)return;
 const side=E('sweSa4250Side');
 const btn=side?.querySelector('[data-sa50="spaces"]');
 if(btn)btn.click();
 setTimeout(()=>{
   try{
     const all=Array.isArray(S.superWorkspaces)?S.superWorkspaces:[];
     const w=all.find(x=>String(x.id||x.workspace_id)===String(id));
     const search=E('saSearchWorkspace');
     const filter=E('saWorkspaceFilter');
     if(filter)filter.value='all';
     if(search)search.value=w?.workspace_name||w?.name||'';
     if(typeof renderSuperAdminWorkspaces==='function')renderSuperAdminWorkspaces();
     const list=E('saWorkspaceList');
     const card=list?.querySelector('.sa-workspace-card');
     if(card){card.scrollIntoView({behavior:'smooth',block:'start'});card.style.outline='2px solid #20a36a';setTimeout(()=>card.style.outline='',1800)}
   }catch(e){console.warn('open workspace manager',e)}
 },180);
}
async function ensureWelcomeQuick(){
 if(!isSA())return;
 const sub=E('sa48-subscriptions');
 if(!sub||E('sweSaWelcomeQuick'))return;
 const d=document.createElement('div');d.id='sweSaWelcomeQuick';d.className='card';
 d.innerHTML=`<div class="swe-toggle-row"><div><h3 style="margin:0">🎁 Offre de bienvenue 60 jours</h3><p class="muted" style="margin:4px 0 0">Active ou désactive l'offre de bienvenue pour les prochains nouveaux espaces.</p></div><label style="display:flex;align-items:center;gap:9px"><input id="sweWelcomeQuickToggle" type="checkbox"><span class="state" id="sweWelcomeQuickState">Chargement…</span></label></div><div id="sweWelcomeQuickMsg" class="muted" style="margin-top:8px"></div>`;
 sub.prepend(d);
 const cb=E('sweWelcomeQuickToggle'),st=E('sweWelcomeQuickState'),msg=E('sweWelcomeQuickMsg');
 const r=await sb.rpc('super_admin_get_platform_settings');
 if(!r.error){const enabled=r.data?.welcome_60_days_enabled!==false;cb.checked=enabled;st.textContent=enabled?'Activée':'Désactivée'}
 cb.onchange=async()=>{
   const wanted=cb.checked;cb.disabled=true;st.textContent='Enregistrement…';
   const q=await sb.rpc('super_admin_set_welcome_60_days',{p_enabled:wanted});
   cb.disabled=false;
   if(q.error){cb.checked=!wanted;st.textContent=cb.checked?'Activée':'Désactivée';msg.textContent='Erreur : modification non enregistrée.';return}
   st.textContent=wanted?'Activée':'Désactivée';msg.textContent=wanted?'Les prochains nouveaux espaces auront 60 jours de bienvenue.':'Les prochains nouveaux espaces n’auront pas l’offre de bienvenue.';
   const other=E('sweWelcome60Toggle');if(other)other.checked=wanted;const lab=E('sweWelcome60Label');if(lab)lab.textContent=wanted?'Activée':'Désactivée';
 };
}
function bind(){
 if(window.__SWE_SA_CONTROLS_V1)return;window.__SWE_SA_CONTROLS_V1=true;
 document.addEventListener('click',e=>{
   const open=e.target.closest?.('[data-open-space48]');
   if(open&&isSA()){
     e.preventDefault();e.stopImmediatePropagation();
     goSpacesFor(open.dataset.openSpace48);
   }
 },true);
 const mo=new MutationObserver(()=>{syncViewClass();if(activeView()==='subscriptions')ensureWelcomeQuick()});
 const start=()=>{const side=E('sweSa4250Side');if(side)mo.observe(side,{subtree:true,attributes:true,attributeFilter:['class']});syncViewClass();ensureWelcomeQuick()};
 setTimeout(start,300);
 document.addEventListener('swe:rendered',()=>setTimeout(()=>{syncViewClass();ensureWelcomeQuick()},50));
 window.addEventListener('pageshow',()=>setTimeout(()=>{syncViewClass();ensureWelcomeQuick()},50));
}
function boot(){if(!isSA())return;injectCss();bind();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900),{once:true});else setTimeout(boot,900);
})();
(()=>{
'use strict';
const {createClient}=window.supabase||{};
if(!createClient)return;
const sb=createClient('https://fbppesfxkvledwjemwsn.supabase.co','sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp',{
  auth:{flowType:'pkce',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'swe-forssadmin-auth-v1'}
});
const E=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let loading=false,lastData=null;
const style=document.createElement('style');
style.textContent=`
.sa-action-nav{display:flex!important;align-items:center;justify-content:space-between;gap:8px}.sa-action-badge{min-width:22px;height:22px;padding:0 7px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:#ef4444;color:#fff;font-size:11px;font-weight:900}.sa-action-badge.zero{background:rgba(255,255,255,.16);color:#b9c8c0}.sa-action-center{margin-top:14px}.sa-action-center h3{margin:0}.sa-action-list{display:grid;gap:9px;margin-top:12px}.sa-action-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid #dce6e0;border-radius:15px;padding:13px;background:#fff}.sa-action-icon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#eef5f1;font-size:19px}.sa-action-item.urgent{border-color:#f3b6b6;background:#fffafa}.sa-action-item.warn{border-color:#f2d18a;background:#fffdf7}.sa-action-item.info{border-color:#cbdcf5;background:#fbfdff}.sa-action-title{font-weight:900}.sa-action-meta{font-size:12px;color:#68766f;margin-top:3px;line-height:1.4}.sa-action-empty{padding:18px;border:1px dashed #bad4c5;border-radius:14px;background:#f7fbf8;color:#426354}.sa-action-summary{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.sa-action-count{font-size:30px;font-weight:950}.sa-action-item .btn{white-space:nowrap}.sa-focus-row{outline:3px solid rgba(13,117,73,.25);background:#f1fbf5!important;transition:background .3s ease}
@media(max-width:720px){.sa-action-item{grid-template-columns:auto 1fr}.sa-action-item .btn{grid-column:1/-1;width:100%}}
`;
document.head.appendChild(style);

async function rpc(name,args){const r=await sb.rpc(name,args);if(r.error)throw r.error;return r.data}
function pending(arr){return (Array.isArray(arr)?arr:[]).filter(x=>String(x.status||'pending').toLowerCase()==='pending')}
function daysUntil(v){if(!v)return null;const n=(new Date(v).getTime()-Date.now())/86400000;return Number.isFinite(n)?Math.ceil(n):null}
function makeActions(data){
  const out=[];
  pending(data.quota).forEach(x=>out.push({type:'quota',level:'warn',icon:'👥',title:'Demande de co-gestionnaires',text:`${x.workspace_name||'Espace'} demande ${x.requested_limit??'une nouvelle limite'} accès (actuel : ${x.current_limit??'—'}).`,view:'security',button:'Traiter la demande',focus:String(x.id||'')}));
  (Array.isArray(data.disputes)?data.disputes:[]).filter(x=>String(x.status||'disputed')==='disputed').forEach(x=>out.push({type:'identity',level:'urgent',icon:'🪪',title:'Conflit d’identité joueur',text:`${x.player_name||'Joueur'} • ${x.workspace_name||'Espace'} • ${x.claimant_email||''}${x.conflict_email?' ↔ '+x.conflict_email:''}`,view:'security',button:'Résoudre le conflit',focus:String(x.claim_id||'')}));
  pending(data.signup).forEach(x=>out.push({type:'signup',level:'info',icon:'✉️',title:'Création de compte joueur en attente',text:`${x.display_name||'Joueur'}${x.email?' • '+x.email:''}`,view:'security',button:'Gérer la demande',focus:String(x.id||'')}));
  (Array.isArray(data.workspaces)?data.workspaces:[]).filter(x=>x.upgrade_requested_at).forEach(x=>out.push({type:'upgrade',level:'info',icon:'⬆️',title:'Demande d’évolution d’offre',text:`${x.workspace_name||'Espace'} • ${x.owner_email||''}`,view:'spaces',button:'Gérer l’espace',focus:String(x.workspace_id||'')}));
  (Array.isArray(data.payments)?data.payments:[]).forEach(x=>{
    const status=String(x.subscription_status||'').toLowerCase();
    if(['past_due','unpaid','incomplete_expired'].includes(status))out.push({type:'billing',level:'urgent',icon:'💳',title:'Abonnement avec incident de paiement',text:`${x.workspace_name||'Espace'} • statut ${status}`,view:'payments',button:'Voir le paiement',focus:String(x.workspace_id||'')});
    else if(x.stripe_connect_account_id && (!x.connect_charges_enabled||!x.connect_payouts_enabled))out.push({type:'connect',level:'warn',icon:'🏦',title:'Stripe Connect à finaliser',text:`${x.workspace_name||'Espace'} • encaissements ${x.connect_charges_enabled?'OK':'bloqués'} • versements ${x.connect_payouts_enabled?'OK':'bloqués'}`,view:'payments',button:'Vérifier Stripe',focus:String(x.workspace_id||'')});
  });
  (Array.isArray(data.workspaces)?data.workspaces:[]).forEach(x=>{const d=daysUntil(x.trial_ends_at);if(d!==null&&d>=0&&d<=7)out.push({type:'trial',level:'warn',icon:'⏳',title:'Offre de lancement bientôt terminée',text:`${x.workspace_name||'Espace'} • fin dans ${d} jour${d>1?'s':''}`,view:'organizers',button:'Gérer l’organisateur',focus:String(x.owner_email||x.workspace_id||'')})});
  return out;
}
function ensureNav(actions){
  const overview=document.querySelector('[data-view="overview"]');
  if(!overview)return;
  let btn=E('saActionCenterNav');
  if(!btn){
    btn=document.createElement('button');btn.id='saActionCenterNav';btn.type='button';btn.className='sa-action-nav';btn.innerHTML='<span>🔔 Actions à traiter</span><span class="sa-action-badge zero" id="saActionBadge">0</span>';
    overview.insertAdjacentElement('afterend',btn);
    btn.onclick=()=>{overview.click();setTimeout(()=>E('saDetailedActions')?.scrollIntoView({behavior:'smooth',block:'start'}),180)};
  }
  const badge=E('saActionBadge');if(badge){badge.textContent=String(actions.length);badge.classList.toggle('zero',actions.length===0)}
}
function gotoAction(view,focus){
  const btn=document.querySelector(`[data-view="${view}"]`);if(!btn)return;btn.click();
  if(focus){sessionStorage.setItem('swe-sa-focus',JSON.stringify({view,focus,at:Date.now()}));setTimeout(()=>highlightFocus(focus),220)}
}
function highlightFocus(focus){
  if(!focus)return;const nodes=[...document.querySelectorAll('#content tr,#content .card')];
  const n=nodes.find(el=>String(el.textContent||'').includes(focus)||String(el.innerHTML||'').includes(focus));
  if(n){n.classList.add('sa-focus-row');n.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>n.classList.remove('sa-focus-row'),3500)}
}
function renderActions(actions){
  const content=E('content');if(!content)return;
  if(document.querySelector('[data-view="overview"]')?.classList.contains('active')!==true)return;
  E('saDetailedActions')?.remove();
  const wrap=document.createElement('section');wrap.id='saDetailedActions';wrap.className='card sa-action-center';
  wrap.innerHTML=`<div class="sa-action-summary"><div><h3>🔔 Actions à réaliser</h3><div class="muted">Notifications opérationnelles du Super Admin. Chaque bouton t’emmène directement vers l’écran concerné.</div></div><div><span class="sa-action-count">${actions.length}</span><div class="muted">à traiter</div></div></div>`+
    (actions.length?`<div class="sa-action-list">${actions.map((a,i)=>`<div class="sa-action-item ${a.level}"><div class="sa-action-icon">${a.icon}</div><div><div class="sa-action-title">${esc(a.title)}</div><div class="sa-action-meta">${esc(a.text)}</div></div><button type="button" class="btn ${a.level==='urgent'?'danger':a.level==='warn'?'ghost':'primary'}" data-sa-action-index="${i}">${esc(a.button)}</button></div>`).join('')}</div>`:`<div class="sa-action-empty" style="margin-top:12px">✅ Aucune action prioritaire détectée pour le moment.</div>`);
  const firstCard=content.querySelector('.grid.stats,.card');
  if(firstCard)firstCard.insertAdjacentElement('afterend',wrap);else content.appendChild(wrap);
  wrap.querySelectorAll('[data-sa-action-index]').forEach(b=>b.onclick=()=>{const a=actions[Number(b.dataset.saActionIndex)];if(a)gotoAction(a.view,a.focus)});
}
async function loadActions(){
  if(loading)return;loading=true;
  try{
    const {data:s}=await sb.auth.getSession();if(!s?.session)return;
    const [quota,disputes,signup,workspaces,payments]=await Promise.all([
      rpc('super_admin_get_coorganizer_quota_requests'),rpc('super_admin_get_identity_disputes'),rpc('super_admin_get_player_signup_requests'),rpc('super_admin_get_workspaces_v5'),rpc('super_admin_get_payment_overview_v1')
    ]);
    lastData={quota,disputes,signup,workspaces,payments};
    const actions=makeActions(lastData);ensureNav(actions);renderActions(actions);
  }catch(e){console.warn('super admin action center',e)}finally{loading=false}
}
function bind(){
  document.querySelector('[data-view="overview"]')?.addEventListener('click',()=>setTimeout(()=>{if(lastData){const actions=makeActions(lastData);ensureNav(actions);renderActions(actions)}else loadActions()},120));
  document.querySelector('[data-view="security"]')?.addEventListener('click',()=>{const f=sessionStorage.getItem('swe-sa-focus');if(f){try{const x=JSON.parse(f);if(x.view==='security')setTimeout(()=>highlightFocus(x.focus),180)}catch(_){}}});
  document.querySelector('[data-view="payments"]')?.addEventListener('click',()=>{const f=sessionStorage.getItem('swe-sa-focus');if(f){try{const x=JSON.parse(f);if(x.view==='payments')setTimeout(()=>highlightFocus(x.focus),180)}catch(_){}}});
  document.querySelector('[data-view="spaces"]')?.addEventListener('click',()=>{const f=sessionStorage.getItem('swe-sa-focus');if(f){try{const x=JSON.parse(f);if(x.view==='spaces')setTimeout(()=>highlightFocus(x.focus),180)}catch(_){}}});
  document.querySelector('[data-view="organizers"]')?.addEventListener('click',()=>{const f=sessionStorage.getItem('swe-sa-focus');if(f){try{const x=JSON.parse(f);if(x.view==='organizers')setTimeout(()=>highlightFocus(x.focus),180)}catch(_){}}});
  const refresh=()=>setTimeout(loadActions,350);
  window.addEventListener('pageshow',refresh,{once:true});
}
function boot(){
  bind();let tries=0;const t=setInterval(()=>{tries++;const shell=E('adminShell');if(shell&&!shell.classList.contains('hidden')){clearInterval(t);loadActions()}else if(tries>30)clearInterval(t)},350);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
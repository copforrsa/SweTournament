(()=>{
'use strict';
const BUILD=window.SWE_BUILD_VERSION;
window.__SWE_PAYMENT_AUTHORITY_ACTIVE=true;
function applyBuild(){window.SWEApplyBuild?.();}
async function purgeLegacyClient(){
  // Migration V50.15 : conserve la PWA et son cache réseau-d'abord.
  try{localStorage.setItem('swe-pwa-runtime-v5015','1')}catch(_){}
}
function loadCss(href,key){if(document.querySelector('link[data-swe-style="'+key+'"]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset.sweStyle=key;document.head.appendChild(l)}
function load(src,key){return new Promise(resolve=>{if(document.querySelector('script[data-swe-loader="'+key+'"]'))return resolve();const s=document.createElement('script');let done=false;const finish=()=>{if(done)return;done=true;resolve()};s.src=src;s.async=false;s.dataset.sweLoader=key;s.onload=finish;s.onerror=()=>{console.warn('SWÉ: module non chargé',key);finish()};document.body.appendChild(s);setTimeout(finish,6000)})}
function mobileClient(){return matchMedia('(max-width: 760px)').matches||navigator.maxTouchPoints>1}
async function boot(){
 const pending=[];
 // Appendre tous les scripts sans attendre chaque réponse réseau. async=false
 // garantit leur exécution dans l'ordre d'insertion (dépendances préservées).
 const queue=(src,key)=>{pending.push(load(src,key));};
 // Chargements redondants retirés : les modules du bundle et les scripts déjà demandés
 // ne doivent pas être relancés avec une autre URL de version.
 applyBuild();purgeLegacyClient();loadCss('/desktop-layout-v4328.css?v=4377','desktop-layout-v4328');document.documentElement.dataset.sweMatchClient=mobileClient()?'mobile':'desktop';
 queue('/hotfix-v4269-rating-update.js?v=4400','v4269-rating-update-v4400');
 queue('/player-experience-v4349.js?v=4424-cooler-health-scope','player-experience-v4349-v4400');
 queue('/hotfix-v4278-rating-cooler-president.js?v=4463-no-self-rating','v4278-rating-cooler-president-v4401');
 queue('/brand-refresh-v4347.js?v=4377','brand-refresh-v4347');
 queue('/version-notice-v4346.js?v=5000','version-notice-v4346');
 queue('/admin-access-gate-v4258.js?v=4377','admin-access-gate');
 queue('/hotfix-v4250-invite-auth.js?v=4377','invite-auth');
 queue('/legacy-hotfix-v4244.js?v=5112-player-label','legacy4244');queue('/hotfix-v4246.js?v=4377','v4246');queue('/hotfix-v4248.js?v=4377','v4248');queue('/hotfix-v4250.js?v=4377','v4250');queue('/hotfix-v4254-auth-stability.js?v=4377','v4254-auth-stability');
 queue('/hotfix-v4263-public-registration-guard.js?v=4377','v4263-public-registration-guard');queue('/hotfix-v4266-public-payment-maps.js?v=4377-invitation1','v4266-public-payment-maps');queue('/hotfix-v4268-flex-format-payment.js?v=4377-invitation1','v4268-flex-format-payment');
 queue('/hotfix-v4270-coorg-fun.js?v=4377','v4270-coorg-fun');queue('/hotfix-v4271-whatsapp-avatar.js?v=4377','v4271-whatsapp-avatar');queue('/hotfix-v4272-profile-registration.js?v=4377','v4272-profile-registration');
 queue('/player-contact-profile-v4321.js?v=4405','player-contact-profile-v4405');queue('/player-id-display-v4313.js?v=4377','player-id-display-v4313');queue('/player-profile-organizer-v4337.js?v=4399-player-r3','player-profile-organizer-v4337');queue('/player-health-badge-fix-v4358.js?v=4424-cooler-health-scope','player-health-badge-fix-v4358');queue('/player-experience-v4340.js?v=4424-cooler-health-scope','player-experience-v4340');queue('/player-card-v4344.js?v=4399-player-r4','player-card-v4344');queue('/account-password-v4343.js?v=4377','account-password-v4343');queue('/player-profile-actions-v4348.js?v=4377','player-profile-actions-v4348');queue('/profile-coorg-photo-guard-v4354.js?v=4406-pilot-photo','profile-coorg-photo-guard-v4354');// Ancien lanceur retiré : doublon de #swePlayerCreateQuick et ouverture privée obsolète.queue('/tournament-compact-v4349.js?v=4377','tournament-compact-v4349');queue('/tournament-links-share-v4359.js?v=5061-external-payment-links','tournament-links-share-v4359');
 queue('/hotfix-v4273-payment-ratings-ui.js?v=4377-invitation1','v4273-payment-ratings-ui');queue('/hotfix-v4274-payment-rating-admin.js?v=4377-invitation1','hotfix-v4274-payment-rating-admin');queue('/coorganizer-selfpay-v4308.js?v=4399-player-r7','coorganizer-selfpay-v4308');queue('/hotfix-v4276-evaluation-reports.js?v=5069-all-rating-voters','v4276-evaluation-reports');queue('/hotfix-v4277-evaluation-progress.js?v=4398-edge-stable','v4277-evaluation-progress');queue('/hotfix-v4279-payment-authority.js?v=4377-invitation1','v4279-payment-authority');queue('/hotfix-v4280-registration-status.js?v=4377','v4280-registration-status');if((new URLSearchParams(location.search).get('start')||'').toLowerCase()!=='player')queue('/hotfix-v4281-complex-home.js?v=4377','v4281-complex-home');queue('/hotfix-v4282-partner-booking.js?v=4377','v4282-partner-booking');queue('/hotfix-v4283-stability-security.js?v=4377','v4283-stability-security');
 queue('/auth-player-clean-v4315.js?v=4412','auth-player-clean-v4318');loadCss('/player-entry-layout-v4330.css?v=4413','player-entry-layout-v4330');queue('/coorg-tab-rights-v4319.js?v=4399-player-r9','coorg-tab-rights-v4321-r9');queue('/match-rating-rules-v4323.js?v=4377','match-rating-rules-v4323');
 queue('/quick-match-v4460.js?v=5091-fast-conquest','quick-match-v4460');queue('/match-team-select-v4309.js?v=4377','match-team-select-v4309');queue('/ui-stability-v4331.js?v=4377','ui-stability-v4331');queue('/match-numbering-v4311.js?v=4377','match-numbering-v4311');queue('/match-actions-v4303.js?v=4377','match-actions-v4303');queue('/match-rotation-v4306.js?v=5603-king-opening-penalties','match-rotation-v4306');queue('/match-tiebreak-persist-v4313.js?v=4377','match-tiebreak-persist-v4313');
 queue('/coorganizer-dashboard-v4399.js?v=5101-pending-room','coorganizer-dashboard-v4401');
 queue('/match-extras-v4306.js?v=5603-king-opening-penalties','match-extras-v4306');queue('/tournament-king-config-v4306.js?v=4377','tournament-king-config-v4306');queue('/live-enhance-v4306.js?v=4377','live-enhance-v4306');queue('/match-realtime-v4304.js?v=5035-conquest-live','match-realtime-v4361');queue('/match-tab-recovery-v4355.js?v=4377','match-tab-recovery-v4363');queue('/match-refresh-guard-v4361.js?v=4377','match-refresh-guard-v4361');queue('/public-registration-lock-v4307.js?v=4377','public-registration-lock-v4307');
 queue('/auth-access-clean-v4352.js?v=4399-player-r9','auth-access-clean-v4352-r9');queue('/mobile-nav-v4361.js?v=4469','mobile-nav-v4361-4469');queue('/coorganizer-invite-reliability-v4392.js?v=4392','coorganizer-invite-reliability-v4392');queue('/player-activity-attendance-v4393.js?v=4398-edge-stable','player-activity-attendance-v4393');queue('/coorg-admin-polish-v5011.js?v=5012','coorg-admin-polish-v5011');queue('/rating-report-reliability-v4394.js?v=5064-rating-counts','rating-report-reliability-v4394');
 queue('/player-profile-compact.js?v=4399-player-r1','player-profile-compact');
 
 queue('/coorganizer-insights-v4400.js?v=4401','coorganizer-insights-v4401');
 
 queue('/football-avatar-picker-v4404.js?v=4405','football-avatar-picker-v4405');
 queue('/player-profile-fixes-v4404.js?v=4404b','player-profile-fixes-v4404');
 queue('/superadmin-rating-correction-v4400.js?v=4400','superadmin-rating-correction-v4400');
 queue('/navigation-ranking-r9.js?v=4405','navigation-ranking-r12');
 queue('/ranking-premium-visuals-v4405.js?v=4405','ranking-premium-visuals-v4405');
 queue('/substitute-fair-play-rules-v4406.js?v=4406','substitute-fair-play-rules-v4406');
 queue('/player-rating-progress-v4462.js?v=4462','player-rating-progress-v4462');
 queue('/players-directory-nav-v4477.js?v=5090-player-readability','players-directory-nav-v4477');
 await Promise.all(pending);
 applyBuild();setTimeout(applyBuild,250);setTimeout(applyBuild,1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.addEventListener('pageshow',()=>setTimeout(applyBuild,50));document.addEventListener('swe:rendered',()=>setTimeout(applyBuild,0));
})();

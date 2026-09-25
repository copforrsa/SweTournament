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
 applyBuild();purgeLegacyClient();loadCss('/desktop-layout-v4328.css?v=4377','desktop-layout-v4328');document.documentElement.dataset.sweMatchClient=mobileClient()?'mobile':'desktop';
 await load('/hotfix-v4269-rating-update.js?v=4400','v4269-rating-update-v4400');
 await load('/player-experience-v4349.js?v=4424-cooler-health-scope','player-experience-v4349-v4400');
 await load('/hotfix-v4278-rating-cooler-president.js?v=4463-no-self-rating','v4278-rating-cooler-president-v4401');
 await load('/brand-refresh-v4347.js?v=4377','brand-refresh-v4347');
 await load('/version-notice-v4346.js?v=5000','version-notice-v4346');
 await load('/admin-access-gate-v4258.js?v=4377','admin-access-gate');
 await load('/hotfix-v4250-invite-auth.js?v=4377','invite-auth');
 await load('/legacy-hotfix-v4244.js?v=5047-player-member','legacy4244');await load('/hotfix-v4246.js?v=4377','v4246');await load('/hotfix-v4248.js?v=4377','v4248');await load('/hotfix-v4250.js?v=4377','v4250');await load('/hotfix-v4254-auth-stability.js?v=4377','v4254-auth-stability');
 await load('/hotfix-v4263-public-registration-guard.js?v=4377','v4263-public-registration-guard');await load('/hotfix-v4266-public-payment-maps.js?v=4377-invitation1','v4266-public-payment-maps');await load('/hotfix-v4268-flex-format-payment.js?v=4377-invitation1','v4268-flex-format-payment');await load('/hotfix-v4269-rating-update.js?v=4377','v4269-rating-update');
 await load('/hotfix-v4270-coorg-fun.js?v=4377','v4270-coorg-fun');await load('/hotfix-v4271-whatsapp-avatar.js?v=4377','v4271-whatsapp-avatar');await load('/hotfix-v4272-profile-registration.js?v=4377','v4272-profile-registration');
 await load('/player-contact-profile-v4321.js?v=4405','player-contact-profile-v4405');await load('/player-id-display-v4313.js?v=4377','player-id-display-v4313');await load('/player-profile-organizer-v4337.js?v=4399-player-r3','player-profile-organizer-v4337');await load('/player-experience-v4349.js?v=4424-cooler-health-scope','player-experience-v4349');await load('/player-health-badge-fix-v4358.js?v=4424-cooler-health-scope','player-health-badge-fix-v4358');await load('/player-experience-v4340.js?v=4424-cooler-health-scope','player-experience-v4340');await load('/player-card-v4344.js?v=4399-player-r4','player-card-v4344');await load('/account-password-v4343.js?v=4377','account-password-v4343');await load('/player-profile-actions-v4348.js?v=4377','player-profile-actions-v4348');await load('/profile-coorg-photo-guard-v4354.js?v=4406-pilot-photo','profile-coorg-photo-guard-v4354');await load('/simple-swe-page-v4350.js?v=4399-player-r2','simple-swe-page-v4350');await load('/simple-swe-launcher-v4350.js?v=4377','simple-swe-launcher-v4350');await load('/simple-swe-responsive-v4353.js?v=4377','simple-swe-responsive-v4353');await load('/tournament-compact-v4349.js?v=5057-dashboard','tournament-compact-v4349');await load('/conquest-format-v5058.js?v=5062-five-team-flow','conquest-format-v5058');await load('/tournament-links-share-v4359.js?v=4377','tournament-links-share-v4359');
 await load('/hotfix-v4273-payment-ratings-ui.js?v=4377-invitation1','v4273-payment-ratings-ui');await load('/hotfix-v4274-payment-rating-admin.js?v=4377-invitation1','hotfix-v4274-payment-rating-admin');await load('/coorganizer-selfpay-v4308.js?v=4399-player-r7','coorganizer-selfpay-v4308');await load('/hotfix-v4276-evaluation-reports.js?v=4377','v4276-evaluation-reports');await load('/hotfix-v4277-evaluation-progress.js?v=4398-edge-stable','v4277-evaluation-progress');await load('/hotfix-v4278-rating-cooler-president.js?v=4398-edge-stable','v4278-rating-cooler-president');await load('/hotfix-v4279-payment-authority.js?v=4377-invitation1','v4279-payment-authority');await load('/hotfix-v4280-registration-status.js?v=4377','v4280-registration-status');await load('/hotfix-v4281-complex-home.js?v=4377','v4281-complex-home');await load('/hotfix-v4282-partner-booking.js?v=4377','v4282-partner-booking');await load('/hotfix-v4283-stability-security.js?v=4377','v4283-stability-security');
 await load('/auth-player-clean-v4315.js?v=4412','auth-player-clean-v4318');loadCss('/player-entry-layout-v4330.css?v=4413','player-entry-layout-v4330');await load('/coorg-tab-rights-v4319.js?v=4399-player-r9','coorg-tab-rights-v4321-r9');await load('/match-rating-rules-v4323.js?v=4377','match-rating-rules-v4323');
 await load('/match-engine-v4300.js?v=5042-conquest-team-tabs','match-engine-v4302');await load('/quick-match-v4460.js?v=4474-conquest-finish','quick-match-v4460');await load('/match-team-select-v4309.js?v=5021-auto-circuit','match-team-select-v4309');await load('/match-rotation-v4306.js?v=5031-role-by-pitch','match-rotation-v4306');await load('/ui-stability-v4331.js?v=5030-initial-matches','ui-stability-v4331');await load('/match-numbering-v4311.js?v=4377','match-numbering-v4311');await load('/match-actions-v4303.js?v=4377','match-actions-v4303');await load('/match-tiebreak-persist-v4313.js?v=4377','match-tiebreak-persist-v4313');
 await load('/coorganizer-dashboard-v4399.js?v=4464-actions-first','coorganizer-dashboard-v4401');
 await load('/match-extras-v4306.js?v=5021-auto-circuit','match-extras-v4306');await load('/match-archive-v5046.js?v=5046','match-archive-v5046');await load('/tournament-king-config-v4306.js?v=4377','tournament-king-config-v4306');await load('/tournament-creation-flow-v5048.js?v=5051-visual-reset','tournament-creation-flow-v5048');await load('/live-enhance-v4306.js?v=4377','live-enhance-v4306');await load('/match-realtime-v4304.js?v=4377','match-realtime-v4361');await load('/match-tab-recovery-v4355.js?v=4364-stable-screen','match-tab-recovery-v4363');await load('/match-refresh-guard-v4361.js?v=4377','match-refresh-guard-v4361');await load('/public-registration-lock-v4307.js?v=4377','public-registration-lock-v4307');
 await load('/auth-access-clean-v4352.js?v=4399-player-r9','auth-access-clean-v4352-r9');await load('/mobile-nav-v4361.js?v=4469','mobile-nav-v4361-4469');await load('/mobile-coorg-rights-v4362.js?v=4399-player-r9','mobile-coorg-rights-v4362-r9');await load('/coorganizer-invite-reliability-v4392.js?v=4392','coorganizer-invite-reliability-v4392');await load('/player-activity-attendance-v4393.js?v=4398-edge-stable','player-activity-attendance-v4393');await load('/coorg-admin-polish-v5011.js?v=5012','coorg-admin-polish-v5011');await load('/rating-report-reliability-v4394.js?v=4394','rating-report-reliability-v4394');await load('/team-composition-visual-v4456.js?v=5036-keep-registration','team-composition-visual-v4456-5036');await load('/coorganizer-dashboard-v4399.js?v=4399-player-r10','coorganizer-dashboard-v4399-r10');
 await load('/player-profile-compact.js?v=4399-player-r1','player-profile-compact');
 await load('/player-home.js?v=4417','player-home-v4417');
 await load('/coorganizer-insights-v4400.js?v=4401','coorganizer-insights-v4401');
 await load('/coorganizer-experience-v4402.js?v=4402','coorganizer-experience-v4402');
 await load('/football-avatar-picker-v4404.js?v=4405','football-avatar-picker-v4405');
 await load('/player-profile-fixes-v4404.js?v=4404b','player-profile-fixes-v4404');
 await load('/superadmin-rating-correction-v4400.js?v=4400','superadmin-rating-correction-v4400');
 await load('/navigation-ranking-r9.js?v=4405','navigation-ranking-r12');
 await load('/ranking-premium-visuals-v4405.js?v=4405','ranking-premium-visuals-v4405');
 await load('/substitute-fair-play-rules-v4406.js?v=4406','substitute-fair-play-rules-v4406');
 await load('/player-rating-progress-v4462.js?v=4462','player-rating-progress-v4462');
 await load('/players-directory-nav-v4477.js?v=5000-fixed-player-tools','players-directory-nav-v4477');
 applyBuild();setTimeout(applyBuild,250);setTimeout(applyBuild,1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.addEventListener('pageshow',()=>setTimeout(applyBuild,50));document.addEventListener('swe:rendered',()=>setTimeout(applyBuild,0));
})();

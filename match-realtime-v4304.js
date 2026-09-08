(()=>{
'use strict';
if(window.__SWE_MATCH_REALTIME_4304)return;window.__SWE_MATCH_REALTIME_4304=true;
let timer=null,channel=null,lastSync=0;
const currentTourId=()=>{try{return currentTour()?.id||S.activeTour||new URLSearchParams(location.search).get('tournament')||null}catch(_){return S.activeTour||null}};
const publicToken=()=>{try{return window.__sweResolvedShortLink?.public_token||new URLSearchParams(location.search).get('public')||null}catch(_){return null}};
function localBusy(){return Number(window.__SWE_LOCAL_MATCH_MUTATION_UNTIL||0)>Date.now()}
async function syncAdmin(tid){
  if(!tid||localBusy())return;
  const [mr,gr]=await Promise.all([
    sb.from('matches').select('*').eq('tournament_id',tid).order('match_order'),
    sb.from('goals').select('*').in('match_id',(S.matches||[]).filter(m=>String(m.tournament_id)===String(tid)).map(m=>m.id).length?(S.matches||[]).filter(m=>String(m.tournament_id)===String(tid)).map(m=>m.id):['00000000-0000-0000-0000-000000000000'])
  ]);
  if(!mr.error){S.matches=mr.data||[]}
  const mids=(S.matches||[]).map(m=>m.id);
  let goals=[];
  if(mids.length){const rr=await sb.from('goals').select('*').in('match_id',mids);if(!rr.error)goals=rr.data||[]}
  S.goals=goals;
  try{if(typeof renderMatches==='function')renderMatches();else window.SWE_RENDER_MATCHES_4302?.()}catch(e){console.warn('SWÉ realtime render admin',e)}
  document.dispatchEvent(new Event('swe:rendered'));
  document.dispatchEvent(new CustomEvent('swe:realtime-synced',{detail:{tournamentId:tid}}));
}
async function syncPublic(){
  if(localBusy())return;
  const token=publicToken();
  if(!token||typeof bootPublic!=='function')return;
  try{await bootPublic(token);document.dispatchEvent(new CustomEvent('swe:realtime-synced',{detail:{public:true}}))}catch(e){console.warn('SWÉ realtime public',e)}
}
async function runSync(){
  if(localBusy())return;
  if(Date.now()-lastSync<180)return;lastSync=Date.now();
  if(S.publicMode)await syncPublic();else await syncAdmin(currentTourId());
}
function schedule(){clearTimeout(timer);timer=setTimeout(runSync,260)}
function subscribe(){
  try{if(channel)sb.removeChannel(channel)}catch(_){}
  channel=sb.channel('swe-match-live-4304')
    .on('postgres_changes',{event:'*',schema:'public',table:'matches'},schedule)
    .on('postgres_changes',{event:'*',schema:'public',table:'goals'},schedule)
    .subscribe(status=>{document.documentElement.dataset.sweRealtime=String(status||'').toLowerCase()});
}
subscribe();
// Fallback discret au cas où le WebView perd la websocket.
setInterval(()=>{if(document.visibilityState==='visible'&&!localBusy())runSync()},3000);
window.addEventListener('online',()=>{subscribe();setTimeout(runSync,350)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(runSync,300)});
})();
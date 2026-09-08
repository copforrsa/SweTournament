(()=>{
'use strict';
if(window.__SWE_MATCH_REALTIME_4305)return;window.__SWE_MATCH_REALTIME_4305=true;
let channel=null;
const timers=new Map();
const FIVE_SECONDS=5000;
const localBusy=()=>Number(window.__SWE_LOCAL_MATCH_MUTATION_UNTIL||0)>Date.now();
const currentTourId=()=>{try{return currentTour()?.id||S.activeTour||new URLSearchParams(location.search).get('tournament')||null}catch(_){return S.activeTour||null}};
const publicToken=()=>{try{return window.__sweResolvedShortLink?.public_token||new URLSearchParams(location.search).get('public')||null}catch(_){return null}};
function queue(matchId){
  if(!matchId)return;
  if(timers.has(matchId))clearTimeout(timers.get(matchId));
  timers.set(matchId,setTimeout(()=>{timers.delete(matchId);syncOne(matchId)},FIVE_SECONDS));
}
async function syncAdminMatch(matchId){
  if(localBusy())return queue(matchId);
  try{
    const A=window.SWE_MATCH_ACTIONS_4303;
    if(A?.refreshMatch){
      const m=await A.refreshMatch(matchId);
      document.dispatchEvent(new CustomEvent('swe:match-remote-final',{detail:{match:m,matchId}}));
      return;
    }
    const [mr,gr]=await Promise.all([
      sb.from('matches').select('*').eq('id',matchId).single(),
      sb.from('goals').select('*').eq('match_id',matchId)
    ]);
    if(mr.error)throw mr.error;
    const i=(S.matches||[]).findIndex(m=>String(m.id)===String(matchId));
    if(i>=0)S.matches[i]=mr.data;
    S.goals=[...(S.goals||[]).filter(g=>String(g.match_id)!==String(matchId)),...(gr.data||[])];
    document.dispatchEvent(new CustomEvent('swe:match-remote-final',{detail:{match:mr.data,matchId}}));
  }catch(e){console.warn('SWÉ V43.05 sync match',e)}
}
async function syncPublicOnce(){
  if(localBusy())return;
  const token=publicToken();
  if(!token||typeof bootPublic!=='function')return;
  try{await bootPublic(token)}catch(e){console.warn('SWÉ V43.05 sync public',e)}
}
async function syncOne(matchId){
  if(S.publicMode)return syncPublicOnce();
  const tid=currentTourId();
  const local=(S.matches||[]).find(m=>String(m.id)===String(matchId));
  if(tid&&local?.tournament_id&&String(local.tournament_id)!==String(tid))return;
  await syncAdminMatch(matchId);
}
function subscribe(){
  try{if(channel)sb.removeChannel(channel)}catch(_){}
  channel=sb.channel('swe-score-final-4305')
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'matches'},payload=>{
      const n=payload?.new,o=payload?.old;
      if(!n?.id)return;
      const changed=Number(n.home_score||0)!==Number(o?.home_score||0)||Number(n.away_score||0)!==Number(o?.away_score||0);
      if(changed)queue(n.id);
    })
    .subscribe(status=>{document.documentElement.dataset.sweRealtime=String(status||'').toLowerCase()});
}
subscribe();
window.addEventListener('online',subscribe);
})();
(()=>{
'use strict';
if(window.__SWE_4284_MOBILE_MATCHES)return;window.__SWE_4284_MOBILE_MATCHES=true;
const E=id=>document.getElementById(id);
const isMobile=()=>window.matchMedia?.('(max-width: 820px), (pointer: coarse)').matches===true;
let createBusy=false,bulkBusy=false,rtTimer=null,fullTimer=null;
function maxOrder(){return Math.max(0,...((typeof S!=='undefined'&&Array.isArray(S.matches))?S.matches:[]).map(m=>Number(m.match_order)||0));}
function sortMatches(){if(typeof S==='undefined'||!Array.isArray(S.matches))return;S.matches.sort((a,b)=>(Number(a.match_order)||0)-(Number(b.match_order)||0)||String(a.created_at||'').localeCompare(String(b.created_at||'')));}
function paintMatches(){try{sortMatches();if(typeof renderMatches==='function')renderMatches();if(typeof renderHome==='function')renderHome();document.dispatchEvent(new Event('swe:rendered'));}catch(e){console.warn('SWÉ matchs 42.84',e)}}
async function createMatch(){if(createBusy||typeof sb==='undefined'||typeof S==='undefined')return;const btn=E('addMatch');if(!btn)return;createBusy=true;const old=btn.textContent;btn.disabled=true;btn.textContent='Création…';try{
  if(typeof isCoorg==='function'&&isCoorg()&&typeof hasTemporaryAdmin==='function'&&!hasTemporaryAdmin()&&!S.myPermissions?.can_enter_scores)throw new Error('Tu n’es pas autorisé à saisir les scores.');
  const t=typeof currentTour==='function'?currentTour():null,home=E('homeTeam')?.value||'',away=E('awayTeam')?.value||'',pitch=E('pitch')?.value||'';
  if(!t||!home||!away||home===away)throw new Error('Choisis deux équipes différentes');
  if(t.format==='league'&&!pitch)throw new Error('Pour un match de Ligue, indique obligatoirement le terrain.');
  const row={tournament_id:t.id,home_team_id:home,away_team_id:away,match_order:maxOrder()+1,pitch:pitch||null,round_label:(E('roundLabel')?.value||'').trim()||null};
  const r=await sb.from('matches').insert(row).select('*').single();
  if(r.error)throw r.error;
  if(!Array.isArray(S.matches))S.matches=[];
  if(r.data&&!S.matches.some(m=>String(m.id)===String(r.data.id)))S.matches.push(r.data);
  if(E('pitch'))E('pitch').value='';if(E('roundLabel'))E('roundLabel').value='';
  paintMatches();
  if(typeof toast==='function')toast('Match créé ✅');
}catch(e){if(typeof toast==='function')toast(e?.message||String(e));else console.warn(e)}finally{createBusy=false;btn.disabled=false;btn.textContent=old}}
async function createRoundRobin(){if(bulkBusy||typeof sb==='undefined'||typeof S==='undefined')return;const btn=E('roundRobin');if(!btn)return;bulkBusy=true;const old=btn.textContent;btn.disabled=true;btn.textContent='Génération…';try{
  const t=typeof currentTour==='function'?currentTour():null;if(!t||!Array.isArray(S.teams)||S.teams.length<2)throw new Error('Crée les équipes d’abord');if(t.format==='league')throw new Error('En Ligue, crée les matchs un par un afin d’indiquer le terrain de chaque match.');
  const existing=new Set((S.matches||[]).map(m=>[m.home_team_id,m.away_team_id].sort().join('|'))),rows=[];let n=maxOrder()+1;
  for(let i=0;i<S.teams.length;i++)for(let j=i+1;j<S.teams.length;j++){const key=[S.teams[i].id,S.teams[j].id].sort().join('|');if(!existing.has(key)){rows.push({tournament_id:t.id,home_team_id:S.teams[i].id,away_team_id:S.teams[j].id,match_order:n++});existing.add(key)}}
  if(!rows.length)throw new Error('Tous les matchs existent déjà');
  const r=await sb.from('matches').insert(rows).select('*');if(r.error)throw r.error;
  const added=Array.isArray(r.data)?r.data:[];if(!Array.isArray(S.matches))S.matches=[];for(const m of added)if(!S.matches.some(x=>String(x.id)===String(m.id)))S.matches.push(m);
  paintMatches();if(typeof toast==='function')toast(rows.length+' matchs générés ✅');
}catch(e){if(typeof toast==='function')toast(e?.message||String(e));else console.warn(e)}finally{bulkBusy=false;btn.disabled=false;btn.textContent=old}}
function interceptClicks(){if(window.__SWE_4284_CLICK_CAPTURE)return;window.__SWE_4284_CLICK_CAPTURE=true;document.addEventListener('click',e=>{const add=e.target?.closest?.('#addMatch');if(add){e.preventDefault();e.stopImmediatePropagation();createMatch();return}const rr=e.target?.closest?.('#roundRobin');if(rr){e.preventDefault();e.stopImmediatePropagation();createRoundRobin();}},true)}
function patchLocalMatch(payload){if(typeof S==='undefined'||!payload)return;const row=payload.new&&Object.keys(payload.new).length?payload.new:payload.old;if(!row)return;const active=String(S.activeTour||'');const tid=String((payload.new||payload.old)?.tournament_id||'');if(active&&tid&&active!==tid)return;if(!Array.isArray(S.matches))S.matches=[];const id=String(row.id||'');if(!id)return;const i=S.matches.findIndex(m=>String(m.id)===id);if(payload.eventType==='DELETE'){if(i>=0)S.matches.splice(i,1)}else if(i>=0)S.matches[i]={...S.matches[i],...row};else S.matches.push(row);paintMatches()}
function scheduleTournamentRefresh(){clearTimeout(rtTimer);rtTimer=setTimeout(async()=>{if(typeof loadTournament!=='function')return;try{await loadTournament();paintMatches();if(typeof renderRanking==='function')renderRanking().catch?.(()=>{})}catch(e){console.warn('SWÉ sync tournoi mobile',e)}},320)}
function scheduleFullRefresh(){clearTimeout(fullTimer);fullTimer=setTimeout(async()=>{if(typeof loadAll!=='function')return;try{await loadAll()}catch(e){console.warn('SWÉ sync mobile',e)}},1100)}
function mobileRealtime(){if(!isMobile()||typeof sb==='undefined'||typeof S==='undefined'||!S.session||!S.workspace)return false;try{if(S.channel)sb.removeChannel(S.channel)}catch(_){ }
  S.channel=sb.channel('tournoi-mobile-4284')
    .on('postgres_changes',{event:'*',schema:'public',table:'matches'},patchLocalMatch)
    .on('postgres_changes',{event:'*',schema:'public',table:'goals'},scheduleTournamentRefresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'match_player_assignments'},scheduleTournamentRefresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'teams'},scheduleFullRefresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'team_players'},scheduleFullRefresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'tournament_players'},scheduleFullRefresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'tournaments'},scheduleFullRefresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'players'},scheduleFullRefresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'seasons'},scheduleFullRefresh)
    .subscribe();return true}
function installMobileRealtime(){if(!isMobile())return;try{window.subscribeRealtime=mobileRealtime;subscribeRealtime=mobileRealtime}catch(_){window.subscribeRealtime=mobileRealtime}if(!mobileRealtime())setTimeout(installMobileRealtime,900)}
function mobilePerfCss(){if(!isMobile()||E('swe4284MobileStyle'))return;const s=document.createElement('style');s.id='swe4284MobileStyle';s.textContent='@media(max-width:820px){#view-matches .match,#view-matches details{content-visibility:auto;contain-intrinsic-size:180px}#view-matches button{touch-action:manipulation}#matchList{overflow-anchor:none}}';document.head.appendChild(s)}
function boot(){interceptClicks();mobilePerfCss();setTimeout(installMobileRealtime,700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.addEventListener('pageshow',()=>{mobilePerfCss();if(isMobile())setTimeout(installMobileRealtime,500)});
})();
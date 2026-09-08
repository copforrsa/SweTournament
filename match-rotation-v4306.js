(()=>{
'use strict';
if(window.__SWE_ROTATION_4306)return;window.__SWE_ROTATION_4306=true;
const R={};
const clone=x=>JSON.parse(JSON.stringify(x||{}));
const team=id=>(S.teams||[]).find(x=>String(x.id)===String(id));
const pitchObj=id=>(S.sportsPitches||[]).find(x=>String(x.id)===String(id));
function activePitchSet(t){return new Set((t?.reserved_pitch_ids||[]).map(String))}
function rolesFor(t){const active=activePitchSet(t),r=[];const hasFilter=active.size>0;if(t?.king_pitch_id&&(!hasFilter||active.has(String(t.king_pitch_id))))r.push('king');if(t?.middle_pitch_id&&(!hasFilter||active.has(String(t.middle_pitch_id))))r.push('middle');if(t?.stream_pitch_id&&(!hasFilter||active.has(String(t.stream_pitch_id))))r.push('stream');return r}
function pitchId(t,role){return role==='king'?t.king_pitch_id:role==='middle'?t.middle_pitch_id:t.stream_pitch_id}
function pitchName(t,role){return pitchObj(pitchId(t,role))?.name||(role==='king'?'Terrain du Roi':role==='middle'?'Terrain intermédiaire':'Terrain Ruisseau')}
function stateOf(t){const s=clone(t?.rotation_state||{});s.version=1;s.queue=Array.isArray(s.queue)?s.queue:[];s.active=s.active||{};s.initialized=!!s.initialized;s.team_count=Number(s.team_count||0);s.waiting=s.waiting||{};['king_winners','king_losers','middle_winners','middle_losers','stream_winners','stream_losers','bottom_entries'].forEach(k=>{if(!Array.isArray(s.waiting[k]))s.waiting[k]=[]});return s}
async function saveState(t,s){const r=await sb.from('tournaments').update({rotation_state:s}).eq('id',t.id);if(r.error)throw r.error;t.rotation_state=clone(s);document.dispatchEvent(new CustomEvent('swe:rotation-updated',{detail:{tournamentId:t.id,state:clone(s)}}))}
async function nextOrder(tid){const r=await sb.from('matches').select('match_order').eq('tournament_id',tid).order('match_order',{ascending:false}).limit(1);if(r.error)return 1;return Number(r.data?.[0]?.match_order||0)+1}
async function createMatch(t,s,role,homeId,awayId){if(!homeId||!awayId||String(homeId)===String(awayId))return null;const order=await nextOrder(t.id);const row={tournament_id:t.id,home_team_id:homeId,away_team_id:awayId,match_order:order,pitch:pitchName(t,role),round_label:role==='king'?'👑 Roi':role==='middle'?'↕️ Intermédiaire':'🌊 Ruisseau',status:'in_progress',started_at:new Date().toISOString(),rotation_role:role,rotation_generated:true};const r=await sb.from('matches').insert(row).select('*').single();if(r.error)throw r.error;S.matches=S.matches||[];S.matches.push(r.data);s.active[role]=r.data.id;if(role==='king')s.king_holder_team_id=homeId;document.dispatchEvent(new CustomEvent('swe:rotation-match-created',{detail:{match:r.data,role}}));return r.data}
function q(s,k){return s.waiting[k]}
async function schedule2(t,s){const roles=rolesFor(t),bottom=roles.find(r=>r!=='king');if(!bottom)return;const odd=s.team_count%2===1,bw=bottom+'_winners',bl=bottom+'_losers';
 if(odd){
   if(!s.active.king&&q(s,'king_winners').length){
     if(q(s,bw).length){const kw=q(s,'king_winners').shift(),lw=q(s,bw).shift(),kl=q(s,'king_losers').shift()||null;await createMatch(t,s,'king',kw,lw);if(kl)s.queue.push(kl)}
     else if(s.active[bottom]&&s.queue.length){const kw=q(s,'king_winners').shift(),outside=s.queue.shift(),kl=q(s,'king_losers').shift()||null;await createMatch(t,s,'king',kw,outside);if(kl)s.queue.push(kl)}
   }
   if(!s.active[bottom]&&q(s,bl).length&&s.queue.length){const ll=q(s,bl).shift(),outside=s.queue.shift();await createMatch(t,s,bottom,ll,outside)}
 }else{
   if(!s.active.king&&q(s,'king_winners').length&&q(s,bw).length)await createMatch(t,s,'king',q(s,'king_winners').shift(),q(s,bw).shift());
   if(!s.active[bottom]&&q(s,'king_losers').length&&q(s,bl).length)await createMatch(t,s,bottom,q(s,'king_losers').shift(),q(s,bl).shift());
 }
}
async function schedule3(t,s){const odd=s.team_count%2===1;
 if(!s.active.king&&q(s,'king_winners').length&&q(s,'middle_winners').length)await createMatch(t,s,'king',q(s,'king_winners').shift(),q(s,'middle_winners').shift());
 if(!s.active.middle&&q(s,'king_losers').length&&q(s,'stream_winners').length)await createMatch(t,s,'middle',q(s,'king_losers').shift(),q(s,'stream_winners').shift());
 if(odd){if(!s.active.stream&&q(s,'middle_losers').length&&q(s,'bottom_entries').length)await createMatch(t,s,'stream',q(s,'middle_losers').shift(),q(s,'bottom_entries').shift())}
 else if(!s.active.stream&&q(s,'middle_losers').length&&q(s,'stream_losers').length)await createMatch(t,s,'stream',q(s,'middle_losers').shift(),q(s,'stream_losers').shift())
}
async function schedule(t,s){const roles=rolesFor(t);if(roles.length===2)await schedule2(t,s);else if(roles.length===3)await schedule3(t,s)}
R.launch=async function(t){if(!t||t.rotation_mode!=='king_of_pitch')throw new Error('Ce tournoi n’est pas en format Roi du terrain.');const roles=rolesFor(t);const teams=[...(S.teams||[])].filter(x=>String(x.tournament_id)===String(t.id)||!x.tournament_id);if(roles.length<1)throw new Error('Configure au moins le terrain du Roi.');if(teams.length>7)throw new Error('Le moteur Roi du terrain gère actuellement jusqu’à 7 équipes.');if(teams.length>=6&&roles.length<3)throw new Error('Avec 6 ou 7 équipes, configure 3 terrains.');if(teams.length>=4&&teams.length<=5&&roles.length<2)throw new Error('Avec 4 ou 5 équipes, configure Roi + Ruisseau.');if(teams.length<2)throw new Error('Il faut au moins 2 équipes.');let s=stateOf(t);if(s.initialized)throw new Error('Le circuit est déjà lancé.');s={version:1,initialized:true,team_count:teams.length,queue:[],active:{},king_holder_team_id:teams[0].id,waiting:{king_winners:[],king_losers:[],middle_winners:[],middle_losers:[],stream_winners:[],stream_losers:[],bottom_entries:[]}};let cursor=0;for(const role of roles){const a=teams[cursor++],b=teams[cursor++];if(!a||!b)break;await createMatch(t,s,role,a.id,b.id)}s.queue=teams.slice(cursor).map(x=>x.id);await saveState(t,s);if(typeof renderMatches==='function')renderMatches();document.dispatchEvent(new Event('swe:rendered'));return s}
R.finish=async function(m,shifumiWinnerId=null){const t=(S.tournaments||[]).find(x=>String(x.id)===String(m.tournament_id))||(typeof currentTour==='function'?currentTour():null);if(!t||t.rotation_mode!=='king_of_pitch')throw new Error('Rotation Roi du terrain inactive.');const role=m.rotation_role||Object.entries(stateOf(t).active).find(([,id])=>String(id)===String(m.id))?.[0];if(!role)throw new Error('Rôle du terrain introuvable.');const s=stateOf(t),hs=Number(m.home_score||0),as=Number(m.away_score||0);let winner=null;if(hs>as)winner=m.home_team_id;else if(as>hs)winner=m.away_team_id;else if(role==='king')winner=s.king_holder_team_id||m.home_team_id;else winner=shifumiWinnerId;if(!winner)throw new Error('SHIFUMI_REQUIRED');const loser=String(winner)===String(m.home_team_id)?m.away_team_id:m.home_team_id;const up=await sb.from('matches').update({status:'finished',finished_at:new Date().toISOString()}).eq('id',m.id);if(up.error)throw up.error;m.status='finished';m.finished_at=new Date().toISOString();s.active[role]=null;q(s,role+'_winners').push(winner);q(s,role+'_losers').push(loser);
 if(rolesFor(t).length===3&&s.team_count%2===1&&role==='stream'){
   const incoming=s.queue.shift()||null;if(incoming){q(s,'bottom_entries').push(incoming);s.queue.push(q(s,'stream_losers').shift())}
 }
 await schedule(t,s);await saveState(t,s);document.dispatchEvent(new CustomEvent('swe:match-finished',{detail:{match:m,winner,loser,role,state:clone(s)}}));if(typeof window.SWE_RENDER_MATCHES_4302==='function')window.SWE_RENDER_MATCHES_4302(false);else if(typeof renderMatches==='function')renderMatches();document.dispatchEvent(new Event('swe:rendered'));return {winner,loser,state:s}}
R.getState=t=>stateOf(t);R.rolesFor=rolesFor;R.pitchName=pitchName;window.SWE_ROTATION_4306=R;
})();
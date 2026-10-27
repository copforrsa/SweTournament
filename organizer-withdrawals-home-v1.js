(()=>{'use strict';
const E=id=>document.getElementById(id);let busy=false,last=0;
async function refresh(force=false){
 const root=E('sweHostReliabilityRows');
 if(!root||busy||!window.sb||!window.S)return;
 if(!S.session?.user?.id||!S.workspace?.id||S.publicMode)return;
 if(!force&&Date.now()-last<30000)return;
 busy=true;last=Date.now();
 try{
  const {data,error}=await sb.rpc('admin_get_workspace_player_reliability',{p_workspace_id:S.workspace.id});
  if(error)throw error;
  const players=(Array.isArray(data)?data:[]).filter(x=>Number(x.linked_late_withdrawals_total||0)>0).sort((a,b)=>Number(b.linked_late_withdrawals_total||0)-Number(a.linked_late_withdrawals_total||0));
  root.replaceChildren();
  if(!players.length){const hint=document.createElement('p');hint.textContent='Aucun désistement tardif n’est enregistré pour ce groupe. Les anciens cas non saisis devront être régularisés après vérification.';root.append(hint);return;}
  const summary=document.createElement('p');summary.className='swe-withdrawals-summary';summary.textContent=players.length+' joueur(s) avec un historique de désistement tardif';root.append(summary);
  for(const player of players){
   const line=document.createElement('div');line.className='swe-withdrawal-person';
   const label=document.createElement('strong');label.textContent=player.player_name||'Joueur';
   const details=document.createElement('span');details.textContent=String(player.linked_late_withdrawals_total||0)+' désistement(s) enregistré(s) · '+String(player.linked_late_withdrawals_12m||0)+' sur 12 mois';
   line.append(label,details);root.append(line);
  }
 }catch(err){root.textContent='Impossible de charger les désistements : '+(err.message||'Erreur de connexion');}
 finally{busy=false}
}
document.addEventListener('click',e=>{if(e.target.closest?.('#sweHostReliabilityRefresh'))refresh(true)});
document.addEventListener('swe:rendered',()=>refresh(false));
window.addEventListener('pageshow',()=>refresh(false));
setInterval(()=>{if(document.visibilityState==='visible')refresh(false)},30000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh(true),{once:true});else refresh(true);
})();

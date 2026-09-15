(()=>{
'use strict';
if(window.__SWE_RATING_UPDATE_4269)return;
window.__SWE_RATING_UPDATE_4269=true;
function sameReview(a,p){
  if(!a)return false;
  return Number(a.cardio)===Number(p.p_cardio)&&Number(a.dribble)===Number(p.p_dribble)&&Number(a.collectif)===Number(p.p_collectif)&&Number(a.frappe)===Number(p.p_frappe)&&String(a.preferred_role||'')===String(p.p_preferred_role||'');
}
function install(){
  if(typeof sb==='undefined'||!sb?.rpc){setTimeout(install,150);return}
  if(sb.rpc.__sweRating4269)return;
  const original=sb.rpc.bind(sb);
  const wrapped=async function(name,args,opts){
    if(name!=='submit_player_skill_review')return original(name,args,opts);
    try{
      const current=(typeof S!=='undefined'&&Array.isArray(S.myRatings))?S.myRatings.find(r=>String(r.player_id)===String(args?.p_player_id)):null;
      if(current)return {data:null,error:{message:'Cette évaluation est définitive. Seul le Super Admin peut la corriger.'}};
      return original('submit_player_skill_review_v2',{
        p_player_id:args.p_player_id,
        p_cardio:Number(args.p_cardio),
        p_dribble:Number(args.p_dribble),
        p_collectif:Number(args.p_collectif),
        p_frappe:Number(args.p_frappe),
        p_preferred_role:args.p_preferred_role,
        p_change_reason:null,
        p_change_note:null,
        p_tournament_id:null
      },opts);
    }catch(e){return {data:null,error:{message:e?.message||String(e)}}}
  };
  wrapped.__sweRating4269=true;
  sb.rpc=wrapped;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,350),{once:true});else setTimeout(install,350);
})();

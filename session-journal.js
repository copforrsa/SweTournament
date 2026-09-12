// Called by successful authentication flows; no DOM observer or click tracking.
(()=>{
 const pending=new Set();
 window.SWEJournalSession=async(client,userId)=>{
  if(!userId||pending.has(userId))return;pending.add(userId);
  try{
   const key='swe-journal-visit:'+userId;let visit=sessionStorage.getItem(key);
   if(!visit){visit=crypto.randomUUID();sessionStorage.setItem(key,visit);}
   if(sessionStorage.getItem(key+':saved')===visit)return;
   const {error}=await client.rpc('record_my_app_visit',{p_visit:visit});
   if(!error)sessionStorage.setItem(key+':saved',visit);
  }catch(_){}finally{pending.delete(userId);}
 };
})();

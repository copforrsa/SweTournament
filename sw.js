const SW_BUILD='42.98-cleanup';
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }catch(_){}
    try{await self.clients.claim();}catch(_){}
    try{
      const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
      for(const client of clients){
        try{client.postMessage({type:'SWE_FORCE_RELOAD',build:SW_BUILD});}catch(_){}
      }
    }catch(_){}
    try{await self.registration.unregister();}catch(_){}
  })());
});
// Aucun fetch handler : accès réseau direct. Le client reçoit SWE_FORCE_RELOAD
// après purge afin de sortir des anciennes versions encore présentes sur mobile.

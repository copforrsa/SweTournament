const SW_BUILD='42.50-cleanup';
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }catch(_){}
    try{await self.clients.claim();}catch(_){}
    try{await self.registration.unregister();}catch(_){}
    try{
      const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
      for(const client of clients){
        try{client.postMessage({type:'SWE_SW_REMOVED',build:SW_BUILD});}catch(_){}
      }
    }catch(_){}
  })());
});
// Aucun fetch handler : la V42.50 repasse entièrement en accès réseau direct.

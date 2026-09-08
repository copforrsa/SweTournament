const SW_BUILD='42.98-network-reset';
const UPDATE_PARAM='swe_update';
const UPDATE_VALUE='4298';
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
        try{
          const u=new URL(client.url);
          if(u.origin!==self.location.origin)continue;
          if(u.searchParams.get(UPDATE_PARAM)!==UPDATE_VALUE){
            u.searchParams.set(UPDATE_PARAM,UPDATE_VALUE);
            await client.navigate(u.toString());
          }
        }catch(_){}
      }
    }catch(_){}
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  let u;try{u=new URL(req.url)}catch(_){return}
  if(u.origin!==self.location.origin)return;
  const force=req.mode==='navigate'||/\.(?:js|html|webmanifest)$/i.test(u.pathname)||u.pathname==='/'||u.pathname.endsWith('/index.html');
  if(!force)return;
  event.respondWith((async()=>{
    try{return await fetch(req,{cache:'no-store'})}
    catch(_){return fetch(req)}
  })());
});
// V42.98 : service worker temporaire de récupération. Il force le réseau pour
// le shell et les scripts afin qu'un WebView/PWA mobile ne reste plus bloqué
// sur une ancienne copie de l'application.

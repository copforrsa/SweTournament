const CACHE='swe-tournament-5v5-v42-50';
const STABLE_ASSETS=['./manifest.webmanifest','./favicon.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STABLE_ASSETS.map(x=>new Request(x,{cache:'reload'})))));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE&&(k.startsWith('tournoi-foot-')||k.startsWith('swe-tournament-5v5-'))).map(k=>caches.delete(k)));
    // Pas de clients.claim() et aucune navigation automatique : la mise à jour
    // prendra le contrôle au prochain chargement normal sans boucle de reconnexion.
  })());
});
async function networkOnly(req){
  return fetch(req,{cache:'no-store'});
}
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin){event.respondWith(fetch(req,{cache:'no-store'}));return;}
  const dynamic=req.mode==='navigate'||/\.(?:html|js|css)$/i.test(url.pathname)||url.pathname.endsWith('/sw.js');
  if(dynamic){event.respondWith(networkOnly(req));return;}
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req,{cache:'no-store'}).then(resp=>{
    if(resp&&resp.ok&&STABLE_ASSETS.some(x=>url.pathname.endsWith(x.replace('./','/')))){
      const copy=resp.clone();caches.open(CACHE).then(c=>c.put(req,copy));
    }
    return resp;
  })));
});

const CACHE='swe-tournament-5v5-v42-49';
const STATIC_ASSETS=['./','./index.html','./styles.css','./app.js','./hotfix-v4227.js','./hotfix-v4228.js','./hotfix-v4229.js','./hotfix-v4230.js','./hotfix-v4231.js','./hotfix-v4232.js','./ui-stability-v4234.js','./hotfix-v4235.js','./hotfix-v4236.js','./hotfix-v4237.js','./hotfix-v4240.js','./hotfix-v4239.js','./hotfix-v4244.js','./hotfix-v4246.js','./hotfix-v4248.js','./season-hotfix-v4244.js','./live.html','./live.js','./manifest.webmanifest','./favicon.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC_ASSETS.map(x=>new Request(x,{cache:'reload'})))));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE&&(k.startsWith('tournoi-foot-')||k.startsWith('swe-tournament-5v5-'))).map(k=>caches.delete(k)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    await Promise.all(clients.map(client=>client.navigate(client.url).catch(()=>null)));
  })());
});
async function networkFirst(req,cacheFallback=true){
  try{
    const resp=await fetch(req,{cache:'no-store'});
    if(resp&&resp.ok){
      const copy=resp.clone();
      caches.open(CACHE).then(c=>c.put(req,copy));
    }
    return resp;
  }catch(err){
    if(cacheFallback){const cached=await caches.match(req,{ignoreSearch:true});if(cached)return cached;}
    throw err;
  }
}
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin){event.respondWith(fetch(req,{cache:'no-store'}));return;}
  const isFreshAsset=/\.(?:js|css)$/i.test(url.pathname);
  const isNavigation=req.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/sw.js');
  if(isNavigation||isFreshAsset){event.respondWith(networkFirst(req,true));return;}
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req,{cache:'no-store'}).then(resp=>{if(resp&&resp.ok){const copy=resp.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return resp;})));
});

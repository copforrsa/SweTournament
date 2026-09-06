const SW_BUILD='42.50b';
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('tournoi-foot-')||k.startsWith('swe-tournament-5v5-')).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
function fresh(req){return fetch(req,{cache:'no-store',headers:req.headers});}
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      const resp=await fresh(req);
      const type=resp.headers.get('content-type')||'';
      if(!resp.ok||!type.includes('text/html'))return resp;
      let html=await resp.text();
      html=html
        .replace(/V42\.\d+/g,'V42.50')
        .replace(/MAJ 42\.\d+/g,'MAJ 42.50')
        .replace(/([.]js|[.]css)[?]v=\d+/g,'$1?v=4250');
      if(!html.includes('hotfix-v4246.js'))html=html.replace('</body>','<script src="./hotfix-v4246.js?v=4250" defer></script></body>');
      if(!html.includes('hotfix-v4248.js'))html=html.replace('</body>','<script src="./hotfix-v4248.js?v=4250" defer></script></body>');
      if(!html.includes('hotfix-v4250.js'))html=html.replace('</body>','<script src="./hotfix-v4250.js?v=4250" defer></script></body>');
      return new Response(html,{status:resp.status,statusText:resp.statusText,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate'}});
    })());
    return;
  }
  if(/\.(?:js|css)$/i.test(url.pathname)||url.pathname.endsWith('/sw.js')){
    event.respondWith(fresh(req));
  }
});

from pathlib import Path
import re

p=Path('index.html'); s=p.read_text()
s=re.sub(r'V42\.\d+','V42.34',s)
s=re.sub(r'MAJ 42\.\d+','MAJ 42.34',s)
s=re.sub(r'styles\.css\?v=\d+','styles.css?v=4234',s)
s=re.sub(r'app\.js\?v=\d+','app.js?v=4234',s)
for n in ['4227','4228','4229','4230','4231','4232']:
    s=re.sub(rf'hotfix-v{n}\.js\?v=\d+',f'hotfix-v{n}.js?v=4234',s)
if 'ui-stability-v4234.js' not in s:
    s=s.replace('</body>','<script src="./ui-stability-v4234.js?v=4234" defer></script></body>')
p.write_text(s)

for name in ['hotfix-v4227.js','hotfix-v4228.js','hotfix-v4229.js','hotfix-v4230.js','hotfix-v4231.js','hotfix-v4232.js']:
    p=Path(name); s=p.read_text(); s=re.sub(r"const VERSION='42\.\d+'","const VERSION='42.34'",s); p.write_text(s)

repls={
'hotfix-v4227.js':[("new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});","document.addEventListener('swe:rendered',apply);")],
'hotfix-v4228.js':[("new MutationObserver(()=>{clearTimeout(window.__swe4228t);window.__swe4228t=setTimeout(enhance,180)}).observe(document.documentElement,{childList:true,subtree:true});setInterval(enhance,5000);","document.addEventListener('swe:rendered',()=>setTimeout(enhance,250));window.addEventListener('pageshow',()=>setTimeout(enhance,900));")],
'hotfix-v4229.js':[("new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});","document.addEventListener('swe:rendered',apply);")],
'hotfix-v4230.js':[("setInterval(tick,1200);","document.addEventListener('swe:rendered',tick);")],
'hotfix-v4231.js':[("setInterval(tick31,1300);","document.addEventListener('swe:rendered',tick31);")],
'hotfix-v4232.js':[("new MutationObserver(tick).observe(document.documentElement,{childList:true,subtree:true});setInterval(tick,1800);","document.addEventListener('swe:rendered',tick);")],
}
for name, pairs in repls.items():
    p=Path(name); s=p.read_text()
    for a,b in pairs: s=s.replace(a,b)
    p.write_text(s)

p=Path('hotfix-v4231.js'); s=p.read_text()
s=s.replace("async function ensureInjuryCard(){const dash=document.getElementById('myPlayerDashboard');if(!dash||dash.classList.contains('hidden')||injuryBusy)return;","async function ensureInjuryCard(){const dash=document.getElementById('myPlayerDashboard'),view=document.getElementById('view-myplayer');if(!dash||dash.classList.contains('hidden')||!view?.classList.contains('active')||injuryBusy)return;")
p.write_text(s)
p=Path('hotfix-v4232.js'); s=p.read_text()
s=s.replace("function ensurePlayerProfileDetails(){\n  if(typeof S==='undefined'||!S.playerDashboard?.profile||!S.session?.user)return;const dash=document.getElementById('myPlayerDashboard');if(!dash)return;","function ensurePlayerProfileDetails(){\n  if(typeof S==='undefined'||!S.playerDashboard?.profile||!S.session?.user)return;const dash=document.getElementById('myPlayerDashboard'),view=document.getElementById('view-myplayer');if(!dash||!view?.classList.contains('active'))return;")
p.write_text(s)

Path('sw.js').write_text("""const CACHE='swe-tournament-5v5-v42-34';
const STATIC_ASSETS=['./','./index.html','./styles.css','./app.js','./hotfix-v4227.js','./hotfix-v4228.js','./hotfix-v4229.js','./hotfix-v4230.js','./hotfix-v4231.js','./hotfix-v4232.js','./ui-stability-v4234.js','./live.html','./live.js','./manifest.webmanifest','./favicon.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC_ASSETS)))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE&&(k.startsWith('tournoi-foot-')||k.startsWith('swe-tournament-5v5-'))).map(k=>caches.delete(k)));await self.clients.claim()})())});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin){event.respondWith(fetch(req,{cache:'no-store'}));return}if(req.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/sw.js')){event.respondWith(fetch(req,{cache:'no-store'}).then(resp=>{if(req.mode==='navigate'&&resp.ok){const copy=resp.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy))}return resp}).catch(()=>caches.match('./index.html')));return}event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(resp=>{if(resp&&resp.ok){const copy=resp.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return resp})))})
""")

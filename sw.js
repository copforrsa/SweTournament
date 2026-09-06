self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('tournoi-foot-')||k.startsWith('swe-tournament-5v5-')).map(k=>caches.delete(k)));
  })());
});
// V42.50 : aucun gestionnaire fetch volontairement.
// Le navigateur charge directement HTML, JS, CSS et appels réseau pour éviter
// les blocages, anciennes versions servies depuis le cache et boucles de chargement.

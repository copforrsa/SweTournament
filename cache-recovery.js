(async()=>{
  try{if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.unregister()));}}catch(e){}
  try{if(window.caches){const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));}}catch(e){}
  setTimeout(()=>location.replace('/?refresh='+Date.now()),350);
})();

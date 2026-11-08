// Contract tests for SWÉ's offline/cache behavior; no real browser or network.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup({online = true, cached = null, oldCaches = []} = {}) {
  const handlers = {};
  const entries = new Map();
  const deleted = [];
  const CACHE_KEY = 'swe-pwa-';
  for (const key of oldCaches) entries.set(key, new Map());
  const response = {ok:true,clone(){return this}};
  const caches = {
    async keys(){return [...entries.keys()]},
    async delete(k){deleted.push(k);return entries.delete(k)},
    async open(k){
      if(!entries.has(k))entries.set(k,new Map());
      return {
        async addAll(paths){for(const p of paths) entries.get(k).set(p,response)},
        async put(req,res){entries.get(k).set(req.url||req,res)}
      };
    },
    async match(req){
      const key = typeof req === 'string' ? req : req.url;
      for(const map of entries.values()) if(map.has(key))return map.get(key);
      return undefined;
    }
  };
  const self = {
    location:{origin:'https://test.example'},
    addEventListener(name,handler){handlers[name]=handler},
    skipWaiting(){self.didSkip=true},
    clients:{async claim(){self.didClaim=true},async matchAll(){return []},async openWindow(){}},
    registration:{async showNotification(){}}
  };
  const sandbox = {
    self,caches,URL,Response:{error(){return {error:true}}},
    fetch:async()=>{if(!online)throw new Error('offline');return response},
    console
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8'),sandbox,{filename:'sw.js'});
  const fire = async(name,extra={})=>{
    let promise;
    handlers[name]({...extra,waitUntil(p){promise=p}});
    if(promise) await promise;
    return promise;
  };
  return {self,caches,entries,deleted,handlers,fire,response};
}

test('SW install caches application shell and activates',async()=>{
  const c=setup();
  await c.fire('install');
  assert.equal(c.self.didSkip,true);
  assert.ok((await c.caches.keys()).some(k=>k.startsWith('swe-pwa-')));
  assert.ok(await c.caches.match('./index.html'));
});

test('SW activation removes only obsolete SWÉ cache versions',async()=>{
  const c=setup({oldCaches:['swe-pwa-legacy','unrelated-cache']});
  await c.fire('install');
  await c.fire('activate');
  assert.equal(c.self.didClaim,true);
  assert.ok(c.deleted.includes('swe-pwa-legacy'));
  assert.ok((await c.caches.keys()).includes('unrelated-cache'));
});

test('SW ignores non-GET requests',async()=>{
  const c=setup();
  let intercepted=false;
  c.handlers.fetch({request:{method:'POST',url:'https://test.example/api'},respondWith(){intercepted=true}});
  assert.equal(intercepted,false);
});

test('SW serves cached application shell when offline',async()=>{
  const c=setup({online:false});
  await c.fire('install');
  let responsePromise;
  c.handlers.fetch({request:{method:'GET',url:'https://test.example/somewhere',mode:'navigate'},respondWith(p){responsePromise=p}});
  assert.ok(responsePromise);
  assert.equal(await responsePromise,c.response);
});

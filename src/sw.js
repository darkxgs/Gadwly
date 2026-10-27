// Template: scripts/build.mjs fills in the version and the precache list.
const CACHE='jadwaly-public-__VERSION__';
const PRECACHE=__PRECACHE__;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('gadwaly-g5-')||k.startsWith('jadwaly-public-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/_vercel/'))return;
  const key=url.origin+url.pathname;
  const network=()=>fetch(request).then(response=>{
    if(response.ok&&response.type==='basic'&&!response.redirected){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(key,copy)));}
    return response;
  });
  // Hashed assets and fonts never change: cache first.
  if(url.pathname.startsWith('/assets/')||url.pathname.startsWith('/fonts/')){event.respondWith(caches.match(key).then(hit=>hit||network()));return;}
  // Pages and everything else: network first, but use the saved copy if the network fails or takes over 3s.
  const fresh=network();
  event.waitUntil(fresh.catch(()=>{}));
  event.respondWith(caches.match(key).then(cached=>cached?Promise.race([fresh.catch(()=>cached),new Promise(resolve=>setTimeout(()=>resolve(cached),3000))]):fresh));
});

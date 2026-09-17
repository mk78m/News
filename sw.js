/* News Center Web Push Service Worker */
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) { data = {title:'خبر جدید', body:event.data?.text() || 'خبر جدید دریافت شد'}; }
  const title = data.title || 'خبر جدید · مرکز اخبار';
  const options = {
    body: data.body || 'یک خبر جدید منتشر شده است.',
    icon: data.icon || undefined,
    badge: data.badge || undefined,
    tag: data.tag || 'news-center',
    renotify: true,
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil((async()=>{
    const list = await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of list){
      try { await client.focus(); client.navigate(url); return; } catch(e) {}
    }
    if(clients.openWindow) return clients.openWindow(url);
  })());
});

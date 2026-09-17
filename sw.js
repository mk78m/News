self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{let d={title:'خبر جدید',body:'خبر جدید دریافت شد',url:'/'};try{d=Object.assign(d,e.data?e.data.json():{})}catch(_){}e.waitUntil(self.registration.showNotification(d.title,{body:d.body,tag:d.tag||'news',data:{url:d.url},icon:'/favicon.ico'}));});
self.addEventListener('notificationclick',e=>{e.notification.close();const u=e.notification.data?.url||'/';e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c){c.navigate(u);return c.focus();}}return clients.openWindow(u);}));});

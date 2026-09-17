const CACHE='news-app-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{};}catch(e){data={};}
  const title=data.title || 'خبر جدید';
  const options={
    body:data.body || 'خبر جدیدی در فید خبری منتشر شد.',
    icon:'/icon-192.png',
    badge:'/icon-192.png',
    tag:data.tag || 'news-update',
    renotify:true,
    data:{url:data.url || '/'}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification.data?.url || '/';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){ if('focus' in c){ c.navigate(url); return c.focus(); } }
    return clients.openWindow(url);
  }));
});

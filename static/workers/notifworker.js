self.addEventListener("push", event => {
  console.log("Push event received:", event);

  const data = event.data ? event.data.json() : {};
  
  self.registration.showNotification(data.title ?? 'Archivium', {
    body: data.body ?? '',
    icon: data.icon ?? '/static/assets/icons/archivium.png',
    data: {
      clickUrl: data.clickUrl,
    },
    // actions: [
    //   { action: 'open', title: 'Open' },
    // ],
  });
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const { clickUrl } = event.notification.data;

  if (event.action === 'open' || clickUrl) {
    const urlToOpen = new URL(clickUrl ?? '/', self.location.origin).href;

    return clients.openWindow(urlToOpen);
  
    // event.waitUntil(
    //   clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
    //     for (let client of clientList) {
    //       if (client.url === urlToOpen && "focus" in client) {
    //         return client.focus();
    //       }
    //     }
    //     return clients.openWindow(urlToOpen);
    //   })
    // );
  }
});

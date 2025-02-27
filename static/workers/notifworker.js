self.addEventListener("push", event => {
  console.log("Push event received:", event);

  const data = event.data ? event.data.json() : { title: "No title", body: "No body" };
  
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/static/assets/icons/archivium.png",
    actions: [
      { action: 'open', title: 'Open' },
    ],
  });
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  if (event.action === 'open') {
    const urlToOpen = new URL("/", self.location.origin).href;
  
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
        for (let client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      })
    );
  }
});

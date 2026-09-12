self.addEventListener(
  "push",
  (event) => {
    let data = {
      title: "Nosso Mundo ❤️",
      body: "Alguém mandou uma saudade para você.",
      url: "/saudade",
      tag: "saudade"
    };

    if (event.data) {
      try {
        data = {
          ...data,
          ...event.data.json()
        };
      }

      catch (_) {
        data.body =
          event.data.text();
      }
    }

    const options = {
      body:
        data.body,

      tag:
        data.tag,

      icon:
        "/static/favicon.png",

      badge:
        "/static/favicon.png",

      data: {
        url:
          data.url || "/saudade"
      }
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || "Nosso Mundo ❤️",
        options
      )
    );
  }
);


self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const targetUrl =
      event.notification.data?.url ||
      "/saudade";

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true
        })
        .then(
          (clientList) => {
            for (const client of clientList) {
              if (
                client.url.includes(targetUrl) &&
                "focus" in client
              ) {
                return client.focus();
              }
            }

            if (clients.openWindow) {
              return clients.openWindow(targetUrl);
            }

            return null;
          }
        )
    );
  }
);
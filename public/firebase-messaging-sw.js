/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

fetch("/api/firebase/config")
  .then((response) => response.json())
  .then((config) => {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title || "Dukandar Shandar";
      const options = {
        body: payload.notification?.body || "You have a new notification",
        data: payload.data || {},
      };
      self.registration.showNotification(title, options);
    });
  })
  .catch((error) => {
    console.error("Firebase SW init failed:", error);
  });

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const route = event.notification?.data?.route || "/notifications";
  event.waitUntil(clients.openWindow(route));
});

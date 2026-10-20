importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDfMX56_f6EcNn97247Q4m2fcMbWaU-kCQ",
  authDomain: "school-d50aa.firebaseapp.com",
  projectId: "school-d50aa",
  storageBucket: "school-d50aa.firebasestorage.app",
  messagingSenderId: "14520467716",
  appId: "1:14520467716:web:a9874d7152ab6e4b255051"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const title = (payload.notification && payload.notification.title) || "مدرسة البتانون";
  const options = {
    body: (payload.notification && payload.notification.body) || "",
    icon: "https://i.ibb.co/SD12XjKb/file-00000000a8b8824398c2d1d125682b5c.png",
    dir: "rtl",
    lang: "ar"
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});

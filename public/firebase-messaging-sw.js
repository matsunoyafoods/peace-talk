importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCKnBelRH9u4_zVoPLbT0-fS8N6tBKxm60",
  authDomain: "kami-chat-cf28c.firebaseapp.com",
  projectId: "kami-chat-cf28c",
  storageBucket: "kami-chat-cf28c.firebasestorage.app",
  messagingSenderId: "330836136864",
  appId: "1:330836136864:web:2dfcf0520a265f29310ac5",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || "PEACE TALK";
  const options = {
    body: payload.notification?.body || "新しいメッセージがあります",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  };
  self.registration.showNotification(title, options);
});

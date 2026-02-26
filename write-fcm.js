const fs = require('fs');

// 1. Service Worker for FCM
fs.writeFileSync('/Users/matsuzakitsuyoshi/Desktop/kami-chat/public/firebase-messaging-sw.js', 
`importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
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
`);
console.log('Written: firebase-messaging-sw.js');

// 2. FCM utility
fs.writeFileSync('/Users/matsuzakitsuyoshi/Desktop/kami-chat/src/lib/fcm.ts',
`import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app, db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

export async function requestNotificationPermission(userId: string) {
  try {
    if (typeof window === "undefined") return null;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    if (token) {
      await setDoc(doc(db, "users", userId), { fcmToken: token }, { merge: true });
    }
    return token;
  } catch (err) {
    console.error("FCM token error:", err);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  if (typeof window === "undefined") return;
  const messaging = getMessaging(app);
  onMessage(messaging, callback);
}
`);
console.log('Written: fcm.ts');

// 3. Notification API route
fs.mkdirSync('/Users/matsuzakitsuyoshi/Desktop/kami-chat/src/app/api/notify', { recursive: true });
fs.writeFileSync('/Users/matsuzakitsuyoshi/Desktop/kami-chat/src/app/api/notify/route.ts',
`import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\\\n/g, "\\n"),
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { tokens, title, body } = await req.json();
    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: "no tokens" }, { status: 400 });
    }
    const message = {
      notification: { title, body },
      tokens: tokens,
    };
    const res = await admin.messaging().sendEachForMulticast(message);
    return NextResponse.json({ success: res.successCount, failure: res.failureCount });
  } catch (error: any) {
    console.error("Notify error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`);
console.log('Written: notify/route.ts');

console.log('Done! All FCM files written.');

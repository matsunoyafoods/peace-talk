const fs = require('fs');

// 1. Update fcm.ts - client-side only notifications
fs.writeFileSync('/Users/matsuzakitsuyoshi/Desktop/kami-chat/src/lib/fcm.ts',
`export async function requestNotificationPermission() {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export function showNotification(title: string, body: string, onClick?: () => void) {
  if (typeof window === "undefined") return;
  if (Notification.permission !== "granted") return;
  const notification = new Notification(title, {
    body: body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "peace-talk-" + Date.now(),
  });
  if (onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }
}
`);
console.log('Written: fcm.ts');

// 2. Create notification hook
fs.mkdirSync('/Users/matsuzakitsuyoshi/Desktop/kami-chat/src/hooks', { recursive: true });
fs.writeFileSync('/Users/matsuzakitsuyoshi/Desktop/kami-chat/src/hooks/useNotifications.ts',
`import { useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from "firebase/firestore";
import { showNotification } from "@/lib/fcm";

export function useGroupNotifications(userId: string | null, groupIds: string[], currentGroupId?: string) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!userId || groupIds.length === 0) return;
    
    // Skip first load
    if (!initialized.current) {
      initialized.current = true;
      const timer = setTimeout(() => { initialized.current = true; }, 2000);
      return () => clearTimeout(timer);
    }

    const unsubscribes = groupIds.map((gid) => {
      if (gid === currentGroupId) return () => {};
      const q = query(
        collection(db, "groups", gid, "messages"),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      let firstLoad = true;
      return onSnapshot(q, (snap) => {
        if (firstLoad) { firstLoad = false; return; }
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            if (data.senderId !== userId && !data.deleted) {
              const senderName = data.senderName || "Someone";
              const text = data.text || (data.fileUrl ? "ファイルを送信しました" : "");
              showNotification("PEACE TALK", senderName + ": " + text);
            }
          }
        });
      });
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [userId, groupIds.join(","), currentGroupId]);
}
`);
console.log('Written: useNotifications.ts');

// 3. Update home page to request permission and listen for notifications
let home = fs.readFileSync('/Users/matsuzakitsuyoshi/Desktop/kami-chat/src/app/home/page.tsx', 'utf8');

// Add imports
home = home.replace(
  'import { useRouter } from "next/navigation";',
  'import { useRouter } from "next/navigation";\nimport { requestNotificationPermission } from "@/lib/fcm";\nimport { useGroupNotifications } from "@/hooks/useNotifications";'
);

// Add notification permission request and hook after loadGroups
home = home.replace(
  'await loadGroups(u.uid);\n      await loadNotices();\n      setLoading(false);',
  'await loadGroups(u.uid);\n      await loadNotices();\n      await requestNotificationPermission();\n      setLoading(false);'
);

// Add notification hook after router
home = home.replace(
  'const router = useRouter();',
  'const router = useRouter();\n\n  useGroupNotifications(user?.uid || null, groups.map((g) => g.id));'
);

fs.writeFileSync('/Users/matsuzakitsuyoshi/Desktop/kami-chat/src/app/home/page.tsx', home);
console.log('Written: home/page.tsx updated');

// 4. Simple icon for notifications
fs.writeFileSync('/Users/matsuzakitsuyoshi/Desktop/kami-chat/public/icon-192.png', '');
console.log('Written: icon placeholder');

console.log('Done! All notification files written.');

import { useEffect, useRef } from "react";
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

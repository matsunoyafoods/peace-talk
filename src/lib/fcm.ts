export async function requestNotificationPermission() {
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

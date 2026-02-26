"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { requestNotificationPermission } from "@/lib/fcm";
import { useGroupNotifications } from "@/hooks/useNotifications";

type Group = { id: string; name: string; memberCount: number; nameMode: string; lastMessage?: string; unread: number; };
type Notice = { id: string; title: string; body: string; createdAt: Date; };

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [positionName, setPositionName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "groups" | "profile">("home");
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const router = useRouter();

  useGroupNotifications(user?.uid || null, groups.map((g) => g.id));

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/"); return; }
      setUser(u);
      setPhoneNumber(u.phoneNumber || "");
      const userSnap = await getDoc(doc(db, "users", u.uid));
      if (!userSnap.exists() || !userSnap.data().displayName) { router.push("/profile"); return; }
      const userData = userSnap.data();
      setDisplayName(userData.displayName || "");
      setPositionName(userData.positionName || "");
      await loadGroups(u.uid);
      await loadNotices();
      await requestNotificationPermission();
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const loadGroups = async (uid: string) => {
    const snap = await getDocs(query(collection(db, "groups"), where("members", "array-contains", uid)));
    const g: Group[] = snap.docs.map((d) => ({ id: d.id, name: d.data().name, memberCount: (d.data().members || []).length, nameMode: d.data().nameMode || "nickname", unread: 0 }));
    setGroups(g);
  };

  const loadNotices = async () => {
    try {
      const snap = await getDocs(query(collection(db, "notices"), orderBy("createdAt", "desc"), limit(10)));
      const n: Notice[] = snap.docs.map((d) => ({ id: d.id, title: d.data().title || "", body: d.data().body || "", createdAt: d.data().createdAt?.toDate() || new Date() }));
      setNotices(n);
    } catch { setNotices([]); }
  };

  const handleLogout = async () => { await auth.signOut(); router.push("/"); };

  const handleUpdateName = async () => {
    if (!newName.trim() || !user) return;
    try {
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "users", user.uid), { displayName: newName.trim() }, { merge: true });
      setDisplayName(newName.trim());
      setEditingName(false);
      setNewName("");
    } catch { alert("更新に失敗しました"); }
  };

  if (loading) { return <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-950"><p className="text-white">読み込み中...</p></div>; }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 to-gray-950">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 backdrop-blur border-b border-gray-700/50">
        <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">PEACE TALK</h1>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-white transition">ログアウト</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "home" && (
          <div className="p-4 space-y-4">
            <div className="p-4 bg-gray-800/60 rounded-2xl">
              <p className="text-white text-lg">おかえりなさい、<span className="font-bold text-green-400">{displayName}</span>さん</p>
              <p className="text-xs text-gray-400 mt-1">グループ {groups.length}件に参加中</p>
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-400 mb-2 px-1">お知らせ・通知</h2>
              {notices.length === 0 ? (
                <div className="p-4 bg-gray-800/40 rounded-2xl"><p className="text-gray-500 text-sm text-center">お知らせはありません</p></div>
              ) : (
                <div className="space-y-2">
                  {notices.map((n) => (
                    <div key={n.id} className="p-3 bg-gray-800/60 rounded-xl">
                      <p className="text-white text-sm font-semibold">{n.title}</p>
                      <p className="text-gray-400 text-xs mt-1">{n.body}</p>
                      <p className="text-gray-600 text-xs mt-1">{n.createdAt.toLocaleDateString("ja-JP")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-400 mb-2 px-1">最近のグループ</h2>
              {groups.length === 0 ? (
                <div className="p-4 bg-gray-800/40 rounded-2xl"><p className="text-gray-500 text-sm text-center">グループに参加していません</p></div>
              ) : (
                <div className="space-y-2">
                  {groups.slice(0, 3).map((g) => (
                    <button key={g.id} onClick={() => router.push("/chat/" + g.id)} className="w-full flex items-center gap-3 p-3 bg-gray-800/60 hover:bg-gray-700/60 rounded-xl transition-all">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold">{g.name[0]}</div>
                      <div className="text-left flex-1">
                        <p className="text-white font-semibold text-sm">{g.name}</p>
                        <p className="text-xs text-gray-400">{g.memberCount}人</p>
                      </div>
                      <span className="text-gray-600">&#8250;</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "groups" && (
          <div className="p-4 space-y-3">
            {groups.length === 0 && (<p className="text-center text-gray-500 mt-10">まだグループがありません。</p>)}
            {groups.map((g) => (
              <button key={g.id} onClick={() => router.push("/chat/" + g.id)} className="w-full flex items-center gap-3 p-4 bg-gray-800/60 hover:bg-gray-700/60 rounded-2xl transition-all">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">{g.name[0]}</div>
                <div className="text-left flex-1">
                  <p className="text-white font-semibold">{g.name}</p>
                  <p className="text-xs text-gray-400">{g.memberCount}人 ・ {g.nameMode === "position" ? "ポジション名" : "ニックネーム"}</p>
                </div>
                <span className="text-gray-600">&#8250;</span>
              </button>
            ))}
            <div className="space-y-2 pt-2">
              <button onClick={() => router.push("/groups")} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold transition-all">グループを作成・参加</button>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="p-4 space-y-4">
            <div className="flex flex-col items-center py-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-3xl">{displayName ? displayName[0] : "?"}</div>
              <p className="text-white text-xl font-bold mt-3">{displayName}</p>
              {positionName && <p className="text-green-400 text-sm">{positionName}</p>}
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-gray-800/60 rounded-xl">
                <p className="text-xs text-gray-400">電話番号</p>
                <p className="text-white mt-1">{phoneNumber}</p>
              </div>
              <div className="p-4 bg-gray-800/60 rounded-xl">
                <p className="text-xs text-gray-400">ニックネーム</p>
                {editingName ? (
                  <div className="flex gap-2 mt-1">
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleUpdateName(); }} className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm" placeholder="新しいニックネーム" />
                    <button onClick={handleUpdateName} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-bold">保存</button>
                    <button onClick={() => setEditingName(false)} className="px-3 py-2 text-gray-400 text-sm">戻る</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-white">{displayName}</p>
                    <button onClick={() => { setEditingName(true); setNewName(displayName); }} className="text-xs text-green-400 hover:text-green-300 transition">編集</button>
                  </div>
                )}
              </div>
              {positionName && (
                <div className="p-4 bg-gray-800/60 rounded-xl">
                  <p className="text-xs text-gray-400">ポジション名</p>
                  <p className="text-white mt-1">{positionName}</p>
                  <p className="text-xs text-gray-500 mt-1">※ポジション名は本部が設定します</p>
                </div>
              )}
              <div className="p-4 bg-gray-800/60 rounded-xl">
                <p className="text-xs text-gray-400">参加グループ数</p>
                <p className="text-white mt-1">{groups.length}件</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex bg-gray-800/80 backdrop-blur border-t border-gray-700/50">
        <button onClick={() => setActiveTab("home")} className={"flex-1 py-3 flex flex-col items-center gap-1 transition " + (activeTab === "home" ? "text-green-400" : "text-gray-500 hover:text-gray-300")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span className="text-xs">ホーム</span>
        </button>
        <button onClick={() => setActiveTab("groups")} className={"flex-1 py-3 flex flex-col items-center gap-1 transition " + (activeTab === "groups" ? "text-green-400" : "text-gray-500 hover:text-gray-300")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span className="text-xs">グループ</span>
        </button>
        <button onClick={() => setActiveTab("profile")} className={"flex-1 py-3 flex flex-col items-center gap-1 transition " + (activeTab === "profile" ? "text-green-400" : "text-gray-500 hover:text-gray-300")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span className="text-xs">プロフィール</span>
        </button>
      </div>
    </div>
  );
}
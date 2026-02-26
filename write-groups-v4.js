const fs = require('fs');
const content = `"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, setDoc, query, where, serverTimestamp, arrayUnion } from "firebase/firestore";
import { useRouter } from "next/navigation";

type Group = { id: string; name: string; memberCount: number; nameMode: string; };

export default function GroupsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [nameMode, setNameMode] = useState<"nickname" | "position">("nickname");
  const [joinId,const fsId] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/"); return; }
      setUser(u);
      const userSnap = await getDoc(doc(db, "users", u.uid));
      if (!userSnap.exists() || !userSnap.data().displayName) { router.push("/profile"); return; }
      setDisplayName(userSnap.data().displayName);
      await loadGroups(u.uid);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const loadGroups = async (uid: string) => {
    const snap = await getDocs(query(collection(db, "groups"), where("members", "array-contains", uid)));
    const g: Group[] = snap.docs.map((d) => ({ id: d.id, name: d.data().name, memberCount: (d.data().members || []).length, nameMode: d.data().nameMode || "nickname" }));
    setGroups(g);
  };

  const handleCreate = async () => {
    if (!newGroupName.trim() || !user) return;
    setCreating(true);
    try {
      const ref = doc(collection(db, "groups"));
      await setDoc(ref, { name: newGroupName.trim(), members: [user.uid], nameMode: nameMode, createdBy: user.uid, createdAt: serverTimestamp() });
      router.push("/chat/" + ref.id);
    } catch (err: any) { alert("作成に失敗: " + err.message); }
    setCreating(false);
  };

  const handleJoin = async () => {
    if (!joinId.trim() || !user) return;
    setCreating(true);
    try {
      const ref = doc(db, "groups", joinId.trim());
      const snap = await getDoc(ref);
      if (!snap.exists()) { alert("グループが見つかりません"); setCreating(false); return; }
      await setDoc(ref, { members: arrayUnion(user.uid) }, { merge: true });
      router.push("/chat/" + joinId.trim());
    } catch (err: any) { alert("参加に失敗: " + err.message); }
    setCreating(false);
  };

  const handleLogout = async () => { await auth.signOut(); router.push("/"); };

  if (loading) { return <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-950"><p className="text-white">読み込み中...</p></div>; }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 to-gray-950">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 backdrop-blur border-b border-gray-700/50">
        <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">PEACE TALK</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{displayName}</span>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-white transition">ログアウト</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {groups.length === 0 && !showCreate && !showJoin && (
          <p className="text-center text-gray-500 mt-10">まだグループがありません。<br />新しく作るか、IDで参加しましょう。</p>
        )}
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
        {showCreate && (
          <div className="p-4 bg-gray-800/60 rounded-2xl space-y-4">
            <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="グループ名" className="w-full px-4 py-3 bg-gray-700 text-white rounded-xl outline-none focus:ring-2 focus:ring-green-500" />
            <div className="space-y-2">
              <p className="text-sm text-gray-400">グループ内の表示名</p>
              <div className="flex gap-2">
                <button onClick={() => setNameMode("nickname")} className={"flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all " + (nameMode === "nickname" ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white" : "bg-gray-700 text-gray-400 hover:text-white")}>ニックネーム</button>
                <button onClick={() => setNameMode("position")} className={"flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all " + (nameMode === "position" ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white" : "bg-gray-700 text-gray-400 hover:text-white")}>ポジション名</button>
              </div>
              <p className="text-xs text-gray-500">{nameMode === "position" ? "本部が設定したポジション名で表示されます" : "プロフィールのニックネームで表示されます"}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={creating || !newGroupName.trim()} className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold disabled:opacity-50 transition-all">{creating ? "作成中..." : "作成"}</button>
              <button onClick={() => { setShowCreate(false); setNameMode("nickname"); }} className="px-4 py-2 text-gray-400 hover:text-white transition">戻る</button>
            </div>
          </div>
        )}
        {showJoin && (
          <div className="p-4 bg-gray-800/60 rounded-2xl space-y-3">
            <input type="text" value={joinId} onChange={(e) => setJoinId(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleJoin(); }} placeholder="グループIDを入力" className="w-full px-4 py-3 bg-gray-700 text-white rounded-xl outline-none focus:ring-2 focus:ring-green-500" />
            <div className="flex gap-2">
              <button onClick={handleJoin} disabled={creating || !joinId.trim()} className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold disabled:opacity-50 transition-all">{creating ? "参加中..." : "参加"}</button>
              <button onClick={() => setShowJoin(false)} className="px-4 py-2 text-gray-400 hover:text-white transition">戻る</button>
            </div>
          </div>
        )}
      </div>
      {!showCreate && !showJoin && (
        <div className="p-4 bg-gray-800/80 backdrop-blur border-t border-gray-700/50 space-y-2">
          <button onClick={() => setShowCreate(true)} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-400 hover:to-emerald-500 transition-all">新しいグループを作成</button>
          <button onClick={() => setShowJoin(true)} className="w-full py-3 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-600 transition-all">グループIDで参加</button>
        </div>
      )}
    </div>
  );
}`;
fs.writeFileSync('/Users/matsuzakitsuyoshi/Desktop/kami-chat/src/app/groups/page.tsx', content);
console.log('Done! Groups v4 written.');

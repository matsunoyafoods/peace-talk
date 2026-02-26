"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/"); return; }
      setUser(u);
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists() && snap.data().displayName) {
        router.push("/home");
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  const handleSave = async () => {
    if (!nickname.trim() || !user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), { displayName: nickname.trim(), phoneNumber: user.phoneNumber || "", createdAt: new Date() }, { merge: true });
      router.push("/home");
    } catch (err: any) { alert("保存に失敗しました: " + err.message); }
    setSaving(false);
  };

  if (loading) { return <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-950"><p className="text-white">読み込み中...</p></div>; }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">プロフィール設定</h1>
          <p className="mt-2 text-sm text-gray-400">チャットで使う名前を設定してください</p>
        </div>
        <div className="space-y-4">
          <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSave(); }} placeholder="ニックネーム" maxLength={20} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg" />
          <button onClick={handleSave} disabled={saving || !nickname.trim()} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 transition-all">{saving ? "保存中..." : "はじめる"}</button>
        </div>
      </div>
    </div>
  );
}
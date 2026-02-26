const fs = require('fs');
const path = require('path');

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log('Written: ' + filePath);
}

const base = '/Users/matsuzakitsuyoshi/Desktop/kami-chat/src';

// 1. Update login page - redirect to /profile
writeFile(base + '/app/page.tsx', `"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  onAuthStateChanged,
} from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(tconst fs = require(' = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) { router.push("/profile"); } else { setChecking(false); }
    });
    return () => unsub();
  }, [router]);

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
    }
  };

  const handleSendCode = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    try {
      setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, phone, (window as any).recaptchaVerifier);
      setConfirmation(result);
    } catch (err: any) { alert("SMS送信エラー: " + err.message); }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!code.trim() || !confirmation) return;
    setLoading(true);
    try {
      await confirmation.confirm(code);
      router.push("/profile");
    } catch (err: any) { alert("認証エラー: " + err.message); }
    setLoading(false);
  };

  if (checking) { return <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-950"><p className="text-white">読み込み中...</p></div>; }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">PEACE TALK</h1>
          <p className="mt-2 text-sm text-gray-400">AIが言葉を優しく変換するチャット</p>
        </div>
        {!confirmation ? (
          <div className="space-y-4">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+81 90-1234-5678" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            <button onClick={handleSendCode} disabled={loading || !phone.trim()} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 transition-all">{loading ? "送信中..." : "認証コードを送信"}</button>
          </div>
        ) : (
          <div className="space-y-4">
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="認証コード（6桁）" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-center tracking-widest text-lg" />
            <button onClick={handleVerify} disabled={loading || !code.trim()} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 transition-all">{loading ? "確認中..." : "ログイン"}</button>
          </div>
        )}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}`);

// 2. Profile page
writeFile(base + '/app/profile/page.tsx', `"use client";

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
        router.push("/groups");
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
      router.push("/groups");
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
}`);

// 3. Groups page
writeFile(base + '/app/groups/page.tsx', `"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, setDoc, query, where, orderBy, serverTimestamp, arrayUnion } from "firebase/firestore";
import { useRouter } from "next/navigation";

type Group = { id: string; name: string; memberCount: number; };

export default function GroupsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinId, setJoinId] = useState("");
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
    const g: Group[] = snap.docs.map((d) => ({ id: d.id, name: d.data().name, memberCount: (d.data().members || []).length }));
    setGroups(g);
  };

  const handleCreate = async () => {
    if (!newGroupName.trim() || !user) return;
    setCreating(true);
    try {
      const ref = doc(collection(db, "groups"));
      await setDoc(ref, { name: newGroupName.trim(), members: [user.uid], createdBy: user.uid, createdAt: serverTimestamp() });
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
              <p className="text-xs text-gray-400">{g.memberCount}人のメンバー</p>
            </div>
            <span className="text-gray-600">&#8250;</span>
          </button>
        ))}
        {showCreate && (
          <div className="p-4 bg-gray-800/60 rounded-2xl space-y-3">
            <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleCreate(); }} placeholder="グループ名" className="w-full px-4 py-3 bg-gray-700 text-white rounded-xl outline-none focus:ring-2 focus:ring-green-500" />
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={creating || !newGroupName.trim()} className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold disabled:opacity-50 transition-all">{creating ? "作成中..." : "作成"}</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-400 hover:text-white transition">戻る</button>
            </div>
          </div>
        )}
        {showJoin && (
          <div className="p-4 bg-gray-800/60 rounded-2xl space-y-3">
            <input type="text" value={joinId} onChange={(e) => setJoinId(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleJoin(); }} placeholder="グループIDを入力" className="w-full px-4 py-3 bg-gray-700 text-white rounded-xl outline-none focus:ring-2 focus:ring-green-500" />
            <div className="flex gap-2">
              <button onClick={handleJoin} disabled={creating || !joinId.trim()} className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold disabled:opacity-50 transition-all">{creating ? "参加中..." : "参加"}</button>
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
}`);

console.log('All files written! Now run write-chat-v2.js next.');

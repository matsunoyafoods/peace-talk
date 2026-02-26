const fs = require('fs');
const path = require('path');
const dir = '/Users/matsuzakitsuyoshi/Desktop/kami-chat/src/app/chat/[groupId]';
fs.mkdirSync(dir, { recursive: true });
const content = `"use client";

import { useEffect, useState, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, Timestamp, doc, updateDoc, getDoc, arrayUnion,
} from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";

type Message = { id: string; text: string; senderId: string; senderName: string; createdAt: Date; deleted: boolean; readBy: string[]; };

const LANGUAGES = [
  { code: "hiragana", label: "やさしいにほんご" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "km", label: "ភាសាខ្មែរ" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ne", label: "नेपाली" },
];

export default function ChatPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");
  const [langMenu, setLangMenu] = useState<string | null>(null);
  const [translating, setTranslating] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState<Record<string, string>>({});
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/"); return; }
      setUser(u);
      const userSnap = await getDoc(doc(db, "users", u.uid));
      if (userSnap.exists()) { setDisplayName(userSnap.data().displayName || ""); }
      const groupSnap = await getDoc(doc(db, "groups", groupId));
      if (groupSnap.exists()) {
        setGroupName(groupSnap.data().name || "");
        const members = groupSnap.data().members || [];
        const names: Record<string, string> = {};
        for (const mid of members) {
          const ms = await getDoc(doc(db, "users", mid));
          if (ms.exists()) names[mid] = ms.data().displayName || "Unknown";
        }
        setMemberNames(names);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router, groupId]);

  useEffect(() => {
    if (!user || !groupId) return;
    const q = query(collection(db, "groups", groupId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, text: data.text, senderId: data.senderId, senderName: data.senderName || "", createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(), deleted: data.deleted || false, readBy: data.readBy || [] };
      });
      setMessages(msgs);
      snap.docs.forEach((d) => {
        const data = d.data();
        if (user && !(data.readBy || []).includes(user.uid)) {
          updateDoc(doc(db, "groups", groupId, "messages", d.id), { readBy: arrayUnion(user.uid) }).catch(() => {});
        }
      });
    });
    return () => unsub();
  }, [user, groupId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleConvert = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/convert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: input.trim() }) });
      const data = await res.json();
      if (data.error) { alert("AI変換エラー: " + data.error); setSending(false); return; }
      setOption1(data.option1); setOption2(data.option2); setShowModal(true);
    } catch (err) { alert("通信エラーが発生しました"); }
    setSending(false);
  };

  const handleSelect = async (selectedText: string) => {
    if (!user) return;
    setShowModal(false); setSending(true);
    try {
      await addDoc(collection(db, "groups", groupId, "messages"), { text: selectedText, senderId: user.uid, senderName: displayName, createdAt: serverTimestamp(), deleted: false, readBy: [user.uid] });
      setInput(""); setOption1(""); setOption2("");
    } catch (err) { alert("送信に失敗しました"); }
    setSending(false);
  };

  const handleDelete = async (msgId: string) => {
    if (!confirm("このメッセージを削除しますか？")) return;
    try { await updateDoc(doc(db, "groups", groupId, "messages", msgId), { deleted: true }); } catch (err) { alert("削除に失敗しました"); }
  };

  const handleTranslate = async (msgId: string, text: string, lang: string) => {
    setLangMenu(null); setTranslating(msgId);
    try {
      const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, lang }) });
      const data = await res.json();
      if (data.translated) { setTranslatedText((prev) => ({ ...prev, [msgId]: data.translated })); } else { alert("翻訳に失敗しました"); }
    } catch { alert("翻訳に失敗しました"); }
    setTranslating(null);
  };

  const toggleLangMenu = (msgId: string) => {
    if (translatedText[msgId]) { const copy = { ...translatedText }; delete copy[msgId]; setTranslatedText(copy); return; }
    setLangMenu(langMenu === msgId ? null : msgId);
  };

  const getInitial = (name: string) => name ? name[0].toUpperCase() : "?";
  const getReadCount = (msg: Message) => msg.readBy ? msg.readBy.length : 0;

  if (loading) { return <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-950"><p className="text-white">読み込み中...</p></div>; }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 to-gray-950">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/80 backdrop-blur border-b border-gray-700/50">
        <button onClick={() => router.push("/groups")} className="text-2xl text-gray-400 hover:text-white transition">&#8249;</button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold">{groupName ? groupName[0] : "G"}</div>
        <div className="flex-1">
          <p className="text-white font-semibold">{groupName}</p>
          <p className="text-xs text-gray-400">{Object.keys(memberNames).length}人のメンバー</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (<p className="text-center text-gray-500 mt-10">メッセージはまだありません。<br />AIが安全な表現に変換してから送信されます。</p>)}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          const name = msg.senderName || memberNames[msg.senderId] || "Unknown";
          return (
            <div key={msg.id} className={"flex gap-2 " + (isMe ? "justify-end" : "justify-start")}>
              {!isMe && (<div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-5">{getInitial(name)}</div>)}
              <div className="relative max-w-xs lg:max-w-md">
                {!isMe && <p className="text-xs text-gray-400 mb-1 ml-1">{name}</p>}
                <div className={"px-4 py-2.5 " + (msg.deleted ? "bg-gray-700/50 text-gray-500 italic rounded-2xl" : isMe ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl rounded-tr-md" : "bg-gray-800 text-white rounded-2xl rounded-tl-md border border-gray-700/50")}>
                  {msg.deleted ? (<span>このメッセージは削除されました</span>) : (<>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    {translatedText[msg.id] && (<p className="mt-1.5 pt-1.5 border-t border-white/20 text-xs opacity-80">{translatedText[msg.id]}</p>)}
                  </>)}
                </div>
                {!msg.deleted && (
                  <div className={"flex items-center gap-2 mt-0.5 " + (isMe ? "justify-end" : "justify-start")}>
                    <button onClick={() => toggleLangMenu(msg.id)} className="text-xs text-gray-500 hover:text-white transition" disabled={translating === msg.id}>{translating === msg.id ? "..." : translatedText[msg.id] ? "✕" : "🌍"}</button>
                    {isMe && <button onClick={() => handleDelete(msg.id)} className="text-xs text-gray-500 hover:text-white transition">🗑</button>}
                    {isMe && <span className="text-xs text-gray-500">既読 {getReadCount(msg)}</span>}
                  </div>
                )}
                {langMenu === msg.id && (
                  <div className={"absolute z-50 mt-1 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl py-1 w-48 " + (isMe ? "right-0" : "left-0")}>
                    {LANGUAGES.map((l) => (<button key={l.code} onClick={() => handleTranslate(msg.id, msg.text, l.code)} className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-700 transition">{l.label}</button>))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 bg-gray-800/80 backdrop-blur border-t border-gray-700/50">
        <div className="flex gap-2 items-end">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleConvert(); }} placeholder="メッセージを入力..." className="flex-1 px-4 py-2.5 bg-gray-700/50 text-white rounded-2xl outline-none focus:ring-2 focus:ring-green-500 border border-gray-600/50 text-sm" disabled={sending} />
          <button onClick={handleConvert} disabled={!input.trim() || sending} className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold text-sm hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">{sending ? "..." : "変換"}</button>
        </div>
        <p className="text-xs text-gray-500 mt-1.5 text-center">AIが心理的に安全な表現に変換します</p>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-5 max-w-md w-full space-y-3 mb-4 sm:mb-0">
            <h2 className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 text-center">どちらの表現で送信しますか？</h2>
            <button onClick={() => handleSelect(option1)} className="w-full p-4 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-xl text-left transition-all border border-gray-600/30 hover:border-green-500/50">
              <span className="text-green-400 font-bold text-xs">A</span>
              <p className="mt-1 text-sm leading-relaxed">{option1}</p>
            </button>
            <button onClick={() => handleSelect(option2)} className="w-full p-4 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-xl text-left transition-all border border-gray-600/30 hover:border-green-500/50">
              <span className="text-green-400 font-bold text-xs">B</span>
              <p className="mt-1 text-sm leading-relaxed">{option2}</p>
            </button>
            <button onClick={() => { setShowModal(false); setOption1(""); setOption2(""); }} className="w-full py-2 text-gray-400 hover:text-white text-sm transition">キャンセル</button>
          </div>
        </div>
      )}
    </div>
  );
}`;
fs.writeFileSync(dir + '/page.tsx', content);
console.log('Done! Chat v2 with groups written.');

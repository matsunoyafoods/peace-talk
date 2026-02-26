const fs = require('fs');
const content = `"use client";

import { useEffect, useState, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, Timestamp, doc, updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

type Message = { id: string; text: string; senderId: string; createdAt: Date; deleted: boolean; };

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
  const [user, setUser] = useState<User | null>(null);
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push("/"); } else { setUser(u); setLoading(false); }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, text: data.text, senderId: data.senderId, createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(), deleted: data.deleted || false };
      });
      setMessages(msgs);
    });
    return () => unsub();
  }, [user]);

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
      await addDoc(collection(db, "messages"), { text: selectedText, senderId: user.uid, createdAt: serverTimestamp(), deleted: false });
      setInput(""); setOption1(""); setOption2("");
    } catch (err) { alert("送信に失敗しました"); }
    setSending(false);
  };

  const handleDelete = async (msgId: string) => {
    if (!confirm("このメッセージを削除しますか？")) return;
    try { await updateDoc(doc(db, "messages", msgId), { deleted: true }); } catch (err) { alert("削除に失敗しました"); }
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

  const handleLogout = async () => { await auth.signOut(); router.push("/"); };

  if (loading) { return (<div className="flex items-center justify-center min-h-screen bg-gray-900"><p className="text-white text-lg">読み込み中...</p></div>); }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <h1 className="text-xl font-bold text-green-400">PEACE TALK</h1>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition">ログアウト</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (<p className="text-center text-gray-500 mt-10">メッセージはまだありません。<br />AIが安全な表現に変換してから送信されます。</p>)}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={"flex " + (isMe ? "justify-end" : "justify-start")}>
              <div className="relative">
                <div className={"max-w-xs lg:max-w-md px-4 py-2 rounded-2xl " + (msg.deleted ? "bg-gray-700 text-gray-500 italic" : isMe ? "bg-green-600 text-white" : "bg-gray-700 text-white")}>
                  {msg.deleted ? (<span>このメッセージは削除されました</span>) : (<>
                    <p>{msg.text}</p>
                    {translatedText[msg.id] && (<p className="mt-1 pt-1 border-t border-gray-500 text-sm text-gray-300">{translatedText[msg.id]}</p>)}
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => toggleLangMenu(msg.id)} className="text-xs opacity-60 hover:opacity-100" disabled={translating === msg.id}>{translating === msg.id ? "..." : translatedText[msg.id] ? "✕" : "🌍"}</button>
                      {isMe && (<button onClick={() => handleDelete(msg.id)} className="text-xs opacity-60 hover:opacity-100">🗑</button>)}
                    </div>
                  </>)}
                </div>
                {langMenu === msg.id && (
                  <div className={"absolute z-50 mt-1 bg-gray-800 border border-gray-600 rounded-xl shadow-lg py-2 w-48 " + (isMe ? "right-0" : "left-0")}>
                    {LANGUAGES.map((l) => (<button key={l.code} onClick={() => handleTranslate(msg.id, msg.text, l.code)} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 transition">{l.label}</button>))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleConvert(); }} placeholder="メッセージを入力..." className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-full outline-none focus:ring-2 focus:ring-green-500" disabled={sending} />
          <button onClick={handleConvert} disabled={!input.trim() || sending} className="px-6 py-2 bg-green-600 text-white rounded-full font-bold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition">{sending ? "変換中..." : "変換"}</button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">AIが心理的に安全な表現に変換してから送信します</p>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-bold text-green-400 text-center">どちらの表現で送信しますか？</h2>
            <p className="text-xs text-gray-500 text-center">AIが安全な表現に変換しました</p>
            <button onClick={() => handleSelect(option1)} className="w-full p-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-left transition"><span className="text-green-400 font-bold text-sm">A</span><p className="mt-1">{option1}</p></button>
            <button onClick={() => handleSelect(option2)} className="w-full p-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-left transition"><span className="text-green-400 font-bold text-sm">B</span><p className="mt-1">{option2}</p></button>
            <button onClick={() => { setShowModal(false); setOption1(""); setOption2(""); }} className="w-full py-2 text-gray-400 hover:text-white text-sm transition">キャンセル</button>
          </div>
        </div>
      )}
    </div>
  );
}`;
fs.writeFileSync(__dirname + '/src/app/chat/page.tsx', content);
console.log('Done! File written successfully.');

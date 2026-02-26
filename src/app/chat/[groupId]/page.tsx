"use client";

import { useEffect, useState, useRef } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, Timestamp, doc, updateDoc, getDoc, arrayUnion,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter, useParams } from "next/navigation";

type Message = { id: string; text: string; senderId: string; senderName: string; createdAt: Date; deleted: boolean; readBy: string[]; fileUrl?: string; fileType?: string; fileName?: string; };

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

function getFileCategory(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

export default function ChatPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const [user, setUser] = useState<User | null>(null);
  const [myName, setMyName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [nameMode, setNameMode] = useState("nickname");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");
  const [langMenu, setLangMenu] = useState<string | null>(null);
  const [translating, setTranslating] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState<Record<string, string>>({});
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/"); return; }
      setUser(u);
      const groupSnap = await getDoc(doc(db, "groups", groupId));
      if (!groupSnap.exists()) { router.push("/groups"); return; }
      const gData = groupSnap.data();
      setGroupName(gData.name || "");
      setNameMode(gData.nameMode || "nickname");
      const members = gData.members || [];
      const names: Record<string, string> = {};
      for (const mid of members) {
        const ms = await getDoc(doc(db, "users", mid));
        if (ms.exists()) {
          const userData = ms.data();
          names[mid] = gData.nameMode === "position" ? (userData.positionName || userData.displayName || "Unknown") : (userData.displayName || "Unknown");
        }
      }
      setMemberNames(names);
      setMyName(names[u.uid] || "");
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
        return { id: d.id, text: data.text || "", senderId: data.senderId, senderName: data.senderName || "", createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(), deleted: data.deleted || false, readBy: data.readBy || [], fileUrl: data.fileUrl || "", fileType: data.fileType || "", fileName: data.fileName || "" };
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) { alert("ファイルサイズは50MB以下にしてください"); return; }
    setUploading(true);
    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, "chat/" + groupId + "/" + timestamp + "_" + file.name);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const fileType = getFileCategory(file.type);
      await addDoc(collection(db, "groups", groupId, "messages"), { text: "", senderId: user.uid, senderName: myName, createdAt: serverTimestamp(), deleted: false, readBy: [user.uid], fileUrl: url, fileType: fileType, fileName: file.name });
    } catch (err: any) { alert("アップロードに失敗しました: " + (err.message || "")); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
      await addDoc(collection(db, "groups", groupId, "messages"), { text: selectedText, senderId: user.uid, senderName: myName, createdAt: serverTimestamp(), deleted: false, readBy: [user.uid] });
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
  const getName = (msg: Message) => msg.senderName || memberNames[msg.senderId] || "Unknown";

  const renderFile = (msg: Message) => {
    if (!msg.fileUrl) return null;
    if (msg.fileType === "image") {
      return <img src={msg.fileUrl} alt={msg.fileName} className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition" onClick={() => setPreviewImg(msg.fileUrl || null)} />;
    }
    if (msg.fileType === "video") {
      return <video src={msg.fileUrl} controls className="max-w-full rounded-lg" />;
    }
    return (
      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-gray-600/30 rounded-lg hover:bg-gray-600/50 transition">
        <span className="text-2xl">📎</span>
        <span className="text-sm underline break-all">{msg.fileName || "ファイル"}</span>
      </a>
    );
  };

  if (loading) { return <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-950"><p className="text-white">読み込み中...</p></div>; }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 to-gray-950">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/80 backdrop-blur border-b border-gray-700/50">
        <button onClick={() => router.push("/groups")} className="text-2xl text-gray-400 hover:text-white transition">&#8249;</button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold">{groupName ? groupName[0] : "G"}</div>
        <div className="flex-1">
          <p className="text-white font-semibold">{groupName}</p>
          <p className="text-xs text-gray-400">{Object.keys(memberNames).length}人 ・ {nameMode === "position" ? "ポジション名" : "ニックネーム"}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (<p className="text-center text-gray-500 mt-10">メッセージはまだありません。<br />AIが安全な表現に変換してから送信されます。</p>)}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          const name = getName(msg);
          return (
            <div key={msg.id} className={"flex gap-2 " + (isMe ? "justify-end" : "justify-start")}>
              {!isMe && (<div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-5">{getInitial(name)}</div>)}
              <div className="relative max-w-xs lg:max-w-md">
                {!isMe && <p className="text-xs text-gray-400 mb-1 ml-1">{name}</p>}
                <div className={"px-4 py-2.5 " + (msg.deleted ? "bg-gray-700/50 text-gray-500 italic rounded-2xl" : isMe ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl rounded-tr-md" : "bg-gray-800 text-white rounded-2xl rounded-tl-md border border-gray-700/50")}>
                  {msg.deleted ? (<span>このメッセージは削除されました</span>) : (<>
                    {msg.fileUrl && renderFile(msg)}
                    {msg.text && <p className={"text-sm leading-relaxed" + (msg.fileUrl ? " mt-2" : "")}>{msg.text}</p>}
                    {!msg.text && !msg.fileUrl && <p className="text-sm leading-relaxed">(空のメッセージ)</p>}
                    {translatedText[msg.id] && (<p className="mt-1.5 pt-1.5 border-t border-white/20 text-xs opacity-80">{translatedText[msg.id]}</p>)}
                  </>)}
                </div>
                {!msg.deleted && (
                  <div className={"flex items-center gap-2 mt-0.5 " + (isMe ? "justify-end" : "justify-start")}>
                    {msg.text && <button onClick={() => toggleLangMenu(msg.id)} className="text-xs text-gray-500 hover:text-white transition" disabled={translating === msg.id}>{translating === msg.id ? "..." : translatedText[msg.id] ? "✕" : "🌍"}</button>}
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
        {uploading && <p className="text-xs text-green-400 text-center mb-2">アップロード中...</p>}
        <div className="flex gap-2 items-end">
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2.5 text-gray-400 hover:text-white transition rounded-xl hover:bg-gray-700/50" title="ファイルを添付">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" className="hidden" onChange={handleFileUpload} />
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleConvert(); }} placeholder="メッセージを入力..." className="flex-1 px-4 py-2.5 bg-gray-700/50 text-white rounded-2xl outline-none focus:ring-2 focus:ring-green-500 border border-gray-600/50 text-sm" disabled={sending || uploading} />
          <button onClick={handleConvert} disabled={!input.trim() || sending || uploading} className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold text-sm hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">{sending ? "..." : "変換"}</button>
        </div>
        <p className="text-xs text-gray-500 mt-1.5 text-center">AIが心理的に安全な表現に変換します</p>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-5 max-w-md w-full space-y-3 mb-4 sm:mb-0">
            <h2 className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 text-center">どちらの表現で送信しますか？</h2>
            <button onClick={() => handleSelect(option1)} className="w-full p-4 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-xl text-left transition-all border border-gray-600/30 hover:border-green-500/50"><span className="text-green-400 font-bold text-xs">A</span><p className="mt-1 text-sm leading-relaxed">{option1}</p></button>
            <button onClick={() => handleSelect(option2)} className="w-full p-4 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-xl text-left transition-all border border-gray-600/30 hover:border-green-500/50"><span className="text-green-400 font-bold text-xs">B</span><p className="mt-1 text-sm leading-relaxed">{option2}</p></button>
            <button onClick={() => { setShowModal(false); setOption1(""); setOption2(""); }} className="w-full py-2 text-gray-400 hover:text-white text-sm transition">キャンセル</button>
          </div>
        </div>
      )}
      {previewImg && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setPreviewImg(null)}>
          <img src={previewImg} alt="プレビュー" className="max-w-full max-h-full object-contain rounded-lg" />
          <button onClick={() => setPreviewImg(null)} className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 transition">✕</button>
        </div>
      )}
    </div>
  );
}
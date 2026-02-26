"use client";

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
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) { router.push("/home"); } else { setChecking(false); }
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
      router.push("/home");
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
}
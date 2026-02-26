import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const LANG_MAP: Record<string, string> = {
  hiragana: "easy Japanese in all hiragana",
  en: "English",
  zh: "Chinese Simplified",
  ko: "Korean",
  vi: "Vietnamese",
  km: "Khmer",
  id: "Indonesian",
  ne: "Nepali",
};

export async function POST(req: NextRequest) {
  try {
    const { message, lang } = await req.json();
    if (!message || !lang) return NextResponse.json({ error: "missing" }, { status: 400 });
    const target = LANG_MAP[lang];
    if (!target) return NextResponse.json({ error: "unsupported" }, { status: 400 });
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    let prompt = "";
    if (lang === "hiragana") {
      prompt = "以下を全てひらがなで書き直して。漢字カタカナ不可。結果のみ返して: " + message;
    } else {
      prompt = "Translate to " + target + ". Return ONLY the translation: " + message;
    }
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return NextResponse.json({ translated: text });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

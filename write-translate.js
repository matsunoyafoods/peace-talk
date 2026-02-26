const fs = require('fs');
const content = `import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const LANG_MAP: Record<string, string> = {
  hiragana: "やさしい日本語",
  en: "English",
  zh: "Chinese (Simplified)",
  ko: "Korean",
  vi: "Vietnamese",
  km: "Khmer",
  id: "Indonesian",
  ne: "Nepali",
};

export async function POST(req: NextRequest) {
  try {
    const { message, lang } = await req.json();
    if (!message || !lang) {
      return NextResponse.json({ error: "missing params" }, { status: 400 });
    }
    const target = LANG_MAP[lang];
    if (!target) {
      return NextResponse.json({ error: "unsupported lang" }, { status: 400 });
    }
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    let prompt = "";
    if (lang === "hiragana") {
      prompt = "以下のメッセージを全てひらがなで書き直してください。漢字やカタカナは使わないでください。翻訳結果のみ返してください。\\n\\nメッセージ: " + message;
    } else {
      prompt = "Translate the following Japanese message to " + target + ". Return ONLY the translation.\\n\\nMessage: " + message;
    }
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return NextResponse.json({ translated: text });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json({ error: "translation failed" }, { status: 500 });
  }
}`;
fs.writeFileSync(__dirname + '/src/app/api/translate/route.ts', content);
console.log('Done! Translate file written successfully.');

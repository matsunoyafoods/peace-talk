import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "メッセージが必要です" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `あなたは心理的安全性の専門家です。
以下のメッセージを、相手が安心して受け取れる表現に変換してください。
必ず2つの異なるバリエーションを生成してください。

ルール：
- 元のメッセージの意図や内容は保持する
- 攻撃的・否定的な表現を、建設的で思いやりのある表現に変換する
- 相手の立場を尊重する言い方にする
- 自然な日本語にする
- 各バリエーションは1〜2文程度にする

元のメッセージ: "${message}"

以下のJSON形式で回答してください（他のテキストは不要）:
{"option1": "変換後のメッセージ1", "option2": "変換後のメッセージ2"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI応答の解析に失敗しました" }, { status: 500 });
    }

    const options = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      option1: options.option1,
      option2: options.option2,
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: "AI変換に失敗しました" }, { status: 500 });
  }
}

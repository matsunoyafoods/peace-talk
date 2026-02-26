import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { tokens, title, body } = await req.json();
    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: "no tokens" }, { status: 400 });
    }
    const message = {
      notification: { title, body },
      tokens: tokens,
    };
    const res = await admin.messaging().sendEachForMulticast(message);
    return NextResponse.json({ success: res.successCount, failure: res.failureCount });
  } catch (error: any) {
    console.error("Notify error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

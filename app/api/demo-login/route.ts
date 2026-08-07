import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabase/server";

// デモ用アカウントのログインをサーバー側で行う。
// パスワードはサーバー限定の環境変数（DEMO_PASSWORD）に置き、ブラウザには渡さない。
// 成功するとセッションのcookieがこの応答で設定される。
export async function POST() {
  const email = process.env.NEXT_PUBLIC_DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;

  // 未設定の環境ではデモログインを提供しない
  if (!email || !password) {
    return NextResponse.json({ error: "not_configured" }, { status: 404 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: "sign_in_failed" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

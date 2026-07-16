import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/server";

// マジックリンクの確認（token_hash 方式）。
// PKCE の code 方式と違い「送信したブラウザ/端末」と「開いたブラウザ/端末」が
// 違っても成立するため、PCで送ってスマホで開くケースでもログインできる。
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error?reason=missing_token_hash`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=${encodeURIComponent(error.message)}`,
    );
  }

  // 行き先：明示指定があればそれ。無ければ管理者は /admin、一般は / へ。
  if (next) return NextResponse.redirect(`${origin}${next}`);

  const { data: isAdmin } = await supabase.rpc("is_admin");
  return NextResponse.redirect(`${origin}${isAdmin ? "/admin" : "/"}`);
}

import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabase/server";

// マジックリンクのリダイレクト先。?code= をセッションに交換してアプリへ戻す。
// 失敗時は原因を ?reason= に載せてエラーページへ（切り分けのため）。
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Supabase 側から返るエラー（リンクの期限切れ・使用済みなど）
  const supabaseError =
    searchParams.get("error_description") ?? searchParams.get("error_code") ?? searchParams.get("error");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=${encodeURIComponent(error.message)}`,
    );
  }

  const reason = supabaseError ?? "code_missing";
  return NextResponse.redirect(
    `${origin}/auth/auth-code-error?reason=${encodeURIComponent(reason)}`,
  );
}

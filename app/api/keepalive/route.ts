import { NextResponse } from "next/server";

// Supabase の無料プランは一定期間アクセスが無いとプロジェクトが自動停止する。
// 止まると、ログイン済みの利用者だけが 504 になる（middleware が Supabase の応答を待つため）。
// それを防ぐために、1日1回ここを叩いて軽いクエリを1本投げる。
//
// 呼び出し元は vercel.json の cron。手で叩いて疎通確認にも使える。
//
// 判定の考え方：
//   行が返るかどうかは問わない。RLS で 0 件でも「データベースに届いた」ことが大事。
//   ホスト名が引けない・接続できない場合だけ失敗とみなす（＝停止している状態）。

export const dynamic = "force-dynamic"; // 常に実行する（キャッシュさせない）

export async function GET(request: Request) {
  // CRON_SECRET を設定している場合は、cron からの呼び出しだけを通す
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const startedAt = Date.now();
  try {
    // いちばん軽い問い合わせ。件数だけを取り、本体は受け取らない。
    const res = await fetch(`${url}/rest/v1/organizations?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    return NextResponse.json({
      ok: true,
      reached: true, // データベースまで届いた＝停止していない
      status: res.status,
      ms: Date.now() - startedAt,
      at: new Date().toISOString(),
    });
  } catch (e) {
    // ここに来るのは、ホスト名が引けない／接続できない場合。
    // Supabase プロジェクトが停止している可能性が高い。
    return NextResponse.json(
      {
        ok: false,
        reached: false,
        reason: e instanceof Error ? e.message : "unreachable",
        ms: Date.now() - startedAt,
        at: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

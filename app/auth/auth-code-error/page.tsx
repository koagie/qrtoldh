import Link from "next/link";

// マジックリンクの確認に失敗したときの案内（判定・疾病用語を含まない中立的な文言）。
// 切り分け用に、Supabase から返った理由を小さく表示する。
export default async function AuthCodeError({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <div className="px-6 pt-16 text-center">
      <h1 className="text-lg font-bold text-brand">リンクを確認できませんでした</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        ログイン用リンクの有効期限が切れているか、すでに使用済みの可能性があります。
        お手数ですが、もう一度メールアドレスを入力してリンクを送り直してください。
      </p>
      <p className="mt-3 text-[12px] leading-relaxed text-zinc-400">
        メールの受信側でリンクが自動的に開かれると、届く前に使用済みになることがあります。
        その場合は、リンクを送り直してからすぐにお試しください。
      </p>

      {reason && (
        <p className="mx-auto mt-5 max-w-sm break-all rounded-xl bg-zinc-50 px-3 py-2 text-left text-[11px] text-zinc-400">
          詳細：{reason}
        </p>
      )}

      <Link
        href="/"
        className="mt-6 inline-block rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white"
      >
        ログイン画面へ戻る
      </Link>
    </div>
  );
}

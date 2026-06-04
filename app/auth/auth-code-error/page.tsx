import Link from "next/link";

// マジックリンクの確認に失敗したときの案内（判定・疾病用語を含まない中立的な文言）。
export default function AuthCodeError() {
  return (
    <div className="px-6 pt-16 text-center">
      <h1 className="text-lg font-bold text-brand">リンクを確認できませんでした</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        ログイン用リンクの有効期限が切れているか、すでに使用済みの可能性があります。
        お手数ですが、もう一度メールアドレスを入力してリンクを送り直してください。
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white"
      >
        ログイン画面へ戻る
      </Link>
    </div>
  );
}

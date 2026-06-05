"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from "../components/AppDataProvider";

// データ完全削除の確認ページ。
// 「はい」→ Supabaseの記録＋アカウント（ログイン用メールアドレス含む）を削除してログアウト。
// 「いいえ」→ 記録画面に戻る。
export default function DeletePage() {
  const router = useRouter();
  const { deleteAccount } = useAppData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleYes() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      // 削除後はログアウト状態になり、トップ（ログイン画面）へ
      router.replace("/");
    } catch {
      setBusy(false);
      setError("削除できませんでした。時間をおいて、もう一度お試しください。");
    }
  }

  return (
    <div className="px-6 pt-12">
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"
              stroke="#e11d48"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="text-lg font-bold text-zinc-800">
          これまでのデータを
          <br />
          完全に消去しますか？
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          これまでの観察記録に加え、ログイン用のメールアドレスなどのアカウント情報も含め、
          すべてのデータを完全に削除します。
        </p>
        <p className="mt-2 text-sm font-medium text-rose-600">
          削除したデータは元に戻せません。
        </p>

        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={handleYes}
            disabled={busy}
            className="w-full rounded-2xl bg-rose-600 py-3.5 text-base font-bold text-white shadow-sm transition-colors disabled:opacity-60"
          >
            {busy ? "削除しています…" : "はい、完全に削除する"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            disabled={busy}
            className="w-full rounded-2xl border border-zinc-200 py-3.5 text-base font-bold text-zinc-700 disabled:opacity-60"
          >
            いいえ、記録画面に戻る
          </button>
        </div>
      </div>
    </div>
  );
}

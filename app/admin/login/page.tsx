"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { useAppData } from "../../components/AppDataProvider";
import ComplianceFooter from "../../components/ComplianceFooter";

// 管理者ログイン（健保組合・企業担当者）。一般利用者ログインとは別入口。
// 認証は既存と同じ magic link。ログイン後は middleware と is_admin() で /admin を保護する。
export default function AdminLoginPage() {
  const router = useRouter();
  const { user, authReady, signOut } = useAppData();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null=未確認 / false=管理者でない（true のときは /admin へリダイレクト済み）
  const [notAdmin, setNotAdmin] = useState(false);

  // ログイン済みなら管理者かどうかを確認し、管理者なら /admin へ（setStateは非同期コールバック内のみ）
  useEffect(() => {
    if (!authReady || !user) return;
    const supabase = createClient();
    supabase.rpc("is_admin").then(({ data }) => {
      if (data === true) router.replace("/admin");
      else setNotAdmin(true);
    });
  }, [authReady, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` },
    });
    setLoading(false);
    if (error) setError("送信できませんでした。メールアドレスをご確認のうえ、もう一度お試しください。");
    else setSent(true);
  }

  return (
    <div className="min-h-dvh bg-brand">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
        <div className="rounded-3xl bg-white px-6 py-8 shadow-xl">
          {/* ブランドロゴ＋サブ表記 */}
          <div className="mb-6 flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" className="h-12 w-12" />
            <p className="mt-2 text-[11px] font-semibold tracking-[0.18em] text-brand-sky">
              管理ダッシュボード
            </p>
          </div>

          {!authReady || (user && !notAdmin) ? (
            <div className="flex h-28 items-center justify-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-sky border-t-transparent" />
            </div>
          ) : user && notAdmin ? (
            <div className="text-center">
              <h1 className="text-lg font-bold text-zinc-800">管理者権限がありません</h1>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                このアカウントは管理ダッシュボードの対象として登録されていません。
                別のメールアドレスでお試しください。
              </p>
              <button
                type="button"
                onClick={() => signOut()}
                className="mt-6 text-sm font-medium text-brand underline"
              >
                ログアウトして別のメールで試す
              </button>
            </div>
          ) : sent ? (
            <div className="text-center">
              <h1 className="text-lg font-bold text-brand">メールを送りました</h1>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                <span className="font-medium text-zinc-700">{email}</span>{" "}
                宛に、ログイン用のリンクを送りました。メールのリンクをタップすると、管理ダッシュボードに進めます。
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="mt-6 text-sm font-medium text-brand underline"
              >
                別のメールアドレスで送り直す
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-center text-lg font-bold text-zinc-800">管理者ログイン</h1>
              <p className="mt-2 text-center text-sm leading-relaxed text-zinc-500">
                登録済みのメールアドレスに、ログイン用リンクをお送りします。
              </p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
                />
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full rounded-2xl bg-brand py-3.5 text-base font-bold text-white shadow-sm transition-colors disabled:bg-zinc-200 disabled:text-zinc-400"
                >
                  {loading ? "送信中…" : "ログインリンクを送る"}
                </button>
              </form>

              <p className="mt-5 text-center text-[11px] leading-relaxed text-zinc-400">
                管理者専用です。
              </p>
              <Link
                href="/"
                className="mt-1 block text-center text-sm font-medium text-brand underline underline-offset-2"
              >
                一般の方は観察ログアプリへ
              </Link>
            </>
          )}
        </div>
        <ComplianceFooter onDark />
      </div>
    </div>
  );
}

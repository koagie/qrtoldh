"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";

// マジックリンク（パスワードレス）ログイン画面。
// 文言は健康教育ツールの制約に準拠：状態の判定・評価・受診勧奨・疾病用語を使わない。
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError("送信できませんでした。メールアドレスをご確認のうえ、もう一度お試しください。");
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="px-6 pt-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 6h16v12H4zM4 7l8 6 8-6"
              stroke="#1A4684"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-brand">リンクを送りました</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          <span className="font-medium text-zinc-700">{email}</span> 宛に、ログイン用のリンクを送りました。
          メールを開いてリンクをタップすると、このアプリに戻ってログインが完了します。
        </p>
        <p className="mt-4 text-[12px] leading-relaxed text-zinc-400">
          メールが見つからないときは、迷惑メールフォルダもご確認ください。
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
    );
  }

  return (
    <div className="px-6 pt-10">
      <div className="mx-auto mb-6 flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="" className="h-14 w-14" />
        <h1 className="mt-3 text-lg font-bold text-brand">お口の観察ログ</h1>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500">
          セルフケアの観察を記録するツールです。
          <br />
          記録はクラウドに保存され、別の端末でも続けられます。
        </p>
      </div>

      {/* かんたん2ステップの説明（マジックリンク方式・新規も登録不要） */}
      <section className="mb-2.5 rounded-xl bg-brand-soft px-3 py-2.5">
        <p className="text-[10px] font-bold tracking-wide text-brand-sky">かんたん2ステップ</p>
        <ol className="mt-1.5 space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
              1
            </span>
            <span className="text-[12px] leading-snug text-zinc-600">
              メールアドレスを入力して、リンクを送る
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
              2
            </span>
            <span className="text-[12px] leading-snug text-zinc-600">
              届いたメールのリンクをタップして、ログイン完了
            </span>
          </li>
        </ol>
        <p className="mt-2 text-[10px] leading-relaxed text-brand/60">
          パスワードは不要です。
          <br />
          初めての方も、アカウント登録なしでそのまま始められます。
        </p>
      </section>

      {/* ログイン後の流れ（初めての人向けに、使い方をひと言） */}
      <p className="mb-4 px-1 text-[11px] leading-relaxed text-zinc-400">
        ログインしたら、今日のお口の色をタップして記録。あとはカレンダーや変化グラフで、毎日の様子をふりかえれます。
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-zinc-600">メールアドレス</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full rounded-2xl bg-brand py-3.5 text-base font-bold text-white shadow-sm transition-colors disabled:bg-zinc-200 disabled:text-zinc-400"
        >
          {loading ? "送信中…" : "ログイン用リンクを送る"}
        </button>
      </form>

      <p className="mt-5 text-[12px] leading-relaxed text-zinc-400">
        記録したデータはご本人だけが見られます。
      </p>
    </div>
  );
}

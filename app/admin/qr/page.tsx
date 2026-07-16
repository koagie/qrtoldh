"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "../../lib/supabase/client";

interface Org {
  code: string;
  name: string;
}

// 配布URLの基点。クライアントでのみ確定（SSRでは空）
const noopSubscribe = () => () => {};
function useOrigin(): string {
  return useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
}

// 配布用QR生成（管理者のみ。middleware でガード）。
// 所属コードごとに配布URL（?org=CODE）とQR画像を作る。
export default function AdminQrPage() {
  const origin = useOrigin();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [code, setCode] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("orgs")
      .select("code,name")
      .order("name")
      .then(({ data }) => setOrgs((data as Org[] | null) ?? []));
  }, []);

  const trimmed = code.trim();
  const url = trimmed ? `${origin}/?org=${encodeURIComponent(trimmed)}` : origin;

  // URLが変わるたびにQRを再生成
  useEffect(() => {
    if (!origin) return;
    QRCode.toDataURL(url, { width: 720, margin: 2, errorCorrectionLevel: "M" })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [url, origin]);

  async function copyUrl() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const known = orgs.some((o) => o.code === trimmed);

  return (
    <div className="min-h-dvh bg-zinc-50">
      <header className="border-b border-zinc-200 bg-brand px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="h-7 w-7 rounded bg-white p-0.5" />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-white">配布用QRコード</h1>
            <p className="text-[11px] text-white/70">
              所属ごとのQRを作ると、所属別に集計できます。
            </p>
          </div>
          <Link
            href="/admin"
            className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white"
          >
            レポートへ
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-4">
        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <label className="block">
            <span className="text-sm font-medium text-zinc-600">所属コード</span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              list="org-codes"
              placeholder="medipal_event_1018"
              className="mt-1 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
            />
            <datalist id="org-codes">
              {orgs.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </datalist>
          </label>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
            半角英数字とアンダースコアがおすすめ（例：<code>kenpo_A</code>、
            <code>medipal_event_1018</code>）。空欄にすると所属なしの一般用QRになります。
          </p>

          {trimmed && !known && (
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
              このコードは所属マスタ（orgs）に未登録です。ダッシュボードの絞り込みに出すには、
              同じコードを orgs に登録してください。
            </p>
          )}
        </section>

        {/* 配布用URL */}
        <section className="mt-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-zinc-700">配布用URL</h2>
          <p className="mt-2 break-all rounded-xl bg-zinc-50 px-3 py-2 text-[12px] text-zinc-600">
            {url}
          </p>
          <button
            type="button"
            onClick={copyUrl}
            className="mt-2 w-full rounded-2xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700"
          >
            {copied ? "コピーしました" : "URLをコピー"}
          </button>
        </section>

        {/* QR */}
        <section className="mt-3 rounded-2xl border border-zinc-100 bg-white p-4 text-center shadow-sm">
          <h2 className="text-left text-sm font-bold text-zinc-700">QRコード</h2>
          {dataUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dataUrl}
                alt={`${trimmed || "一般"}用のQRコード`}
                className="mx-auto mt-3 h-56 w-56"
              />
              <a
                href={dataUrl}
                download={`qr-${trimmed || "general"}.png`}
                className="mt-3 block w-full rounded-2xl bg-brand py-3 text-sm font-bold text-white"
              >
                QR画像をダウンロード（PNG）
              </a>
            </>
          ) : (
            <p className="py-8 text-sm text-zinc-400">QRを生成できませんでした。</p>
          )}
          <p className="mt-3 text-left text-[11px] leading-relaxed text-zinc-400">
            チラシ・結果票などに印刷して配布します。読み取った方の記録に、この所属コードが自動で付きます
            （利用者の入力は不要）。
          </p>
        </section>
      </div>
    </div>
  );
}

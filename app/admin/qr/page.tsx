"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import JSZip from "jszip";
import { ORG_TYPES, ORG_TYPE_LABEL, makeUniqueOrgCode } from "../../lib/org-id";
import ComplianceFooter from "../../components/ComplianceFooter";

// 配布ID・QR発行（管理者のみ。middleware でガード）。
// 団体情報を入力すると10桁の不透明IDを発行し、QRを生成する。
// QR/URL には ?c=<10桁ID> しか出ないため、団体名・種別・時期は外から読めない。

interface Issued {
  code: string;
  name: string;
  type: string;
  ym: string;
  note: string;
  dataUrl: string | null;
}

// 配布URLの基点。クライアントでのみ確定（SSRでは空）
const noopSubscribe = () => () => {};
function useOrigin(): string {
  return useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
}

export default function AdminQrPage() {
  const origin = useOrigin();
  const [base, setBase] = useState("");
  const [baseTouched, setBaseTouched] = useState(false);
  const [items, setItems] = useState<Issued[]>([]);

  // 入力フォーム
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("corporate");
  const [ym, setYm] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // クリップボードが使えない環境向けに、SQLを画面に出して手動コピーできるようにする
  const [sqlText, setSqlText] = useState<string | null>(null);

  const baseUrl = baseTouched ? base : origin;

  function buildUrl(code: string) {
    const b = baseUrl.trim().replace(/\s+/g, "");
    return b + (b.includes("?") ? "&" : "?") + "c=" + code;
  }

  function handleAdd() {
    const n = name.trim();
    if (!n) {
      setError("団体名を入力してください。");
      return;
    }
    const y = ym.trim();
    if (y && !/^\d{4}$/.test(y)) {
      setError("発行年月は YYMM の4桁で入力してください（例 2607）。");
      return;
    }
    setError(null);
    const code = makeUniqueOrgCode(new Set(items.map((i) => i.code)));
    setItems((prev) => [
      ...prev,
      { code, name: n, type, ym: y, note: note.trim(), dataUrl: null },
    ]);
    setName("");
    setNote("");
  }

  // QR画像を生成（未生成のものだけ）
  useEffect(() => {
    const pending = items.filter((i) => i.dataUrl === null);
    if (pending.length === 0 || !baseUrl) return;
    (async () => {
      const made = await Promise.all(
        pending.map(async (i) => ({
          code: i.code,
          dataUrl: await QRCode.toDataURL(buildUrl(i.code), {
            width: 720,
            margin: 2,
            errorCorrectionLevel: "H",
          }).catch(() => null),
        })),
      );
      setItems((prev) =>
        prev.map((i) => {
          const m = made.find((x) => x.code === i.code);
          return m && i.dataUrl === null ? { ...i, dataUrl: m.dataUrl } : i;
        }),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, baseUrl]);

  function download(content: BlobPart, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleZip() {
    const zip = new JSZip();
    for (const i of items) {
      if (!i.dataUrl) continue;
      zip.file(`qr_${i.code}.png`, i.dataUrl.split(",")[1], { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "qr_codes.zip";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleCsv() {
    const q = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const rows = [["配布ID", "団体名", "種別", "発行年月", "メモ", "URL"]].concat(
      items.map((i) => [
        i.code,
        i.name,
        ORG_TYPE_LABEL[i.type] ?? i.type,
        i.ym,
        i.note,
        buildUrl(i.code),
      ]),
    );
    const csv = "﻿" + rows.map((r) => r.map(q).join(",")).join("\r\n");
    download(
      csv,
      `発行台帳_${new Date().toISOString().slice(0, 10)}.csv`,
      "text/csv;charset=utf-8",
    );
  }

  async function handleSql() {
    const e = (s: string) => String(s ?? "").replace(/'/g, "''");
    const sql = items
      .map((i) => {
        const label = i.ym || i.note ? `'${e([i.ym, i.note].filter(Boolean).join(" / "))}'` : "null";
        return `with o as (
  insert into public.organizations (name, org_type)
  values ('${e(i.name)}', '${i.type}')
  returning id
)
insert into public.distributions (code, organization_id, purpose, label)
select '${i.code}', o.id, 'general', ${label} from o
on conflict (code) do nothing;`;
      })
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(sql);
      setSqlText(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // コピーできない環境では画面に表示して手動コピーしてもらう
      setSqlText(sql);
    }
  }

  const has = items.length > 0;

  return (
    <div className="min-h-dvh bg-zinc-50">
      <header className="border-b border-zinc-200 bg-brand px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="h-7 w-7 rounded bg-white p-0.5" />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-white">配布ID・QR発行</h1>
            <p className="text-[11px] text-white/70">
              10桁のランダムIDを発行してQRを作ります。IDから団体名も種別も読み取れません。
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
        {/* アプリのURL */}
        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <label className="block">
            <span className="text-sm font-bold text-zinc-700">アプリのURL（共通）</span>
            <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
              全団体で共通です。団体ごとに変わるのは末尾の <code className="text-brand-sky">?c=</code> の値だけ。
            </p>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => {
                setBaseTouched(true);
                setBase(e.target.value);
              }}
              spellCheck={false}
              className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
            />
          </label>
        </section>

        {/* 団体を追加 */}
        <section className="mt-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-zinc-700">団体を追加</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
            ここに入れた情報は台帳とデータベースにだけ残ります。QRには載りません。
          </p>

          <div className="mt-3 space-y-2.5">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              placeholder="団体名（例：デモ株式会社）"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
            />
            <div className="flex gap-2">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex-1 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-sky"
              >
                {ORG_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={ym}
                onChange={(e) => setYm(e.target.value)}
                maxLength={4}
                inputMode="numeric"
                placeholder="発行年月 2607"
                className="w-32 rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
              />
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="社内メモ（担当者・配布枚数など／任意）"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
            />
          </div>

          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

          <button
            type="button"
            onClick={handleAdd}
            className="mt-3 w-full rounded-2xl bg-brand py-3 text-sm font-bold text-white shadow-sm"
          >
            IDを発行してQRを作る
          </button>

          {/* 一括出力 */}
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleZip}
              disabled={!has}
              className="rounded-2xl border border-zinc-200 py-2.5 text-xs font-medium text-zinc-700 disabled:opacity-40"
            >
              QRをZIP保存
            </button>
            <button
              type="button"
              onClick={handleCsv}
              disabled={!has}
              className="rounded-2xl border border-zinc-200 py-2.5 text-xs font-medium text-zinc-700 disabled:opacity-40"
            >
              台帳CSV
            </button>
            <button
              type="button"
              onClick={handleSql}
              disabled={!has}
              className="rounded-2xl border border-zinc-200 py-2.5 text-xs font-medium text-zinc-700 disabled:opacity-40"
            >
              {copied ? "コピー済" : "SQLをコピー"}
            </button>
          </div>

          {sqlText && (
            <div className="mt-2">
              <p className="text-[11px] text-zinc-500">
                自動コピーできませんでした。下のSQLを選択してコピーしてください。
              </p>
              <textarea
                readOnly
                value={sqlText}
                onFocus={(e) => e.currentTarget.select()}
                rows={5}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 font-mono text-[11px] text-zinc-700"
              />
            </div>
          )}

          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
            <span className="font-bold">発行台帳は社外秘です。</span>{" "}
            IDと団体名の対応表そのものが配布先の一覧になります。CSVは社内で保管し、
            フライヤー等には添付しないでください。
          </p>
        </section>

        {/* 発行したQR */}
        {has ? (
          <>
            <div className="mt-4 flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-zinc-700">発行したQR</h2>
              <span className="text-xs text-zinc-400">{items.length} 件</span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2.5">
              {items.map((i) => (
                <div
                  key={i.code}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-zinc-100 bg-white p-3 text-center shadow-sm"
                >
                  {i.dataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.dataUrl} alt="" className="h-32 w-32" />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-sky border-t-transparent" />
                    </div>
                  )}
                  <p className="text-[13px] font-bold leading-tight text-zinc-700">{i.name}</p>
                  <p className="text-[11px] text-zinc-400">
                    {ORG_TYPE_LABEL[i.type]}
                    {i.ym ? ` ・ ${i.ym}` : ""}
                  </p>
                  <p className="font-mono text-[12px] tracking-wider text-brand-sky">{i.code}</p>
                  {i.dataUrl && (
                    <a
                      href={i.dataUrl}
                      download={`qr_${i.code}.png`}
                      className="mt-1 w-full rounded-xl border border-zinc-200 py-1.5 text-[11px] font-medium text-zinc-600"
                    >
                      PNGを保存
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* 発行台帳 */}
            <h2 className="mt-5 text-sm font-bold text-zinc-700">発行台帳</h2>
            <div className="mt-2 overflow-x-auto rounded-2xl border border-zinc-100 bg-white shadow-sm">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-zinc-100 text-[10px] uppercase tracking-wide text-zinc-400">
                    <th className="px-3 py-2">配布ID</th>
                    <th className="px-3 py-2">団体名</th>
                    <th className="px-3 py-2">種別</th>
                    <th className="px-3 py-2">年月</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((i, idx) => (
                    <tr key={i.code} className="border-b border-zinc-50 last:border-0">
                      <td className="px-3 py-2 font-mono tracking-wider text-brand-sky">{i.code}</td>
                      <td className="px-3 py-2 text-zinc-700">{i.name}</td>
                      <td className="px-3 py-2 text-zinc-500">{ORG_TYPE_LABEL[i.type]}</td>
                      <td className="px-3 py-2 text-zinc-500">{i.ym}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setItems((prev) => prev.filter((_, k) => k !== idx))}
                          className="px-1 text-zinc-300 hover:text-rose-500"
                          aria-label={`${i.name} を削除`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="mt-8 text-center text-sm text-zinc-400">
            団体名を入れて「IDを発行してQRを作る」を押してください。
          </p>
        )}

        {/* 運用メモ */}
        <section className="mt-5 rounded-2xl bg-brand-soft p-4">
          <h2 className="text-sm font-bold text-brand">運用メモ</h2>
          <ol className="mt-2 space-y-1 text-[12px] leading-relaxed text-brand/80">
            <li>① 団体を追加 → ② QRをZIPで保存して印刷物に配置</li>
            <li>③ 台帳CSVを社内保管 → ④ SQLをコピーしてSupabaseに投入</li>
          </ol>
          <p className="mt-2 text-[11px] leading-relaxed text-brand/60">
            IDは暗号論的乱数で生成（31文字種×10桁）。紛らわしい 0 1 i l o は除外し、連番は使いません。
            契約終了・誤配布時はレコードを消さず is_active を false にしてください。
          </p>
        </section>
      </div>
      <ComplianceFooter />
    </div>
  );
}

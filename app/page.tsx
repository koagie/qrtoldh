"use client";

import { useState } from "react";
import Link from "next/link";
import ColorGrid from "./components/ColorGrid";
import { ZONE_RANGES, ZONE_STYLE } from "./lib/colors";
import { SCREEN_COLOR_NOTE, ZONE_MESSAGE } from "./lib/messages";
import { formatJP } from "./lib/date";
import { useToday } from "./lib/hooks";
import { useAppData } from "./components/AppDataProvider";
import { zoneFromColor } from "./lib/types";

export default function RecordPage() {
  const today = useToday();
  const { measurements, saveMeasurement, isDemo } = useAppData();
  const existing = measurements.find((m) => m.measured_on === today);

  // 選択値はローカル操作。未操作のときは既存記録の色を表示する（effect 不要の派生）。
  const [picked, setPicked] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = picked ?? existing?.color_value ?? null;
  const zone = selected ? zoneFromColor(selected) : null;
  const hadRecord = !!existing;

  function handleSelect(value: number) {
    setPicked(value);
    setSaved(false);
  }

  function handleSaveClick() {
    if (selected == null) return;
    // 同日に既存記録があれば上書き確認（仕様書 6①）
    if (existing) setConfirmOpen(true);
    else doSave();
  }

  async function doSave() {
    if (selected == null || !today) return;
    setSaving(true);
    await saveMeasurement(today, selected);
    setSaving(false);
    setConfirmOpen(false);
    setSaved(true);
  }

  return (
    <div className="px-4 pt-5">
      <header className="mb-3">
        <h1 className="text-xl font-bold text-zinc-800">今日のお口の色は？</h1>
        <p className="mt-0.5 text-sm text-zinc-400">{today ? formatJP(today) : " "}</p>
      </header>

      {/* 区分の凡例（カラーチャートと同じ並び。数値がどの範囲にあるかを示す） */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {ZONE_RANGES.map(({ zone: z, min, max }) => {
          const zs = ZONE_STYLE[z];
          return (
            <div key={z} className="text-center">
              <span
                className="block h-1 rounded-full"
                style={{ backgroundColor: zs.accent }}
                aria-hidden
              />
              <span className="mt-1 block text-[13px] font-bold" style={{ color: zs.text }}>
                {zs.label}
              </span>
              <span className="block text-[9px] font-medium tracking-[0.12em] text-zinc-400">
                {zs.sub}
              </span>
              <span className="block text-[10px] text-zinc-400">
                {min}–{max}
              </span>
            </div>
          );
        })}
      </div>

      <ColorGrid selected={selected} onSelect={handleSelect} />

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">{SCREEN_COLOR_NOTE}</p>

      {/* 選択中のゾーン名＋応援メッセージ */}
      {zone && (
        <section
          className="mt-4 rounded-2xl p-4"
          style={{ backgroundColor: ZONE_STYLE[zone].soft }}
        >
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-bold" style={{ color: ZONE_STYLE[zone].text }}>
              {ZONE_STYLE[zone].label}
            </span>
            <span className="text-[10px] font-medium tracking-[0.12em] text-zinc-500">
              {ZONE_STYLE[zone].sub}
            </span>
            <span className="ml-auto text-[11px] text-zinc-500">
              {selected} 番 ・ {ZONE_STYLE[zone].range}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700">{ZONE_MESSAGE[zone]}</p>
        </section>
      )}

      <button
        type="button"
        onClick={handleSaveClick}
        disabled={selected == null || saving}
        className="mt-5 w-full rounded-2xl bg-brand py-3.5 text-base font-bold text-white shadow-sm transition-colors disabled:bg-zinc-200 disabled:text-zinc-400"
      >
        {saving ? "保存中…" : hadRecord ? "記録を更新する" : "記録する"}
      </button>

      {/* 完了表示 */}
      {saved && (
        <p className="mt-3 text-center text-sm font-medium text-brand">
          ✓ 今日の色を記録しました
        </p>
      )}

      {/* 上書き確認 */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
            <p className="text-base font-bold text-zinc-800">上書きしますか？</p>
            <p className="mt-1 text-sm text-zinc-500">
              {today ? formatJP(today) : ""}の記録を {selected} 番に更新します。
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-2xl border border-zinc-200 py-3 text-sm font-medium text-zinc-600"
              >
                やめる
              </button>
              <button
                type="button"
                onClick={doSave}
                disabled={saving}
                className="flex-1 rounded-2xl bg-brand py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? "保存中…" : "上書きする"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* データ削除（控えめに最下部）。デモ用アカウントでは共有アカウントを消せてしまうため出さない */}
      {!isDemo && (
        <div className="mt-10 border-t border-zinc-100 pt-4">
          <Link
            href="/delete"
            className="block text-center text-xs text-zinc-400 underline underline-offset-2"
          >
            記録データを削除する
          </Link>
        </div>
      )}
    </div>
  );
}

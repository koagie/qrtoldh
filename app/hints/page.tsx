"use client";

import { useState } from "react";
import { ZONE_STYLE } from "../lib/colors";
import { HINT_ZONES } from "../lib/hints";
import type { Zone } from "../lib/types";

// ケアのヒント（仕様書 タスク1）。
// KEEP / BOOST / ACTION の3ゾーンをアコーディオン表示（1つ開くと他は閉じる、初期はKEEP）。
// 文言はガイドライン準拠（判定・受診勧奨・疾病用語を使わない）。注意書きは共通フッターで常時表示。
export default function HintsPage() {
  const [open, setOpen] = useState<Zone | null>("KEEP");

  return (
    <div className="px-4 pt-5">
      <header className="mb-4">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-brand-sky">ORAL CARE TIPS</p>
        <h1 className="mt-0.5 text-xl font-bold text-brand">ケアのヒント</h1>
        <p className="mt-1 text-sm text-zinc-500">
          気になる段階を開いて、できそうなことから取り入れてみよう。
        </p>
      </header>

      <div className="space-y-3">
        {HINT_ZONES.map(({ zone, range, description, items }) => {
          const zs = ZONE_STYLE[zone];
          const isOpen = open === zone;
          const panelId = `hint-panel-${zone}`;
          return (
            <section
              key={zone}
              className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-[0_6px_18px_-8px_rgba(25,56,118,0.18)]"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : zone)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
              >
                {/* 左：数字レンジ＋区分記号のバッジ */}
                <span
                  className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-1.5 text-white"
                  style={{ backgroundColor: zs.accent }}
                >
                  <span className="text-sm font-extrabold leading-none">{range}</span>
                  <span className="mt-0.5 text-[9px] font-bold tracking-wider">{zs.sub}</span>
                </span>

                {/* 中央：区分名＋一言説明 */}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold" style={{ color: zs.text }}>
                      {zs.label}
                    </span>
                    <span className="text-[10px] text-zinc-400">{zs.range}</span>
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-zinc-500">
                    {description}
                  </span>
                </span>

                {/* 右：開閉シェブロン */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className={`shrink-0 text-zinc-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {isOpen && (
                <ul id={panelId} className="space-y-1.5 px-4 pb-4 pt-0.5">
                  {items.map((item, i) => (
                    <li
                      key={item}
                      className="hint-item flex items-start gap-2 text-sm leading-snug text-zinc-700"
                      style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                        className="mt-0.5 shrink-0"
                        style={{ color: zs.accent }}
                      >
                        <path
                          d="M5 13l4 4L19 7"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { COLOR_SAMPLES, ZONE_STYLE } from "../lib/colors";
import { zoneFromColor } from "../lib/types";

// 比色サンプル 1〜8 のグリッド。
// ・各サンプルに数字を併記（色だけで判別させない＝アクセシビリティ／仕様書 8）
// ・上部の細いバーでゾーン（KEEP/PLUS/ACTION）を色分け
export default function ColorGrid({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {COLOR_SAMPLES.map(({ value, hex }) => {
        const zone = zoneFromColor(value);
        const zs = ZONE_STYLE[zone];
        const isActive = selected === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            aria-pressed={isActive}
            aria-label={`色 ${value}（${zone}）`}
            className={`relative aspect-square overflow-hidden rounded-2xl transition-all ${
              isActive
                ? "scale-[1.04] ring-4 ring-offset-2 ring-brand-sky"
                : "ring-1 ring-black/5 active:scale-95"
            }`}
            style={{ backgroundColor: hex }}
          >
            {/* ゾーン色分けバー */}
            <span
              className="absolute inset-x-0 top-0 h-1.5"
              style={{ backgroundColor: zs.accent }}
              aria-hidden
            />
            {/* 実物の比色は淡色のため数字は常に濃色で表示（可読性・アクセシビリティ） */}
            <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-zinc-800">
              {value}
            </span>
            {isActive && (
              <span
                className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-brand-sky shadow"
                aria-hidden
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

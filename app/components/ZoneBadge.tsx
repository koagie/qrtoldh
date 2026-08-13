import { ZONE_STYLE } from "../lib/colors";
import type { Zone } from "../lib/types";

// ゾーン表示バッジ。カラーチャートに合わせて「たもつ／ふやす／みなおす」を出す。
// 健康度のランクではなく、数値がどの範囲にあるかを示す区分。
export default function ZoneBadge({
  zone,
  size = "md",
  showSub = false,
}: {
  zone: Zone;
  size?: "sm" | "md";
  showSub?: boolean;
}) {
  const s = ZONE_STYLE[zone];
  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-full font-bold ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-sm"
      }`}
      style={{ backgroundColor: s.soft, color: s.text }}
    >
      {s.label}
      {showSub && (
        <span className="text-[0.75em] font-medium tracking-wider opacity-70">{s.sub}</span>
      )}
    </span>
  );
}

import { ZONE_STYLE } from "../lib/colors";
import type { Zone } from "../lib/types";

// ゾーン表示バッジ。「健康度のランク」ではなく
// 「セルフケアを見直すきっかけの段階」を示す中立ラベル。
export default function ZoneBadge({ zone, size = "md" }: { zone: Zone; size?: "sm" | "md" }) {
  const s = ZONE_STYLE[zone];
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold tracking-wide ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-sm"
      }`}
      style={{ backgroundColor: s.soft, color: s.text }}
    >
      {s.label}
    </span>
  );
}

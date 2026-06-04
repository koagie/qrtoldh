import type { Zone } from "./types";

// 比色サンプルの色（1〜8）
// 実物のカラーチャート（丸山印刷様送付用 改訂版カラーチャート 2026.05.21）から抽出。
// 1＝白に近い 〜 8＝淡いラベンダーグレーへ徐々に濃くなる。
export const COLOR_SAMPLES: { value: number; hex: string }[] = [
  { value: 1, hex: "#FEFEFE" },
  { value: 2, hex: "#F2F1F9" },
  { value: 3, hex: "#ECE6F1" },
  { value: 4, hex: "#E1DBE7" },
  { value: 5, hex: "#DDD7E3" },
  { value: 6, hex: "#D1C9D9" },
  { value: 7, hex: "#C9BED3" },
  { value: 8, hex: "#C1B5CB" },
];

export function hexForColorValue(value: number): string {
  return COLOR_SAMPLES.find((c) => c.value === value)?.hex ?? "#cccccc";
}

// ゾーンの表示色。声かけ集（結果表）に準拠し、ブランドの「青の濃淡」で3段階を区別する。
// 緑/黄/赤のような良し悪しを連想させる配色は使わず、KEEP=明るい青 → ACTION=濃紺 とする。
// （健康度のランクではなく「セルフケアを見直すきっかけの段階」を見分けるためのもの）
export const ZONE_STYLE: Record<
  Zone,
  { label: string; accent: string; soft: string; text: string }
> = {
  KEEP: { label: "KEEP", accent: "#28B2DF", soft: "#E3F5FC", text: "#1379A6" },
  BOOST: { label: "BOOST", accent: "#1B76AD", soft: "#E1EEF7", text: "#155E8A" },
  ACTION: { label: "ACTION", accent: "#193876", soft: "#E0E6F1", text: "#193876" },
};

// ゾーンが占める color_value の範囲（グラフの帯・グリッドの区切りに使用）
export const ZONE_RANGES: { zone: Zone; min: number; max: number }[] = [
  { zone: "KEEP", min: 1, max: 3 },
  { zone: "BOOST", min: 4, max: 5 },
  { zone: "ACTION", min: 6, max: 8 },
];

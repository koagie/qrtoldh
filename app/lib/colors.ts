import type { Zone } from "./types";

// 比色サンプルの色（1〜8）
// カラーチャート改訂案B（Designchartv1）の記載値。
// 1＝白 〜 8＝淡いラベンダーグレーへ徐々に濃くなる。
export const COLOR_SAMPLES: { value: number; hex: string }[] = [
  { value: 1, hex: "#FFFFFF" },
  { value: 2, hex: "#F3F2FA" },
  { value: 3, hex: "#EBE5F1" },
  { value: 4, hex: "#E0DAE6" },
  { value: 5, hex: "#DCD5E2" },
  { value: 6, hex: "#CFC8D8" },
  { value: 7, hex: "#C7BCD2" },
  { value: 8, hex: "#C0B4CA" },
];

export function hexForColorValue(value: number): string {
  return COLOR_SAMPLES.find((c) => c.value === value)?.hex ?? "#cccccc";
}

// ゾーンの表示。カラーチャート改訂案B（Designchartv1）に準拠。
// 画面に出す名前は「たもつ／ふやす／みなおす」。
// キー（KEEP/PLUS/ACTION）はチャート上の区分記号で、DBに保存する値と同じ。
// 3段階は数値の範囲を見分けるための区分色であり、健康度のランクではない。
export const ZONE_STYLE: Record<
  Zone,
  { label: string; sub: string; range: string; accent: string; soft: string; text: string }
> = {
  KEEP: {
    label: "たもつ",
    sub: "KEEP",
    range: "低めの範囲",
    accent: "#3182E0",
    soft: "#DEE9FA",
    text: "#2A6FC4",
  },
  PLUS: {
    label: "ふやす",
    sub: "PLUS",
    range: "中くらいの範囲",
    accent: "#D9A02A",
    soft: "#F6EBD1",
    text: "#B0801A",
  },
  ACTION: {
    label: "みなおす",
    sub: "ACTION",
    range: "高めの範囲",
    accent: "#D5544A",
    soft: "#FAE2E0",
    text: "#BF3A30",
  },
};

// ゾーンが占める color_value の範囲（グラフの帯・グリッドの区切りに使用）
export const ZONE_RANGES: { zone: Zone; min: number; max: number }[] = [
  { zone: "KEEP", min: 1, max: 3 },
  { zone: "PLUS", min: 4, max: 5 },
  { zone: "ACTION", min: 6, max: 8 },
];

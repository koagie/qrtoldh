// ドメイン型定義（データモデル再設計 v1 準拠）

export type Zone = "KEEP" | "PLUS" | "ACTION";

// 測定イベント。zone は保存せず、色番号から導出する（原則3）。
export interface Measurement {
  id: string;
  app_user_id: string;
  measured_on: string; // 測定日 YYYY-MM-DD
  recorded_at: string; // 記録日時 ISO 8601
  color_value: number; // 1–8
  scale_version: string; // カラーチャートの版
  distribution_code: string | null; // 配布コード（QRの ?c=）
  context: MeasurementContext;
}

// 同じ日でも文脈が違えば別の測定として残せる（イベントと日常の衝突を防ぐ）
export type MeasurementContext = "self" | "event" | "clinic";

// 色番号 → ゾーン。
// DB側は scale_versions が持つ。画面表示のためにアプリ側でも同じ対応を持つ。
// チャートを改訂して範囲が変わったら、両方を更新すること。
export function zoneFromColor(value: number): Zone {
  if (value <= 3) return "KEEP";
  if (value <= 5) return "PLUS";
  return "ACTION";
}

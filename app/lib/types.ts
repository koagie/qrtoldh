// ドメイン型定義
// データモデルは第2・第3段（Supabase / 企業匿名集計）を見据えた構造。
// 第1段で未使用のフィールド（org_id）も「箱」だけ用意しておく。

export type Zone = "KEEP" | "PLUS" | "ACTION";

export interface RecordEntry {
  id: string;
  user_id: string; // 第1段はローカル生成の仮ID。第2段でSupabase認証IDに移行
  org_id: string | null; // 第3段用。第1段は null
  measured_at: string; // 測定日 YYYY-MM-DD（1日1件を基本）
  color_value: number; // 選んだ色の数値 1–8
  zone: Zone; // color_value から自動算出
  created_at: string; // ISO 8601
}

// ゾーン算出ロジック（仕様書 5）
//  1–3 → KEEP / 4–5 → PLUS / 6–8 → ACTION
export function zoneFromColor(value: number): Zone {
  if (value <= 3) return "KEEP";
  if (value <= 5) return "PLUS";
  return "ACTION";
}

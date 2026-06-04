// ローカルタイムゾーンでの日付ユーティリティ（toISOString のUTCずれを避ける）

export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayYMD(): string {
  return toYMD(new Date());
}

// "YYYY-MM-DD" → "M月D日（曜）"
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function formatJP(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}月${d}日（${WEEKDAYS[date.getDay()]}）`;
}

export function formatShort(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}/${d}`;
}

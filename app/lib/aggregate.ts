// 集計の匿名性しきい値。ここ1箇所で管理する（複数箇所に散らさない）。
// 母数がこれ未満のときは、個人が推測されうるため数値を表示しない。
export const MIN_AGGREGATE_N = 5;

export function isSuppressed(n: number): boolean {
  return n > 0 && n < MIN_AGGREGATE_N;
}

// 集計のマスク時に共通で使う文言
export const SUPPRESSED_LABEL = "データが少ないため表示しません";

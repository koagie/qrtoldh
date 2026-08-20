// 配布ID（QRの ?c= の値）の生成。
// 外に出る文字列から団体名・種別・時期が読めないよう、意味を持たない10桁のランダムIDにする。
// 連番は使わない（社数が露見し、次を推測できるため）。

// 紛らわしい 0 1 i l o を除外した31文字種
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const ID_LENGTH = 10; // 31^10 ≈ 8.2×10^14（衝突・推測とも実質不可能）

// 暗号論的乱数で生成（Math.random は使わない）
export function makeOrgCode(length = ID_LENGTH): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// 既存と重複しないIDを作る
export function makeUniqueOrgCode(existing: Set<string>): string {
  let code: string;
  do {
    code = makeOrgCode();
  } while (existing.has(code));
  return code;
}

// 団体種別（DB内のみで持ち、QR/URLには出さない）
export const ORG_TYPES = [
  { value: "corporate", label: "企業" },
  { value: "kenpo", label: "健康保険組合" },
  { value: "municipality", label: "自治体" },
  { value: "dental", label: "歯科医院" },
  { value: "event", label: "イベント" },
  { value: "academic", label: "大学・研究機関" },
  { value: "internal", label: "社内" },
] as const;

// 配布の用途（distributions.purpose）
export const PURPOSES = [
  { value: "general", label: "一般" },
  { value: "health_business", label: "保健事業" },
  { value: "research", label: "研究" },
] as const;

export type OrgType = (typeof ORG_TYPES)[number]["value"];

export const ORG_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  ORG_TYPES.map((t) => [t.value, t.label]),
);

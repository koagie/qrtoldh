// 利用者の属性（app_users）。氏名・生年月日・住所は扱わない。
export type Gender = "male" | "female" | "other" | "no_answer";

export interface AppUser {
  id: string;
  age: number | null;
  gender: Gender | null;
  entry_code: string | null;
}

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
  { value: "no_answer", label: "回答しない" },
];

export const GENDER_LABEL: Record<Gender, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
  no_answer: "回答しない",
};

// 集計時は年代にまとめて扱う（DB側の age_group() と対応させる）
export function ageBand(age: number | null | undefined): string {
  if (age == null) return "不明";
  if (age < 20) return "10代以下";
  if (age >= 80) return "80代以上";
  return `${Math.floor(age / 10) * 10}代`;
}

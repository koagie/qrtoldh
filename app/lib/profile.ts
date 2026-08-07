// 利用者の属性（年齢・性別）。氏名・生年月日・住所は扱わない。
export type Gender = "male" | "female" | "other" | "na";

export interface Profile {
  id: string;
  age: number | null;
  gender: Gender | null;
}

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
  { value: "na", label: "回答しない" },
];

export const GENDER_LABEL: Record<Gender, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
  na: "回答しない",
};

// 集計時は年代にまとめて扱う（個人が特定されにくくするため）
export function ageBand(age: number | null | undefined): string | null {
  if (age == null) return null;
  if (age < 10) return "10歳未満";
  if (age >= 70) return "70代以上";
  return `${Math.floor(age / 10) * 10}代`;
}

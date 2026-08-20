// 同意の目的と版。consent_documents / consents と対応する。

export type ConsentPurpose =
  | "terms"
  | "privacy"
  | "research"
  | "health_business"
  | "external_link";

// プライバシーポリシーの版。
// 取得する情報や利用目的を変更したら、この値を上げて改めて同意を得る。
export const POLICY_VERSION = "2026-08-07";

// 登録時に必ず同意してもらう目的。
// research（研究利用）は本文が確定してから画面に出す。仕組み（consents）は先に用意済み。
export const REQUIRED_CONSENTS: ConsentPurpose[] = ["privacy"];

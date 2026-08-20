"use client";

import { v4 as uuidv4 } from "uuid";
// ログイン前にブラウザへ一時保存する記録（クラウドへ移したら消す）
export interface LocalRecord {
  id: string;
  measured_at: string;
  color_value: number;
}

// ログイン前の一時保存だけを担う。ログインすると measurements へ移して消す。

const USER_KEY = "ocl_user_id";
const RECORDS_KEY = "ocl_records";
const ORG_KEY = "ocl_org_code";
const EVENT = "ocl_records_changed";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// ローカル生成の仮ユーザーID（第2段でSupabase認証IDへ移行）
export function getUserId(): string {
  if (!isBrowser()) return "";
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

export function getRecords(): LocalRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalRecord[];
    return parsed.sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  } catch {
    return [];
  }
}

export function getRecordByDate(date: string): LocalRecord | undefined {
  return getRecords().find((r) => r.measured_at === date);
}

function persist(records: LocalRecord[]) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(EVENT));
}

// 同日に既存記録があれば上書き（measured_at は1日1件を基本）
export function upsertRecord(measured_at: string, color_value: number): LocalRecord {
  const records = getRecords();
  const existing = records.find((r) => r.measured_at === measured_at);
  const entry: LocalRecord = {
    id: existing?.id ?? uuidv4(),
    measured_at,
    color_value,
  };
  const next = existing
    ? records.map((r) => (r.id === existing.id ? entry : r))
    : [...records, entry];
  persist(next);
  return entry;
}

export function deleteRecord(id: string) {
  persist(getRecords().filter((r) => r.id !== id));
}

// 所属コード（QRの ?org= 由来）。個人を特定しない「どの集団か」のラベル。
// QRから開いた時点で保存し、以降の記録に付与する。
export function getOrgCode(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ORG_KEY);
}

export function setOrgCode(code: string) {
  if (!isBrowser()) return;
  localStorage.setItem(ORG_KEY, code);
}

// 第2段：ログイン後にクラウドへ移行したローカル記録を消去する。
export function clearLocalRecords() {
  if (!isBrowser()) return;
  localStorage.removeItem(RECORDS_KEY);
  window.dispatchEvent(new Event(EVENT));
}

// 画面間で記録変更を反映するための購読
export function subscribeRecords(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb); // 別タブ更新も反映
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

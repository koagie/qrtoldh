"use client";

import { useState } from "react";
import Link from "next/link";
import { GENDER_OPTIONS, type Gender } from "../lib/profile";
import { useAppData } from "./AppDataProvider";

// ログイン後、はじめの1回だけ表示する属性入力。
// 記録の集計に使う情報のみ。氏名・生年月日・住所は取得しない。
export default function ProfileSetup() {
  const { saveProfile } = useAppData();
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ageNum = Number(age);
  const ageValid = age !== "" && Number.isInteger(ageNum) && ageNum >= 0 && ageNum <= 120;
  const canSubmit = ageValid && gender !== null && agreed && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || gender === null) return;
    setSaving(true);
    setError(null);
    try {
      await saveProfile(ageNum, gender);
    } catch {
      setSaving(false);
      setError("保存できませんでした。時間をおいて、もう一度お試しください。");
    }
  }

  return (
    <div className="px-6 pt-8">
      <div className="mx-auto max-w-sm">
        <h1 className="text-lg font-bold text-brand">はじめに、2つだけ教えてください</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          記録をまとめて見るときに使います。お名前や連絡先はうかがいません。
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* 年齢 */}
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">年齢</span>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="35"
                className="w-28 rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
              />
              <span className="text-sm text-zinc-500">歳</span>
            </div>
          </label>

          {/* 性別 */}
          <fieldset>
            <legend className="text-sm font-medium text-zinc-700">性別</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {GENDER_OPTIONS.map((o) => {
                const active = gender === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setGender(o.value)}
                    className={`rounded-2xl border py-3 text-sm font-medium transition-colors ${
                      active
                        ? "border-brand bg-brand text-white"
                        : "border-zinc-200 bg-white text-zinc-700"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* 同意（プライバシーポリシー） */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-brand-soft p-3.5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#1A4684]"
            />
            <span className="text-[13px] leading-relaxed text-zinc-700">
              <Link
                href="/privacy"
                target="_blank"
                className="font-medium text-brand underline underline-offset-2"
              >
                プライバシーポリシー
              </Link>
              を読み、記録の保存と、個人が特定されない形での集計に同意します。
            </span>
          </label>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-brand py-3.5 text-base font-bold text-white shadow-sm transition-colors disabled:bg-zinc-200 disabled:text-zinc-400"
          >
            {saving ? "保存中…" : "同意してはじめる"}
          </button>
        </form>

        <p className="mt-5 text-[12px] leading-relaxed text-zinc-400">
          入力した内容はご本人だけが見られます。まとめて見るときは、個人が分からない形で集計します。
        </p>
      </div>
    </div>
  );
}

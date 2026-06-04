import { ZONE_RANGES, ZONE_STYLE } from "../lib/colors";
import { THINGS_TO_KNOW, ZONE_MESSAGE } from "../lib/messages";

// ケアのヒント（仕様書 6④）。声かけ集（結果表）のデザインに準拠。
// KEEP / BOOST / ACTION の3セクションを「すべて」閲覧可能にする。
// 結果による出し分けはしない（特定ゾーンの人だけに見せない）。

// 各ゾーンのセルフケアのコツ（一般的な教育コンテンツの範囲。状態判定・受診勧奨はしない）
const ZONE_TIPS: Record<string, string[]> = {
  KEEP: [
    "朝晩のブラッシングを、今日も気持ちよく続けよう。",
    "歯ブラシは1〜2か月を目安に取り替えると毛先が元気。",
    "デンタルフロスや歯間ブラシをときどき取り入れてみよう。",
  ],
  BOOST: [
    "いつものケアに「歯間ケア」をひとつ追加してみよう。",
    "夜のブラッシングは少していねいに、時間をかけて。",
    "水分をこまめにとって、お口のうるおいをキープ。",
  ],
  ACTION: [
    "歯と歯ぐきの境目を、やさしく小刻みに磨いてみよう。",
    "歯間ブラシ・フロスを毎日の習慣に。",
    "自分に合う道具やケアの仕方を、いろいろ試してみよう。",
  ],
};

export default function HintsPage() {
  return (
    <div className="bg-gradient-to-b from-brand-soft/60 to-transparent px-4 pt-5">
      <header className="mb-4">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-brand-sky">ORAL CARE TIPS</p>
        <h1 className="mt-0.5 text-xl font-bold text-brand">あなたにぴったりのケアのヒント</h1>
        <p className="mt-1 text-sm text-zinc-500">
          どの段階のヒントも自由に見られます。気になるものから取り入れてみよう。
        </p>
      </header>

      <div className="space-y-4">
        {ZONE_RANGES.map(({ zone, min, max }) => {
          const zs = ZONE_STYLE[zone];
          return (
            <section
              key={zone}
              className="flex overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_-6px_rgba(25,56,118,0.25)] ring-1 ring-black/5"
            >
              {/* 左：数値レンジ＋ゾーン名バッジ（声かけ集準拠） */}
              <div
                className="flex w-24 shrink-0 flex-col items-center justify-center gap-1.5 py-5 text-white"
                style={{ backgroundColor: zs.accent }}
              >
                <span className="text-2xl font-extrabold leading-none">
                  {min}〜{max}
                </span>
                <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-[11px] font-bold tracking-wide">
                  {zs.label}
                </span>
              </div>
              {/* 右：応援メッセージ＋セルフケアのコツ */}
              <div className="min-w-0 flex-1 px-4 py-3.5">
                <h2 className="text-sm font-bold" style={{ color: zs.text }}>
                  {zs.label}ゾーンの方へ
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-zinc-700">{ZONE_MESSAGE[zone]}</p>
                <ul className="mt-3 space-y-1.5">
                  {ZONE_TIPS[zone].map((tip) => (
                    <li key={tip} className="flex gap-2 text-sm text-zinc-600">
                      <span style={{ color: zs.accent }}>・</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}
      </div>

      {/* 知っておきたい3つのコト（仕様書 7） */}
      <section className="mt-5 rounded-2xl bg-brand-soft p-4">
        <h2 className="text-sm font-bold text-brand">知っておきたい3つのコト</h2>
        <ol className="mt-2 space-y-2">
          {THINGS_TO_KNOW.map((t, i) => (
            <li key={t} className="flex gap-2 text-sm leading-relaxed text-brand/90">
              <span className="font-bold text-brand-sky">{i + 1}.</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

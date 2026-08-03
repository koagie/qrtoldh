// 全ページ共通のコンプライアンス注記。
// 文言は既存の承認済み資材（A6結果票）と同一。創作・改変しないこと。
// 濃色背景のページでは onDark を渡して可読性を確保する（文言は変えない）。
export default function ComplianceFooter({ onDark = false }: { onDark?: boolean }) {
  return (
    <p
      className={`px-4 py-6 text-center text-[12px] leading-relaxed ${
        onDark ? "text-white/70" : "text-slate-500"
      }`}
    >
      本ツールは毎日のセルフケアを応援する健康教育用ツールです。 {/* copy-lint-ignore */}
      <br />
      疾病の診断・治療を目的とした医療機器ではありません。 {/* copy-lint-ignore */}
      <br />
      長田産業株式会社
    </p>
  );
}

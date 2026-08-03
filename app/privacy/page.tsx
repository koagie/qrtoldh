import Link from "next/link";

export const metadata = {
  title: "プライバシーポリシー｜お口の観察ログ",
};

// プライバシーポリシー（ログイン不要で閲覧可。AppShell の公開ルート扱い）。
// 文言は健康教育ツールの制約に準拠（状態の判定・診断・疾病用語を使わない）。
export default function PrivacyPage() {
  return (
    <div className="px-5 pt-6 pb-4">
      <h1 className="text-xl font-bold text-brand">プライバシーポリシー</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        長田産業株式会社（以下「当社」）は、「お口の観察ログ」（以下「本サービス」）における利用者の情報の取扱いについて、以下のとおり定めます。
      </p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
        本サービスは健康教育用ツールであり、医療機器ではありません。身体の状態を判定・診断するものではなく、セルフケアの観察を記録するためのものです。 {/* copy-lint-ignore */}
      </p>

      <Section title="1. 事業者情報">
        <ul className="space-y-1">
          <li>事業者名：長田産業株式会社</li>
          <li>代表者：代表取締役 田中万里</li>
        </ul>
      </Section>

      <Section title="2. 取得する情報">
        <ul className="list-disc space-y-1 pl-5">
          <li>メールアドレス（ログイン〔マジックリンク認証〕のために使用します）</li>
          <li>観察記録（選択した色の数値〔1〜8〕および記録日）</li>
        </ul>
      </Section>

      <Section title="3. 利用目的">
        <p>
          取得した情報は、ご本人が記録した観察データを保存し、同じ方が別の端末でも表示・継続できるようにするため、およびログイン（本人確認）のために利用します。これら以外の目的では利用しません。
        </p>
      </Section>

      <Section title="4. 第三者提供・委託">
        <p>
          取得した情報を第三者へ提供しません。データの保管にはクラウドサービス（Supabase）を利用しています（保管リージョン：東京）。
        </p>
      </Section>

      <Section title="5. 安全管理">
        <p>
          通信はHTTPSで暗号化しています。行レベルセキュリティ（RLS）により、記録はご本人のみが参照・編集でき、他の利用者や第三者がご本人の記録を見ることはできません。
        </p>
      </Section>

      <Section title="6. データの削除">
        <p>
          利用者は、本サービス内の「記録データを削除する」機能から、いつでもご自身の観察記録およびアカウント情報（ログイン用メールアドレスを含む）を完全に削除できます。削除したデータは元に戻せません。
        </p>
      </Section>

      <Section title="7. お問い合わせ窓口">
        <p>
          本ポリシーや情報の取扱いに関するお問い合わせは、長田産業株式会社までご連絡ください。
        </p>
      </Section>

      <Section title="8. 改定">
        <p>本ポリシーの内容は、必要に応じて改定することがあります。</p>
      </Section>

      <p className="mt-6 text-xs text-zinc-400">制定日：2026年6月5日</p>

      <div className="mt-8 border-t border-zinc-100 pt-4">
        <Link
          href="/"
          className="block text-center text-sm font-medium text-brand underline underline-offset-2"
        >
          戻る
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="text-sm font-bold text-zinc-800">{title}</h2>
      <div className="mt-1.5 text-sm leading-relaxed text-zinc-600">{children}</div>
    </section>
  );
}

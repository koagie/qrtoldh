# お口の観察ログ / Oral Care Log

LDH test NAGATA（健康教育用ツール）の付随Webアプリ。利用者が試験紙の色を自分で記録し、日々の変化を観察することで、セルフケアの習慣化を応援する。

> **大前提**：本アプリは「健康教育用ツール」であり、**医療機器ではない**。疾病の診断・判定・治療を目的としない。

## ⚠️ 最重要：ガイドライン遵守ルール

「体外診断用医薬品に関する取扱いガイドライン（医薬監麻発0331第1号）」に抵触しない設計を全UI文言で厳守する。

- **状態の判定・評価をしない**（「健康です」「良好です」「リスクが高い」等は禁止）
- **結果別の受診勧奨をしない**（受診案内は全ユーザー共通フッターのみ）
- **疾病・診断用語を使わない**（歯周病／炎症／リスク／診断／判定／陽性・陰性は禁止）
- **改善／悪化の判定ラベルを付けない**
- ゾーンは「健康度のランク」ではなく「**セルフケアを見直すきっかけの段階**」

新しい文言・機能を足すときは必ず仕様書 `2. ガイドライン遵守ルール` を確認すること。共通文言は [`app/lib/messages.ts`](app/lib/messages.ts) に集約。

## 技術スタック

- Next.js 16（App Router）+ React 19 + TypeScript
- Tailwind CSS v4
- recharts（変化グラフ）
- PWA（manifest + 簡易 Service Worker）
- データ保存：**第1段は localStorage のみ**（ログイン不要・個人情報を預からない）

## 開発

```bash
npm run dev     # 開発サーバ http://localhost:3000
npm run build   # 本番ビルド
npm run lint    # ESLint
```

## 画面構成（下部タブ）

| タブ | パス | 内容 |
|---|---|---|
| 記録 | `/` | 1〜8の比色サンプルから今日の色を選んで記録。同日上書き確認あり |
| カレンダー | `/calendar` | 月表示・その日の色ドット・「今月◯回観察」・日タップで詳細 |
| 変化 | `/chart` | 折れ線で色の位置（1〜8）の推移。ゾーン帯・週/月/全期間切替 |
| ヒント | `/hints` | KEEP/BOOST/ACTION 全ゾーン閲覧可・知っておきたい3つのコト |

## データモデルと段階構成

第1段の実装が第2・第3段の土台。画面設計は3段階共通で、変わるのは**保存先だけ**。

- レコード型・ゾーン算出：[`app/lib/types.ts`](app/lib/types.ts)
- 保存層（差し替え対象）：[`app/lib/storage.ts`](app/lib/storage.ts)
- `records` には第2・3段を見据え `user_id` / `org_id` の「箱」を用意済み（第1段は user_id=ローカル uuid、org_id=null）

| 段階 | 保存先 | 概要 |
|---|---|---|
| 第1段（実装済み） | localStorage | ログイン不要・MVP |
| 第2段 | Supabase（Auth + RLS） | クラウド個人保存・複数端末 |
| 第3段 | Supabase | 企業向け匿名集計（個人特定不可） |

第2段移行時は `storage.ts` の CRUD を Supabase 実装に差し替えるのが基本方針。

## ブランドカラー

ロゴ・パッケージ・声かけ集（結果表）から抽出。[`app/globals.css`](app/globals.css) の `@theme` に定義（`bg-brand` 等で利用）。

| トークン | HEX | 用途 |
|---|---|---|
| `brand` | `#1A4684` | 見出し・ボタン・ナビのネイビー |
| `brand-deep` | `#193876` | 最も濃いネイビー（ACTION・パッケージの波） |
| `brand-mid` | `#1B76AD` | スチールブルー（BOOST） |
| `brand-sky` | `#28B2DF` | スカイブルー（KEEP・ロゴ下部） |
| `brand-soft` | `#EAF3FB` | 淡い青の面 |

ゾーン配色（[`app/lib/colors.ts`](app/lib/colors.ts) の `ZONE_STYLE`）は声かけ集に準拠し、
**青の濃淡**（KEEP=明るい青 → ACTION=濃紺）で3段階を区別する。良し悪しを連想させる緑/黄/赤は使わない。

## 比色サンプルの色

[`app/lib/colors.ts`](app/lib/colors.ts) の `COLOR_SAMPLES` は **仮グラデーション**。
正確な HEX は `Downloads/丸山印刷様送付用 LDH test NAGATA改訂版カラーチャート…pdf`（実物の1〜8色）から確定後に差し替える。
画面には「色は目安」の注意書きを常時表示。

## ロゴ・アイコン

ロゴマークは声かけ集 PDF から抽出して [`public/logo-mark.png`](public/logo-mark.png)（白地）/ `public/logo-mark-alpha.png`（透過）として配置。
アプリアイコン（`public/icon-192.png` / `public/icon-512.png` / `app/apple-icon.png` / favicon `app/icon.png`）は透過マークを白角丸地に合成して sharp で生成。
ロゴ素材を差し替えたらアイコンを再生成すること。

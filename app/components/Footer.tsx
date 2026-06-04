import { COMMON_FOOTER } from "../lib/messages";

// 全画面下部に常時表示する共通フッター（仕様書 6）。
// 受診案内は結果に紐付けず、全ユーザー共通の一般啓発のみ。
export default function Footer() {
  return (
    <p className="mx-auto max-w-md px-4 py-3 text-[11px] leading-relaxed text-zinc-400">
      {COMMON_FOOTER}
    </p>
  );
}

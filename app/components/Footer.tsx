import Link from "next/link";
import { COMMON_FOOTER } from "../lib/messages";

// 全画面下部に常時表示する共通フッター（仕様書 6）。
// 受診案内は結果に紐付けず、全ユーザー共通の一般啓発のみ。
export default function Footer() {
  return (
    <div className="mx-auto max-w-md px-4 py-3">
      <p className="text-[11px] leading-relaxed text-zinc-400">{COMMON_FOOTER}</p>
      <Link
        href="/privacy"
        className="mt-1.5 inline-block text-[11px] text-zinc-400 underline underline-offset-2"
      >
        プライバシーポリシー
      </Link>
    </div>
  );
}

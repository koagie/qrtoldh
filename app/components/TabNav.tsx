"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 下部タブナビゲーション（仕様書 6）：記録 / カレンダー / 変化 / ヒント
const TABS = [
  { href: "/", label: "記録", icon: PenIcon },
  { href: "/calendar", label: "カレンダー", icon: CalendarIcon },
  { href: "/chart", label: "変化", icon: ChartIcon },
  { href: "/hints", label: "ヒント", icon: BulbIcon },
];

export default function TabNav() {
  const pathname = usePathname();
  return (
    <nav
      className="sticky bottom-0 z-20 border-t border-zinc-200 bg-white/95 backdrop-blur"
      aria-label="メインナビゲーション"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                  active ? "text-brand" : "text-zinc-400"
                }`}
              >
                <Icon active={active} />
                <span className={active ? "font-semibold" : ""}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type IconProps = { active?: boolean };

function PenIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="2"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
      />
      <path
        d="M3 9h18M8 2v4M16 2v4"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChartIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 18 L9 12 L13 15 L20 6"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 21h18" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
    </svg>
  );
}

function BulbIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3Z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

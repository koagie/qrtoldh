import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AppDataProvider from "./components/AppDataProvider";
import AppShell from "./components/AppShell";
import ServiceWorker from "./components/ServiceWorker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "お口の観察ログ",
  description:
    "試験紙の色を自分で記録し、日々の変化を観察してセルフケアの習慣化を応援する健康教育用ツールです。",
  applicationName: "お口の観察ログ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "お口の観察ログ",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A4684",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* モバイルファースト：スマホ縦画面前提。認証状態に応じてシェルが出し分け */}
        <AppDataProvider>
          <AppShell>{children}</AppShell>
        </AppDataProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}

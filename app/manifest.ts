import type { MetadataRoute } from "next";

// PWA マニフェスト（仕様書 9）。ホーム画面追加・基本オフライン動作に対応。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "お口の観察ログ",
    short_name: "観察ログ",
    description:
      "試験紙の色を記録して、日々の変化を観察。セルフケアの習慣化を応援する健康教育用ツール。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1A4684",
    lang: "ja",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: { default: "Hammunity", template: "%s | Hammunity" },
  description: "고등학생 올인원 커뮤니티 — 게시판, 진로 탐색, 시간표, 공부 인증",
  keywords: ["고등학생", "커뮤니티", "진로", "시간표", "수행평가", "공부 인증"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1B3A5C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8673007010222998"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-dvh">
        <AuthProvider>
          <Header />
          <main className="max-w-lg mx-auto px-4 py-4">
            {children}
          </main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
```

그리고 `ads.txt` 파일도 필요함. `public/ads.txt` 파일 새로 만들어서 아래 내용 입력:
```
google.com, pub-8673007010222998, DIRECT, f08c47fec0942fa0

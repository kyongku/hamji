import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: { default: "함지고", template: "%s | 함지고" },
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

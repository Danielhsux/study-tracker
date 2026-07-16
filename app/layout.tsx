import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "讀書足跡｜Study Tracker",
  description: "高中生製作的讀書時間紀錄、目標管理與學習分析工具。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant" className="dark">
      <body>{children}</body>
    </html>
  );
}

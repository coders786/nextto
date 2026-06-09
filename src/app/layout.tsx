import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "nextto — an AI learning companion",
  description: "What if someone was sitting next to you while you learned? An AI companion that sees your screen, adapts to you, and teaches you.",
  keywords: ["AI learning", "learning companion", "nextto", "screen sharing", "personalized teaching"],
  authors: [{ name: "nextto" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "nextto",
    description: "What if someone was sitting next to you while you learned?",
    type: "website",
    siteName: "nextto",
  },
  twitter: {
    card: "summary_large_image",
    title: "nextto",
    description: "What if someone was sitting next to you while you learned?",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

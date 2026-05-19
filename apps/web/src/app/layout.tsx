import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lore",
  description: "AI-powered storytelling platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

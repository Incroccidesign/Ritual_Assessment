import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });

export const metadata: Metadata = {
  title: "Ritual Assessments",
  description: "Ritual-inspired guided visual assessment builder"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}

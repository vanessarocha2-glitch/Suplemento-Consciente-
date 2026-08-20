import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Suplemento Consciente",
  description:
    "Consulte ingredientes, situação na Anvisa e alertas de uso de suplementos alimentares.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl items-center gap-6 p-4">
            <Link href="/" className="font-semibold">
              Suplemento Consciente
            </Link>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/videos" className="hover:text-foreground">
                Vídeos
              </Link>
              <Link href="/quiz" className="hover:text-foreground">
                Quiz
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

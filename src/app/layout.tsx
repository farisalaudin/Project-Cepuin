import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cepuin — Laporin Masalah Infrastruktur Kotamu",
    template: "%s | Cepuin",
  },
  description:
    "Platform crowdsourced untuk melaporkan masalah infrastruktur kota. Lapor dalam 60 detik, tanpa daftar. Jalan berlubang, lampu mati, banjir — semua bisa dilaporkan.",
  keywords: [
    "lapor infrastruktur",
    "jalan berlubang",
    "lapor pemkot",
    "crowdsourcing",
    "cepuin",
  ],
  authors: [{ name: "Cepuin Team" }],
  openGraph: {
    title: "Cepuin — Laporin Masalah Infrastruktur Kotamu",
    description:
      "Lapor masalah infrastruktur kota dalam 60 detik. Tanpa daftar, langsung berdampak.",
    type: "website",
    locale: "id_ID",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563EB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
        {children}
      </body>
    </html>
  );
}

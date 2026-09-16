import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const baloo = localFont({
  src: "./fonts/Baloo2-VariableFont_wght.ttf",
  variable: "--font-baloo",
  weight: "400 800",
  display: "swap",
});

const nunito = localFont({
  src: "./fonts/Fredoka,Nunito/Nunito/Nunito-VariableFont_wght.ttf",
  variable: "--font-nunito",
  weight: "200 1000",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mindpop Akademi",
  description: "Öğrenmeyi maceraya dönüştüren kişisel öğrenme alanı.",
  metadataBase: new URL("https://mindpopakademi.com.tr"),
  openGraph: {
    title: "Mindpop Akademi | Öğrenmeyi maceraya dönüştür",
    description:
      "Hedefini yaz, POP sana özel öğrenme yol haritanı hazırlasın.",
    type: "website",
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mindpop Akademi | Öğrenmeyi maceraya dönüştür",
    description:
      "Hedefini yaz, POP sana özel öğrenme yol haritanı hazırlasın.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${baloo.variable} ${nunito.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

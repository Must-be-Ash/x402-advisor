import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from "@/lib/store";

const coinbaseSans = localFont({
  src: [
    { path: "../../public/fonts/Coinbase_Sans-Light-web-1.32.woff2", weight: "300", style: "normal" },
    { path: "../../public/fonts/Coinbase_Sans-Regular-web-1.32.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Coinbase_Sans-Medium-web-1.32.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/Coinbase_Sans-Bold-web-1.32.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-coinbase-sans",
  display: "swap",
});

const coinbaseMono = localFont({
  src: [
    { path: "../../public/fonts/Coinbase_Mono-Regular-web.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Coinbase_Mono-Medium-web.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/Coinbase_Mono-Bold-web.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-coinbase-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "x402 Setup",
  description: "Make your API x402-ready.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${coinbaseSans.variable} ${coinbaseMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProvider>{children}</AppProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

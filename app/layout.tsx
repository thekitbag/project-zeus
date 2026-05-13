import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Project Zeus",
  description: "Household operations. Broadly under control.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Project Zeus",
  },
};

export const viewport: Viewport = {
  themeColor: "#fafaf8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 min-h-screen">
        <Providers>
          <div className="max-w-lg mx-auto min-h-screen flex flex-col">
            <main className="flex-1 pb-20">{children}</main>
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}

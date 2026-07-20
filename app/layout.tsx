import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { BottomNav } from "@/components/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Toaster } from "@/components/Toaster";

export const metadata: Metadata = {
  title: "Project Zeus",
  description: "Household operations. Broadly under control.",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon-192.png",
  },
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
            <InstallPrompt />
            <Toaster />
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}

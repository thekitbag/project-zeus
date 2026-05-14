"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Three distinct states:
// "android-native"  — beforeinstallprompt fired (HTTPS), show native install button
// "android-manual"  — Android but no beforeinstallprompt (HTTP), show menu instructions
// "ios"             — iOS Safari, show Share sheet instructions
type Platform = "android-native" | "android-manual" | "ios" | null;

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const gotNativePrompt = useRef(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Already installed — nothing to show
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;

    if (isIOS) {
      const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
      if (isSafari) {
        setPlatform("ios");
        setShow(true);
      }
      return;
    }

    const isAndroid = /Android/.test(ua);

    // Native install prompt — only fires on HTTPS
    const handler = (e: Event) => {
      e.preventDefault();
      gotNativePrompt.current = true;
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setPlatform("android-native");
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setShow(false));

    // Fallback for HTTP (local network): if beforeinstallprompt never fires
    // within 1.5s, show manual menu instructions instead
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if (isAndroid) {
      fallbackTimer = setTimeout(() => {
        if (!gotNativePrompt.current) {
          setPlatform("android-manual");
          setShow(true);
        }
      }, 1500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") setShow(false);
    deferredPrompt.current = null;
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 inset-x-0 z-40 px-4 pb-2 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-4 flex items-start gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-amber-100">
            <Image src="/johnson.jpeg" alt="" fill className="object-cover object-top" sizes="40px" />
          </div>

          <div className="flex-1 min-w-0">
            {platform === "ios" && (
              <>
                <p className="text-sm font-semibold text-stone-800 leading-snug">
                  Add Project Zeus to your home screen.
                </p>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Tap the <strong>Share</strong> button ⎙ then <strong>Add to Home Screen</strong>. It&apos;s not complicated.
                </p>
              </>
            )}

            {platform === "android-native" && (
              <>
                <p className="text-sm font-semibold text-stone-800 leading-snug">
                  Install Project Zeus.
                </p>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Add it to your home screen. Chance would be a fine thing.
                </p>
                <button
                  onClick={handleInstall}
                  className="mt-2 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                >
                  Add to Home Screen →
                </button>
              </>
            )}

            {platform === "android-manual" && (
              <>
                <p className="text-sm font-semibold text-stone-800 leading-snug">
                  Add Project Zeus to your home screen.
                </p>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Tap the <strong>⋮ menu</strong> in Chrome then <strong>Add to Home Screen</strong>. It&apos;s in there. Have a look.
                </p>
              </>
            )}
          </div>

          <button
            onClick={() => setShow(false)}
            aria-label="Dismiss"
            className="text-stone-300 hover:text-stone-500 transition-colors flex-shrink-0 mt-0.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

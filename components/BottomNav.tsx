"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/shopping", label: "Shopping", icon: "🛒", active: true },
  { href: "/tasks", label: "Tasks", icon: "📋", active: true },
  { href: "/watch", label: "Watch", icon: "📺", active: true },
  { href: "/key-dates", label: "Key Dates", icon: "📅", active: true },
  { href: "/finance", label: "Finance", icon: "💳", active: true },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-50">
      <div className="flex max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isCurrent = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors ${
                isCurrent
                  ? "text-amber-600"
                  : "text-stone-400 hover:text-stone-600"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium tracking-wide uppercase">
                {item.label}
              </span>
              {!item.active && (
                <span className="text-[8px] text-stone-300 -mt-0.5">soon</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

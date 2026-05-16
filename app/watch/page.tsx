"use client";

import Image from "next/image";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WatchItem } from "@/components/WatchItem";
import { AddWatchItemSheet } from "@/components/AddWatchItemSheet";
import type { WatchItem as WatchItemType } from "@/db/schema";

type FilterType = "all" | "film" | "series" | "documentary" | "other";

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "film", label: "Film" },
  { value: "series", label: "Series" },
  { value: "documentary", label: "Documentary" },
  { value: "other", label: "Other" },
];

export default function WatchPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: items = [] } = useQuery<WatchItemType[]>({
    queryKey: ["watch-items"],
    queryFn: async () => {
      const res = await fetch("/api/watch-items");
      return res.json();
    },
  });

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);
  const toWatch = filtered.filter((i) => !i.watched);
  const watched = filtered.filter((i) => i.watched);

  return (
    <>
      <header className="px-4 pt-8 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold tracking-widest uppercase text-amber-600">Project Zeus</p>
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-amber-200 shadow-sm flex-shrink-0">
            <Image src="/johnson.jpeg" alt="Johnson" fill className="object-cover object-top" sizes="40px" />
          </div>
        </div>
        <div className="relative w-full h-36 rounded-2xl overflow-hidden mb-3 shadow-sm">
          <Image src="/marktheatre.jpeg" alt="Mark at the theatre" fill className="object-cover object-top" sizes="(max-width: 512px) 100vw, 512px" priority />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Watch List</h1>
            <p className="text-sm text-stone-400 mt-0.5 leading-relaxed">
              &ldquo;I&apos;ve got Heat on DVD at home. We&apos;re watching this, when for less money we could be watching Robert De Niro and Al Pacino.&rdquo;
            </p>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex-shrink-0 flex items-center gap-1.5 bg-amber-500 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-sm active:opacity-80 transition-opacity mt-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>
      </header>

      {/* Filter chips */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              filter === value
                ? "bg-stone-800 text-white border-stone-800"
                : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 pb-6">
        {toWatch.length === 0 && watched.length === 0 && (
          <div className="text-center py-14">
            <p className="text-stone-400 text-sm font-medium">The queue is empty.</p>
            <p className="text-stone-300 text-xs mt-1">Which is both a relief and a disappointment.</p>
          </div>
        )}

        {toWatch.length > 0 && (
          <div className="space-y-2">
            {toWatch.map((item) => (
              <WatchItem key={item.id} item={item} />
            ))}
          </div>
        )}

        {watched.length > 0 && (
          <div className={toWatch.length > 0 ? "mt-6" : ""}>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-stone-300 mb-2 px-1">
              Watched
            </p>
            <div className="space-y-2">
              {watched.map((item) => (
                <WatchItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>

      <AddWatchItemSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLongPress } from "@/lib/useLongPress";
import type { WatchItem as WatchItemType } from "@/db/schema";

const TYPE_STYLES: Record<string, string> = {
  film: "bg-amber-100 text-amber-700",
  series: "bg-blue-100 text-blue-700",
  documentary: "bg-green-100 text-green-700",
  other: "bg-stone-100 text-stone-500",
};

const TYPE_LABELS: Record<string, string> = {
  film: "Film",
  series: "Series",
  documentary: "Doc",
  other: "Other",
};

export function WatchItem({ item }: { item: WatchItemType }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const suppressClick = useRef(false);

  const toggleMutation = useMutation({
    // Idempotent state flip, so retrying a transient network blip is safe.
    retry: 2,
    mutationFn: async () => {
      const res = await fetch(`/api/watch-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watched: !item.watched }),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["watch-items"] });
      const prev = qc.getQueryData<WatchItemType[]>(["watch-items"]);
      qc.setQueryData<WatchItemType[]>(["watch-items"], (old) =>
        old?.map((i) => (i.id === item.id ? { ...i, watched: !item.watched } : i))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["watch-items"], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["watch-items"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/watch-items/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["watch-items"] });
      const prev = qc.getQueryData<WatchItemType[]>(["watch-items"]);
      qc.setQueryData<WatchItemType[]>(["watch-items"], (old) =>
        old?.filter((i) => i.id !== item.id)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["watch-items"], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["watch-items"] }),
  });

  const longPress = useLongPress(() => {
    suppressClick.current = true;
    setConfirming(true);
  });

  if (confirming) {
    return (
      <div className="bg-red-50 rounded-2xl p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-red-700 font-medium truncate">Remove &ldquo;{item.title}&rdquo;?</p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setConfirming(false)}
            className="text-xs text-stone-500 font-medium px-3 py-1.5 rounded-xl hover:bg-stone-100 transition-colors"
          >
            Reprieve
          </button>
          <button
            onClick={() => deleteMutation.mutate()}
            className="text-xs text-white font-medium px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...longPress}
      className={`bg-white rounded-2xl p-4 flex items-start gap-3 border border-stone-100 transition-opacity ${item.watched ? "opacity-50" : ""}`}
    >
      <button
        onClick={() => toggleMutation.mutate()}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center transition-colors ${
          item.watched ? "border-amber-500 bg-amber-500" : "border-stone-300 hover:border-amber-400"
        }`}
      >
        {item.watched && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium text-stone-800 leading-snug ${item.watched ? "line-through" : ""}`}>
          {item.title}
        </p>
        {item.notes && (
          <p className="text-xs text-stone-400 mt-0.5 leading-relaxed whitespace-pre-line">{item.notes}</p>
        )}
      </div>

      <span className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full mt-0.5 ${TYPE_STYLES[item.type] ?? TYPE_STYLES.other}`}>
        {TYPE_LABELS[item.type] ?? item.type}
      </span>
    </div>
  );
}

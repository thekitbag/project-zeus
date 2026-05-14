"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLongPress } from "@/lib/useLongPress";
import { relativeDateLine, getCategoryById } from "@/lib/dates";
import type { Situation, SituationCategory } from "@/db/schema";

interface Props {
  situation: Situation;
  categories: SituationCategory[];
  todayStr: string;
}

export function SituationCard({ situation, categories, todayStr }: Props) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const category = getCategoryById(categories, situation.categoryId);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/situations/${situation.id}`, { method: "DELETE" });
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["situations"] });
      const prev = qc.getQueryData<Situation[]>(["situations"]);
      qc.setQueryData<Situation[]>(["situations"], (old) =>
        old?.filter((s) => s.id !== situation.id)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(["situations"], ctx?.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["situations"] });
      setConfirming(false);
    },
  });

  const longPress = useLongPress(() => setConfirming(true));

  if (confirming) {
    return (
      <div className="bg-red-50 rounded-xl px-4 py-3 border border-red-100 flex items-center justify-between gap-3">
        <span className="text-sm text-stone-600 italic">
          Stand down &ldquo;{situation.title}&rdquo;?
        </span>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setConfirming(false)}
            className="text-xs px-3 py-1.5 rounded-full border border-stone-300 text-stone-600"
          >
            Reprieve
          </button>
          <button
            onClick={() => deleteMutation.mutate()}
            className="text-xs px-3 py-1.5 rounded-full bg-red-500 text-white font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...longPress}
      className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden select-none"
      style={{ borderLeftWidth: 4, borderLeftColor: category?.colour ?? "#e5e7eb" }}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base leading-none">{category?.emoji ?? "📌"}</span>
          <span className="text-[10px] font-semibold tracking-widest uppercase text-stone-400">
            {category?.name ?? "Situation"}
          </span>
        </div>
        <p className="text-sm font-semibold text-stone-800 leading-snug">{situation.title}</p>
        <p className="text-xs text-stone-400 mt-0.5">
          {relativeDateLine(situation.startDate, situation.endDate, todayStr)}
        </p>
        {situation.notes && (
          <p className="text-xs text-stone-500 mt-2 leading-relaxed whitespace-pre-line border-t border-stone-50 pt-2">
            {situation.notes}
          </p>
        )}
      </div>
    </div>
  );
}

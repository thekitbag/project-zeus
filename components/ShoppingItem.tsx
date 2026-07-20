"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLongPress } from "@/lib/useLongPress";
import { apiFetch } from "@/lib/apiFetch";
import type { ShoppingItem as Item } from "@/db/schema";

interface Props {
  item: Item;
  listId: number;
}

export function ShoppingItem({ item, listId }: Props) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: async (completed: boolean) => {
      await apiFetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
    },
    onMutate: async (completed) => {
      await qc.cancelQueries({ queryKey: ["items", listId] });
      const prev = qc.getQueryData<Item[]>(["items", listId]);
      qc.setQueryData<Item[]>(["items", listId], (old) =>
        old?.map((i) => (i.id === item.id ? { ...i, completed } : i))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(["items", listId], ctx?.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["items", listId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(`/api/items/${item.id}`, { method: "DELETE" });
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["items", listId] });
      const prev = qc.getQueryData<Item[]>(["items", listId]);
      qc.setQueryData<Item[]>(["items", listId], (old) =>
        old?.filter((i) => i.id !== item.id)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(["items", listId], ctx?.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["items", listId] });
      setConfirming(false);
    },
  });

  const longPress = useLongPress(() => setConfirming(true));

  if (confirming) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-stone-100">
        <span className="text-sm text-stone-600 italic">
          Eliminate &ldquo;{item.text}&rdquo;?
        </span>
        <div className="flex gap-2">
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
      className={`flex items-center gap-3 px-4 py-3 border-b border-stone-100 select-none transition-opacity ${
        item.completed ? "opacity-40" : ""
      }`}
    >
      <button
        onClick={() => toggleMutation.mutate(!item.completed)}
        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          item.completed
            ? "bg-amber-500 border-amber-500"
            : "border-stone-300 hover:border-amber-400"
        }`}
        aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
      >
        {item.completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span className={`text-sm flex-1 ${item.completed ? "line-through text-stone-400" : "text-stone-800"}`}>
        {item.text}
      </span>
    </div>
  );
}

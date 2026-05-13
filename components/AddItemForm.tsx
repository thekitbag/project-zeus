"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ShoppingItem } from "@/db/schema";

export function AddItemForm({ listId }: { listId: number }) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      return res.json() as Promise<ShoppingItem>;
    },
    onMutate: async (text) => {
      await qc.cancelQueries({ queryKey: ["items", listId] });
      const prev = qc.getQueryData<ShoppingItem[]>(["items", listId]);
      const optimistic: ShoppingItem = {
        id: Date.now(),
        listId,
        text,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<ShoppingItem[]>(["items", listId], (old) => [
        ...(old ?? []),
        optimistic,
      ]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(["items", listId], ctx?.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["items", listId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 px-4 py-3 border-t border-stone-200 bg-white">
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add item…"
        className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-full px-4 py-2 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0"
        aria-label="Add item"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </form>
  );
}

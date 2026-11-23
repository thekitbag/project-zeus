"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { WATCH_TYPE_OPTIONS } from "@/components/AddWatchItemSheet";
import { EditSheet, editFieldClass, editLabelClass } from "@/components/EditSheet";
import type { WatchItem } from "@/db/schema";

export function EditWatchItemSheet({ item, onClose }: { item: WatchItem; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(item.title);
  const [type, setType] = useState(item.type);
  const [notes, setNotes] = useState(item.notes ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/watch-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), type, notes: notes.trim() || null }),
      });
      return (await res.json()) as WatchItem;
    },
    onSuccess: (updated) => {
      qc.setQueryData<WatchItem[]>(["watch-items"], (old) =>
        old?.map((i) => (i.id === updated.id ? updated : i))
      );
      qc.invalidateQueries({ queryKey: ["watch-items"] });
      onClose();
    },
  });

  return (
    <EditSheet
      heading="Edit Watch Item"
      canSave={title.trim().length > 0}
      saving={save.isPending}
      onClose={onClose}
      onSave={() => save.mutate()}
    >
      <div className="mb-4">
        <label htmlFor="edit-watch-title" className={editLabelClass}>Title</label>
        <input
          id="edit-watch-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={editFieldClass}
          autoComplete="off"
        />
      </div>
      <div className="mb-4">
        <span className={editLabelClass}>Type</span>
        <div className="flex gap-2 flex-wrap">
          {WATCH_TYPE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={type === value}
              onClick={() => setType(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                type === value
                  ? "bg-stone-800 text-white border-stone-800"
                  : "border-stone-200 text-stone-600 bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label htmlFor="edit-watch-notes" className={editLabelClass}>Notes (optional)</label>
        <textarea
          id="edit-watch-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={`${editFieldClass} resize-none`}
        />
      </div>
    </EditSheet>
  );
}

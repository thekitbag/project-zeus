"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { toDateStr } from "@/lib/dates";
import { EditSheet, editFieldClass, editLabelClass } from "@/components/EditSheet";
import type { Situation, SituationCategory } from "@/db/schema";

interface Props {
  situation: Situation;
  categories: SituationCategory[];
  onClose: () => void;
}

export function EditSituationSheet({ situation, categories, onClose }: Props) {
  const qc = useQueryClient();
  const todayStr = toDateStr(new Date());
  const [title, setTitle] = useState(situation.title);
  const [categoryId, setCategoryId] = useState(situation.categoryId);
  const [startDate, setStartDate] = useState(situation.startDate);
  const [endDate, setEndDate] = useState(situation.endDate ?? "");
  const [notes, setNotes] = useState(situation.notes ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/situations/${situation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          categoryId,
          startDate,
          endDate: endDate || null,
          notes: notes.trim() || null,
        }),
      });
      return (await res.json()) as Situation;
    },
    onSuccess: (updated) => {
      qc.setQueryData<Situation[]>(["situations"], (old) =>
        old
          ?.map((s) => (s.id === updated.id ? updated : s))
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
      );
      qc.invalidateQueries({ queryKey: ["situations"] });
      onClose();
    },
  });

  const validStart = Boolean(startDate) && (startDate >= todayStr || startDate === situation.startDate);
  const canSave = title.trim().length > 0 && validStart && (!endDate || endDate >= startDate);

  return (
    <EditSheet
      heading="Edit Situation"
      canSave={canSave}
      saving={save.isPending}
      onClose={onClose}
      onSave={() => save.mutate()}
    >
      <div className="mb-4">
        <label htmlFor="edit-situation-title" className={editLabelClass}>Title</label>
        <input
          id="edit-situation-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={editFieldClass}
          autoComplete="off"
        />
      </div>
      <div className="mb-4">
        <span className={editLabelClass}>Category</span>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              aria-pressed={categoryId === cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                categoryId === cat.id ? "border-transparent text-stone-800" : "border-stone-200 text-stone-600 bg-white"
              }`}
              style={categoryId === cat.id ? { backgroundColor: cat.colour } : {}}
            >
              <span>{cat.emoji}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label htmlFor="edit-situation-start" className={editLabelClass}>Date</label>
        <input
          id="edit-situation-start"
          type="date"
          value={startDate}
          min={todayStr}
          onChange={(e) => {
            setStartDate(e.target.value);
            if (endDate && e.target.value > endDate) setEndDate("");
          }}
          className={editFieldClass}
        />
      </div>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <label htmlFor="edit-situation-end" className={editLabelClass}>End date (optional)</label>
          {endDate && (
            <button type="button" onClick={() => setEndDate("")} className="text-xs text-amber-600 font-medium mb-1.5">
              Clear
            </button>
          )}
        </div>
        <input
          id="edit-situation-end"
          type="date"
          value={endDate}
          min={startDate || todayStr}
          onChange={(e) => setEndDate(e.target.value)}
          className={editFieldClass}
        />
      </div>
      <div className="mb-4">
        <label htmlFor="edit-situation-notes" className={editLabelClass}>Notes (optional)</label>
        <textarea
          id="edit-situation-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={`${editFieldClass} resize-none`}
        />
      </div>
    </EditSheet>
  );
}

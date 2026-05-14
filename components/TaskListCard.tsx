"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLongPress } from "@/lib/useLongPress";
import type { TaskList } from "@/db/schema";

export function TaskListCard({ list }: { list: TaskList }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const suppressClick = useRef(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/task-lists/${list.id}`, { method: "DELETE" });
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["task-lists"] });
      const prev = qc.getQueryData<TaskList[]>(["task-lists"]);
      qc.setQueryData<TaskList[]>(["task-lists"], (old) =>
        old?.filter((l) => l.id !== list.id)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(["task-lists"], ctx?.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["task-lists"] });
      setConfirming(false);
    },
  });

  const longPress = useLongPress(() => {
    suppressClick.current = true;
    setConfirming(true);
  });

  const handleClick = () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    router.push(`/tasks/${list.id}`);
  };

  if (confirming) {
    return (
      <div className="flex items-center justify-between bg-red-50 rounded-2xl px-4 py-4 border border-red-100">
        <span className="text-sm text-stone-600 italic">
          Delete &ldquo;{list.name}&rdquo;?
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
      onClick={handleClick}
      className="flex items-center justify-between bg-white rounded-2xl px-4 py-4 shadow-sm border border-stone-100 active:bg-stone-50 transition-colors select-none cursor-pointer"
    >
      <span className="font-medium text-stone-800">{list.name}</span>
      <svg className="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

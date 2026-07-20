"use client";

import { use, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { apiFetch } from "@/lib/apiFetch";
import type { TaskItem, TaskList } from "@/db/schema";
import { TaskItem as TaskItemComponent } from "@/components/TaskItem";

export default function TaskListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const listId = parseInt(id, 10);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: lists } = useQuery<TaskList[]>({
    queryKey: ["task-lists"],
    queryFn: () => fetch("/api/task-lists").then((r) => r.json()),
  });

  const { data: items, isLoading } = useQuery<TaskItem[]>({
    queryKey: ["task-items", listId],
    queryFn: () => fetch(`/api/task-lists/${listId}/items`).then((r) => r.json()),
    enabled: !isNaN(listId),
  });

  const addItem = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiFetch(`/api/task-lists/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      return res.json() as Promise<TaskItem>;
    },
    onMutate: async (text) => {
      await qc.cancelQueries({ queryKey: ["task-items", listId] });
      const prev = qc.getQueryData<TaskItem[]>(["task-items", listId]);
      const optimistic: TaskItem = {
        id: Date.now(),
        listId,
        text,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<TaskItem[]>(["task-items", listId], (old) => [...(old ?? []), optimistic]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(["task-items", listId], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["task-items", listId] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    addItem.mutate(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  const list = lists?.find((l) => l.id === listId);
  const activeItems = items?.filter((i) => !i.completed) ?? [];
  const completedItems = items?.filter((i) => i.completed) ?? [];

  return (
    <div className="flex flex-col min-h-full">
      <header className="px-4 pt-8 pb-3">
        <Link href="/tasks" className="flex items-center gap-1 text-xs text-stone-400 mb-3 hover:text-stone-600 transition-colors w-fit">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Tasks
        </Link>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
          {list?.name ?? "Loading…"}
        </h1>
        <p className="text-xs text-stone-400 mt-0.5">
          {activeItems.length === 0 && !isLoading
            ? "God, life's relentless."
            : `${activeItems.length} task${activeItems.length !== 1 ? "s" : ""} remaining`}
        </p>
      </header>

      <div className="flex-1 bg-white rounded-t-2xl border border-stone-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-stone-400 text-sm">Assessing the situation…</div>
        ) : activeItems.length === 0 && completedItems.length === 0 ? (
          <div className="py-10 text-center px-6">
            <div className="relative w-40 h-36 mx-auto rounded-xl overflow-hidden mb-4 shadow-sm">
              <Image
                src="/jez.jpeg"
                alt="Jez"
                fill
                className="object-cover object-top"
                sizes="160px"
              />
            </div>
            <p className="text-stone-500 text-sm font-medium leading-relaxed max-w-xs mx-auto">
              &ldquo;A carton of Mars Bar milk, a small bag of marijuana and a pirated DVD of Anchorman is not important stuff.&rdquo;
            </p>
          </div>
        ) : (
          <>
            {activeItems.map((item) => (
              <TaskItemComponent key={item.id} item={item} listId={listId} />
            ))}
            {completedItems.length > 0 && (
              <>
                <div className="px-4 py-2 bg-stone-50 border-y border-stone-100">
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-stone-400">
                    Done ({completedItems.length})
                  </span>
                </div>
                {completedItems.map((item) => (
                  <TaskItemComponent key={item.id} item={item} listId={listId} />
                ))}
              </>
            )}
          </>
        )}
      </div>

      <div className="sticky bottom-20 bg-white border-t border-stone-200">
        <form onSubmit={handleSubmit} className="flex gap-2 px-4 py-3">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add task…"
            className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-full px-4 py-2 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0"
            aria-label="Add task"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

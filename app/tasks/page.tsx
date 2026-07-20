"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { apiFetch } from "@/lib/apiFetch";
import type { TaskList } from "@/db/schema";
import { TaskListCard } from "@/components/TaskListCard";

export default function TasksPage() {
  const qc = useQueryClient();
  const [newListName, setNewListName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: lists, isLoading } = useQuery<TaskList[]>({
    queryKey: ["task-lists"],
    queryFn: () => fetch("/api/task-lists").then((r) => r.json()),
  });

  const createList = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiFetch("/api/task-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-lists"] });
      setNewListName("");
      setShowForm(false);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    createList.mutate(newListName.trim());
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="px-4 pt-8 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold tracking-widest uppercase text-amber-600">
            Project Zeus
          </p>
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-amber-200 shadow-sm flex-shrink-0">
            <Image src="/johnson.jpeg" alt="Johnson" fill className="object-cover object-top" sizes="40px" />
          </div>
        </div>
        <div className="relative w-full h-36 rounded-2xl overflow-hidden mb-3 shadow-sm">
          <Image
            src="/johnson_charlescamilla.jpeg"
            alt="Johnson — If we succeed, I'm going to be Charles and you'll be my Camilla"
            fill
            className="object-cover object-center"
            sizes="(max-width: 512px) 100vw, 512px"
            priority
          />
        </div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Tasks</h1>
        <p className="text-sm text-stone-400 mt-0.5 leading-relaxed">
          &ldquo;If we succeed, I&apos;m going to be Charles and you&apos;ll be my Camilla.&rdquo;
        </p>
      </header>

      <div className="flex-1 px-4">
        {isLoading ? (
          <div className="py-12 text-center text-stone-400 text-sm">Assessing the situation…</div>
        ) : lists?.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-stone-400 text-sm">No task lists. This is either very good or very bad.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            {lists?.map((list) => <TaskListCard key={list.id} list={list} />)}
          </div>
        )}

        <div className="mt-4">
          {showForm ? (
            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="New list name…"
                className="flex-1 text-sm bg-white border border-stone-200 rounded-full px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              />
              <button
                type="submit"
                disabled={!newListName.trim()}
                className="px-4 py-2.5 rounded-full bg-amber-500 text-white text-sm font-medium disabled:opacity-40 transition-opacity"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setNewListName(""); }}
                className="px-4 py-2.5 rounded-full border border-stone-200 text-stone-500 text-sm"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-600 transition-colors py-2"
            >
              <span className="w-6 h-6 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center text-stone-300 text-base leading-none">+</span>
              New list
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

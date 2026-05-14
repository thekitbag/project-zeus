"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import type { ShoppingItem, ShoppingList } from "@/db/schema";
import { ShoppingItem as ShoppingItemComponent } from "@/components/ShoppingItem";
import { AddItemForm } from "@/components/AddItemForm";

export default function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const listId = parseInt(id, 10);

  const { data: lists } = useQuery<ShoppingList[]>({
    queryKey: ["lists"],
    queryFn: () => fetch("/api/lists").then((r) => r.json()),
  });

  const { data: items, isLoading } = useQuery<ShoppingItem[]>({
    queryKey: ["items", listId],
    queryFn: () => fetch(`/api/lists/${listId}/items`).then((r) => r.json()),
    enabled: !isNaN(listId),
  });

  const list = lists?.find((l) => l.id === listId);
  const activeItems = items?.filter((i) => !i.completed) ?? [];
  const completedItems = items?.filter((i) => i.completed) ?? [];

  return (
    <div className="flex flex-col min-h-full">
      <header className="px-4 pt-8 pb-3">
        <Link href="/shopping" className="flex items-center gap-1 text-xs text-stone-400 mb-3 hover:text-stone-600 transition-colors w-fit">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Shopping
        </Link>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
          {list?.name ?? "Loading…"}
        </h1>
        <p className="text-xs text-stone-400 mt-0.5">
          {activeItems.length === 0 && !isLoading
            ? "God, life's relentless."
            : `${activeItems.length} item${activeItems.length !== 1 ? "s" : ""} remaining`}
        </p>
      </header>

      <div className="flex-1 bg-white rounded-t-2xl border border-stone-100 shadow-sm overflow-hidden mx-0">
        {isLoading ? (
          <div className="py-12 text-center text-stone-400 text-sm">
            Retrieving items from the archive…
          </div>
        ) : activeItems.length === 0 && completedItems.length === 0 ? (
          <div className="py-10 text-center px-6">
            <div className="relative w-48 h-36 mx-auto rounded-xl overflow-hidden mb-4 shadow-sm">
              <Image
                src="/noturkey.jpeg"
                alt="Where's the turkey Jeremy?"
                fill
                className="object-cover object-top"
                sizes="192px"
              />
            </div>
            <p className="text-stone-500 text-sm font-medium">
              Where&apos;s the turkey, Jeremy?
            </p>
          </div>
        ) : (
          <>
            {activeItems.map((item) => (
              <ShoppingItemComponent key={item.id} item={item} listId={listId} />
            ))}
            {completedItems.length > 0 && (
              <>
                <div className="px-4 py-2 bg-stone-50 border-y border-stone-100">
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-stone-400">
                    Done ({completedItems.length})
                  </span>
                </div>
                {completedItems.map((item) => (
                  <ShoppingItemComponent key={item.id} item={item} listId={listId} />
                ))}
              </>
            )}
          </>
        )}
      </div>

      <div className="sticky bottom-20 bg-white border-t border-stone-200">
        <AddItemForm listId={listId} />
      </div>
    </div>
  );
}

import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  shoppingItems,
  shoppingLists,
  taskItems,
  taskLists,
  voiceRequests,
  watchItems,
} from "@/db/schema";
import type { Interpretation, SavedEntry, VoiceResult } from "./types";

const DEFAULT_SHOPPING_LIST = "Groceries";
const FALLBACK_TASK_LIST = "To Do";

// "Jobs list", "the jobs" and "JOBS" should all land on a list called "Jobs".
export function normaliseListName(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (words[0] === "the" || words[0] === "our") words.shift();
  if (words.length > 1 && words[words.length - 1] === "list") words.pop();
  return words.join(" ");
}

function findByName<T extends { name: string }>(lists: T[], name: string): T | undefined {
  const wanted = normaliseListName(name);
  return lists.find((list) => normaliseListName(list.name) === wanted);
}

function toResult(row: { id: string; result: string; undoneAt: string | null }): VoiceResult {
  const stored = JSON.parse(row.result) as Omit<VoiceResult, "requestId" | "undone">;
  return { ...stored, requestId: row.id, undone: row.undoneAt !== null };
}

export function getVoiceResult(requestId: string): VoiceResult | null {
  const row = getDb().select().from(voiceRequests).where(eq(voiceRequests.id, requestId)).get();
  return row ? toResult(row) : null;
}

export function getListNames(): { shopping: string[]; tasks: string[] } {
  const db = getDb();
  return {
    shopping: db.select().from(shoppingLists).orderBy(asc(shoppingLists.id)).all().map((l) => l.name),
    tasks: db.select().from(taskLists).orderBy(asc(taskLists.id)).all().map((l) => l.name),
  };
}

// Saves everything or nothing, so a failure can't leave half a command behind.
export function saveVoiceRequest(requestId: string, interpretation: Interpretation): VoiceResult {
  const { operations, unclear } = interpretation;
  if (operations.length === 0) {
    return { requestId, saved: [], createdTaskListIds: [], unclear, undone: false };
  }

  return getDb().transaction((tx) => {
    // A concurrent retry may have finished while the model was running.
    const existing = tx.select().from(voiceRequests).where(eq(voiceRequests.id, requestId)).get();
    if (existing) return toResult(existing);

    const now = new Date().toISOString();
    const shopping = tx.select().from(shoppingLists).orderBy(asc(shoppingLists.id)).all();
    const tasks = tx.select().from(taskLists).orderBy(asc(taskLists.id)).all();
    const saved: SavedEntry[] = [];
    const createdTaskListIds: number[] = [];

    const defaultShoppingList = () => {
      let list = findByName(shopping, DEFAULT_SHOPPING_LIST) ?? shopping[0];
      if (!list) {
        list = tx
          .insert(shoppingLists)
          .values({ name: DEFAULT_SHOPPING_LIST, createdAt: now })
          .returning()
          .get();
        shopping.push(list);
      }
      return list;
    };

    for (const op of operations) {
      if (op.kind === "shopping") {
        const list = (op.listName && findByName(shopping, op.listName)) || defaultShoppingList();
        const item = tx
          .insert(shoppingItems)
          .values({ listId: list.id, text: op.text, completed: false, createdAt: now })
          .returning()
          .get();
        saved.push({ kind: "shopping", id: item.id, text: item.text, destination: list.name });
      } else if (op.kind === "task") {
        const name = op.listName || FALLBACK_TASK_LIST;
        let list = findByName(tasks, name);
        if (!list) {
          list = tx.insert(taskLists).values({ name, createdAt: now }).returning().get();
          tasks.push(list);
          createdTaskListIds.push(list.id);
        }
        const item = tx
          .insert(taskItems)
          .values({ listId: list.id, text: op.text, completed: false, createdAt: now })
          .returning()
          .get();
        saved.push({ kind: "task", id: item.id, text: item.text, destination: list.name });
      } else {
        const item = tx
          .insert(watchItems)
          .values({ title: op.text, type: op.watchType, createdAt: now })
          .returning()
          .get();
        saved.push({ kind: "watch", id: item.id, text: item.title, destination: "Watch List" });
      }
    }

    const stored = { saved, createdTaskListIds, unclear };
    tx.insert(voiceRequests)
      .values({ id: requestId, result: JSON.stringify(stored), createdAt: now })
      .run();
    return { ...stored, requestId, undone: false };
  });
}

// Removes what the command added. A task list it created goes too, but only
// if nobody has added anything else to it since.
export function undoVoiceRequest(requestId: string): VoiceResult | null {
  return getDb().transaction((tx) => {
    const row = tx.select().from(voiceRequests).where(eq(voiceRequests.id, requestId)).get();
    if (!row) return null;
    const result = toResult(row);
    if (result.undone) return result;

    for (const entry of result.saved) {
      if (entry.kind === "shopping") {
        tx.delete(shoppingItems).where(eq(shoppingItems.id, entry.id)).run();
      } else if (entry.kind === "task") {
        tx.delete(taskItems).where(eq(taskItems.id, entry.id)).run();
      } else {
        tx.delete(watchItems).where(eq(watchItems.id, entry.id)).run();
      }
    }

    for (const listId of result.createdTaskListIds) {
      const remaining = tx.select().from(taskItems).where(eq(taskItems.listId, listId)).get();
      if (!remaining) tx.delete(taskLists).where(eq(taskLists.id, listId)).run();
    }

    tx.update(voiceRequests)
      .set({ undoneAt: new Date().toISOString() })
      .where(eq(voiceRequests.id, requestId))
      .run();
    return { ...result, undone: true };
  });
}

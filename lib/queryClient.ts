import { QueryClient, MutationCache } from "@tanstack/react-query";
import { showToast } from "./toast";

function messageForError(error: unknown): string {
  // A rejected fetch (offline, server unreachable) surfaces as a TypeError.
  if (error instanceof TypeError) {
    return "Couldn't reach the server — your change wasn't saved.";
  }
  const detail = error instanceof Error ? error.message : "";
  return detail ? `Couldn't save — ${detail}` : "Couldn't save your change.";
}

export const queryClient = new QueryClient({
  // Any mutation that ends in error (after its retries) shows a toast, so a
  // failed write is never silent — the optimistic rollback is now explained.
  mutationCache: new MutationCache({
    onError: (error) => showToast(messageForError(error)),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

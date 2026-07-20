// Wrapper around fetch that throws on a non-2xx response.
//
// Plain fetch() only rejects on a network-level failure — an HTTP 4xx/5xx still
// resolves. In an optimistic-mutation flow that means a failed write looks
// successful: onError never fires, the optimistic UI sticks, and the change
// silently vanishes on the next real refetch. Routing every mutation through
// this helper makes the failure throw, so React Query's onError rolls the
// optimistic update back and the user actually sees the save didn't land.
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.clone().json())?.error ?? "";
    } catch {
      // response wasn't JSON; fall back to the status line
    }
    throw new Error(
      detail || `Request failed: ${res.status} ${res.statusText}`.trim()
    );
  }
  return res;
}

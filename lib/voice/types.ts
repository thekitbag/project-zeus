export const WATCH_TYPES = ["film", "series", "documentary", "other"] as const;
export type WatchType = (typeof WATCH_TYPES)[number];

export const MAX_TRANSCRIPT_LENGTH = 500;

export type VoiceOperation =
  | { kind: "shopping"; text: string; listName: string | null }
  | { kind: "task"; text: string; listName: string | null }
  | { kind: "watch"; text: string; watchType: WatchType };

export interface Interpretation {
  operations: VoiceOperation[];
  unclear: string | null;
}

export interface SavedEntry {
  kind: VoiceOperation["kind"];
  id: number;
  text: string;
  destination: string;
}

export interface VoiceResult {
  requestId: string;
  saved: SavedEntry[];
  createdTaskListIds: number[];
  unclear: string | null;
  undone: boolean;
}

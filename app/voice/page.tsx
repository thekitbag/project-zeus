"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { MAX_TRANSCRIPT_LENGTH, type SavedEntry, type VoiceResult } from "@/lib/voice/types";

interface RecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognitionConstructor = new () => Recognition;
type Phase = "idle" | "listening" | "processing" | "done" | "error";

function getRecognition(): RecognitionConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const subscribeNever = () => () => {};

// Detach handlers first, so a cancelled recording can never be submitted.
function discardRecognition(recognition: Recognition | null) {
  if (!recognition) return;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  recognition.abort();
}

function newRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // randomUUID is unavailable over plain http://<pi-ip>:3000.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function joinItems(items: string[]): string {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function summarise(saved: SavedEntry[]): string[] {
  const groups = new Map<string, string[]>();
  for (const entry of saved) {
    groups.set(entry.destination, [...(groups.get(entry.destination) ?? []), entry.text]);
  }
  return Array.from(groups, ([destination, items]) => `Added ${joinItems(items)} to ${destination}`);
}

export default function VoicePage() {
  const qc = useQueryClient();
  const speechSupported = useSyncExternalStore(subscribeNever, () => getRecognition() !== null, () => false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [undoing, setUndoing] = useState(false);

  const recognitionRef = useRef<Recognition | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refreshLists = useCallback(() => {
    for (const key of ["lists", "items", "task-lists", "task-items", "watch-items"]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  }, [qc]);

  const submit = useCallback(
    async (value: string) => {
      const transcript = value.trim();
      if (!transcript) return;
      // A retry reuses this ID, so the server can't add the items twice.
      requestIdRef.current ??= newRequestId();
      setPhase("processing");
      setMessage(null);
      setResult(null);

      try {
        const res = await apiFetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: requestIdRef.current, transcript }),
        });
        const data = (await res.json()) as VoiceResult;
        requestIdRef.current = null;
        setResult(data);
        setPhase("done");
        setText("");
        if (data.saved.length > 0) refreshLists();
      } catch (error) {
        setMessage(
          error instanceof TypeError
            ? "Couldn't reach Zeus. Nothing has been added yet."
            : error instanceof Error
              ? error.message
              : "Something went wrong. Nothing was added."
        );
        setPhase("error");
      }
    },
    [refreshLists]
  );

  const startListening = useCallback(
    (automatic = false) => {
      const Ctor = getRecognition();
      if (!Ctor) return;

      const recognition = new Ctor();
      recognition.lang = "en-GB";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      let heard = "";
      let failed = false;

      recognition.onresult = (event) => {
        heard = Array.from(event.results as ArrayLike<ArrayLike<{ transcript: string }>>)
          .map((alternatives) => alternatives[0].transcript)
          .join("");
        setText(heard);
      };

      recognition.onerror = (event) => {
        failed = true;
        if (event.error === "aborted") return;
        // An automatic start can be blocked until the first tap. That's fine.
        if (automatic && event.error === "not-allowed") {
          setPhase("idle");
          return;
        }
        setPhase("idle");
        if (event.error === "no-speech") {
          setMessage("Didn't catch that. Tap to try again.");
        } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setMessage("The mic isn't available here. Use the mic on your keyboard instead.");
          inputRef.current?.focus();
        } else {
          setMessage("Speech recognition failed. Try again, or type it below.");
        }
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        if (failed) return;
        if (heard.trim()) {
          void submit(heard);
        } else {
          setPhase("idle");
          setMessage("Didn't catch that. Tap to try again.");
        }
      };

      requestIdRef.current = null;
      setText("");
      setMessage(null);
      setResult(null);
      setPhase("listening");
      try {
        recognition.start();
      } catch {
        recognitionRef.current = null;
        setPhase("idle");
      }
    },
    [submit]
  );

  const cancel = () => {
    discardRecognition(recognitionRef.current);
    recognitionRef.current = null;
    setText("");
    setPhase("idle");
  };

  const undo = async () => {
    if (!result) return;
    setUndoing(true);
    try {
      const res = await apiFetch(`/api/voice/${result.requestId}`, { method: "DELETE" });
      setResult((await res.json()) as VoiceResult);
      refreshLists();
    } catch {
      setMessage("Couldn't undo that. Try again.");
    } finally {
      setUndoing(false);
    }
  };

  // Start straight away only if the mic has already been allowed.
  useEffect(() => {
    let active = true;
    if (getRecognition() && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((status) => {
          if (active && status.state === "granted") startListening(true);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
      discardRecognition(recognitionRef.current);
      recognitionRef.current = null;
    };
  }, [startListening]);

  const listening = phase === "listening";
  const processing = phase === "processing";

  return (
    <div className="px-4 pt-8 flex flex-col items-center">
      <h1 className="text-2xl font-bold text-stone-900">Quick Add</h1>
      <p className="text-sm text-stone-500 mt-1 text-center">
        Shopping, jobs or something to watch. Just say it.
      </p>

      {speechSupported && (
        <button
          onClick={() => (listening ? recognitionRef.current?.stop() : startListening())}
          disabled={processing}
          aria-label={listening ? "Stop listening" : "Start listening"}
          className={`mt-8 w-36 h-36 rounded-full flex items-center justify-center text-white shadow-lg transition-all disabled:opacity-50 ${
            listening ? "bg-red-500 animate-pulse scale-105" : "bg-amber-500"
          }`}
        >
          <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zm6-3a6 6 0 01-12 0m6 6v3m-3 0h6"
            />
          </svg>
        </button>
      )}

      <p className="mt-4 h-5 text-sm font-medium text-stone-600" role="status">
        {listening ? "Listening…" : processing ? "Adding…" : speechSupported && phase === "idle" ? "Tap to speak" : ""}
      </p>
      {listening && (
        <button onClick={cancel} className="mt-1 text-sm text-stone-400 underline">
          Cancel
        </button>
      )}

      {result && (
        <div className="mt-5 w-full bg-white border border-stone-200 rounded-2xl p-4">
          {result.undone ? (
            <p className="text-sm font-medium text-stone-600">Undone. Nothing to see here.</p>
          ) : (
            <>
              {summarise(result.saved).map((line) => (
                <p key={line} className="text-sm font-semibold text-green-700">
                  ✓ {line}
                </p>
              ))}
              {result.unclear && <p className="text-sm text-amber-700 mt-1">{result.unclear}</p>}
              {result.saved.length > 0 && (
                <button
                  onClick={undo}
                  disabled={undoing}
                  className="mt-2 text-sm font-semibold text-amber-600 disabled:opacity-50"
                >
                  {undoing ? "Undoing…" : "Undo"}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {message && <p className="mt-4 text-sm text-red-600 text-center">{message}</p>}

      <form
        className="mt-6 w-full"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(text);
        }}
      >
        <label htmlFor="voice-text" className="text-xs text-stone-500 block mb-1.5">
          {speechSupported ? "Or type, or use your keyboard's mic" : "Type, or use your keyboard's mic"}
        </label>
        <textarea
          id="voice-text"
          ref={inputRef}
          value={text}
          maxLength={MAX_TRANSCRIPT_LENGTH}
          onChange={(e) => {
            setText(e.target.value);
            // Edited text is a new command, not a retry of the old one.
            requestIdRef.current = null;
          }}
          rows={2}
          placeholder="We need milk and bread, and remind us to book the MOT"
          className="w-full text-base bg-white border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || processing || listening}
          className="mt-2 w-full py-3 rounded-2xl bg-stone-800 text-white font-semibold text-sm disabled:opacity-40"
        >
          {phase === "error" ? "Retry" : "Add"}
        </button>
      </form>
    </div>
  );
}

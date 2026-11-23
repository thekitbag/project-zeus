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

// Browsers end recognition after a pause, so listening restarts until the user
// taps stop. This only guards against a mic left on after opening the app.
const SILENCE_LIMIT_MS = 30_000;

interface ListeningSession {
  recognition: Recognition | null;
  stopRequested: boolean;
  silenceTimer: ReturnType<typeof setTimeout> | null;
}

// Detach handlers first, so a cancelled recording can never be submitted.
function discardSession(session: ListeningSession | null) {
  if (!session) return;
  if (session.silenceTimer) clearTimeout(session.silenceTimer);
  const recognition = session.recognition;
  session.recognition = null;
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

  const sessionRef = useRef<ListeningSession | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refreshLists = useCallback(() => {
    for (const key of ["lists", "items", "task-lists", "task-items", "watch-items", "situations"]) {
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

      discardSession(sessionRef.current);
      const session: ListeningSession = { recognition: null, stopRequested: false, silenceTimer: null };
      sessionRef.current = session;
      let committed = "";
      let current = "";

      const heard = () => `${committed} ${current}`.replace(/\s+/g, " ").trim();

      // Keep what was said in the box rather than saving it unreviewed.
      const endWithoutSaving = (note: string | null) => {
        const words = heard();
        discardSession(session);
        sessionRef.current = null;
        setText(words);
        setPhase("idle");
        setMessage(words ? (note ?? "Recording stopped. Tap Add to save it.") : note);
      };

      const resetSilenceTimer = () => {
        if (session.silenceTimer) clearTimeout(session.silenceTimer);
        session.silenceTimer = setTimeout(() => {
          endWithoutSaving(heard() ? "Stopped as it went quiet. Tap Add to save it." : null);
        }, SILENCE_LIMIT_MS);
      };

      const listen = () => {
        const recognition = new Ctor();
        recognition.lang = "en-GB";
        // Android repeats earlier words in continuous mode, so restart instead.
        recognition.continuous = !/Android/i.test(navigator.userAgent);
        recognition.interimResults = true;
        session.recognition = recognition;
        current = "";
        let fatal = false;

        recognition.onresult = (event) => {
          current = Array.from(event.results as ArrayLike<ArrayLike<{ transcript: string }>>)
            .map((alternatives) => alternatives[0].transcript)
            .join("");
          setText(heard());
          resetSilenceTimer();
        };

        recognition.onerror = (event) => {
          // A pause isn't a failure. onend restarts listening.
          if (event.error === "no-speech" || event.error === "aborted") return;
          fatal = true;
          // An automatic start can be blocked until the first tap. That's fine.
          if (automatic && !heard() && event.error === "not-allowed") {
            endWithoutSaving(null);
          } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            endWithoutSaving("The mic isn't available here. Use the mic on your keyboard instead.");
            inputRef.current?.focus();
          } else {
            endWithoutSaving("Speech recognition failed. Try again, or type it below.");
          }
        };

        recognition.onend = () => {
          if (fatal) return;
          committed = heard();
          current = "";

          if (!session.stopRequested) {
            try {
              listen();
            } catch {
              endWithoutSaving(null);
            }
            return;
          }

          const words = committed;
          discardSession(session);
          sessionRef.current = null;
          if (words) {
            void submit(words);
          } else {
            setPhase("idle");
            setMessage("Didn't catch that. Tap to try again.");
          }
        };

        recognition.start();
      };

      requestIdRef.current = null;
      setText("");
      setMessage(null);
      setResult(null);
      setPhase("listening");
      resetSilenceTimer();
      try {
        listen();
      } catch {
        discardSession(session);
        sessionRef.current = null;
        setPhase("idle");
      }
    },
    [submit]
  );

  const stopListening = () => {
    const session = sessionRef.current;
    if (!session) return;
    session.stopRequested = true;
    session.recognition?.stop();
  };

  const cancel = () => {
    discardSession(sessionRef.current);
    sessionRef.current = null;
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
      discardSession(sessionRef.current);
      sessionRef.current = null;
    };
  }, [startListening]);

  const listening = phase === "listening";
  const processing = phase === "processing";

  return (
    <div className="px-4 pt-8 flex flex-col items-center">
      <h1 className="text-2xl font-bold text-stone-900">Quick Add</h1>
      <p className="text-sm text-stone-500 mt-1 text-center">
        Shopping, jobs, key dates or something to watch. Just say it.
      </p>

      {speechSupported && (
        <button
          onClick={() => (listening ? stopListening() : startListening())}
          disabled={processing}
          aria-label={listening ? "Stop listening" : "Start listening"}
          className={`mt-8 w-36 h-36 rounded-full flex items-center justify-center text-white shadow-lg transition-all disabled:opacity-50 ${
            listening ? "bg-red-500 animate-pulse scale-105" : "bg-amber-500"
          }`}
        >
          {listening ? (
            <span className="w-12 h-12 rounded-lg bg-white" aria-hidden="true" />
          ) : (
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zm6-3a6 6 0 01-12 0m6 6v3m-3 0h6"
              />
            </svg>
          )}
        </button>
      )}

      <p className="mt-4 h-5 text-sm font-medium text-stone-600" role="status">
        {listening ? "Listening. Tap to finish." : processing ? "Adding…" : speechSupported && phase === "idle" ? "Tap to speak" : ""}
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
          placeholder="We need milk and bread, and the dentist is on Friday at 3"
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

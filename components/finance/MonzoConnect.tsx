"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  connected: boolean;
  onSynced: () => void;
}

export function MonzoConnect({ connected, onSynced }: Props) {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/monzo/sync", { method: "POST" });
      const data = await res.json() as { imported?: number; error?: string };
      if (res.status === 401 && data.error === "auth_required") {
        setLastResult("Session expired — please reconnect Monzo.");
      } else if (!res.ok) {
        setLastResult("Sync failed. Check connection.");
      } else {
        setLastResult(data.imported! > 0 ? `${data.imported} new transaction${data.imported === 1 ? "" : "s"} imported.` : "Up to date.");
        qc.invalidateQueries({ queryKey: ["monzo-accounts"] });
        qc.invalidateQueries({ queryKey: ["monzo-pending"] });
        onSynced();
      }
    } catch {
      setLastResult("Sync failed. Check connection.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    await fetch("/api/monzo/disconnect", { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["monzo-accounts"] });
    qc.invalidateQueries({ queryKey: ["monzo-pending"] });
    qc.invalidateQueries({ queryKey: ["monzo-connected"] });
    setDisconnecting(false);
  };

  if (!connected) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-stone-100 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-800">Connect Monzo</p>
          <p className="text-xs text-stone-400 mt-0.5">Sync transactions automatically.</p>
        </div>
        <a
          href="/api/monzo/auth"
          className="flex-shrink-0 text-xs font-semibold text-white bg-stone-800 hover:bg-stone-900 transition-colors px-3 py-2 rounded-full"
        >
          Connect →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-100">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-stone-800">Monzo connected</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors px-3 py-1.5 rounded-full disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync Now"}
          </button>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="text-xs font-semibold text-stone-400 hover:text-red-500 transition-colors px-2 py-1.5"
          >
            {disconnecting ? "…" : "Disconnect"}
          </button>
        </div>
      </div>
      {lastResult && (
        <p className="text-xs text-stone-400 mt-2">{lastResult}</p>
      )}
    </div>
  );
}

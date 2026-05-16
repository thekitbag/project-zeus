import { formatMoney } from "@/lib/money";
import type { MonzoAccount } from "@/db/schema";

export function AccountCard({ account }: { account: MonzoAccount }) {
  return (
    <div className="bg-stone-900 rounded-2xl p-4 flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold tracking-wide uppercase text-stone-500">{account.name}</p>
        <p className="text-xl font-bold text-white mt-0.5">{formatMoney(account.balancePence)}</p>
      </div>
      {account.lastSyncedAt && (
        <p className="text-[10px] text-stone-600 text-right">
          Synced<br />
          {new Date(account.lastSyncedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}

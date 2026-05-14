"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import type { Situation, SituationCategory } from "@/db/schema";
import { groupSituations, groupByMonth, toDateStr } from "@/lib/dates";
import { SituationCard } from "@/components/SituationCard";
import { AddSituationSheet } from "@/components/AddSituationSheet";

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 py-2 mt-4 first:mt-0">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-stone-400">
        {label}
      </span>
    </div>
  );
}

function SituationList({ situations, categories, todayStr }: {
  situations: Situation[];
  categories: SituationCategory[];
  todayStr: string;
}) {
  return (
    <div className="flex flex-col gap-2 px-4">
      {situations.map((s) => (
        <SituationCard key={s.id} situation={s} categories={categories} todayStr={todayStr} />
      ))}
    </div>
  );
}

export default function KeyDatesPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const todayStr = toDateStr(new Date());

  const { data: allSituations = [], isLoading: loadingSituations } = useQuery<Situation[]>({
    queryKey: ["situations"],
    queryFn: () => fetch("/api/situations").then((r) => r.json()),
  });

  const { data: categories = [] } = useQuery<SituationCategory[]>({
    queryKey: ["situation-categories"],
    queryFn: () => fetch("/api/situation-categories").then((r) => r.json()),
  });

  const groups = groupSituations(allSituations, todayStr);
  const upcomingByMonth = groupByMonth(groups.upcoming);
  const isEmpty = !loadingSituations && allSituations.length === 0;

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
            src="/mark_dressinggown.jpeg"
            alt="Mark Corrigan at his desk"
            fill
            className="object-cover object-center"
            sizes="(max-width: 512px) 100vw, 512px"
            priority
          />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Key Dates</h1>
            <p className="text-sm text-stone-400 mt-0.5 leading-relaxed">
              &ldquo;Do you mean the pizza coupon with &lsquo;sis mesg&rsquo; written with a burnt match?&rdquo;
            </p>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex-shrink-0 flex items-center gap-1.5 bg-amber-500 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-sm active:opacity-80 transition-opacity mt-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Situation
          </button>
        </div>
      </header>

      <div className="flex-1 pb-4">
        {loadingSituations ? (
          <div className="py-12 text-center text-stone-400 text-sm px-4">
            Scanning the horizon for incoming situations…
          </div>
        ) : isEmpty ? (
          <div className="py-12 text-center px-8">
            <p className="text-stone-500 text-sm font-medium">No known disruptions to domestic civilisation.</p>
            <p className="text-stone-300 text-xs mt-2">The horizon appears deceptively calm.</p>
          </div>
        ) : (
          <>
            {groups.today.length > 0 && (
              <>
                <SectionHeader label="Today" />
                <SituationList situations={groups.today} categories={categories} todayStr={todayStr} />
              </>
            )}

            {groups.tomorrow.length > 0 && (
              <>
                <SectionHeader label="Tomorrow" />
                <SituationList situations={groups.tomorrow} categories={categories} todayStr={todayStr} />
              </>
            )}

            {groups.thisWeek.length > 0 && (
              <>
                <SectionHeader label="This Week" />
                <SituationList situations={groups.thisWeek} categories={categories} todayStr={todayStr} />
              </>
            )}

            {groups.upcoming.length > 0 && (
              <>
                <SectionHeader label="Upcoming" />
                {upcomingByMonth.map(({ heading, items }) => (
                  <div key={heading}>
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-xs font-semibold text-stone-500">{heading}</span>
                    </div>
                    <SituationList situations={items} categories={categories} todayStr={todayStr} />
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      <AddSituationSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        categories={categories}
      />
    </div>
  );
}

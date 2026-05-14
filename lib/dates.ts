import type { Situation, SituationCategory } from "@/db/schema";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Parse YYYY-MM-DD as a local date (avoids UTC midnight shift) */
export function fromDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Sunday of the current Mon–Sun week */
function weekEnd(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  return addDays(d, day === 0 ? 0 : 7 - day);
}

export function formatDisplay(s: string): string {
  const d = fromDateStr(s);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function formatMonthHeading(s: string): string {
  const d = fromDateStr(s);
  return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

export function relativeDateLine(startStr: string, endStr: string | null | undefined, todayStr: string): string {
  const today = fromDateStr(todayStr);
  const start = fromDateStr(startStr);
  const diffDays = Math.round((start.getTime() - today.getTime()) / 86_400_000);

  const rel = diffDays === 0 ? "Today" : diffDays === 1 ? "Tomorrow" : `In ${diffDays} days`;
  const absStart = formatDisplay(startStr);

  if (endStr && endStr !== startStr) {
    return `${rel} · ${absStart} – ${formatDisplay(endStr)}`;
  }
  return `${rel} · ${absStart}`;
}

export interface SituationGroups {
  today: Situation[];
  tomorrow: Situation[];
  thisWeek: Situation[];
  upcoming: Situation[];
}

export function groupSituations(situations: Situation[], todayStr: string): SituationGroups {
  const today = fromDateStr(todayStr);
  const tomorrowStr = toDateStr(addDays(today, 1));
  const weekEndStr = toDateStr(weekEnd(today));

  return {
    today:     situations.filter(s => s.startDate === todayStr),
    tomorrow:  situations.filter(s => s.startDate === tomorrowStr),
    thisWeek:  situations.filter(s => s.startDate > tomorrowStr && s.startDate <= weekEndStr),
    upcoming:  situations.filter(s => s.startDate > weekEndStr),
  };
}

/** Group an array of situations by month heading for the UPCOMING section */
export function groupByMonth(situations: Situation[]): { heading: string; items: Situation[] }[] {
  const map = new Map<string, Situation[]>();
  for (const s of situations) {
    const heading = formatMonthHeading(s.startDate);
    const bucket = map.get(heading) ?? [];
    bucket.push(s);
    map.set(heading, bucket);
  }
  return Array.from(map.entries()).map(([heading, items]) => ({ heading, items }));
}

export function getCategoryById(categories: SituationCategory[], id: number): SituationCategory | undefined {
  return categories.find(c => c.id === id);
}

export type OrderUrgency = "normal" | "warning" | "urgent";

const WARNING_AFTER_MINUTES = 5;
const URGENT_AFTER_MINUTES = 10;

export function minutesSince(isoTimestamp: string, now: Date = new Date()): number {
  const elapsedMs = now.getTime() - new Date(isoTimestamp).getTime();
  return Math.max(0, Math.floor(elapsedMs / 60_000));
}

/** Destaque crescente conforme tempo de espera (docs/04 O-02). */
export function urgencyForMinutes(minutes: number): OrderUrgency {
  if (minutes >= URGENT_AFTER_MINUTES) return "urgent";
  if (minutes >= WARNING_AFTER_MINUTES) return "warning";
  return "normal";
}

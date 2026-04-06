import { db } from "@/lib/db";
import type { ActivityRecord } from "@/types/activity";

export async function recordActivity(
  record: Omit<ActivityRecord, "id" | "timestamp">
): Promise<void> {
  await db.activity.add({
    ...record,
    timestamp: Date.now(),
  });
}

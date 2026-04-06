import Dexie, { type EntityTable } from "dexie";
import type { ActivityRecord } from "@/types/activity";

export type { ActivityRecord };

class UmWalletDb extends Dexie {
  activity!: EntityTable<ActivityRecord, "id">;

  constructor() {
    super("UmWalletDb");
    this.version(1).stores({
      // indexed fields only — remaining fields are stored but not indexed
      activity: "++id, txHash, from, to, chainId, type, timestamp",
    });
  }
}

export const db = new UmWalletDb();

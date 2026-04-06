import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { ActivityRecord } from "@/types/activity";

// ── Mock Dexie db before importing the module under test ─────────────────────

const mockAdd = vi.fn().mockResolvedValue(1);

vi.mock("@/lib/db", () => ({
  db: {
    activity: {
      add: mockAdd,
    },
  },
}));

// Import AFTER mock is registered so the module gets the mocked db
const { recordActivity } = await import("@/lib/activity");

// ── Helpers ──────────────────────────────────────────────────────────────────

const BASE_RECORD: Omit<ActivityRecord, "id" | "timestamp"> = {
  txHash: "0xabc123",
  from: "0x1111111111111111111111111111111111111111",
  to: "0x2222222222222222222222222222222222222222",
  chainId: 1,
  type: "native",
};

// ── recordActivity ───────────────────────────────────────────────────────────

describe("recordActivity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockAdd.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("persists record with the current timestamp", async () => {
    const fakeNow = 1_700_000_000_000;
    vi.setSystemTime(fakeNow);

    await recordActivity(BASE_RECORD);

    expect(mockAdd).toHaveBeenCalledOnce();
    expect(mockAdd).toHaveBeenCalledWith({
      ...BASE_RECORD,
      timestamp: fakeNow,
    });
  });

  test("timestamp changes between calls", async () => {
    vi.setSystemTime(1_000_000);
    await recordActivity(BASE_RECORD);
    const first = mockAdd.mock.calls[0][0] as ActivityRecord;

    vi.setSystemTime(2_000_000);
    await recordActivity(BASE_RECORD);
    const second = mockAdd.mock.calls[1][0] as ActivityRecord;

    expect(first.timestamp).toBe(1_000_000);
    expect(second.timestamp).toBe(2_000_000);
  });

  test("does not add an id field (auto-incremented by Dexie)", async () => {
    await recordActivity(BASE_RECORD);
    const saved = mockAdd.mock.calls[0][0] as ActivityRecord;
    expect(saved).not.toHaveProperty("id");
  });

  test("passes through all optional native fields", async () => {
    vi.setSystemTime(0);
    const record: Omit<ActivityRecord, "id" | "timestamp"> = {
      ...BASE_RECORD,
      nativeValue: "1000000000000000000",
      gasPrice: "20000000000",
      ensName: "vitalik.eth",
    };

    await recordActivity(record);

    expect(mockAdd).toHaveBeenCalledWith({
      ...record,
      timestamp: 0,
    });
  });

  test("passes through all optional ERC-20 fields", async () => {
    vi.setSystemTime(0);
    const record: Omit<ActivityRecord, "id" | "timestamp"> = {
      txHash: "0xdef456",
      from: "0x1111111111111111111111111111111111111111",
      to: "0x2222222222222222222222222222222222222222",
      chainId: 137,
      type: "erc20",
      tokenValue: "1000000",
      tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      tokenSymbol: "USDC",
      tokenDecimals: 6,
      gasPrice: "30000000000",
    };

    await recordActivity(record);

    expect(mockAdd).toHaveBeenCalledWith({ ...record, timestamp: 0 });
  });

  test("passes through all optional ERC-721 fields", async () => {
    vi.setSystemTime(0);
    const record: Omit<ActivityRecord, "id" | "timestamp"> = {
      txHash: "0xfed789",
      from: "0x1111111111111111111111111111111111111111",
      to: "0x2222222222222222222222222222222222222222",
      chainId: 8453,
      type: "erc721",
      nftId: "42",
      tokenAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
      tokenSymbol: "BAYC",
    };

    await recordActivity(record);

    expect(mockAdd).toHaveBeenCalledWith({ ...record, timestamp: 0 });
  });

  test.each([
    ["native", "native" as const],
    ["erc20", "erc20" as const],
    ["erc721", "erc721" as const],
    ["raw", "raw" as const],
  ])("accepts type '%s'", async (_label, type) => {
    vi.setSystemTime(0);
    await recordActivity({ ...BASE_RECORD, type });
    expect(mockAdd).toHaveBeenCalledOnce();
    expect((mockAdd.mock.calls[0][0] as ActivityRecord).type).toBe(type);
  });

  test("returns void (does not expose the Dexie key)", async () => {
    vi.setSystemTime(0);
    const result = await recordActivity(BASE_RECORD);
    expect(result).toBeUndefined();
  });

  test("propagates db errors", async () => {
    mockAdd.mockRejectedValueOnce(new Error("IndexedDB quota exceeded"));
    await expect(recordActivity(BASE_RECORD)).rejects.toThrow("IndexedDB quota exceeded");
  });
});

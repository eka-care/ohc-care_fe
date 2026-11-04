import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clearPendingReturn,
  loadPendingReturn,
  savePendingReturn,
} from "../src/pendingReturn.ts";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (i) => [...items.keys()][i] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  };
}

const ret = { docUrls: ["http://scribe/a.jwe"], sessionId: "s-1" };

describe("pendingReturn", () => {
  it("returns what was saved for that encounter", () => {
    const storage = memoryStorage();
    savePendingReturn(storage, "enc-1", ret);
    assert.deepEqual(loadPendingReturn(storage, "enc-1"), ret);
  });

  it("returns nothing for another encounter", () => {
    const storage = memoryStorage();
    savePendingReturn(storage, "enc-1", ret);
    assert.equal(loadPendingReturn(storage, "enc-2"), undefined);
  });

  it("returns nothing after clear", () => {
    const storage = memoryStorage();
    savePendingReturn(storage, "enc-1", ret);
    clearPendingReturn(storage, "enc-1");
    assert.equal(loadPendingReturn(storage, "enc-1"), undefined);
  });
});

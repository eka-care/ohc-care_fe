import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CareApiError } from "../src/api.ts";
import { KeyMissingError, ScribeNote } from "../src/crypto.ts";
import { fileScribeNotes } from "../src/fileNotes.ts";

const ret = {
  docUrls: ["http://scribe/a.jwe", "http://scribe/b.jwe"],
  sessionId: "s-1",
};
const notes: Record<string, ScribeNote> = {
  "http://scribe/a.jwe": { bundle: { id: "b1" }, kid: "k1" },
  "http://scribe/b.jwe": { bundle: { id: "b2" }, kid: "k2" },
};

function fakeDeps(post: (n: number) => Promise<unknown> = async () => ({})) {
  const posted: unknown[][] = [];
  const deleted: string[] = [];
  return {
    posted,
    deleted,
    deps: {
      fetchNote: async (url: string) => notes[url],
      post: async (encounterId: string, body: unknown) => {
        posted.push([encounterId, body]);
        return post(posted.length);
      },
      deleteKey: async (kid: string) => void deleted.push(kid),
    },
  };
}

describe("fileScribeNotes", () => {
  it("posts each bundle with the session id, then deletes each key", async () => {
    const { posted, deleted, deps } = fakeDeps();
    await fileScribeNotes(ret, "enc-1", deps);
    assert.deepEqual(posted, [
      ["enc-1", { bundle: { id: "b1" }, session_id: "s-1" }],
      ["enc-1", { bundle: { id: "b2" }, session_id: "s-1" }],
    ]);
    assert.deepEqual(deleted, ["k1", "k2"]);
  });

  it("deletes no key when the second post fails", async () => {
    const { deleted, deps } = fakeDeps(async (n) => {
      if (n === 2) throw new CareApiError("x", 500, {});
    });
    await assert.rejects(fileScribeNotes(ret, "enc-1", deps), {
      status: 500,
    });
    assert.deepEqual(deleted, []);
  });

  it("rejects with the 409 from the backend", async () => {
    const { deps } = fakeDeps(async () => {
      throw new CareApiError("x", 409, {});
    });
    await assert.rejects(fileScribeNotes(ret, "enc-1", deps), {
      status: 409,
    });
  });

  it("posts nothing when a note can't be decrypted", async () => {
    const { posted, deps } = fakeDeps();
    deps.fetchNote = async () => {
      throw new KeyMissingError();
    };
    await assert.rejects(fileScribeNotes(ret, "enc-1", deps), KeyMissingError);
    assert.deepEqual(posted, []);
  });
});

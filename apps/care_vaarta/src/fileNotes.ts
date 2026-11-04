import { careApi } from "@/api";
import { fetchScribeNote } from "@/crypto";
import { ScribeReturn } from "@/handoff";
import { deleteKey } from "@/keyStore";

export interface FileNotesDeps {
  fetchNote: typeof fetchScribeNote;
  post: typeof careApi.fileScribeFhir;
  deleteKey: (kid: string) => Promise<unknown>;
}

const realDeps: FileNotesDeps = {
  fetchNote: fetchScribeNote,
  post: careApi.fileScribeFhir,
  deleteKey,
};

// 1. decrypt every note  2. file each one  3. drop the keys, only once all are filed so a retry can decrypt again
export async function fileScribeNotes(
  ret: ScribeReturn,
  encounterId: string,
  deps: FileNotesDeps = realDeps,
) {
  const notes = await Promise.all(ret.docUrls.map(deps.fetchNote));
  for (const note of notes) {
    await deps.post(encounterId, {
      bundle: note.bundle,
      session_id: ret.sessionId,
    });
  }
  await Promise.all(
    notes.flatMap((n) => (n.kid ? [deps.deleteKey(n.kid)] : [])),
  );
}

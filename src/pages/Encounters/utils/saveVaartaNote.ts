import mutate from "@/Utils/request/mutate";
import { callApi } from "@/Utils/request/query";
import threadApi from "@/types/notes/threadApi";

// Notes sent back from Vaarta collect in one thread per encounter.
export const VAARTA_THREAD_TITLE = "Vaarta Notes";

export async function saveVaartaNote(
  patientId: string,
  encounterId: string,
  note: string,
): Promise<void> {
  const threads = await callApi(threadApi.list, {
    pathParams: { patientId },
    queryParams: { encounter: encounterId },
  });
  const threadId =
    threads.results.find((thread) => thread.title === VAARTA_THREAD_TITLE)
      ?.id ??
    (
      await mutate(threadApi.create, { pathParams: { patientId } })({
        title: VAARTA_THREAD_TITLE,
        encounter: encounterId,
      })
    ).id;
  await mutate(threadApi.createNote, {
    pathParams: { patientId, threadId },
  })({ message: note });
}

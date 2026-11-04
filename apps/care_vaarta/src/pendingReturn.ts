import { ScribeReturn } from "@/handoff";

// The return params are stripped from the address bar, so a reload or a retry reads them from here.
const keyFor = (encounterId: string) => `care_vaarta:return:${encounterId}`;

export function savePendingReturn(
  storage: Storage,
  encounterId: string,
  ret: ScribeReturn,
) {
  storage.setItem(keyFor(encounterId), JSON.stringify(ret));
}

export function loadPendingReturn(
  storage: Storage,
  encounterId: string,
): ScribeReturn | undefined {
  const raw = storage.getItem(keyFor(encounterId));
  return raw ? (JSON.parse(raw) as ScribeReturn) : undefined;
}

export function clearPendingReturn(storage: Storage, encounterId: string) {
  storage.removeItem(keyFor(encounterId));
}

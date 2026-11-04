import { navigate } from "raviger";
import { useCallback, useEffect, useRef, useState } from "react";

import { CareApiError } from "@/api";
import { config } from "@/config";
import { KeyMissingError } from "@/crypto";
import { fileScribeNotes } from "@/fileNotes";
import { ScribeReturn, readReturn, stripReturnParams } from "@/handoff";
import {
  clearPendingReturn,
  loadPendingReturn,
  savePendingReturn,
} from "@/pendingReturn";
import { strings } from "@/strings";

interface Props {
  facilityId: string;
  patientId: string;
  encounterId: string;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: strings.noteRejected,
  403: strings.noPermission,
  409: strings.filedElsewhere,
};

function messageFor(err: unknown) {
  if (err instanceof KeyMissingError) return strings.keyMissing;
  if (err instanceof CareApiError) {
    return STATUS_MESSAGES[err.status] ?? strings.filingFailed;
  }
  return strings.filingFailed;
}

// The scribe's Publish opens this page with a doc_url per note; each is filed on the encounter and the doctor goes back.
export function VaartaReturnPage({
  facilityId,
  patientId,
  encounterId,
}: Props) {
  const encounterPath = `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}`;
  const [ret, setRet] = useState<ScribeReturn>();
  const [error, setError] = useState("");
  const started = useRef(false);

  const file = useCallback(
    async (toFile: ScribeReturn) => {
      setError("");
      try {
        await fileScribeNotes(toFile, encounterId);
        clearPendingReturn(sessionStorage, encounterId);
        navigate(`${encounterPath}/updates`, { replace: true });
      } catch (err) {
        console.error("file scribe notes", err);
        setError(messageFor(err));
      }
    },
    [encounterId, encounterPath],
  );

  // The params are stripped from the address bar straight away; a reload reads them back from sessionStorage.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fromUrl = readReturn(
      window.location.search,
      new URL(config.vaartaUrl).origin,
    );
    if (fromUrl.docUrls.length) {
      savePendingReturn(sessionStorage, encounterId, fromUrl);
    }
    window.history.replaceState(
      null,
      "",
      stripReturnParams(window.location.href),
    );
    const toFile = fromUrl.docUrls.length
      ? fromUrl
      : loadPendingReturn(sessionStorage, encounterId);
    if (!toFile) {
      setError(strings.noDocUrl);
      return;
    }
    setRet(toFile);
    file(toFile);
  }, [encounterId, file]);

  return (
    <div className="mx-auto mt-16 max-w-md space-y-4 text-center text-sm">
      <p className={error ? "text-red-600" : "text-gray-600"}>
        {error || strings.filing}
      </p>
      {error && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            className="rounded-md border border-gray-300 px-3 py-1.5"
            onClick={() => navigate(`${encounterPath}/updates`)}
          >
            {strings.backToEncounter}
          </button>
          {ret && (
            <button
              type="button"
              className="rounded-md bg-primary-700 px-3 py-1.5 text-white"
              onClick={() => file(ret)}
            >
              {strings.retry}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

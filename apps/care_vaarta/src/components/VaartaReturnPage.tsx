import { navigate } from "raviger";
import { useEffect, useRef, useState } from "react";

import { MedicinePick } from "@/components/MedicinePick";
import { config } from "@/config";
import { KeyMissingError } from "@/crypto";
import { readDocUrls, stripReturnParams } from "@/handoff";
import {
  NoMedicinesError,
  RxQuestionnaireMissingError,
  ScribeRx,
  loadScribeRx,
  saveRxDraft,
} from "@/openRxDraft";
import { strings } from "@/strings";
import { Code } from "@/types";

interface Props {
  facilityId: string;
  patientId: string;
  encounterId: string;
}

// undefined: still to choose; null: left out.
type Pick = Code | null | undefined;

function messageFor(err: unknown) {
  if (err instanceof KeyMissingError) return strings.keyMissing;
  if (err instanceof NoMedicinesError) return strings.noMedicines;
  if (err instanceof RxQuestionnaireMissingError) {
    return strings.questionnaireMissing(config.rxQuestionnaireSlug);
  }
  return strings.loadFailed;
}

// The scribe's Publish opens this page with a doc_url per note; the doctor codes its medicines here,
// then CARE's own Rx pad opens on a draft holding them.
export function VaartaReturnPage({
  facilityId,
  patientId,
  encounterId,
}: Props) {
  const encounterPath = `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}`;
  const [rx, setRx] = useState<ScribeRx>();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const started = useRef(false);

  // The doc_urls are read once: they are stripped from the address bar straight away.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const docUrls = readDocUrls(
      window.location.search,
      new URL(config.vaartaUrl).origin,
    );
    window.history.replaceState(
      null,
      "",
      stripReturnParams(window.location.href),
    );
    if (!docUrls.length) {
      setError(strings.noDocUrl);
      return;
    }
    loadScribeRx(docUrls, encounterId)
      .then((loaded) => {
        setRx(loaded);
        setPicks(
          loaded.meds.map((m) =>
            m.medication.code ? m.medication : undefined,
          ),
        );
      })
      .catch((err) => {
        console.error("load scribe note", err);
        setError(messageFor(err));
      });
  }, [encounterId]);

  const save = async () => {
    if (!rx) return;
    setSaving(true);
    setError("");
    try {
      const draftId = await saveRxDraft(rx, picks as (Code | null)[], {
        patientId,
        encounterId,
      });
      navigate(
        `${encounterPath}/questionnaire/${rx.questionnaire.slug}?continue_draft=${draftId}`,
        { replace: true },
      );
    } catch (err) {
      console.error("save scribe rx draft", err);
      setError(strings.saveFailed);
      setSaving(false);
    }
  };

  if (!rx) {
    return (
      <div className="mx-auto mt-16 max-w-md space-y-4 text-center text-sm">
        <p className={error ? "text-red-600" : "text-gray-600"}>
          {error || strings.loading}
        </p>
        {error && (
          <button
            type="button"
            className="rounded-md border border-gray-300 px-3 py-1.5"
            onClick={() => navigate(`${encounterPath}/updates`)}
          >
            {strings.backToEncounter}
          </button>
        )}
      </div>
    );
  }

  const ready = picks.every((p) => p !== undefined) && picks.some(Boolean);
  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-4 px-4">
      <div>
        <h1 className="text-lg font-semibold">{strings.reviewTitle}</h1>
        <p className="text-sm text-gray-600">{strings.reviewHint}</p>
      </div>
      <ul className="space-y-2">
        {rx.meds.map((med, i) => (
          <MedicinePick
            key={i}
            scribeName={med.medication.display}
            todo={rx.todo[i]}
            pick={picks[i]}
            onPick={(pick) =>
              setPicks((prev) => prev.map((p, j) => (j === i ? pick : p)))
            }
          />
        ))}
      </ul>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          onClick={() => navigate(`${encounterPath}/updates`)}
        >
          {strings.cancel}
        </button>
        <button
          type="button"
          disabled={!ready || saving}
          className="rounded-md bg-primary-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          onClick={save}
        >
          {saving ? strings.saving : strings.continueToRxPad}
        </button>
      </div>
    </div>
  );
}

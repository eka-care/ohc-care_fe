import { useRef, useState } from "react";

import { config } from "@/config";
import { createPublicKey } from "@/crypto";
import { buildHandoffUrl } from "@/handoff";
import { LANGUAGES, TEMPLATES } from "@/scribeOptions";
import { strings } from "@/strings";
import { Encounter } from "@/types";

// CARE's own labels for its encounter classes.
const ENCOUNTER_CLASS_LABELS: Record<string, string> = {
  amb: "Outpatient",
  imp: "Inpatient",
  emer: "Emergency",
  obsenc: "Observation",
  vr: "Virtual",
  hh: "Home Health",
};

interface Props {
  encounter: Encounter;
  className?: string;
}

export default function VaartaButton({ encounter, className }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [language, setLanguage] = useState(LANGUAGES[0].code);
  const [template, setTemplate] = useState(TEMPLATES[0].id);
  const [error, setError] = useState("");

  // Same tab: Vaarta sends this tab back to callback_url on publish, so the doctor ends where they began.
  const start = async () => {
    try {
      const publicKey = await createPublicKey();
      window.location.assign(
        buildHandoffUrl(config.vaartaUrl, {
          encounterId: encounter.id,
          title: `${encounter.patient.name} · ${ENCOUNTER_CLASS_LABELS[encounter.encounter_class] ?? encounter.encounter_class}`,
          attendees: [
            `${encounter.patient.name} (patient)`,
            ...encounter.care_team.map(({ member }) =>
              `${member.first_name} ${member.last_name}`.trim(),
            ),
          ].join(", "),
          languageHint: language,
          templates: template,
          callbackUrl: `${window.location.origin}/facility/${encounter.facility.id}/patient/${encounter.patient.id}/encounter/${encounter.id}/vaarta/return`,
          publicKey,
        }),
      );
    } catch (err) {
      console.error("start vaarta handoff", err);
      setError(strings.handoffFailed);
    }
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => dialog.current?.showModal()}
      >
        {strings.takeNotes}
      </button>
      <dialog
        ref={dialog}
        className="m-auto rounded-lg border border-gray-200 p-4 shadow-lg backdrop:bg-black/30"
      >
        <div className="flex w-72 flex-col gap-3 text-sm">
          <p className="font-semibold">{strings.takeNotes}</p>
          <label className="flex flex-col gap-1">
            {strings.language}
            <select
              className="rounded-md border border-gray-300 px-2 py-1.5"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            {strings.template}
            <select
              className="rounded-md border border-gray-300 px-2 py-1.5"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            >
              {TEMPLATES.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.label}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 px-3 py-1.5"
              onClick={() => dialog.current?.close()}
            >
              {strings.cancel}
            </button>
            <button
              type="button"
              className="rounded-md bg-primary-700 px-3 py-1.5 text-white"
              onClick={start}
            >
              {strings.start}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

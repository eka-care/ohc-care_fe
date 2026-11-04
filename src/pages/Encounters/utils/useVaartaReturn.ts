import careConfig from "@careConfig";
import { useSetAtom } from "jotai";
import { navigate } from "raviger";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import useAuthUser from "@/hooks/useAuthUser";

import { questionnairePrefillAtom } from "@/atoms/questionnairePrefillAtom";
import {
  VaartaKeyMissingError,
  deleteVaartaKey,
  fetchVaartaBundle,
} from "@/pages/Encounters/utils/vaartaCrypto";
import {
  readVaartaDocUrls,
  stripVaartaReturn,
} from "@/pages/Encounters/utils/vaartaHandoff";
import {
  RX_PAD_SLUG,
  toRxPadValues,
} from "@/pages/Encounters/utils/vaartaRxPad";
import { convertFHIRToCare } from "@/Utils/fhir-to-care";

interface Args {
  facilityId?: string;
  patientId: string;
  encounterId: string;
}

// Vaarta's Publish opens this encounter with a doc_url per note; open the Rx pad filled from them.
export function useVaartaReturn({ facilityId, patientId, encounterId }: Args) {
  const { t } = useTranslation();
  const authUser = useAuthUser();
  const setPrefill = useSetAtom(questionnairePrefillAtom);

  useEffect(() => {
    const docUrls = readVaartaDocUrls(
      window.location.search,
      new URL(careConfig.vaartaUrl).origin,
    );
    if (!docUrls.length || !facilityId || !encounterId) return;
    window.history.replaceState(
      null,
      "",
      stripVaartaReturn(window.location.href),
    );

    openPrefilledRxPad(docUrls)
      .then((count) => {
        if (!count) toast.info(t("vaarta_note_no_medications"));
      })
      .catch((err) =>
        toast.error(
          err instanceof VaartaKeyMissingError
            ? t("vaarta_note_key_missing")
            : t("vaarta_note_load_failed"),
        ),
      );

    async function openPrefilledRxPad(urls: string[]) {
      const notes = await Promise.all(urls.map(fetchVaartaBundle));
      await Promise.all(
        notes.flatMap((n) => (n.kid ? [deleteVaartaKey(n.kid)] : [])),
      );
      const care = notes.map((n) =>
        convertFHIRToCare(n.bundle, { encounter: encounterId }),
      );
      const values = toRxPadValues(care, encounterId, authUser);
      if (!values.length) return 0;
      const uncoded = care.flatMap((c) =>
        c.review.filter((r) => r.type === "medication_request"),
      ).length;
      if (uncoded)
        toast.warning(t("vaarta_note_needs_review", { count: uncoded }));
      setPrefill({ encounterId, values });
      navigate(
        `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/questionnaire/${RX_PAD_SLUG}`,
      );
      return values.length;
    }
  }, [facilityId, patientId, encounterId, authUser, setPrefill, t]);
}

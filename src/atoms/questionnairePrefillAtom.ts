import { atom } from "jotai";

import { ResponseValue } from "@/types/questionnaire/form";

// Kept in memory only: it holds clinical data and is read once by the next form that opens.
export interface QuestionnairePrefill {
  encounterId: string;
  values: ResponseValue[];
}

export const questionnairePrefillAtom = atom<QuestionnairePrefill | null>(null);

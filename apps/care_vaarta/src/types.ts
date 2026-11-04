// The slices of CARE's API shapes this app reads or writes.
export interface Code {
  system: string;
  code: string;
  display: string;
}

export interface UserMinimal {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
}

export interface CareTeamMember {
  member: UserMinimal;
}

export interface Encounter {
  id: string;
  status: string;
  encounter_class: string;
  facility: { id: string };
  patient: { id: string; name: string };
  care_team: CareTeamMember[];
}

export interface Question {
  id: string;
  link_id: string;
  type: string;
  structured_type?: string | null;
  questions?: Question[];
}

export interface Questionnaire {
  id: string;
  slug: string;
  questions: Question[];
}

export interface ResponseValue {
  type: string;
  value: unknown;
}

// CARE's QuestionnaireForm state; a draft's response_dump holds it as questionnaireResponses.
export interface QuestionnaireFormState {
  questionnaire: Questionnaire;
  responses: {
    question_id: string;
    link_id: string;
    structured_type: string | null;
    values: ResponseValue[];
  }[];
  errors: never[];
}

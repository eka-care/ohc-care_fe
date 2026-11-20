// The slices of CARE's API shapes this app reads or writes.
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

// care_scribe's facility extension; the scribe needs the HFR ID to start a session.
export const FACILITY_EXTENSION = "care_scribe__facility";

export interface Facility {
  id: string;
  extensions?: { [FACILITY_EXTENSION]?: { hfr_id?: string } };
}

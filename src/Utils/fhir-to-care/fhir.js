export function resourcesOf(bundle, resourceType) {
  return (bundle.entry ?? [])
    .map((entry) => entry.resource)
    .filter((resource) => resource?.resourceType === resourceType);
}

export function textOf(concept) {
  return (
    concept?.text ?? concept?.coding?.find((c) => c.display)?.display ?? ""
  );
}

// CARE stores a Coding with system, code and display; an uncoded concept keeps only its text.
export function toCode(concept) {
  const coding = concept?.coding?.find((c) => c.system && c.code);
  const display = coding?.display ?? textOf(concept);
  if (!coding) return { system: "", code: "", display };
  return { system: coding.system, code: coding.code, display };
}

export function isCoded(code) {
  return Boolean(code?.system && code?.code);
}

export function codeOf(concept) {
  return concept?.coding?.find((c) => c.code)?.code;
}

export function categoryCodes(resource) {
  return (resource.category ?? []).flatMap((concept) => [
    ...(concept.coding ?? []).map((c) => c.code),
    concept.text,
  ]);
}

export function notesOf(resource) {
  const text = (resource.note ?? [])
    .map((n) => n.text)
    .filter(Boolean)
    .join("\n");
  return text || undefined;
}

// FHIR codes are kebab-case; CARE's enums use snake_case.
export function snake(value) {
  return value?.replace(/-/g, "_");
}

export function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

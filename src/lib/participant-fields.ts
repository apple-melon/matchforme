/** 대회에서 참가자에게 요청할 수 있는 추가 항목 (이름은 항상 필수) */
export const PARTICIPANT_FIELD_OPTIONS = [
  { key: "affiliation", label: "소속", unit: null as null },
  { key: "weightKg", label: "몸무게 (kg)", unit: "kg" as const },
  { key: "heightCm", label: "키 (cm)", unit: "cm" as const },
  { key: "age", label: "나이 (만)", unit: "세" as const },
] as const;

export type ParticipantFieldKey = (typeof PARTICIPANT_FIELD_OPTIONS)[number]["key"];

const ALLOWED = new Set(PARTICIPANT_FIELD_OPTIONS.map((o) => o.key));

export function parseCollectedFieldsJson(raw: string | null | undefined): ParticipantFieldKey[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is ParticipantFieldKey => typeof x === "string" && ALLOWED.has(x as ParticipantFieldKey));
  } catch {
    return [];
  }
}

export function serializeCollectedFields(fields: ParticipantFieldKey[]): string {
  return JSON.stringify([...new Set(fields)]);
}

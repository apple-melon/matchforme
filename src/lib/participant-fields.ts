/** 대회에서 참가자에게 요청할 수 있는 추가 항목 */
export const PARTICIPANT_FIELD_OPTIONS = [
  { key: "weightKg", label: "몸무게 (kg)", unit: "kg" as const },
  { key: "heightCm", label: "키 (cm)", unit: "cm" as const },
  { key: "age", label: "나이 (만)", unit: "세" as const },
] as const;

export type ParticipantFieldKey = (typeof PARTICIPANT_FIELD_OPTIONS)[number]["key"];

export function parseCollectedFieldsJson(raw: string | null | undefined): ParticipantFieldKey[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    const allowed = new Set(PARTICIPANT_FIELD_OPTIONS.map((o) => o.key));
    return arr.filter((x): x is ParticipantFieldKey => typeof x === "string" && allowed.has(x as ParticipantFieldKey));
  } catch {
    return [];
  }
}

export function serializeCollectedFields(fields: ParticipantFieldKey[]): string {
  return JSON.stringify([...new Set(fields)]);
}

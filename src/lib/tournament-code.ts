/** 6자리 숫자 참가 코드 (100000–999999) */
export function randomNumericTournamentCode(): string {
  return String(100000 + Math.floor(Math.random() * 900000));
}

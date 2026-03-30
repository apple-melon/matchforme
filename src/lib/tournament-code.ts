const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomTournamentCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)]!;
  }
  return out;
}

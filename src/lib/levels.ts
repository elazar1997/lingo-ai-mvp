// Spanish levels a learner can pick. The database also allows "elementary", which the
// picker shows as beginner, so older profiles keep working.
export const LEVELS = [
  { id: "beginner", labelHe: "מתחיל", hintHe: "לאט, מילים בסיסיות, עזרה בעברית" },
  { id: "intermediate", labelHe: "בינוני", hintHe: "קצב רגיל, משפטים פשוטים" },
  { id: "advanced", labelHe: "מתקדם", hintHe: "שיחה טבעית ומהירה" },
] as const;

export type LevelId = (typeof LEVELS)[number]["id"];

export function isLevelId(value: unknown): value is LevelId {
  return LEVELS.some((l) => l.id === value);
}

export function pickerLevel(dbLevel: string | null | undefined): LevelId {
  return isLevelId(dbLevel) ? dbLevel : "beginner";
}

// Onboarding choices shown to the learner. The ids match the database checks on
// profiles.goal and profiles.interests.

export const GOALS = [
  { id: "travel", labelHe: "טיולים", emoji: "✈️" },
  { id: "business", labelHe: "עבודה ועסקים", emoji: "💼" },
  { id: "studies", labelHe: "לימודים", emoji: "🎓" },
  { id: "relocation", labelHe: "רילוקיישן", emoji: "🏡" },
  { id: "hobby", labelHe: "סתם בשביל הכיף", emoji: "🎉" },
] as const;
export type GoalId = (typeof GOALS)[number]["id"] | "other";

export const INTERESTS = [
  { id: "food", labelHe: "אוכל" },
  { id: "music", labelHe: "מוזיקה" },
  { id: "sport", labelHe: "ספורט" },
  { id: "movies", labelHe: "סרטים וסדרות" },
  { id: "tech", labelHe: "טכנולוגיה" },
  { id: "nature", labelHe: "טבע" },
  { id: "art", labelHe: "אמנות ועיצוב" },
  { id: "family", labelHe: "משפחה וחברים" },
  { id: "travel", labelHe: "טיולים" },
  { id: "fashion", labelHe: "אופנה" },
] as const;
export type InterestId = (typeof INTERESTS)[number]["id"];
export const MAX_INTERESTS = 3;

export const DAILY_GOALS = [
  { minutes: 5, labelHe: "קליל", hintHe: "שיעור אחד ביום" },
  { minutes: 10, labelHe: "רציני", hintHe: "שניים-שלושה שיעורים" },
  { minutes: 15, labelHe: "אינטנסיבי", hintHe: "כל הדקות של היום" },
] as const;

export function isGoalId(v: unknown): v is GoalId {
  return v === "other" || GOALS.some((g) => g.id === v);
}

export function isInterestId(v: unknown): v is InterestId {
  return INTERESTS.some((i) => i.id === v);
}

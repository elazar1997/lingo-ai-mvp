import type { Lesson } from "@/content/path-es";

// Pure helpers for lesson missions: which target words the learner said, and the stars.
// Used live on the call screen and again on the server after the call.

// Lowercase, no accents, letters and digits only, single spaces.
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Indexes of the lesson's target words found in what the learner said.
export function wordsSaid(lesson: Lesson, learnerTexts: string[]): number[] {
  const text = ` ${normalize(learnerTexts.join(" "))} `;
  return lesson.words.flatMap((w, i) => (w.forms.some((f) => text.includes(` ${normalize(f)} `)) ? [i] : []));
}

export const STAR_XP = 20;

// 0 = not passed. 1 = enough words and the mission done, 2 = every word,
// 3 = every word with at most one mistake.
export function lessonStars(lesson: Lesson, said: number, goalMet: boolean, mistakes: number): number {
  if (!goalMet || said < lesson.need) return 0;
  if (said < lesson.words.length) return 1;
  return mistakes <= 1 ? 3 : 2;
}

// Bonus XP only for stars beyond the best earlier result, so replays can't farm XP.
export function lessonBonusXp(stars: number, previousBest: number): number {
  return Math.max(0, stars - previousBest) * STAR_XP;
}

export type LessonState = "done" | "current" | "open" | "locked";

// Beginners unlock lessons in order; higher levels have every lesson open.
export function lessonStates(
  lessons: Lesson[],
  stars: Record<string, number>,
  sequential: boolean,
): LessonState[] {
  let currentGiven = false;
  return lessons.map((l, i) => {
    if ((stars[l.id] ?? 0) > 0) return "done";
    const reachable = !sequential || i === 0 || (stars[lessons[i - 1].id] ?? 0) > 0;
    if (!reachable) return "locked";
    if (currentGiven) return "open";
    currentGiven = true;
    return "current";
  });
}

export function isUnlocked(lessons: Lesson[], id: string, stars: Record<string, number>, sequential: boolean) {
  const i = lessons.findIndex((l) => l.id === id);
  if (i === -1) return false;
  return lessonStates(lessons, stars, sequential)[i] !== "locked";
}

import { QUIZ_ES, type QuizQuestion } from "@/content/placement-es";
import type { LevelId } from "@/lib/levels";

// Adaptive placement quiz. Two right answers in a row move up a band; two wrong answers in
// the same band end the quiz. The level comes from the highest band passed, and when in
// doubt it stays low: passing bands 1-2 is beginner, 3-4 intermediate, all 5 advanced.

export const MAX_QUESTIONS = 10;
export const TOP_BAND = 5;

export type QuizState = {
  band: number;
  /** Highest band passed (0 = none). */
  passed: number;
  /** Right answers in a row in this band. */
  streak: number;
  /** Wrong answers in this band. */
  wrong: number;
  asked: string[];
  done: boolean;
};

export function startQuiz(): QuizState {
  return { band: 1, passed: 0, streak: 0, wrong: 0, asked: [], done: false };
}

export function nextQuestion(state: QuizState, questions: QuizQuestion[] = QUIZ_ES): QuizQuestion | null {
  if (state.done) return null;
  return questions.find((q) => q.band === state.band && !state.asked.includes(q.id)) ?? null;
}

export function answerQuiz(state: QuizState, questionId: string, correct: boolean, questions: QuizQuestion[] = QUIZ_ES): QuizState {
  const asked = [...state.asked, questionId];
  let { band, passed, streak, wrong } = state;
  let done = false;

  if (correct) {
    streak += 1;
    if (streak >= 2) {
      passed = band;
      if (band >= TOP_BAND) done = true;
      else {
        band += 1;
        streak = 0;
        wrong = 0;
      }
    }
  } else {
    streak = 0;
    wrong += 1;
    if (wrong >= 2) done = true;
  }

  const next: QuizState = { band, passed, streak, wrong, asked, done };
  if (!done && (asked.length >= MAX_QUESTIONS || !nextQuestion(next, questions))) next.done = true;
  return next;
}

export function quizLevel(state: Pick<QuizState, "passed">): LevelId {
  if (state.passed >= TOP_BAND) return "advanced";
  if (state.passed >= 3) return "intermediate";
  return "beginner";
}

/** Options in a stable shuffled order (same on server and client), with the answer's index. */
export function shuffledOptions(q: QuizQuestion): { options: string[]; answer: number } {
  let seed = 0;
  for (const ch of q.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = (seed >>> 16) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { options: order.map((i) => q.options[i]), answer: order.indexOf(0) };
}

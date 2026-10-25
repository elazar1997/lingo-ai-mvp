import { describe, expect, it } from "vitest";
import { BAND_TITLE_HE, QUIZ_ES } from "@/content/placement-es";
import { MAX_QUESTIONS, answerQuiz, nextQuestion, quizLevel, shuffledOptions, startQuiz } from "./placement";

function run(answers: boolean[]) {
  let state = startQuiz();
  for (const correct of answers) {
    const q = nextQuestion(state);
    if (!q) break;
    state = answerQuiz(state, q.id, correct);
  }
  return state;
}

describe("placement quiz", () => {
  it("has four questions with four distinct options in every band", () => {
    for (const band of [1, 2, 3, 4, 5] as const) {
      expect(QUIZ_ES.filter((q) => q.band === band)).toHaveLength(4);
      expect(BAND_TITLE_HE[band]).toBeTruthy();
    }
    for (const q of QUIZ_ES) expect(new Set(q.options).size).toBe(4);
    expect(new Set(QUIZ_ES.map((q) => q.id)).size).toBe(QUIZ_ES.length);
  });

  it("ends early for a learner who knows nothing", () => {
    const state = run([false, false]);
    expect(state.done).toBe(true);
    expect(state.asked).toHaveLength(2);
    expect(quizLevel(state)).toBe("beginner");
  });

  it("moves up a band after two right answers in a row", () => {
    const state = run([true, true]);
    expect(state.band).toBe(2);
    expect(state.passed).toBe(1);
    expect(nextQuestion(state)?.band).toBe(2);
  });

  it("does not move up on right answers that are not in a row", () => {
    const state = run([true, false, true]);
    expect(state.band).toBe(1);
    expect(state.done).toBe(false);
  });

  it("places someone who stops at the sentence band as beginner", () => {
    expect(quizLevel(run([true, true, true, true, false, false]))).toBe("beginner");
  });

  it("places someone who passes sentences but not the dialogue as intermediate", () => {
    const state = run([true, true, true, true, true, true, true, true, false, false]);
    expect(state.done).toBe(true);
    expect(quizLevel(state)).toBe("intermediate");
  });

  it("places someone who answers everything as advanced, in ten questions", () => {
    const state = run(Array(20).fill(true));
    expect(state.done).toBe(true);
    expect(state.asked).toHaveLength(MAX_QUESTIONS);
    expect(quizLevel(state)).toBe("advanced");
  });

  it("never asks more than ten questions", () => {
    const state = run([true, false, true, true, true, false, true, true, true, true, true, true]);
    expect(state.asked.length).toBeLessThanOrEqual(MAX_QUESTIONS);
    expect(state.done).toBe(true);
  });

  it("shuffles options stably and keeps track of the answer", () => {
    for (const q of QUIZ_ES) {
      const a = shuffledOptions(q);
      expect(a).toEqual(shuffledOptions(q));
      expect(a.options[a.answer]).toBe(q.options[0]);
      expect([...a.options].sort()).toEqual([...q.options].sort());
    }
    // The right answer is not always in the same place.
    expect(new Set(QUIZ_ES.map((q) => shuffledOptions(q).answer)).size).toBeGreaterThan(2);
  });
});

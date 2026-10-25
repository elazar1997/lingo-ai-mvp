import { describe, expect, it } from "vitest";
import { findLesson, LESSONS, PATH_ES } from "@/content/path-es";
import { isPersonaId } from "@/lib/personas";
import { isUnlocked, lessonBonusXp, lessonStars, lessonStates, normalize, wordsSaid } from "./mission";

const coffee = findLesson("u2-coffee")!;

describe("lesson content", () => {
  it("has unique ids, valid personas and reachable pass marks", () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PATH_ES.length).toBeGreaterThan(0);
    for (const l of LESSONS) {
      expect(isPersonaId(l.persona)).toBe(true);
      expect(l.id.length).toBeLessThanOrEqual(40);
      expect(l.need).toBeGreaterThan(0);
      expect(l.need).toBeLessThanOrEqual(l.words.length);
      for (const w of l.words) expect(w.forms.length).toBeGreaterThan(0);
    }
  });

  it("never uses slash forms addressing the learner in Hebrew", () => {
    for (const l of LESSONS) expect(`${l.titleHe} ${l.goalHe}`).not.toMatch(/את\/ה|\/ה\b/);
  });
});

describe("wordsSaid", () => {
  it("ignores accents, case and punctuation", () => {
    expect(normalize("¡Un CAFÉ, por favor!")).toBe("un cafe por favor");
    expect(wordsSaid(coffee, ["¡Hola! Quiero un café con leche, por favor."])).toEqual([0, 1, 2, 3]);
  });

  it("matches whole words only and accepts listed forms", () => {
    expect(wordsSaid(coffee, ["cafetería"])).toEqual([]);
    expect(wordsSaid(coffee, ["quisiera un cafe", "muchas gracias"])).toEqual([0, 1, 4]);
  });
});

describe("stars and XP", () => {
  it("needs the mission and enough words to pass", () => {
    expect(lessonStars(coffee, 5, false, 0)).toBe(0);
    expect(lessonStars(coffee, 3, true, 0)).toBe(0);
    expect(lessonStars(coffee, 4, true, 0)).toBe(1);
    expect(lessonStars(coffee, 5, true, 2)).toBe(2);
    expect(lessonStars(coffee, 5, true, 1)).toBe(3);
  });

  it("pays bonus XP only for new stars", () => {
    expect(lessonBonusXp(2, 0)).toBe(40);
    expect(lessonBonusXp(3, 2)).toBe(20);
    expect(lessonBonusXp(1, 3)).toBe(0);
  });
});

describe("lessonStates", () => {
  const lessons = LESSONS.slice(0, 3);
  it("unlocks in order for beginners", () => {
    expect(lessonStates(lessons, {}, true)).toEqual(["current", "locked", "locked"]);
    expect(lessonStates(lessons, { [lessons[0].id]: 2 }, true)).toEqual(["done", "current", "locked"]);
    // A failed attempt (0 stars) keeps the lesson current.
    expect(lessonStates(lessons, { [lessons[0].id]: 0 }, true)).toEqual(["current", "locked", "locked"]);
  });

  it("opens everything for higher levels", () => {
    expect(lessonStates(lessons, { [lessons[1].id]: 1 }, false)).toEqual(["current", "done", "open"]);
    expect(isUnlocked(lessons, lessons[2].id, {}, false)).toBe(true);
    expect(isUnlocked(lessons, lessons[2].id, {}, true)).toBe(false);
    expect(isUnlocked(lessons, "nope", {}, false)).toBe(false);
  });
});

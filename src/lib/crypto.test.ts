import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decrypt, encrypt, newInviteCode, normalizeInviteCode } from "./crypto";

const key = randomBytes(32).toString("base64");

describe("transcript encryption", () => {
  it("round-trips Hebrew and Spanish text", () => {
    const text = JSON.stringify([{ role: "user", text: "¿Cómo estás? מה שלומך" }]);
    expect(decrypt(encrypt(text, key), key)).toBe(text);
  });

  it("uses a fresh IV each time", () => {
    expect(encrypt("hola", key)).not.toBe(encrypt("hola", key));
  });

  it("rejects tampered ciphertext", () => {
    const parts = encrypt("hola", key).split(".");
    parts[3] = Buffer.from("adios").toString("base64url");
    expect(() => decrypt(parts.join("."), key)).toThrow();
  });

  it("rejects the wrong key", () => {
    expect(() => decrypt(encrypt("hola", key), randomBytes(32).toString("base64"))).toThrow();
  });
});

describe("invite codes", () => {
  it("are 10 unambiguous characters", () => {
    expect(newInviteCode()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{10}$/);
  });

  it("normalize case, spaces and dashes", () => {
    expect(normalizeInviteCode(" abcd-efgh 23 ")).toBe("ABCDEFGH23");
  });
});

// Creates an invite code. Usage:
//   node --env-file=.env.local scripts/create-invite.mjs [email] [note]
// The plain code is printed once; only its sha256 hash is stored.
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const code = Array.from(randomBytes(10), (b) => ALPHABET[b % ALPHABET.length]).join("");
const [email = null, note = null] = process.argv.slice(2);

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { error } = await admin.from("invites").insert({
  code_hash: createHash("sha256").update(code).digest("hex"),
  email,
  note,
});

if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
console.log(`Invite code: ${code}${email ? ` (only for ${email})` : ""}`);

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function remove() {
    setBusy(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setBusy(false);
    }
  }

  return (
    <div className="mt-auto pt-8 text-center text-sm">
      {confirming ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-danger/50 p-4">
          <p>כל המידע שלך יימחק לצמיתות: פרופיל, שיחות, תמלולים והתקדמות. אי אפשר לבטל את זה.</p>
          <div className="flex gap-3">
            <button onClick={remove} disabled={busy} className="flex-1 rounded-xl bg-danger py-2 font-bold text-bg">
              {busy ? "מוחק..." : "מחיקה סופית"}
            </button>
            <button onClick={() => setConfirming(false)} className="flex-1 rounded-xl border border-line py-2">
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="text-muted underline">
          מחיקת החשבון
        </button>
      )}
    </div>
  );
}

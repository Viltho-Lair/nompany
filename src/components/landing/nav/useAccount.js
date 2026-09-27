"use client";
import { useEffect, useState } from "react";

/**
 * Who is signed in, for a public header: `undefined` while asking, `null` for a
 * guest, `{ name, email, photo }` for a person. ONE COPY, shared by every
 * public header, so "Log in" and the avatar cannot disagree between pages.
 * A failed request resolves to guest, so a skeleton never hangs.
 */
export function useAccount() {
  const [account, setAccount] = useState(undefined);
  useEffect(() => {
    let alive = true;
    fetch("/api/identity/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setAccount(d?.user ? { name: d.profile?.fullName || "", email: d.user.email, photo: d.profile?.photo || "" } : null);
      })
      .catch(() => {
        if (alive) setAccount(null);
      });
    return () => {
      alive = false;
    };
  }, []);
  return account;
}

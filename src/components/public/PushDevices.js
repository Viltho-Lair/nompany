"use client";

import { useCallback, useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { notificationSettingsDict } from "@/shared/notificationSettings";
import { useReload } from "@/components/studio2/useReload";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { STACK, ROW, ROW_LABEL, ROW_VALUE, BTN, BTN_GHOST, BANNER_GOOD, BANNER_BAD, H2, SUB } from "@/components/public/accountKit";

// /account → Notifications → PUSH ON THIS DEVICE, and the devices that have it.
//
// TURNING PUSH ON NEEDS A PRESS. Browsers only ask for notification permission
// in answer to something the person did, so nothing here subscribes on load —
// except to REPAIR a device that already said yes: when the key nompany signs
// with has changed (it is derived from the master key, platform/notify/push),
// or the server forgot this device, it re-subscribes quietly, because the
// person's answer is still yes and only the plumbing moved.
//
// iPHONE AND iPAD RECEIVE PUSH ONLY FROM A HOME-SCREEN APP. In a Safari tab the
// browser has no push at all, so the screen says how to add nompany to the Home
// Screen instead of offering a button that cannot work.

const toBytes = (b64url) => {
  const s = atob(String(b64url).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
const sameKey = (a, b64url) => {
  if (!a) return false;
  const x = new Uint8Array(a);
  const y = toBytes(b64url);
  return x.length === y.length && x.every((v, i) => v === y[i]);
};
// The id the server gives a device: the first 16 hex of SHA-256(endpoint).
async function deviceIdOf(endpoint) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
// "Chrome on Windows" — for the person's own list, nothing more.
function labelOf(ua) {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} · ${os}` : browser;
}

export default function PushDevices() {
  const locale = useAccountLocale();
  const tr = notificationSettingsDict(locale);
  const [info, setInfo] = useState(null);
  const [thisId, setThisId] = useState("");
  const [state, setState] = useState("");

  const env = typeof window === "undefined" ? {} : {
    supported: "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
    ios: /iPhone|iPad|iPod/.test(navigator.userAgent),
    standalone: window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true,
    permission: "Notification" in window ? Notification.permission : "default",
  };

  const register = useCallback(async (publicKey) => {
    const reg = await navigator.serviceWorker.register(`/sw.js?locale=${locale}`);
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    // SUBSCRIBED UNDER ANOTHER KEY: that subscription can never be pushed to by
    // this server again, so it is replaced rather than kept.
    if (sub && !sameKey(sub.options?.applicationServerKey, publicKey)) {
      await sub.unsubscribe();
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(publicKey) });
    const res = await fetch("/api/account/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), locale, label: labelOf(navigator.userAgent) }),
    });
    if (!res.ok) throw new Error("subscribe");
    return deviceIdOf(sub.endpoint);
  }, [locale]);

  const load = useCallback(async () => {
    const res = await fetch("/api/account/push", { cache: "no-store" });
    if (!res.ok) return;
    const out = await res.json();
    setInfo(out);
    // THE QUIET REPAIR: this browser already said yes, but the server does not
    // know it under the current key (re-keyed, pruned, or a new browser profile
    // on the same machine reusing the permission).
    if (out.publicKey && "serviceWorker" in navigator && "Notification" in window && Notification.permission === "granted") {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          const id = await deviceIdOf(sub.endpoint);
          const known = out.devices.find((d) => d.id === id && d.keyId === out.keyId);
          if (known) setThisId(id);
          else {
            setThisId(await register(out.publicKey));
            const again = await fetch("/api/account/push", { cache: "no-store" });
            if (again.ok) setInfo(await again.json());
          }
        }
      } catch { /* the button below still works */ }
    }
  }, [register]);
  useReload(load);

  async function enable() {
    setState("enabling");
    try {
      const answer = await Notification.requestPermission();
      if (answer !== "granted") { setState("denied"); return; }
      setThisId(await register(info.publicKey));
      setState("on");
      await load();
    } catch {
      setState("failed");
    }
  }

  async function remove(id) {
    await fetch(`/api/account/push?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (id === thisId) {
      try { await (await (await navigator.serviceWorker.getRegistration("/"))?.pushManager.getSubscription())?.unsubscribe(); } catch { /* removed server-side either way */ }
      setThisId("");
    }
    await load();
  }

  async function test() {
    setState("");
    const res = await fetch("/api/account/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test" }) });
    setState(res.ok ? "tested" : "failed");
  }

  if (!info) return null;

  let action;
  if (!info.publicKey) action = <p className={SUB}>{tr.pushNotConfigured}</p>;
  else if (env.ios && !env.standalone) action = <p className={cn(BANNER_GOOD, "mt-3")}>{tr.pushIosHint}</p>;
  else if (!env.supported) action = <p className={SUB}>{tr.pushUnsupported}</p>;
  else if (env.permission === "denied" || state === "denied") action = <p className={cn(BANNER_BAD, "mt-3")}>{tr.pushDenied}</p>;
  else if (thisId) action = <p className={cn(BANNER_GOOD, "mt-3")}>{tr.pushThisDevice}</p>;
  else action = (
    <button type="button" className={cn(BTN, "mt-3")} disabled={state === "enabling"} onClick={enable}>
      {state === "enabling" ? tr.pushEnabling : tr.pushEnable}
    </button>
  );

  return (
    <section className="space-y-6">
      <div>
        <h3 className={H2}>{tr.pushTitle}</h3>
        <p className={SUB}>{tr.pushLead}</p>
        {action}
      </div>
      <div>
        <h3 className={H2}>{tr.devicesTitle}</h3>
        <div className={cn(STACK, "mt-3")}>
          {info.devices.length === 0 ? (
            <div className={ROW}><span className={ROW_VALUE}>{tr.devicesNone}</span></div>
          ) : info.devices.map((d) => (
            <div key={d.id} className={ROW}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={ROW_LABEL}>{d.label || "—"}{d.id === thisId ? " ✓" : ""}</span>
                <span className={ROW_VALUE}>{tr.deviceAdded(fmtDate(d.createdAt))}</span>
              </span>
              <button type="button" className={BTN_GHOST} onClick={() => remove(d.id)}>{tr.remove}</button>
            </div>
          ))}
        </div>
        {info.devices.length > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <button type="button" className={BTN_GHOST} onClick={test}>{tr.testPush}</button>
            {state === "tested" && <span className={BANNER_GOOD}>{tr.testSent}</span>}
          </div>
        )}
      </div>
    </section>
  );
}

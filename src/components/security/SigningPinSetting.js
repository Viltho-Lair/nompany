"use client";

import { useState } from "react";
import SettingsFold from "@/components/studio2/SettingsFold";
import { securityDict } from "@/shared/security";

// WHETHER EVERY SIGNER MUST TYPE THEIR PIN (18/09/2026). Off, only a person
// who has set a PIN is asked for it before signing; on, everybody is, and a
// signer with no PIN is told to set one. Saved on the studio's settings PUT
// beside the approval chains, because it is a rule about signing them.
export default function SigningPinSetting({ value, canManage, onSave, locale = "en" }) {
  const t = securityDict(locale);
  const [busy, setBusy] = useState(false);
  return (
    <SettingsFold heading={t.signingPinTitle} lead={t.signingPinBody}>
      <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={!canManage || busy}
          onChange={async (e) => { setBusy(true); await onSave({ signingPin: e.target.checked }); setBusy(false); }}
          className="h-4 w-4 accent-brand-600"
        />
        {t.signingPinTitle}
      </label>
    </SettingsFold>
  );
}

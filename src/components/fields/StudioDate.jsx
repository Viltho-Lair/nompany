"use client";

// The studio's date field: a thin wrapper that lazily loads the MUI picker
// (MuiDate) so MUI's date code never enters the studio's shared chunk — only the
// forms that render a date pay for it, in their own chunk. `ssr: false` because
// a date picker has nothing meaningful to render on the server and it keeps the
// MUI internals off the server bundle too.
//
// Use it INSIDE a <Field>, which supplies the label, box and focus ring:
//   <Field label="Deadline" required filled={!!f.deadline}>
//     <StudioDate value={f.deadline} onChange={(iso) => set(iso)} />
//   </Field>
import nextDynamic from "next/dynamic";

const MuiDate = nextDynamic(() => import("./MuiDate"), {
  ssr: false,
  // A placeholder the exact height of the loaded control, so the field does not
  // jump when the picker arrives.
  loading: () => <div className="px-3.5 pt-5 pb-1.5 text-sm text-transparent">—</div>,
});

export default function StudioDate(props) {
  return <MuiDate {...props} />;
}

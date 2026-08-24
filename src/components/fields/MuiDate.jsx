"use client";

// The MUI date picker, and the only place MUI's date code is imported — so it
// lands in a lazily-loaded chunk (see StudioDate) rather than the studio's
// shared bundle. dd/MM/yyyy via the en-GB locale, which is the studio's default
// and the format the rest of the app already shows through fmtDate.
//
// Talks ISO (yyyy-mm-dd) to the form — what every record stores — and converts
// to and from a Date at this boundary only. Rendered BORDERLESS so it sits
// inside a <Field> box like any other control; the Field draws the border, the
// floating label and the focus ring.
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { enGB } from "date-fns/locale/en-GB";

// Local calendar date, never UTC — a due date keyed "2026-08-22" must read as
// the 22nd everywhere, which `new Date(iso)` (UTC midnight) breaks west of GMT.
const toISO = (d) => {
  if (!d || Number.isNaN(d.getTime?.() ?? NaN)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function MuiDate({ value, onChange, disabled, minDate, maxDate }) {
  const dateVal = value ? new Date(`${value}T00:00:00`) : null;
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
      <DatePicker
        value={dateVal}
        onChange={(d) => onChange?.(toISO(d))}
        disabled={disabled}
        format="dd/MM/yyyy"
        minDate={minDate ? new Date(`${minDate}T00:00:00`) : undefined}
        maxDate={maxDate ? new Date(`${maxDate}T00:00:00`) : undefined}
        slotProps={{
          textField: {
            variant: "standard",
            fullWidth: true,
            InputProps: { disableUnderline: true },
            // Match the Field control's box (text-sm, pt-5 pb-1.5 px-3.5) so the
            // date sits exactly where every other field's value does and the
            // field is the SAME HEIGHT as its neighbours.
            //
            // These target `.MuiPickersInputBase-*`, not `.MuiInputBase-*`. The
            // x-date-pickers v9 field is a segmented control (a section list),
            // whose classes carry the `Pickers` prefix — the old `MuiInputBase`
            // selectors silently stopped matching at that upgrade, which is why
            // the date field drifted to MUI's default 16px font and 4px padding
            // and no longer lined up with the plain inputs.
            sx: {
              "& .MuiPickersInputBase-root": { fontSize: "0.875rem", lineHeight: "1.25rem" },
              "& .MuiPickersInputBase-sectionsContainer": { padding: "1.25rem 0.875rem 0.375rem", lineHeight: "1.25rem" },
              // Keep the calendar button from making the row taller than the text.
              "& .MuiIconButton-root": { padding: "0.25rem" },
            },
          },
          // The popover portals to <body>, so a scrollable modal never clips it.
          popper: { placement: "bottom-start" },
        }}
      />
    </LocalizationProvider>
  );
}

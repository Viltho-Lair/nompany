// Scheduling math for the Project Plan (Gantt) builder.
// Weekend = Friday + Saturday (Saudi work week). When weekends are excluded
// (the default), task durations count working days only and every task starts
// on a working day. Dependencies push a task to start after the latest
// dependency ends.

export function isWeekend(d) {
  const g = d.getDay(); // Sun=0 … Fri=5, Sat=6
  return g === 5 || g === 6;
}

function addCalendarDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Nudge a date forward to the next working day (unless weekends are included).
export function nextWorkingDay(d, includeWeekends) {
  let x = new Date(d);
  x.setHours(0, 0, 0, 0);
  if (includeWeekends) return x;
  while (isWeekend(x)) x = addCalendarDays(x, 1);
  return x;
}

// The last day of a task that runs `duration` days starting at `start`.
// A 2-day task starting Sunday ends Monday (start counts as day 1). With
// weekends excluded, Fri/Sat are skipped so the bar spans real working days.
export function taskEnd(start, duration, includeWeekends) {
  const dur = Math.max(1, Math.round(Number(duration) || 1));
  let x = nextWorkingDay(start, includeWeekends);
  let counted = 1;
  while (counted < dur) {
    x = addCalendarDays(x, 1);
    if (includeWeekends || !isWeekend(x)) counted++;
  }
  return x;
}

// Resolve start/end dates for every task. `tasks` = [{ id, duration, deps:[ids],
// parentId }]. deps reference other task ids; a task with deps starts the working
// day after the latest dependency's end. The first task never has dependencies
// and starts at the project start date.
//
// Sub-tasks (parentId set): can never start before their mother task's start,
// and their own end date is start + duration. If a mother's sub-tasks run past
// its own end date, the mother's end date extends to cover the latest sub-task
// (so `ownEnd` = the mother's own duration, `end` = the effective/extended end).
export function computeSchedule(tasks, projectStart, includeWeekends) {
  const base = nextWorkingDay(projectStart ? new Date(projectStart) : new Date(), includeWeekends);
  const start = {};
  const end = {};
  const ownEnd = {};
  const list = Array.isArray(tasks) ? tasks : [];
  for (let pass = 0; pass <= list.length; pass++) {
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      const deps = (i === 0 ? [] : t.deps || []).map((id) => end[id]).filter(Boolean);
      let s;
      if (deps.length) {
        const latest = new Date(Math.max(...deps.map((d) => d.getTime())));
        s = nextWorkingDay(addCalendarDays(latest, 1), includeWeekends);
      } else {
        s = base;
      }
      // A sub-task cannot start before its mother task.
      if (t.parentId && start[t.parentId] && s < start[t.parentId]) s = new Date(start[t.parentId]);
      start[t.id] = s;
      ownEnd[t.id] = taskEnd(s, t.duration, includeWeekends);
      end[t.id] = ownEnd[t.id];
    }
  }
  // Extend each mother task to cover any sub-task that runs past its own end.
  for (const t of list) {
    if (!t.parentId) continue;
    const p = t.parentId;
    if (end[t.id] && end[p] && end[t.id] > end[p]) end[p] = end[t.id];
  }
  return list.map((t) => ({ ...t, start: start[t.id], end: end[t.id], ownEnd: ownEnd[t.id] }));
}

export function fmtPlanDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB");
  } catch {
    return "—";
  }
}

// Whole-day span (calendar days, inclusive) between two dates — for bar widths.
export function daySpan(a, b) {
  const ms = new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

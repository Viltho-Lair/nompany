"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { hrDict } from "@/shared/studio/hr";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import {
  panel, label, btn, btnGhost, th, stripeOn, stripeOff,
  Dialog, Toolbar, Empty, fmtDate,
} from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import { initialsOf } from "@/lib/initials";
import HrDashboard from "@/components/studio2/HrDashboard";
import { useAnalyticsLevel } from "@/components/studio2/analyticsLevel";
import { StatusPill } from "@/components/studio2/StatusPill";
import { PanelBar, usePanelParam } from "@/components/studio2/PanelBar";

const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";
const td = "py-3 pe-3 align-middle";

// Leave-request colours now live in the shared StatusPill map (kind "leave").
// Cancelled is the dimmer `muted` slate, kept distinct from the neutral default.

// Dates are dd/mm/yyyy everywhere in this product.
const fmt = fmtDate;

// HUMAN RESOURCES. The employee record IS the collaborator row, so this screen
// edits the person who is already in the studio rather than creating a parallel
// people list — someone's department exists only here, inside this studio.
//
// That is the one place this differs from the Old System, which creates an
// employee and mints them a login. Here a person arrives by JOINING the studio
// and an admin approving them; HR then describes who they are, rather than
// bringing them into being. So there is no "add employee" — there is nobody to
// add who is not already here.
//
// `view` is the ACTIVE SUB-SECTION key. HR has exactly one sub-section —
// Employees — so the parent renders the dashboard and hr-employees renders the
// tabbed screen (People / Roles / Certifications / Leave), which are tabs of one
// screen rather than sub-sections of their own.
//
// THERE IS NO DEPARTMENTS TAB. A department is a top-level section, so there is
// nothing to create and nothing to delete — the list is derived from the studio
// the moment it loads. And Positions became Roles: a job title and the access
// that job implies were two lists for one idea, and only one of them decided
// anything.
export default function StudioHr({ slug, view = "hr" }) {
  const tr = hrDict(useStudioLocale());
  const [data, setData] = useState(null);
  // The active panel is remembered in ?tab= so a refresh or a deep link reopens
  // the same one; the switch itself is an in-place flip via the bottom PanelBar.
  const [tab, setTab] = usePanelParam("tab", "people", ["people", "roles", "certifications", "leave"]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const level = useAnalyticsLevel();

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/hr`, { cache: "no-store" });
    if (!res.ok) { setError(tr.accessHumanResourcesStudio); return; }
    setData(await res.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);
  // HR records change from more than one desk — stay current.
  useLiveUpdates(slug, "hr", load);

  const send = useCallback(async (kind, method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/hr/${kind}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(
        out.error === "read-only" ? tr.viewOnlyAccessHuman
        : out.error === "duplicate" ? tr.nameAlreadyUse
        : out.error === "in-use" ? inUseMessage(out)
        : out.error === "protected" ? tr.adminComesStudioCan
        : out.error === "role-forbidden" ? roleForbiddenMessage(out, tr)
        : out.error === "escalation" ? tr.canOnlyGiveSomebody
        : out.error === "department" ? tr.sectionIsnPartStudio
        : out.error === "overlap" ? `That overlaps leave already booked ${fmt(out.from)} – ${fmt(out.to)}.`
        : out.error === "already-decided" ? `That request was already ${String(out.status || "").toLowerCase()}.`
        : out.error === "range" ? tr.endDateCanBefore
        : out.error === "forbidden" ? tr.can
        : tr.didnSave
      );
      return false;
    }
    await load();
    return true;
  }, [slug, load]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingHumanResources} />;

  const { canManage: canManageParent, departments, roles, certifications, employees, vacations, expiring, headcount, vocabulary, me, nav } = data;
  // MANAGE IS ASKED OF THE SCREEN BEING SHOWN. `view` is the section key, and
  // the map is keyed the same way, so a sub-section grant answers for its own
  // screen and the parent's answer no longer stands in for all of them.
  const canManage = data.manage?.[view] ?? canManageParent;

  const pendingLeave = vacations.filter((v) => v.status === "Pending").length;
  const banner = error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>;

  if (view === "hr") {
    return (
      <div className="space-y-6">
        {banner}
        {/* The HR dashboard counts everybody and every expiring document, so it
            answers to hr.dashboard.view rather than to the Employees grant. */}
        {data.canViewDashboard === false
          ? <Empty title={tr.dashboardIsnYoursSee} body={tr.studioKeepsModuleDashboards} />
          : <HrDashboard slug={slug} nav={nav} departments={departments}
              headcount={headcount} expiring={expiring} vacations={vacations}
              windowDays={vocabulary.expiryWindowDays} level={level} />}
      </div>
    );
  }

  const panelItems = [
    { key: "people", label: `People (${employees.length})` },
    { key: "roles", label: `Roles (${roles.length})` },
    { key: "certifications", label: `Certifications (${certifications.length})` },
    { key: "leave", label: `Leave${pendingLeave ? ` (${pendingLeave})` : ""}` },
  ];

  // pb-20 keeps the last rows clear of the fixed PanelBar, the way StudioOperations
  // spaces its own bottom bar.
  return (
    <div className="space-y-6 pb-20">
      {banner}

      {/* The old top pill-tab strip moved to the shared bottom PanelBar; the
          view-only badge stays up top-right where the header used to hold it. */}
      {!canManage && (
        <div className="flex justify-end">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">{tr.viewOnly}</span>
        </div>
      )}

      <Overview headcount={headcount} departments={departments} expiring={expiring} windowDays={vocabulary.expiryWindowDays} />

      {tab === "people" && (
        <People employees={employees} departments={departments} roles={roles}
          certifications={certifications} canManage={canManage} canAssignRoles={data.canAssignRoles}
          slug={slug} busy={busy}
          onSave={(collaboratorId, patch) => send("employees", "PUT", { collaboratorId, patch })} />
      )}
      {tab === "roles" && (
        <Roles rows={roles} slug={slug} canManage={canManage} canAssignRoles={data.canAssignRoles} busy={busy} send={send} />
      )}
      {tab === "certifications" && (
        <Certifications rows={certifications} employees={employees} canManage={canManage} busy={busy} send={send} />
      )}
      {tab === "leave" && (
        <Leave rows={vacations} employees={employees} types={vocabulary.leaveTypes}
          canManage={canManage} meId={me.collaboratorId} busy={busy} send={send} />
      )}

      <PanelBar items={panelItems} active={tab} onSelect={setTab} />
    </div>
  );
}

function inUseMessage(out) {
  const n = out.people || 0;
  return `Still held by ${n} ${n === 1 ? "person" : "people"} — reassign them first.`;
}

// The two ways an access change is refused here, and they are different
// problems: one is about handing access out, the other about taking it away.
// The dictionary comes in as an argument: module scope, no hook to read.
function roleForbiddenMessage(out, tr) {
  const n = out.people || 0;
  return n > 0
    ? tr.roleHeldBy(n)
    : tr.roleIsAccessChange;
}

// ---- overview --------------------------------------------------------------
function Overview({ headcount, departments, expiring, windowDays }) {
  const tr = hrDict(useStudioLocale());
  return (
    <section className={panel}>
      <div className="flex flex-wrap gap-8">
        <div>
          <p className="font-display text-3xl font-800 text-slate-900 dark:text-white">{headcount.total}</p>
          <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.people}</p>
        </div>
        <div>
          <p className="font-display text-3xl font-800 text-slate-900 dark:text-white">{departments.length}</p>
          <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.departments}</p>
        </div>
        {headcount.unassigned > 0 && (
          <div>
            <p className="font-display text-3xl font-800 text-amber-600 dark:text-amber-400">{headcount.unassigned}</p>
            <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.unassigned}</p>
          </div>
        )}
      </div>

      {departments.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {departments.map((d) => (
            <span key={d.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-600 text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {d.name} · {headcount.byDepartment[d.id] || 0}
            </span>
          ))}
        </div>
      )}

      {expiring.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="font-display text-sm font-700 text-amber-800 dark:text-amber-200">
            Documents expiring within {windowDays} days
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
            {expiring.map((e) => (
              <li key={`${e.collaboratorId}-${e.kind}`}>
                {e.alias} — {e.kind} {e.daysLeft < 0 ? `expired ${Math.abs(e.daysLeft)} days ago` : `in ${e.daysLeft} days`} ({fmt(e.date)})
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ---- people ----------------------------------------------------------------
function People({ employees, departments, roles, certifications, canManage, canAssignRoles, slug, busy, onSave }) {
  const tr = hrDict(useStudioLocale());
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const closeEditing = useCallback(() => setEditing(null), []);
  const certName = useMemo(() => Object.fromEntries(certifications.map((c) => [c.id, c.name])), [certifications]);

  // Keep the open editor on the freshly loaded row after a save.
  useEffect(() => {
    setEditing((cur) => (cur ? employees.find((e) => e.id === cur.id) || null : null));
  }, [employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      `${e.alias} ${e.employeeCode || ""} ${e.departmentName || ""} ${(e.roleNames || []).join(" ")} ${e.mobile || ""}`.toLowerCase().includes(q));
  }, [employees, query]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Field label={tr.searchNameCodeDepartment} type="search" className="w-full sm:max-w-xs"
          value={query} onChange={setQuery} />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {filtered.length} of {employees.length}. Identity numbers are encrypted at rest.
        </p>
      </div>

      {editing && (
        <Dialog title={editing.alias} description={tr.employmentDetailsApplyInside} onClose={closeEditing} width="max-w-[820px]">
          <EmployeeEditor person={editing} departments={departments} roles={roles}
            certifications={certifications} canAssignRoles={canAssignRoles} slug={slug}
            busy={busy} onCancel={closeEditing}
            onSave={async (patch) => { if (await onSave(editing.id, patch)) setEditing(null); }} />
        </Dialog>
      )}

      {employees.length === 0 ? (
        <Empty title={tr.nobodyHereYet} body={tr.peopleArriveJoiningStudio} />
      ) : filtered.length === 0 ? (
        <Empty title={tr.nobodyMatches} body={tr.noOneHereMatches} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((e) => {
            const certs = (e.certificationIds || []).map((id) => certName[id]).filter(Boolean);
            // Somebody with no department has not been placed yet.
            const unassigned = !e.departmentId;
            return (
              // Only the stripe COLOUR here, not the shared stripe's tint: the
              // panel already paints a background, and two same-specificity
              // background utilities would be settled by stylesheet order rather
              // than by intent.
              <section key={e.id} className={`${panel} border-s-4 ${unassigned ? "border-s-amber-400 dark:border-s-amber-500/70" : "border-s-transparent"}`}>
                <div className="flex items-start gap-4">
                  {/* THE FACE COMES OFF THE ACCOUNT, carried on every read
                      rather than copied onto the studio's row — so somebody
                      who changes their picture has changed it here too.
                      Initials remain the answer for anyone who has not set
                      one, which is most people on the day they arrive. */}
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500/10 font-display text-lg font-800 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                    {e.photo
                      /* eslint-disable-next-line @next/next/no-img-element */
                      ? <img src={e.photo} alt="" className="h-full w-full object-cover" />
                      : initialsOf(e.alias)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{e.alias}</h3>
                      {e.role === "owner" && <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[11px] font-600 text-white">owner</span>}
                      {/* No "admin" badge here any more. It read a flag that
                          duplicated what somebody's roles say, and HR is not
                          where access is described anyway — People is. */}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                      {[e.employeeCode, (e.roleNames || []).join(", "), e.departmentName].filter(Boolean).join("  ·  ")
                        || <span className="text-amber-700 dark:text-amber-300">{tr.notPlacedYet}</span>}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Mobile: {e.mobile || "—"} · Joined: {fmt(e.dateOfJoin)}
                    </p>
                    {certs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {certs.map((name) => (
                          <span key={name} className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-600 text-brand-700 dark:text-brand-300">{name}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2"><Documents person={e} canManage={canManage} /></div>
                  </div>

                  {canManage && (
                    <button className={btnGhost} onClick={() => setEditing(e)}>{tr.edit}</button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

// A view-only viewer sees that a document is on file and when it expires —
// never the number. That's the whole point of encrypting it at rest.
function Documents({ person, canManage }) {
  const tr = hrDict(useStudioLocale());
  const items = [
    { kind: "ID", has: person.hasId, number: person.idNumber, expiry: person.idExpiry },
    { kind: tr.passport, has: person.hasPassport, number: person.passportNumber, expiry: person.passportExpiry },
  ].filter((d) => d.has || d.expiry);

  if (items.length === 0) return <span className="text-xs text-slate-400">{tr.noDocumentsFile}</span>;
  return (
    <span className="flex flex-col gap-0.5">
      {items.map((d) => (
        <span key={d.kind} className="text-xs text-slate-600 dark:text-slate-300">
          <span className="font-600">{d.kind}</span>{" "}
          {canManage && d.number ? <span className="font-mono">{d.number}</span> : d.has ? tr.file : ""}
          {d.expiry && <span className="text-slate-400"> · exp {fmt(d.expiry)}</span>}
        </span>
      ))}
    </span>
  );
}

function EmployeeEditor({ person, departments, roles, certifications, canAssignRoles, slug, busy, onCancel, onSave }) {
  const tr = hrDict(useStudioLocale());
  const [form, setForm] = useState({
    departmentId: person.departmentId || "",
    roleIds: person.roleIds || [],
    employeeCode: person.employeeCode || "",
    dateOfJoin: person.dateOfJoin || "",
    mobile: person.mobile || "",
    idNumber: person.idNumber || "",
    idExpiry: person.idExpiry || "",
    passportNumber: person.passportNumber || "",
    passportExpiry: person.passportExpiry || "",
    certificationIds: person.certificationIds || [],
  });
  // A stored identity number is READ-ONLY until it is deliberately unlocked, so
  // editing somebody's phone number can never fat-finger over their passport.
  const [editId, setEditId] = useState(false);
  const [editPassport, setEditPassport] = useState(false);
  // Somebody may hold more than one, and any one of them is enough to act — so
  // this is a list, exactly as it is on the access screen.
  const toggleRole = (id) => setForm((f) => ({
    ...f,
    roleIds: f.roleIds.includes(id) ? f.roleIds.filter((x) => x !== id) : [...f.roleIds, id],
  }));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* THE STUDIO'S SECTIONS ARE ITS DEPARTMENTS. Nothing to maintain,
            and no way for this list to disagree with the nav. */}
        <Field label={tr.department} as="select" value={form.departmentId}
          onChange={(v) => setForm((f) => ({ ...f, departmentId: v }))}
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
          hint={tr.studioSectionsWhereThey} />
        <Field label={tr.employeeCode} value={form.employeeCode} hint={tr.eGEmp014}
          onChange={(v) => setForm((f) => ({ ...f, employeeCode: v }))} />
        <Field label={tr.dateJoining} filled={!!form.dateOfJoin}>
          <StudioDate value={form.dateOfJoin} onChange={(iso) => setForm((f) => ({ ...f, dateOfJoin: iso }))} />
        </Field>
        <Field label={tr.mobile} value={form.mobile} onChange={(v) => setForm((f) => ({ ...f, mobile: v }))} />
      </div>

      {/* ROLE, which is what "position" used to be — except this one decides
          what they may actually do, because it is the same role Access grants
          against. Putting somebody in one is therefore an ACCESS act: it is
          offered only to somebody who may hand access out, and the server
          refuses it either way rather than trusting the screen. */}
      <div className="mt-6 rounded-xl border border-slate-200/70 p-4 dark:border-white/10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.role}</p>
          {/* This used to read the People screen's nav key off the nav map —
              People is never a nav key at all (sectionNav only keys real
              SECTION_DEFS entries), so the link could never render for
              anyone. It was never supposed to check nav in the first place:
              what each role may do is defined on Access, not People, exactly
              as the link text already said before the href pointed somewhere
              else — and whether this person may open Access is
              canAssignRoles, already threaded into this component for the
              same "may hand access out" gate the comment above describes. */}
          {canAssignRoles && (
            <a href={`/${slug}/access`} className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300">
              {tr.whatEachRoleMayDo}
            </a>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {canAssignRoles
            ? tr.whatPersonWhatLets
            : tr.rolesShownHereBut}
        </p>
        {roles.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">{tr.noRolesDefinedYet}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {roles.map((r) => {
              const on = form.roleIds.includes(r.id);
              return (
                <button key={r.id} type="button" disabled={!canAssignRoles}
                  title={r.description || r.name}
                  onClick={() => toggleRole(r.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-600 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${on
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}>
                  {r.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200/70 p-4 dark:border-white/10">
        <p className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.identityDocuments}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {tr.numbersEncrypted}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-start gap-2">
              <Field label={tr.idNumber} className="flex-1" value={form.idNumber} disabled={!editId}
                onChange={(val) => setForm((f) => ({ ...f, idNumber: val }))} />
              <button type="button" onClick={() => setEditId((v) => !v)}
                className="mt-3 rounded-md px-2 py-0.5 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">
                {editId ? "lock" : "edit"}
              </button>
            </div>
            <Field label={tr.idExpiry} filled={!!form.idExpiry} className="mt-2">
              <StudioDate value={form.idExpiry} onChange={(iso) => setForm((f) => ({ ...f, idExpiry: iso }))} />
            </Field>
          </div>
          <div>
            <div className="flex items-start gap-2">
              <Field label={tr.passportNumber} className="flex-1" value={form.passportNumber} disabled={!editPassport}
                onChange={(val) => setForm((f) => ({ ...f, passportNumber: val }))} />
              <button type="button" onClick={() => setEditPassport((v) => !v)}
                className="mt-3 rounded-md px-2 py-0.5 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">
                {editPassport ? "lock" : "edit"}
              </button>
            </div>
            <Field label={tr.passportExpiry} filled={!!form.passportExpiry} className="mt-2">
              <StudioDate value={form.passportExpiry} onChange={(iso) => setForm((f) => ({ ...f, passportExpiry: iso }))} />
            </Field>
          </div>
        </div>
      </div>

      {certifications.length > 0 && (
        <div className="mt-6">
          <label className={label}>{tr.certificationsHeld}</label>
          <div className="flex flex-wrap gap-2">
            {certifications.map((c) => {
              const on = form.certificationIds.includes(c.id);
              return (
                <button key={c.id} type="button"
                  onClick={() => setForm((f) => ({
                    ...f,
                    certificationIds: on ? f.certificationIds.filter((x) => x !== c.id) : [...f.certificationIds, c.id],
                  }))}
                  className={`rounded-full px-3 py-1.5 text-xs font-600 transition-colors ${on
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}>
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {/* roleIds is left OUT of the payload entirely for somebody who may not
            assign them. Sending it unchanged would be refused rather than
            ignored, which would make saving a phone number fail for anybody
            holding HR and nothing else. */}
        <button className={btn} disabled={busy}
          onClick={() => { const { roleIds, ...rest } = form; onSave(canAssignRoles ? form : rest); }}>
          {busy ? tr.saving : tr.save}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

// ---- roles ------------------------------------------------------------------
// WHAT REPLACED POSITIONS, and it is the same row Access grants against.
//
// A position was a job title with a description; a role is a job title with a
// description AND the permissions that title implies. Keeping both meant every
// studio wrote its jobs down twice and only one copy decided anything — so
// somebody could be a "Sales Engineer" by position and hold no access at all,
// with nothing on either screen to say the two were unrelated.
//
// The split is by QUESTION rather than by list. HR names the job, because that
// is an HR fact. Access says what the job may do, because handing out
// permissions is its own right and must not be reachable through an HR grant.
// Each row here says which half has been done.
function Roles({ rows, slug, canManage, canAssignRoles, busy, send }) {
  const tr = hrDict(useStudioLocale());
  const [form, setForm] = useState(null);
  const [confirming, setConfirming] = useState("");
  const closeForm = useCallback(() => setForm(null), []);

  return (
    <>
      <Toolbar canManage={canManage} label={tr.addRole} onAdd={() => setForm({ row: null })} />

      {form && (
        <Dialog title={form.row ? `Rename ${form.row.name}` : tr.newRole}
          description={tr.namingJobHrWhat}
          onClose={closeForm} width="max-w-[560px]">
          <SimpleForm busy={busy} onCancel={closeForm}
            fields={[
              { key: "name", label: tr.name, required: true, value: form.row?.name || "", placeholder: "Job title" },
              { key: "description", label: tr.description, area: true, value: form.row?.description || "" },
            ]}
            onSave={async (values) => {
              if (await send("roles", form.row ? "PUT" : "POST", form.row ? { ...values, id: form.row.id } : values)) setForm(null);
            }} />
        </Dialog>
      )}

      <section className={panel}>
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-600 text-slate-900 dark:text-white">{r.name}</span>
                  {/* Admin is the studio's own, not something anybody created —
                      which is why it cannot be renamed or deleted here. */}
                  {r.wildcard && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-700 text-amber-700 dark:text-amber-300">
                      {tr.builtInEverything}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {r.held} held
                  </span>
                  {/* The half HR does not do. A job nobody has given any access
                      to is not broken, but it is unfinished, and saying so here
                      is the only place anybody would notice. */}
                  {!r.wildcard && r.permissionCount === 0 && (
                    <span className="text-xs font-600 text-amber-700 dark:text-amber-300">{tr.noAccessGrantedYet}</span>
                  )}
                </div>
                {r.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{r.description}</p>}
              </div>
              {canManage && !r.wildcard && (
                <div className="flex gap-2">
                  <button className={btnGhost} onClick={() => setForm({ row: r })}>{tr.rename}</button>
                  {/* DELETING A HELD ROLE TAKES ACCESS OFF PEOPLE, so the count
                      is on the button before it is pressed rather than in a
                      message afterwards. A role nobody holds costs nothing and
                      deletes on one press. */}
                  {confirming === r.id ? (
                    <>
                      <button className={btnDanger} disabled={busy}
                        onClick={async () => { await send("roles", "DELETE", { id: r.id }); setConfirming(""); }}>
                        {r.held > 0
                          ? `Delete — ${r.held} ${r.held === 1 ? tr.personLoses : tr.peopleLose} this access`
                          : tr.deleteGood}
                      </button>
                      <button className={btnGhost} onClick={() => setConfirming("")}>{tr.keep}</button>
                    </>
                  ) : (
                    <button className={btnDanger} disabled={busy} onClick={() => setConfirming(r.id)}>{tr.delete}</button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          What each role is allowed to do is set on the access screen
          {/* Same defect as the Role panel above: this used to read the
              People screen's nav key off the nav map, which is never a nav
              key at all, so the link could never render — and the text right
              here already names the access screen, not People. The false
              branch's own copy (an admin can open it) is the tell that
              canAssignRoles was always the intended gate. */}
          {canAssignRoles ? <> — <a href={`/${slug}/access`} className="font-600 underline">{tr.open}</a></> : ", which an admin can open"}.
        </p>
      </section>
    </>
  );
}

// ---- certifications --------------------------------------------------------
function Certifications({ rows, employees, canManage, busy, send }) {
  const tr = hrDict(useStudioLocale());
  const [form, setForm] = useState(null);
  const closeForm = useCallback(() => setForm(null), []);
  const held = (id) => employees.filter((e) => (e.certificationIds || []).includes(id)).length;

  return (
    <>
      <Toolbar canManage={canManage} label={tr.addCertification} onAdd={() => setForm({ row: null })} />

      {form && (
        <Dialog title={form.row ? `Edit ${form.row.name}` : tr.newCertification} onClose={closeForm} width="max-w-[560px]">
          <SimpleForm busy={busy} onCancel={closeForm}
            fields={[
              { key: "name", label: tr.name, required: true, value: form.row?.name || "" },
              { key: "issuer", label: tr.issuer, value: form.row?.issuer || "" },
              { key: "validityMonths", label: tr.validMonths, type: "number", value: form.row?.validityMonths || "" },
              { key: "notes", label: tr.notes, area: true, value: form.row?.notes || "" },
            ]}
            onSave={async (values) => {
              if (await send("certifications", form.row ? "PUT" : "POST", form.row ? { ...values, id: form.row.id } : values)) setForm(null);
            }} />
        </Dialog>
      )}

      {rows.length === 0 ? <Empty title={tr.noCertificationsYet} body={tr.defineQualificationsPeopleHold} /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-600 text-slate-900 dark:text-white">{c.name}</span>
                    {c.issuer && <span className="text-xs text-slate-500 dark:text-slate-400">{c.issuer}</span>}
                    {c.validityMonths > 0 && <span className="text-xs text-slate-400">valid {c.validityMonths} months</span>}
                    <span className="text-xs text-slate-400">· {held(c.id)} held</span>
                  </div>
                  {c.notes && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{c.notes}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button className={btnGhost} onClick={() => setForm({ row: c })}>{tr.edit}</button>
                    <button className={btnDanger} disabled={busy} onClick={() => send("certifications", "DELETE", { id: c.id })}>{tr.delete}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// ---- leave -----------------------------------------------------------------
function Leave({ rows, employees, types, canManage, meId, busy, send }) {
  const tr = hrDict(useStudioLocale());
  const [asking, setAsking] = useState(false);
  const closeAsk = useCallback(() => setAsking(false), []);

  return (
    <>
      <div className="flex justify-end">
        <button className={btn} onClick={() => setAsking(true)}>{tr.requestLeave}</button>
      </div>

      {asking && (
        <Dialog title={tr.requestLeave} description={canManage ? tr.bookYourselfSomebodyManage : tr.goesWhoeverManagesHr}
          onClose={closeAsk} width="max-w-[620px]">
          <LeaveForm types={types} employees={employees} canManage={canManage} meId={meId} busy={busy}
            onCancel={closeAsk}
            onSave={async (form) => { if (await send("vacations", "POST", form)) setAsking(false); }} />
        </Dialog>
      )}

      {rows.length === 0 ? <Empty title={tr.noLeaveBooked} body={canManage ? tr.requestsPeopleArriveHere : tr.ownLeaveRequestsAppear} /> : (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {[tr.person, tr.type, tr.from, tr.to, tr.days, tr.status].map((head) => (
                    <th key={head} className={`${th} ps-2 text-start`}>{head}</th>
                  ))}
                  <th className={`${th} text-end`} />
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  // A request nobody has decided on yet is the one needing action.
                  <tr key={v.id} className={`border-s-4 border-b border-slate-100 last:border-b-0 dark:border-white/5 ${v.status === "Pending" ? stripeOn : stripeOff}`}>
                    <td className={`${td} ps-2 font-600 text-slate-900 dark:text-white`}>{v.alias}</td>
                    <td className={`${td} ps-2 text-slate-600 dark:text-slate-300`}>{v.type}</td>
                    <td className={`${td} ps-2 text-slate-600 dark:text-slate-300`}>{fmt(v.from)}</td>
                    <td className={`${td} ps-2 text-slate-600 dark:text-slate-300`}>{fmt(v.to)}</td>
                    <td className={`${td} ps-2 tabular-nums text-slate-600 dark:text-slate-300`}>{v.days}</td>
                    <td className={`${td} ps-2`}>
                      <StatusPill kind="leave" status={v.status} />
                    </td>
                    <td className={`${td} text-end`}>
                      {v.status === "Pending" && (
                        <span className="flex flex-wrap justify-end gap-2">
                          {canManage && (
                            <>
                              <button className={btnGhost} disabled={busy} onClick={() => send("vacations", "PUT", { id: v.id, status: "Approved" })}>{tr.approve}</button>
                              <button className={btnGhost} disabled={busy} onClick={() => send("vacations", "PUT", { id: v.id, status: "Declined" })}>{tr.decline}</button>
                            </>
                          )}
                          {v.collaboratorId === meId && (
                            <button className={btnGhost} disabled={busy} onClick={() => send("vacations", "PUT", { id: v.id, status: "Cancelled" })}>{tr.cancel}</button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function LeaveForm({ types, employees, canManage, meId, busy, onSave, onCancel }) {
  const tr = hrDict(useStudioLocale());
  const [form, setForm] = useState({ collaboratorId: "", type: types[0], from: "", to: "", reason: "" });
  // Inclusive of both ends, which is how leave is counted.
  const days = form.from && form.to
    ? Math.max(0, Math.round((new Date(form.to) - new Date(form.from)) / 86400000) + 1)
    : form.from ? 1 : 0;
  const backwards = form.from && form.to && form.to < form.from;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {canManage && (
          <Field label={tr.person} as="select" value={form.collaboratorId}
            onChange={(v) => setForm((f) => ({ ...f, collaboratorId: v }))}
            options={employees.filter((e) => e.id !== meId).map((e) => ({ value: e.id, label: e.alias }))} />
        )}
        <Field label={tr.type} as="select" value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={types} />
        <Field label={tr.from} filled={!!form.from}>
          <StudioDate value={form.from} onChange={(iso) => setForm((f) => ({ ...f, from: iso }))} />
        </Field>
        <Field label={tr.to} filled={!!form.to}>
          <StudioDate value={form.to} onChange={(iso) => setForm((f) => ({ ...f, to: iso }))} />
        </Field>
      </div>
      <Field label={tr.reason} as="textarea" className="mt-4" value={form.reason} onChange={(v) => setForm((f) => ({ ...f, reason: v }))} />

      <p className={`mt-3 text-xs ${backwards ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
        {backwards ? tr.endDateBeforeStart : days > 0 ? tr.thatIsNDays(days) : tr.pickStartDate}
      </p>

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !form.from || backwards} onClick={() => onSave(form)}>{busy ? tr.sending : tr.submit}</button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

// ---- shared bits -----------------------------------------------------------
// One form shape covers departments, positions and certifications — they differ
// only in their fields, so there is no reason for three near-identical forms.
function SimpleForm({ fields, busy, onCancel, onSave }) {
  const tr = hrDict(useStudioLocale());
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value ?? ""])));
  const ready = fields.filter((f) => f.required).every((f) => String(values[f.key] || "").trim());

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.area ? "sm:col-span-2" : ""}>
            {f.options ? (
              <Field label={f.label} required={f.required} as="select" value={values[f.key]}
                onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                options={f.options.filter((o) => o.value !== "").map((o) => ({ value: o.value, label: o.text }))} />
            ) : f.area ? (
              <Field label={f.label} required={f.required} as="textarea" value={values[f.key]}
                onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />
            ) : f.type === "date" ? (
              <Field label={f.label} required={f.required} filled={!!values[f.key]}>
                <StudioDate value={values[f.key]} onChange={(iso) => setValues((s) => ({ ...s, [f.key]: iso }))} />
              </Field>
            ) : (
              <Field label={f.label} required={f.required} type={f.type || "text"} hint={f.placeholder || undefined}
                value={values[f.key]} onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !ready} onClick={() => onSave(values)}>{busy ? tr.saving : tr.save}</button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

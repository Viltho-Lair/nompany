// CAREERS' STORE — nompany's own job openings and the applications to them,
// written from /super (27/09/2026). Both are site collections under `g:site:*`
// (see lib/data/site), platform content outside every cascade.
//
// Until this existed NOTHING wrote the openings: /careers read a collection no
// screen could fill, and its comment said "managed in the Super console" about
// a console screen that did not exist.

import { getSiteCollection, addSiteRow, updateSiteRow, deleteSiteRow } from "./site";
import type { Row } from "@/platform/db/store";
import { ID } from "@/platform/db/keys";
import { cleanApplicationStatus, cleanJob, isOpen, jobProblem } from "@/shared/careers";
import { deleteMedia, getMedia, readMedia } from "@/lib/media";

type JobResult = { job: Row } | { error: string };

const newest = (a: Row, b: Row) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""));

/** Every opening, open and closed, newest first — the console's list. */
export async function listJobs(): Promise<Row[]> {
  return (await getSiteCollection("careers")).slice().sort(newest);
}

/** The openings the public site shows. */
export async function openJobs(): Promise<Row[]> {
  return (await listJobs()).filter(isOpen);
}

export async function createJob(input: unknown): Promise<JobResult> {
  const clean = cleanJob(input);
  const problem = jobProblem(clean);
  if (problem) return { error: problem };
  const now = new Date().toISOString();
  const job = await addSiteRow("careers", { ...clean, id: ID.job(), createdAt: now, updatedAt: now });
  return { job };
}

export async function updateJob(id: string, input: unknown): Promise<JobResult> {
  const clean = cleanJob(input);
  const problem = jobProblem(clean);
  if (problem) return { error: problem };
  const now = new Date().toISOString();
  const job = await updateSiteRow("careers", id, (row) => ({ ...row, ...clean, updatedAt: now }));
  return job ? { job } : { error: "notfound" };
}

/** Deleting an opening leaves its applications: each keeps the title it was sent for. */
export async function deleteJob(id: string): Promise<boolean> {
  return deleteSiteRow("careers", id);
}

// ---- applications ------------------------------------------------------------

/** Every application, newest first, WITHOUT the sender's IP (kept for abuse, not for reading). */
export async function listApplications(): Promise<Row[]> {
  return (await getSiteCollection("applications"))
    .slice()
    .sort(newest)
    .map(({ ip: _ip, ...row }) => row);
}

export async function setApplicationStatus(id: string, status: unknown): Promise<Row | { error: string }> {
  const s = cleanApplicationStatus(status);
  if (!s) return { error: "invalid-status" };
  const now = new Date().toISOString();
  const row = await updateSiteRow("applications", id, (r) => ({ ...r, status: s, reviewedAt: now }));
  return row || { error: "notfound" };
}

/**
 * Delete an application AND its CV. A candidate's CV is personal data kept only
 * for this application; once the application is gone nothing may reach it, so
 * the file goes with the row rather than lingering unreachable.
 */
export async function deleteApplication(id: string): Promise<boolean> {
  const row = (await getSiteCollection("applications")).find((r) => r.id === id);
  if (!row) return false;
  const gone = await deleteSiteRow("applications", id);
  if (gone && row.cvMediaId) await deleteMedia(String(row.cvMediaId)).catch(() => {});
  return gone;
}

/**
 * The CV of one application, for the console. The file is stored PRIVATE with
 * no studio and no owner, so the public media route hands it to nobody; this is
 * the one door, and it opens only for a SuperAdmin (the route's auth) and only
 * for a media id an application actually names — never an arbitrary id.
 */
export async function applicationCv(id: string) {
  const row = (await getSiteCollection("applications")).find((r) => r.id === id);
  if (!row?.cvMediaId) return null;
  const media = await getMedia(String(row.cvMediaId));
  if (!media) return null;
  const buffer = await readMedia(media);
  if (!buffer) return null;
  return { buffer, contentType: media.contentType, filename: String(row.cvFilename || media.filename || "cv") };
}

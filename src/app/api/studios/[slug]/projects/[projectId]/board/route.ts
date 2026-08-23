import { route } from "@/platform/http/route";
import { projectsContext, readProjectBoard, saveProjectBoard } from "@/modules/projects/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A project's Kanban board — the project profile is the board now. It resolves
// through projectsContext, so the projects-list grant is what governs it: having
// the context at all is the view gate, and the write re-checks projects.list.edit
// beside the thing it protects. `[projectId]` is a dynamic sibling of the static
// `overtimes`/`sla` routes; Next resolves those first, so this only ever catches
// a real project id.
const spec = { auth: "studio", context: projectsContext, name: "project-board" };

export const GET = route({ ...spec, body: false }, async (c) =>
  readProjectBoard(c, c.params.projectId));

// Whole-document set: the client store is authoritative, so the body carries the
// entire board and saveProjectBoard writes it under one compare-and-set.
export const PUT = route({ ...spec, body: true }, async (c) =>
  saveProjectBoard(c, c.params.projectId, c.body?.board));

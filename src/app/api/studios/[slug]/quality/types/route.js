import {
  qualityGuard, createType, updateType, removeType,
  installStarterTypes, saveDepartmentCodes,
} from "@/lib/quality";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

const status = (error) => {
  if (error === "forbidden") return 403;
  if (error === "unknown-permission") return 500;
  if (error === "notfound") return 404;
  // Both mean "the data says no", not "you asked wrongly": a type that
  // documents were filed under cannot be deleted, and the starter pack cannot
  // be planted over a taxonomy that already exists.
  if (error === "in-use" || error === "prefix-in-use" || error === "not-empty") return 409;
  return 400;
};

// Everything on this route is setup — managing the taxonomy every future
// document code is built from, which is its own right rather than a bigger edit.
export async function POST(request, ctx) {
  const g = await qualityGuard(ctx.params, { setup: true });
  if (g.fail) return g.fail;
  const b = await body(request);

  // One press, five types and their templates — the way a studio that has never
  // written a quality system gets a taxonomy to argue with rather than a blank
  // page to invent one on.
  if (b.starter) {
    const result = await installStarterTypes(g);
    if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
    return Response.json({ ok: true, types: result.types }, { status: 201 });
  }

  const result = await createType(g, b);
  if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
  return Response.json({ ok: true, type: result.type }, { status: 201 });
}

export async function PUT(request, ctx) {
  const g = await qualityGuard(ctx.params, { setup: true });
  if (g.fail) return g.fail;
  const b = await body(request);

  // The department short codes are part of the same setup screen: they are the
  // middle third of every document number, so they are edited where the types
  // are rather than somewhere else the numbering is decided from.
  if (b.departmentCodes !== undefined) {
    const result = await saveDepartmentCodes(g, b);
    if (result.error) {
      return Response.json({ error: result.error, code: result.code, departments: result.departments },
        { status: status(result.error) });
    }
    return Response.json({ ok: true, departmentCodes: result.departmentCodes });
  }

  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await updateType(g, b.id, b);
  if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
  return Response.json({ ok: true, type: result.type });
}

export async function DELETE(request, ctx) {
  const g = await qualityGuard(ctx.params, { setup: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeType(g, b.id);
  if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
  return Response.json({ ok: true });
}

import { permissionsFromGrants } from "@/lib/access";
import { listRoles, createRole, ADMIN_ROLE_ID } from "@/lib/data/roles";
import { listCollaborators, updateCollaborator } from "@/lib/data/collaborators";
import { listSections, listGrants } from "@/lib/data/sections";

// TURNING ONE STUDIO'S GRANTS INTO ROLES.
//
// Deliberately not automatic and not global. It changes who can do what, so it
// is something an owner triggers for their own studio, after looking at what it
// intends to do — hence the dry run, which is the same code path with the
// writing switched off.
//
// The translation is exact rather than clever. Whatever a person's grants
// currently resolve to is what their role will hold: nobody gains anything, and
// the only people who lose are those whose grants already meant nothing.

const sortedKey = (perms) => [...perms].sort().join("|");

export async function planMigration(studioId) {
  const [people, roles, sections, grants] = await Promise.all([
    listCollaborators(studioId), listRoles(studioId), listSections(studioId), listGrants(studioId),
  ]);

  // Roles that already exist, indexed by exactly what they hold, so a studio
  // whose people happen to match a starter role reuses it instead of breeding
  // near-identical copies.
  const byShape = new Map();
  for (const r of roles) if (!r.wildcard) byShape.set(sortedKey(r.permissions || []), r);

  const plan = [];
  const invent = new Map(); // shape -> the bespoke role we will need

  for (const person of people) {
    if (person.role === "owner") {
      plan.push({ id: person.id, alias: person.alias, action: "skip", why: "Owns the studio; always has everything." });
      continue;
    }
    if ((person.roleIds || []).length) {
      plan.push({ id: person.id, alias: person.alias, action: "skip", why: "Already has a role." });
      continue;
    }
    // The admin flag IS the Admin role — that is how the flag retires, rather
    // than being switched off and hoping somebody notices.
    if (person.isAdmin) {
      plan.push({ id: person.id, alias: person.alias, action: "assign", roleName: "Admin", roleId: ADMIN_ROLE_ID });
      continue;
    }

    const perms = [...permissionsFromGrants(person.id, sections, grants)];
    if (!perms.length) {
      plan.push({ id: person.id, alias: person.alias, action: "none", why: "Their grants allow nothing today." });
      continue;
    }
    const shape = sortedKey(perms);
    const existing = byShape.get(shape);
    if (existing) {
      plan.push({ id: person.id, alias: person.alias, action: "assign", roleName: existing.name, roleId: existing.id });
      continue;
    }
    // No role matches, so one has to be made. People with IDENTICAL access
    // share it — otherwise a studio of thirty ends up with thirty roles and the
    // whole point of naming them is lost.
    if (!invent.has(shape)) invent.set(shape, { name: `${person.alias || "Member"}'s access`, permissions: perms, holders: [] });
    invent.get(shape).holders.push(person.id);
    plan.push({ id: person.id, alias: person.alias, action: "create", roleName: invent.get(shape).name, permissions: perms.length });
  }

  return { plan, newRoles: [...invent.values()] };
}

export async function runMigration(studioId) {
  const { plan, newRoles } = await planMigration(studioId);

  // Make the bespoke roles first, so every assignment below has something real
  // to point at.
  const created = [];
  for (const spec of newRoles) {
    const role = await createRole(studioId, { name: spec.name, description: "Carried over from section grants.", permissions: spec.permissions });
    created.push(role);
    for (const holder of spec.holders) {
      await updateCollaborator(studioId, holder, { roleIds: [role.id] });
    }
  }
  for (const row of plan) {
    if (row.action !== "assign") continue;
    await updateCollaborator(studioId, row.id, { roleIds: [row.roleId] });
  }

  // The grants are LEFT IN PLACE. They stop being consulted the moment someone
  // holds a role, so deleting them buys nothing and removes the only way back
  // if an assignment turns out wrong.
  return { assigned: plan.filter((r) => r.action !== "skip" && r.action !== "none").length, created: created.length };
}

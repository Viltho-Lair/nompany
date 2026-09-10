// A THROWAWAY end-to-end check of the payroll approve → post path, run against
// the sandbox namespace. Deleted after use; it exists because the browser has
// only one signed-in person and invariant 7 needs two.
process.env.NOMPANY_KEY_PREFIX = "sandbox_";
const { createUser } = await import("../src/platform/auth/users.ts");
const { addCollaborator } = await import("../src/platform/auth/collaborators.ts");
const { createRole } = await import("../src/modules/people/roles.ts");
const { getStudioBySlug } = await import("../src/modules/main/studios.ts");

const studio = await getStudioBySlug("sandbox");
const email = `payroll-${Date.now()}@test.invalid`;
const { user } = await createUser({ email, passwordHash: "x" });
const role = await createRole(studio.id, {
  name: `payroll-approver-${Date.now()}`,
  permissions: ["hr.payroll.view", "hr.payroll.approve", "hr.payroll.edit", "finance.ledger.post", "finance.ledger.view"],
});
const collab = await addCollaborator(studio.id, {
  userId: user.id, alias: "Approver", role: "member", roleIds: [role.id],
});
console.log(JSON.stringify({ userId: user.id, collaboratorId: collab.id, email }));

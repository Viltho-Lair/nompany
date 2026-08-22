// ACCESS, AS ONE MODULE.
//
// `lib/permissions.js` and `lib/access.js` were always one subject split across
// two files — the catalogue of what exists, and the resolution of who holds it —
// and every caller that needed one usually needed the other. Five files imported
// both, from two paths, which is five places where somebody could reach for the
// catalogue and forget the resolver.
//
// The split between the files is worth keeping and is not the same as a split in
// the import path: `catalogue` is a declaration with no logic, `resolve` is logic
// with no declarations, and grading them together would lose that. So they stay
// two files behind one door.
//
// SIBLINGS IMPORT EACH OTHER DIRECTLY, never through here. `resolve` needs the
// catalogue, and reaching for it via this manifest would be the module importing
// itself — a cycle whose failure mode is an undefined export at load time rather
// than an error anybody can read.
//
// Nothing here touches Redis, which is what lets a client component name
// ADMIN_ROLE_ID or render the access grid without dragging the store into the
// browser bundle. Keep it that way: this door is on both sides of the network.

export * from "./catalogue";
export * from "./resolve";

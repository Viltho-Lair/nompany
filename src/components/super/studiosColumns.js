// The Studios grid's LAYOUT, with no React in it — so the route's loading.js can
// import it without pulling the client grid, the plan dialog and MUI X into the
// one bundle that has to arrive first. Same arrangement as the Users grid; see
// the note in src/app/super/(shell)/application/users/columns.js.

export const STUDIOS_COLUMNS = [
  { field: "studio", headerName: "Studio", flex: 2, minWidth: 220 },
  { field: "owner", headerName: "Owner", flex: 2, minWidth: 200 },
  { field: "packageName", headerName: "Plan", width: 140, skeleton: "pill" },
  { field: "tierName", headerName: "Tier", width: 130, skeleton: "pill" },
  { field: "members", headerName: "Members", width: 120, skeleton: "number" },
  { field: "created", headerName: "Created", width: 150, skeleton: "number" },
];

export const STUDIOS_PAGE_SIZE = 10;

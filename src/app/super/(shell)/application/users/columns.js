// The Users grid's LAYOUT, with no React in it.
//
// It lives apart from UsersTable so `loading.js` can import it. UsersTable is a
// client component; a skeleton that imported its columns would drag the whole
// grid — MUI X, the role menu, the fetch — into the loading bundle, which is the
// one bundle that has to arrive before anything else.
//
// This is also what keeps the skeleton HONEST. The placeholder's columns are not
// a guess at the table's shape, they are the table's shape: same order, same
// widths, same `flex`. Change a width here and the bar under it moves with it.
//
// `skeleton` says what kind of thing lands in the cell — see the Bar switch in
// SuperDataGrid.skeleton.js.

export const USERS_COLUMNS = [
  { field: "user", headerName: "User", flex: 2, minWidth: 240, skeleton: "avatar" },
  { field: "role", headerName: "Role", width: 150, skeleton: "pill" },
  { field: "studios", headerName: "Studios", flex: 1, minWidth: 160 },
  { field: "status", headerName: "Status", width: 130, skeleton: "pill" },
  { field: "lastActive", headerName: "Last active", width: 150 },
  { field: "actions", headerName: "", width: 72, skeleton: "pill" },
];

export const USERS_PAGE_SIZE = 10;

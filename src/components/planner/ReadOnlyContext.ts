import { createContext, useContext } from 'react';

// Whether the plan is read-only for this viewer. Provided by PlannerShell from
// the plan door's `canEdit`, read by the editing surfaces (the row menu today)
// so a viewer is never offered a control whose change would apply on screen and
// then vanish on the next reload because it was never saved.
export const PlannerReadOnlyContext = createContext(false);

export const usePlannerReadOnly = () => useContext(PlannerReadOnlyContext);

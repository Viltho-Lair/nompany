import { cache } from "react";
import { currentSuperAdmin } from "@/platform/auth/superAuth";

// THE SIGNED-IN ADMIN, ONCE PER RENDER.
//
// The console layout gates every screen with this, and the questionnaire pages
// ask again — and a layout and its page are separate calls, so the request
// cache (`withRequest`, AsyncLocalStorage) cannot span them: each got its own
// session lookup and its own read of the admin registry, two sequential round
// trips apiece. React's `cache()` is scoped to the request's render pass, which
// is the lifetime that covers both. The same reasoning as `studio/_shell.js`.
//
// It changes nothing about WHERE the check happens: every caller still refuses
// on a null answer; they just share the answer.
export const signedInAdmin = cache(() => currentSuperAdmin());

// A stand-in for `next/headers`, used only by the integration suite.
//
// Route handlers find the caller through cookies() — that is the whole of
// authentication — so signing in, inside a test, means putting a real session
// token in this jar. The token is minted by the real mintSession(), so
// currentUser() looks it up against Redis exactly as it does in production.
// Nothing here fakes a user; it only carries the cookie a browser would.

const jar = new Map();
let requestHeaders = new Headers();

export function __signIn(cookieName, token) {
  jar.set(cookieName, token);
}
export function __signOut() {
  jar.clear();
}
export function __setHeaders(init) {
  requestHeaders = new Headers(init || {});
}

export async function cookies() {
  return {
    get: (name) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    has: (name) => jar.has(name),
    set: (name, value) => jar.set(name, value),
    delete: (name) => jar.delete(name),
  };
}

export async function headers() {
  return requestHeaders;
}

/* Records saved in the last few seconds, so lists can greet them with a short entrance (hero) animation. */
const fresh = new Map();
const WINDOW = 4000;
export const markFresh = (id) => { if (id) fresh.set(String(id), Date.now()); };
export const isFresh = (id) => { const at = fresh.get(String(id)); if (!at) return false; if (Date.now() - at > WINDOW) { fresh.delete(String(id)); return false; } return true; };

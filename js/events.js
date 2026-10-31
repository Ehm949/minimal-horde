const map = new Map();
export const Bus = {
  on(e, f) {
    if (!map.has(e)) map.set(e, new Set());
    map.get(e).add(f);
    return () => map.get(e).delete(f);
  },
  emit(e, d) {
    const s = map.get(e);
    if (s) for (const f of s) f(d);
  }
};